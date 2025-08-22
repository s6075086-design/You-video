// index.js - simple API with signup/login, upload, feed, video details
const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
const USE_S3 = process.env.USE_S3 === 'true';
const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({ dest: UPLOAD_DIR });

// ---- helper middleware
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing Authorization header' });
  const token = auth.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ---- create tables on start (basic)
async function ensureSchema() {
  const sql = fs.readFileSync(path.join(__dirname, 'db.sql')).toString();
  await pool.query(sql);
}
ensureSchema().catch(err => console.error('Schema error', err));

// ---- signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    const password_hash = await bcrypt.hash(password, 10);
    const q = 'INSERT INTO users (username, email, password_hash) VALUES ($1,$2,$3) RETURNING id, username, email';
    const { rows } = await pool.query(q, [username, email, password_hash]);
    const user = rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ user, accessToken: token });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(409).json({ error: 'Username or email already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

// ---- login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ accessToken: token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---- upload endpoint
app.post('/api/videos/upload', authMiddleware, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { title = null, description = null, isReel = 'false' } = req.body;
    const file = req.file;
    const key = `videos/${Date.now()}_${file.originalname}`;

    // For dev we simply move into uploads folder with sanitized name
    const destName = key.replace(/\//g, '_');
    const destPath = path.join(UPLOAD_DIR, destName);
    fs.renameSync(file.path, destPath);

    const insertQ = `INSERT INTO videos (user_id, title, description, s3_key, is_reel, thumbnail_url)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, created_at`;
    const { rows } = await pool.query(insertQ, [req.user.id, title, description, key, isReel === 'true', null]);

    res.json({ success: true, videoId: rows[0].id, key });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ---- feed (paginated)
app.get('/api/videos/feed', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '15', 10), 50);
    const offset = parseInt(req.query.offset || '0', 10);
    const reelsOnly = req.query.reelsOnly === 'true';
    const cond = reelsOnly ? 'WHERE v.is_reel = true' : '';
    const q = `SELECT v.*, u.username, u.avatar_url FROM videos v JOIN users u ON v.user_id = u.id ${cond} ORDER BY v.created_at DESC LIMIT $1 OFFSET $2`;
    const { rows } = await pool.query(q, [limit, offset]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---- video details (stream_url building)
app.get('/api/videos/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { rows } = await pool.query('SELECT v.*, u.username FROM videos v JOIN users u ON v.user_id=u.id WHERE v.id=$1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const video = rows[0];
    const fileName = video.s3_key.replace(/\//g, '_');
    video.stream_url = `${req.protocol}://${req.get('host')}/uploads/${fileName}`;
    res.json(video);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---- serve static uploads in dev
app.use('/uploads', express.static(UPLOAD_DIR));

app.listen(PORT, () => console.log(`API listening on ${PORT}`));
