# You Video - Minimal Full-Project Scaffold

This archive contains a minimal scaffold for the You Video app:
- server/: Node.js + Express API (signup/login/upload/feed)
- client/: Expo React Native starter app (Login, Feed, Upload)
- worker/: simple worker placeholder to process uploads
- docker-compose.yml to start Postgres + API + worker (dev)

## Quick start (dev)
1. Install Docker and Docker Compose.
2. From the project root run:
   ```
   docker compose up --build
   ```
3. API: http://localhost:4000
   - POST /api/auth/signup { username, email, password }
   - POST /api/auth/login { email, password }
   - POST /api/videos/upload (multipart, auth Bearer token)
   - GET /api/videos/feed

Notes:
- This scaffold uses local uploads (server/uploads) for dev; switch to S3 for production.
- Worker is a placeholder; replace with FFmpeg-based transcoding for production.
