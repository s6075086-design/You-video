// worker/worker.js - minimal poller placeholder
// In production replace with a real queue system (Bull/Redis or SQS)
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const UPLOAD_DIR = path.join(__dirname, '..', 'server', 'uploads');

async function poll() {
  try {
    const { rows } = await pool.query('SELECT id, s3_key FROM videos WHERE thumbnail_url IS NULL LIMIT 5');
    for (const r of rows) {
      const key = r.s3_key.replace(/\//g,'_');
      const file = path.join(UPLOAD_DIR, key);
      if (!fs.existsSync(file)) continue;
      // Here you'd run ffmpeg to create thumbnails / renditions.
      // For this scaffold we just write a placeholder thumbnail file.
      const thumbName = key + '_thumb.jpg';
      const thumbPath = path.join(UPLOAD_DIR, thumbName);
      fs.writeFileSync(thumbPath, 'thumbnail-placeholder');
      const thumbUrl = `/uploads/${thumbName}`;
      await pool.query('UPDATE videos SET thumbnail_url=$1 WHERE id=$2', [thumbUrl, r.id]);
      console.log('Processed', r.id);
    }
  } catch (e) { console.error(e); }
}

setInterval(poll, 5000);
console.log('Worker started');
