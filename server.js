// server.js —— ESM 版（稳健存储）：索引 + 单条文件，避免 db.json 过大导致 OOM
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- 进程级兜底日志 ----
process.on('uncaughtException', e => console.error('uncaughtException:', e?.stack || e));
process.on('unhandledRejection', e => console.error('unhandledRejection:', e));

const app = express();
const JSON_LIMIT = process.env.JSON_LIMIT || '500mb';
app.use(express.json({ limit: JSON_LIMIT }));
app.use(cors());

// 统一请求日志
app.use((req, res, next) => {
  const t0 = process.hrtime.bigint();
  console.log(`[REQ] ${new Date().toISOString()} ${req.method} ${req.url} len=${req.headers['content-length']||0}`);
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    console.log(`[RES] ${req.method} ${req.url} -> ${res.statusCode} (${Math.round(ms)}ms)`);
  });
  next();
});
// JSON 解析错误快速返回
app.use((err, _req, res, next) => {
  if (err) {
    console.error('[JSON-PARSER-ERROR]', err?.type || err?.name, err?.message);
    return res.status(err.type === 'entity.too.large' ? 413 : 400).send(err?.message || 'Invalid JSON');
  }
  next();
});

// ---- 存储路径 ----
const DATA_DIR   = process.env.DATA_DIR || path.join(__dirname, 'data');
const INDEX_FILE = path.join(DATA_DIR, 'index.json');     // 仅存元数据列表
const ITEMS_DIR  = path.join(DATA_DIR, 'items');          // 每条一个 JSON 文件
const BAK_FILE   = INDEX_FILE + '.bak';

console.log('[BOOT] DATA_DIR   =', DATA_DIR);
console.log('[BOOT] INDEX_FILE =', INDEX_FILE);
console.log('[BOOT] ITEMS_DIR  =', ITEMS_DIR);

// ---- 工具：原子写 + 写队列 ----
let writeQueue = Promise.resolve();
function enqueueWrite(fn) { writeQueue = writeQueue.then(fn, fn); return writeQueue; }
async function writeFileAtomic(file, content) {
  const tmp = file + '.' + process.pid + '.' + Date.now() + '.tmp';
  await fsp.writeFile(tmp, content, 'utf8');
  await fsp.rename(tmp, file);
}

// ---- 初始化与安全读写索引 ----
async function ensureStore() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.mkdir(ITEMS_DIR, { recursive: true });
  try {
    await fsp.access(INDEX_FILE, fs.constants.F_OK);
  } catch {
    const init = JSON.stringify({ items: [] }, null, 2);
    await fsp.writeFile(INDEX_FILE, init, 'utf8');
    await fsp.writeFile(BAK_FILE,   init, 'utf8');
  }
}
async function loadIndex() {
  try {
    const txt = await fsp.readFile(INDEX_FILE, 'utf8');  // 索引很小，读入内存没问题
    return JSON.parse(txt);
  } catch (e) {
    console.error('[INDEX] load error, try backup:', e?.message || e);
    try {
      const bak = await fsp.readFile(BAK_FILE, 'utf8');
      return JSON.parse(bak);
    } catch {
      const empty = { items: [] };
      await fsp.writeFile(INDEX_FILE, JSON.stringify(empty, null, 2), 'utf8');
      await fsp.writeFile(BAK_FILE,   JSON.stringify(empty, null, 2), 'utf8');
      return empty;
    }
  }
}
async function saveIndex(db) {
  const json = JSON.stringify(db, null, 2);
  try { await fsp.copyFile(INDEX_FILE, BAK_FILE); } catch {}
  await writeFileAtomic(INDEX_FILE, json);
}

// ---- 单条文件路径（用 base64url 防止文件名非法字符）----
function toId(userId, title) { return `${userId}:${title}`; }
function idToFile(id) {
  const safe = Buffer.from(id).toString('base64url');
  return path.join(ITEMS_DIR, safe + '.json');
}

// ---- 计算大小与 ETag（与原来一致）----
function computeSizesAndEtag(item) {
  let videoBytes = 0;
  if (typeof item.video === 'string') {
    const idx = item.video.indexOf(',');
    const b64 = idx >= 0 ? item.video.slice(idx + 1) : item.video;
    videoBytes = Math.floor((b64.length * 3) / 4);
  }
  const markdownBytes = Buffer.byteLength(item.markdown || '', 'utf8');

  const h = crypto.createHash('sha1');
  h.update(item.id || '');
  h.update(item.timestamp || '');
  h.update(String(videoBytes));
  h.update(String(markdownBytes));
  const etag = `"${h.digest('base64')}"`;

  item.videoBytes = videoBytes;
  item.markdownBytes = markdownBytes;
  item.etag = etag;
  return { videoBytes, markdownBytes, etag };
}

// ---- 读取/写入单条内容 ----
async function readItemById(id) {
  const file = idToFile(id);
  const txt = await fsp.readFile(file, 'utf8');      // 只在需要详情时读取单条
  return JSON.parse(txt);
}
async function writeItemById(id, item) {
  const file = idToFile(id);
  await writeFileAtomic(file, JSON.stringify(item, null, 2));
}
async function removeItemById(id) {
  const file = idToFile(id);
  try { await fsp.unlink(file); } catch {}
}

