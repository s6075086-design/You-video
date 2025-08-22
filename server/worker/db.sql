CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS videos (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  title TEXT,
  description TEXT,
  s3_key TEXT,
  thumbnail_url TEXT,
  duration INT,
  is_reel BOOLEAN DEFAULT false,
  views INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS likes (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  video_id INT REFERENCES videos(id),
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, video_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  video_id INT REFERENCES videos(id),
  body TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS follows (
  id SERIAL PRIMARY KEY,
  follower_id INT REFERENCES users(id),
  followee_id INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(follower_id, followee_id)
);
