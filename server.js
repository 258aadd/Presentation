// server.js —— ESM 版本（适配 package.json 中 "type": "module"）
// 启动： node server.js
// 依赖： npm i express cors

import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '100mb' }));
app.use(cors()); // 同域反代可关

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

async function ensureDb() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  try {
    await fsp.access(DB_FILE, fs.constants.F_OK);
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

function computeStorageInfo(items) {
  const userInfo = {};
  let totalBytes = 0;

  for (const it of items) {
    userInfo[it.userId] = (userInfo[it.userId] || 0) + 1;

    let videoBytes = 0;
    if (typeof it.video === 'string') {
      const idx = it.video.indexOf(',');
      const b64 = idx >= 0 ? it.video.slice(idx + 1) : it.video;
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

app.get('/api/items', async (_req, res) => {
  try {
    const db = await loadDb();
    db.items.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    res.json({ items: db.items });
  } catch (e) {
    res.status(500).send(String(e));
  }
});

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
    res.json({ titles });
  } catch (e) {
    res.status(500).send(String(e));
  }
});

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
