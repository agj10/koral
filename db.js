import sqlite3Pkg from 'sqlite3';
const sqlite3 = sqlite3Pkg.verbose();
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import util from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'koral.db');
const db = new sqlite3.Database(dbPath);

db.runAsync = util.promisify(db.run).bind(db);
db.getAsync = util.promisify(db.get).bind(db);
db.allAsync = util.promisify(db.all).bind(db);

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
  
  console.log("Database initialized successfully.");
};

initDb().catch(console.error);

export default db;
