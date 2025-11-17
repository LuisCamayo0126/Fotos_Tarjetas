// server.js
// Simple Express server to persist phrases, templates, fields and events into SQLite
const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

const app = express();
app.use(express.json({ limit: '10mb' }));

const dbPath = path.join(__dirname, 'data', 'app.db');
if (!fs.existsSync(dbPath)) {
  console.error('Database not found. Run `npm run init-db` first to create', dbPath);
  process.exit(1);
}
const db = new Database(dbPath);

app.post('/api/phrase', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  const stmt = db.prepare('INSERT INTO phrases (text) VALUES (?)');
  const info = stmt.run(text);
  res.json({ id: info.lastInsertRowid });
});

app.post('/api/event', (req, res) => {
  const { type, payload } = req.body;
  if (!type) return res.status(400).json({ error: 'type required' });
  const stmt = db.prepare('INSERT INTO events (type, payload) VALUES (?, ?)');
  const info = stmt.run(type, JSON.stringify(payload || null));
  res.json({ id: info.lastInsertRowid });
});

app.post('/api/template', (req, res) => {
  const { name, data } = req.body;
  if (!data) return res.status(400).json({ error: 'data required' });
  const stmt = db.prepare('INSERT INTO templates (name, data) VALUES (?, ?)');
  const info = stmt.run(name || null, data);
  res.json({ id: info.lastInsertRowid });
});

app.post('/api/field', (req, res) => {
  const { name, x, y, size_ratio } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const stmt = db.prepare('INSERT INTO fields (name, x, y, size_ratio) VALUES (?, ?, ?, ?)');
  const info = stmt.run(name, x || null, y || null, size_ratio || null);
  res.json({ id: info.lastInsertRowid });
});

app.get('/api/phrases', (req, res) => {
  const rows = db.prepare('SELECT id, text, created_at FROM phrases ORDER BY id DESC LIMIT 200').all();
  res.json(rows);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));
