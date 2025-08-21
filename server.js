// server.js —— 快速加速版（ESM），支持 ?lean=1 与 ETag 缓存
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// 如有更大的上传，按需调大
app.use(express.json({ limit: '500mb' }));
app.use(cors());

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

async function ensureDb() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  try { await fsp.access(DB_FILE, fs.constants.F_OK); }
  catch { await fsp.writeFile(DB_FILE, JSON.stringify({ items: [] }, null, 2)); }
}

function toId(userId, title) {
  return `${userId}:${title}`;
}

async function loadDb() {
  const txt = await fsp.readFile(DB_FILE, 'utf8');
  return JSON.parse(txt);
}
async function saveDb(db) {
  await fsp.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

// 计算大小与 etag（在保存时做，避免每次 GET 都算）
function computeSizesAndEtag(item) {
  // 估算 base64 大小：每 4 字符 ≈ 3 字节
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
  // 注意：只用大小和时间戳就够了；真正的内容变更也会改时间戳
  h.update(String(videoBytes));
  h.update(String(markdownBytes));
  const etag = `"${h.digest('base64')}"`;

  item.videoBytes = videoBytes;
  item.markdownBytes = markdownBytes;
  item.etag = etag;
}

function computeStorageInfo(items) {
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

// 列表：支持 ?lean=1 只返回元信息（极大提速）
app.get('/api/items', async (req, res) => {
  try {
    const db = await loadDb();
    db.items.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

    if (req.query.lean === '1') {
      const list = db.items.map(({ id, userId, title, timestamp, videoBytes = 0, markdownBytes = 0 }) => ({
        id, userId, title, timestamp, videoBytes, markdownBytes
      }));
      // 列表可短缓存
      res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=30');
      return res.json({ items: list });
    }

    // 旧行为（不建议在页面初始加载时用）
    return res.json({ items: db.items });
  } catch (e) {
    res.status(500).send(String(e));
  }
});

// 标题列表
app.get('/api/items/titles', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.json({ titles: [] });
    const db = await loadDb();
    const titles = db.items
      .filter((x) => x.userId === String(userId))
      .map((x) => x.title)
      .filter((t, i, arr) => arr.indexOf(t) === i)
      .sort((a, b) => a.localeCompare(b));
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=60');
    res.json({ titles });
  } catch (e) {
    res.status(500).send(String(e));
  }
});

// 单条内容（带 ETag，命中 304 极快）
app.get('/api/items/content', async (req, res) => {
  try {
    const { userId, title } = req.query;
    if (!userId || !title) return res.status(400).send('userId/title is required');
    const id = toId(String(userId), String(title));
    const db = await loadDb();
    const item = db.items.find((x) => x.id === id);
    if (!item) return res.status(404).send('Not Found');

    const etag = item.etag || '"0"';
    // 协商缓存
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }
    res.set('ETag', etag);
    res.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=60'); // 可按需调整
    res.json(item);
  } catch (e) {
    res.status(500).send(String(e));
  }
});

// 保存/更新（写入时计算大小与 etag）
app.post('/api/items', async (req, res) => {
  try {
    const item = req.body || {};
    if (!item.userId || !item.title) return res.status(400).send('userId/title is required');
    item.id = item.id || toId(item.userId, item.title);
    item.timestamp = item.timestamp || new Date().toISOString();

    computeSizesAndEtag(item);

    const db = await loadDb();
    const idx = db.items.findIndex((x) => x.id === item.id);
    if (idx >= 0) db.items[idx] = item; else db.items.push(item);
    await saveDb(db);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).send(String(e));
  }
});

app.delete('/api/items', async (req, res) => {
  try {
    const { userId, title } = req.query;
    if (!userId || !title) return res.status(400).send('userId/title is required');
    const id = toId(String(userId), String(title));
    const db = await loadDb();
    const before = db.items.length;
    db.items = db.items.filter((x) => x.id !== id);
    await saveDb(db);
    res.json({ ok: true, removed: before - db.items.length });
  } catch (e) {
    res.status(500).send(String(e));
  }
});

app.delete('/api/items/all', async (_req, res) => {
  try {
    const db = await loadDb();
    db.items = [];
    await saveDb(db);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).send(String(e));
  }
});

app.get('/api/storage-info', async (_req, res) => {
  try {
    const db = await loadDb();
    res.set('Cache-Control', 'public, max-age=30');
    res.json(computeStorageInfo(db.items));
  } catch (e) {
    res.status(500).send(String(e));
  }
});

const PORT = process.env.PORT || 8787;
ensureDb().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`API server running at http://0.0.0.0:${PORT}`);
  });
});