// ---- 统计信息 ----
function computeStorageInfoFromIndex(items) {
  const userInfo = {};
  let totalBytes = 0;
  for (const it of items) {
    userInfo[it.userId] = (userInfo[it.userId] || 0) + 1;
    totalBytes += (it.videoBytes || 0) + (it.markdownBytes || 0);
  }
  return {
    totalSize: totalBytes,
    totalSizeMB: (totalBytes / 1024 / 1024).toFixed(2) + ' MB',
    itemCount: items.length,
    userCount: Object.keys(userInfo).length,
    userInfo,
  };
}

// ==================== 路由 ====================

// 列表（默认瘦身）
app.get('/api/items', async (req, res) => {
  try {
    const db = await loadIndex();
    db.items.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

    const full = req.query.full === '1';
    if (!full) {
      const list = db.items.map(({ id, userId, title, timestamp, videoBytes = 0, markdownBytes = 0 }) => ({
        id, userId, title, timestamp,
        video: '', markdown: '', videoBytes, markdownBytes,
      }));
      res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=30');
      return res.json({ items: list });
    }
    return res.json({ items: db.items });
  } catch (e) {
    console.error('[ROUTE] GET /api/items error:', e?.stack || e);
    res.status(500).send(String(e?.message || e));
  }
});

// 标题列表
app.get('/api/items/titles', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.json({ titles: [] });
    const db = await loadIndex();
    const titles = db.items
      .filter(x => x.userId === String(userId))
      .map(x => x.title)
      .filter((t, i, arr) => arr.indexOf(t) === i)
      .sort((a, b) => a.localeCompare(b));
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=60');
    res.json({ titles });
  } catch (e) {
    console.error('[ROUTE] GET /api/items/titles error:', e?.stack || e);
    res.status(500).send(String(e?.message || e));
  }
});

// 单条内容（含 ETag）
app.get('/api/items/content', async (req, res) => {
  try {
    const { userId, title } = req.query;
    if (!userId || !title) return res.status(400).send('userId/title is required');
    const id = toId(String(userId), String(title));

    const item = await readItemById(id).catch(() => null);
    if (!item) return res.status(404).send('Not Found');

    const etag = item.etag || '"0"';
    if (req.headers['if-none-match'] === etag) return res.status(304).end();

    res.set('ETag', etag);
    res.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=60');
    res.json(item);
  } catch (e) {
    console.error('[ROUTE] GET /api/items/content error:', e?.stack || e);
    res.status(500).send(String(e?.message || e));
  }
});

// 保存/更新
app.post('/api/items', async (req, res) => {
  try {
    const item = req.body || {};
    if (!item.userId || !item.title) return res.status(400).send('userId/title is required');
    item.id = item.id || toId(item.userId, item.title);
    item.timestamp = item.timestamp || new Date().toISOString();

    const meta = computeSizesAndEtag(item);

    await enqueueWrite(async () => {
      // 写单条文件
      await writeItemById(item.id, item);

      // 更新索引（只保留元数据）
      const db = await loadIndex();
      const idx = db.items.findIndex(x => x.id === item.id);
      const metaRow = {
        id: item.id,
        userId: item.userId,
        title: item.title,
        timestamp: item.timestamp,
        videoBytes: meta.videoBytes,
        markdownBytes: meta.markdownBytes,
        etag: meta.etag,
      };
      if (idx >= 0) db.items[idx] = metaRow; else db.items.push(metaRow);
      await saveIndex(db);
    });

    res.json({ ok: true });
  } catch (e) {
    console.error('[ROUTE] POST /api/items error:', e?.stack || e);
    res.status(500).send(String(e?.message || e));
  }
});

// 删除单条
app.delete('/api/items', async (req, res) => {
  try {
    const { userId, title } = req.query;
    if (!userId || !title) return res.status(400).send('userId/title is required');
    const id = toId(String(userId), String(title));

    let removed = 0;
    await enqueueWrite(async () => {
      await removeItemById(id);
      const db = await loadIndex();
      const before = db.items.length;
      db.items = db.items.filter(x => x.id !== id);
      removed = before - db.items.length;
      await saveIndex(db);
    });

    res.json({ ok: true, removed });
  } catch (e) {
    console.error('[ROUTE] DELETE /api/items error:', e?.stack || e);
    res.status(500).send(String(e?.message || e));
  }
});

// 清空全部
app.delete('/api/items/all', async (_req, res) => {
  try {
    await enqueueWrite(async () => {
      // 删除所有单条文件
      const files = await fsp.readdir(ITEMS_DIR).catch(() => []);
      await Promise.allSettled(files.map(f => f.endsWith('.json') ? fsp.unlink(path.join(ITEMS_DIR, f)) : null));

      // 重置索引
      const empty = { items: [] };
      await saveIndex(empty);
    });
    res.json({ ok: true });
  } catch (e) {
    console.error('[ROUTE] DELETE /api/items/all error:', e?.stack || e);
    res.status(500).send(String(e?.message || e));
  }
});

// 存储信息（基于索引，O(条目数)，不会读大文件）
app.get('/api/storage-info', async (_req, res) => {
  try {
    const db = await loadIndex();
    res.set('Cache-Control', 'public, max-age=30');
    res.json(computeStorageInfoFromIndex(db.items));
  } catch (e) {
    console.error('[ROUTE] GET /api/storage-info error:', e?.stack || e);
    res.status(500).send(String(e?.message || e));
  }
});

// 全局错误处理中间件
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, req, res, _next) => {
  console.error('[EXPRESS-ERROR]', req.method, req.url, err?.stack || err);
  if (!res.headersSent) res.status(500).send(err?.message || 'Internal Server Error');
});

// ---- 启动 ----
const PORT = process.env.PORT || 8787;
await ensureStore();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running at http://0.0.0.0:${PORT}`);
});
