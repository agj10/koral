import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/koral',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

const convertQuery = (sql) => {
  let count = 1;
  return sql.replace(/\?/g, () => `$${count++}`);
};

const db = {
  async runAsync(sql, params = []) {
    const res = await pool.query(convertQuery(sql), params);
    return res;
  },
  async getAsync(sql, params = []) {
    const res = await pool.query(convertQuery(sql), params);
    return res.rows[0];
  },
  async allAsync(sql, params = []) {
    const res = await pool.query(convertQuery(sql), params);
    return res.rows;
  }
};
const initDb = async () => {
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      handle TEXT UNIQUE NOT NULL,
      displayName TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      avatar TEXT,
      bio TEXT,
      website TEXT,
      joinedAt TEXT NOT NULL,
      verified INTEGER DEFAULT 0
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS follows (
      follower TEXT,
      following TEXT,
      createdAt TEXT,
      PRIMARY KEY (follower, following)
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      title TEXT,
      authorHandle TEXT NOT NULL,
      images TEXT, -- JSON array
      caption TEXT,
      tags TEXT, -- JSON array
      location TEXT,
      createdAt TEXT NOT NULL
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS post_likes (
      postId TEXT,
      handle TEXT,
      PRIMARY KEY (postId, handle)
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS post_bookmarks (
      postId TEXT,
      handle TEXT,
      PRIMARY KEY (postId, handle)
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      postId TEXT NOT NULL,
      parentId TEXT,
      authorHandle TEXT NOT NULL,
      text TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      editedAt TEXT
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS comment_likes (
      commentId TEXT,
      handle TEXT,
      PRIMARY KEY (commentId, handle)
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      authorHandle TEXT NOT NULL,
      layers TEXT, -- JSON array
      createdAt TEXT NOT NULL,
      expiresAt TEXT NOT NULL
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS story_likes (
      storyId TEXT,
      handle TEXT,
      PRIMARY KEY (storyId, handle)
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS story_views (
      storyId TEXT,
      handle TEXT,
      PRIMARY KEY (storyId, handle)
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      fromHandle TEXT NOT NULL,
      toHandle TEXT NOT NULL,
      postId TEXT,
      read INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      authorHandle TEXT NOT NULL,
      data TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS verification_codes (
      email TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      expiresAt TEXT NOT NULL
    )
  `);
  
  console.log("Database initialized successfully.");
};

initDb().catch(console.error);

export default db;
