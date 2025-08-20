// server.js —— 极简 REST API，文件持久化（data/db.json）
// 仅依赖 express 与 cors： npm i express cors
// 启动： node server.js
// 生产环境建议用 pm2 或 systemd 守护进程。

import express, { json } from 'express';
import cors from 'cors';
import { promises } from 'fs';
const fsp = promises;
import { join } from 'path';

const app = express();
app.use(json({ limit: '500mb' })); // base64 视频可能较大
app.use(cors()); // 若同源部署可去掉

const DATA_DIR = join(__dirname, 'data');
const DB_FILE = join(DATA_DIR, 'db.json');

// 确保数据文件存在
async function ensureDb() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  try {
    await fsp.access(DB_FILE);
  } catch {
    await fsp.writeFile(DB_FILE, JSON.stringify({ items: [] }, null, 2), 'utf8');
  }
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

// 计算存储信息
function computeStorageInfo(items) {
  const userInfo = {};
  let totalBytes = 0;

  for (const it of items) {
    userInfo[it.userId] = (userInfo[it.userId] || 0) + 1;

    // video 为 data URL：`data:xxx;base64,AAAA...`，取逗号后部分计算 base64 字节数
    let videoBytes = 0;
    if (typeof it.video === 'string') {
      const idx = it.video.indexOf(',');
      const b64 = idx >= 0 ? it.video.slice(idx + 1) : it.video;
      // base64 -> 字节数近似：每 4 个 base64 字符 = 3 字节
      videoBytes = Math.floor((b64.length * 3) / 4);
    }
    const markdownBytes = Buffer.byteLength(it.markdown || '', 'utf8');

    totalBytes += videoBytes + markdownBytes;
  }

  const mb = (totalBytes / 1024 / 1024).toFixed(2) + ' MB';
  return {
    totalSize: totalBytes,
    totalSizeMB: mb,
    itemCount: items.length,
    userCount: Object.keys(userInfo).length,
    userInfo,
  };
}

// 列出所有条目
app.get('/api/items', async (req, res) => {
  try {
    const db = await loadDb();
    // 按时间倒序
    db.items.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    res.json({ items: db.items });
  } catch (e) {
    res.status(500).send(String(e));
  }
});

// 列出指定 userId 的标题
app.get('/api/items/titles', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.json({ titles: [] });
    const db = await loadDb();
    const titles = db.items
      .filter((x) => x.userId === String(userId))
      .map((x) => x.title)
      .filter((t, i, arr) => arr.indexOf(t) === i) // 去重
      .sort((a, b) => a.localeCompare(b));
    res.json({ titles });
  } catch (e) {
    res.status(500).send(String(e));
  }
});

// 读取某条内容（按 userId + title）
app.get('/api/items/content', async (req, res) => {
  try {
    const { userId, title } = req.query;
    if (!userId || !title) return res.status(400).send('userId/title is required');
    const id = toId(String(userId), String(title));
    const db = await loadDb();
    const item = db.items.find((x) => x.id === id);
    if (!item) return res.status(404).send('Not Found');
    res.json(item);
  } catch (e) {
    res.status(500).send(String(e));
  }
});

// 保存/更新
app.post('/api/items', async (req, res) => {
  try {
    const item = req.body || {};
    if (!item.userId || !item.title) {
      return res.status(400).send('userId/title is required');
    }
    item.id = item.id || toId(item.userId, item.title);
    item.timestamp = item.timestamp || new Date().toISOString();

    const db = await loadDb();
    const idx = db.items.findIndex((x) => x.id === item.id);
    if (idx >= 0) db.items[idx] = item;
    else db.items.push(item);

    await saveDb(db);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).send(String(e));
  }
});

// 删除某条
app.delete('/api/items', async (req, res) => {
  try {
    const { userId, title } = req.query;
    if (!userId || !title) return res.status(400).send('userId/title is required');
    const id = toId(String(userId), String(title));
    const db = await loadDb();
    const before = db.items.length;
    db.items = db.items.filter((x) => x.id !== id);
    const removed = before - db.items.length;
    await saveDb(db);
    res.json({ ok: true, removed });
  } catch (e) {
    res.status(500).send(String(e));
  }
});

// 清空所有
app.delete('/api/items/all', async (req, res) => {
  try {
    const db = await loadDb();
    db.items = [];
    await saveDb(db);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).send(String(e));
  }
});

// 存储统计
app.get('/api/storage-info', async (req, res) => {
  try {
    const db = await loadDb();
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
