import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { fileURLToPath } from 'url';
import db from './db.js';
import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');

if (process.env.SMTP_HOST === 'smtp.sendgrid.net') {
  sgMail.setApiKey(process.env.SMTP_PASS);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_PORT === '465' || process.env.SMTP_PORT == null,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'koral-super-secret-key-123';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Create uploads dir
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// JWT Middleware
const verifyToken = (req, res, next) => {
  const bearerHeader = req.headers['authorization'];
  if (typeof bearerHeader !== 'undefined') {
    const token = bearerHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return res.sendStatus(403);
      req.user = decoded;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

const uid = () => Math.random().toString(36).substring(2, 9);

// --- Auth Routes ---
app.post('/api/auth/send-verification', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    await db.runAsync(
      'INSERT INTO verification_codes (email, code, expiresAt) VALUES (?, ?, ?) ON CONFLICT (email) DO UPDATE SET code = excluded.code, expiresAt = excluded.expiresAt',
      [email, code, expiresAt]
    );

    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@koral.com';
    const fromName = process.env.SMTP_FROM_NAME || 'koral';
    const subject = '[koral] 이메일 인증 코드';
    const text = `koral에 가입해 주셔서 감사합니다!\n\n인증 코드: ${code}\n\n이 코드는 5분간 유효합니다.`;

    console.log(`[DEBUG] Attempting to send email to ${email} from ${fromName} <${fromAddress}>`);

    if (process.env.SMTP_HOST === 'smtp.sendgrid.net') {
      console.log(`[DEBUG] Using SendGrid HTTP API`);
      await sgMail.send({
        to: email,
        from: `"${fromName}" <${fromAddress}>`,
        subject,
        text
      });
    } else {
      console.log(`[DEBUG] Attempting to connect to SMTP: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
      await transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: email,
        subject,
        text
      });
    }

    res.json({ message: 'Verification code sent.' });
  } catch (err) {
    console.error('Error sending email:', err);
    if (err.response) {
      console.error(err.response.body);
    }
    res.status(500).json({ error: 'Failed to send verification email.' });
  }
});
app.post('/api/auth/register', async (req, res) => {
  const { handle, displayName, email, password, avatar, verificationCode } = req.body;
  if (!handle || !email || !password || !verificationCode) return res.status(400).json({ error: 'Missing fields' });
  
  try {
    const vc = await db.getAsync('SELECT * FROM verification_codes WHERE email = ?', [email]);
    if (!vc || vc.code !== verificationCode) return res.status(400).json({ error: '인증코드가 올바르지 않거나 발송되지 않았습니다.' });
    if (new Date(vc.expiresAt) < new Date()) return res.status(400).json({ error: '인증코드가 만료되었습니다.' });
    
    await db.runAsync('DELETE FROM verification_codes WHERE email = ?', [email]);

    const existing = await db.getAsync('SELECT * FROM users WHERE handle = ? OR email = ?', [handle, email]);
    if (existing) return res.status(400).json({ error: 'Handle or email already in use.' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uid();
    const joinedAt = new Date().toISOString();
    
    await db.runAsync(
      'INSERT INTO users (id, handle, displayName, email, password, avatar, joinedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, handle, displayName, email, hashedPassword, avatar, joinedAt]
    );
    
    const token = jwt.sign({ handle, id: userId }, JWT_SECRET, { expiresIn: '7d' });
    const user = { id: userId, handle, displayName, email, avatar, joinedAt, followers: [], following: [], settings: {} };
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  let { handleOrEmail, password } = req.body;
  
  // Create a version with @ and without @ to be safe
  let handleWithAt = handleOrEmail;
  if (!handleWithAt.startsWith('@') && !handleWithAt.includes('@')) {
    handleWithAt = '@' + handleWithAt;
  }
  
  try {
    const user = await db.getAsync(
      'SELECT * FROM users WHERE handle = ? OR handle = ? OR email = ?', 
      [handleOrEmail, handleWithAt, handleOrEmail]
    );
    if (!user) return res.status(400).json({ error: 'User not found.' });
    
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid password.' });
    
    const followers = await db.allAsync('SELECT follower FROM follows WHERE following = ?', [user.handle]);
    const following = await db.allAsync('SELECT following FROM follows WHERE follower = ?', [user.handle]);
    
    user.followers = followers.map(f => f.follower);
    user.following = following.map(f => f.following);
    delete user.password;
    if (user.settings) {
      try { user.settings = JSON.parse(user.settings); } catch(e) { user.settings = {}; }
    } else {
      user.settings = {};
    }
    
    const token = jwt.sign({ handle: user.handle, id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Upload Route ---
app.post('/api/upload', verifyToken, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.post('/api/upload-base64', verifyToken, (req, res) => {
  const { dataUrl } = req.body;
  if (!dataUrl) return res.status(400).json({ error: 'No dataUrl provided' });
  
  const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (matches.length !== 3) return res.status(400).json({ error: 'Invalid base64 string' });
  
  const ext = matches[1].split('/')[1];
  const data = Buffer.from(matches[2], 'base64');
  const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.' + ext;
  const filepath = path.join(uploadDir, filename);
  
  fs.writeFileSync(filepath, data);
  res.json({ url: `/uploads/${filename}` });
});

// --- User Routes ---
app.get('/api/users/me', verifyToken, async (req, res) => {
  try {
    const user = await db.getAsync('SELECT * FROM users WHERE handle = ?', [req.user.handle]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const followers = await db.allAsync('SELECT follower FROM follows WHERE following = ?', [user.handle]);
    const following = await db.allAsync('SELECT following FROM follows WHERE follower = ?', [user.handle]);
    
    user.followers = followers.map(f => f.follower);
    user.following = following.map(f => f.following);
    delete user.password;
    if (user.settings) {
      try { user.settings = JSON.parse(user.settings); } catch(e) { user.settings = {}; }
    } else {
      user.settings = {};
    }
    
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/me', verifyToken, async (req, res) => {
  const { displayName, bio, website, avatar } = req.body;
  try {
    await db.runAsync(
      'UPDATE users SET displayName = ?, bio = ?, website = ?, avatar = ? WHERE handle = ?',
      [displayName, bio, website, avatar, req.user.handle]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/me/settings', verifyToken, async (req, res) => {
  const { settings } = req.body;
  try {
    const settingsStr = typeof settings === 'string' ? settings : JSON.stringify(settings || {});
    await db.runAsync('UPDATE users SET settings = ? WHERE handle = ?', [settingsStr, req.user.handle]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/me/password', verifyToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  try {
    const user = await db.getAsync('SELECT password FROM users WHERE handle = ?', [req.user.handle]);
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) return res.status(400).json({ error: 'Incorrect old password' });
    
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.runAsync('UPDATE users SET password = ? WHERE handle = ?', [hashed, req.user.handle]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/me/handle', verifyToken, async (req, res) => {
  const { newHandle } = req.body;
  try {
    if (!newHandle || newHandle.length < 3) return res.status(400).json({ error: 'Invalid handle' });
    const existing = await db.getAsync('SELECT id FROM users WHERE handle = ?', [newHandle]);
    if (existing) return res.status(400).json({ error: 'Handle already taken' });
    
    await db.runAsync('UPDATE users SET handle = ? WHERE handle = ?', [newHandle, req.user.handle]);
    await db.runAsync('UPDATE posts SET authorHandle = ? WHERE authorHandle = ?', [newHandle, req.user.handle]);
    await db.runAsync('UPDATE comments SET authorHandle = ? WHERE authorHandle = ?', [newHandle, req.user.handle]);
    await db.runAsync('UPDATE post_likes SET handle = ? WHERE handle = ?', [newHandle, req.user.handle]);
    await db.runAsync('UPDATE post_bookmarks SET handle = ? WHERE handle = ?', [newHandle, req.user.handle]);
    await db.runAsync('UPDATE comment_likes SET handle = ? WHERE handle = ?', [newHandle, req.user.handle]);
    await db.runAsync('UPDATE stories SET authorHandle = ? WHERE authorHandle = ?', [newHandle, req.user.handle]);
    await db.runAsync('UPDATE story_likes SET handle = ? WHERE handle = ?', [newHandle, req.user.handle]);
    await db.runAsync('UPDATE story_views SET handle = ? WHERE handle = ?', [newHandle, req.user.handle]);
    await db.runAsync('UPDATE follows SET follower = ? WHERE follower = ?', [newHandle, req.user.handle]);
    await db.runAsync('UPDATE follows SET following = ? WHERE following = ?', [newHandle, req.user.handle]);
    await db.runAsync('UPDATE notifications SET fromHandle = ? WHERE fromHandle = ?', [newHandle, req.user.handle]);
    await db.runAsync('UPDATE notifications SET toHandle = ? WHERE toHandle = ?', [newHandle, req.user.handle]);
    await db.runAsync('UPDATE drafts SET authorHandle = ? WHERE authorHandle = ?', [newHandle, req.user.handle]);
    
    const token = jwt.sign({ handle: newHandle, id: req.user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, newHandle });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/me', verifyToken, async (req, res) => {
  try {
    const handle = req.user.handle;
    await db.runAsync('DELETE FROM users WHERE handle = ?', [handle]);
    await db.runAsync('DELETE FROM posts WHERE authorHandle = ?', [handle]);
    await db.runAsync('DELETE FROM comments WHERE authorHandle = ?', [handle]);
    await db.runAsync('DELETE FROM post_likes WHERE handle = ?', [handle]);
    await db.runAsync('DELETE FROM post_bookmarks WHERE handle = ?', [handle]);
    await db.runAsync('DELETE FROM comment_likes WHERE handle = ?', [handle]);
    await db.runAsync('DELETE FROM stories WHERE authorHandle = ?', [handle]);
    await db.runAsync('DELETE FROM story_likes WHERE handle = ?', [handle]);
    await db.runAsync('DELETE FROM story_views WHERE handle = ?', [handle]);
    await db.runAsync('DELETE FROM follows WHERE follower = ? OR following = ?', [handle, handle]);
    await db.runAsync('DELETE FROM notifications WHERE fromHandle = ? OR toHandle = ?', [handle, handle]);
    await db.runAsync('DELETE FROM drafts WHERE authorHandle = ?', [handle]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await db.allAsync('SELECT id, handle, displayName, avatar, bio, website, verified, settings FROM users');
    for (const u of users) {
      const followers = await db.allAsync('SELECT follower FROM follows WHERE following = ?', [u.handle]);
      const following = await db.allAsync('SELECT following FROM follows WHERE follower = ?', [u.handle]);
      u.followers = followers.map(f => f.follower);
      u.following = following.map(f => f.following);
      if (u.settings) {
        try { u.settings = JSON.parse(u.settings); } catch(e) { u.settings = {}; }
      } else {
        u.settings = {};
      }
    }
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/settings', verifyToken, async (req, res) => {
  const { settings } = req.body;
  try {
    await db.runAsync('UPDATE users SET settings = ? WHERE handle = ?', [JSON.stringify(settings), req.user.handle]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/follow', verifyToken, async (req, res) => {
  const { handle } = req.body;
  const myHandle = req.user.handle;
  if (handle === myHandle) return res.status(400).json({ error: 'Cannot follow yourself' });
  
  try {
    const exists = await db.getAsync('SELECT * FROM follows WHERE follower = ? AND following = ?', [myHandle, handle]);
    if (exists) {
      await db.runAsync('DELETE FROM follows WHERE follower = ? AND following = ?', [myHandle, handle]);
      res.json({ following: false });
    } else {
      await db.runAsync('INSERT INTO follows (follower, following, createdAt) VALUES (?, ?, ?)', [myHandle, handle, new Date().toISOString()]);
      await db.runAsync('INSERT INTO notifications (id, type, fromHandle, toHandle, createdAt) VALUES (?, ?, ?, ?, ?)', [uid(), 'follow', myHandle, handle, new Date().toISOString()]);
      res.json({ following: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Post Routes ---
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await db.allAsync('SELECT * FROM posts ORDER BY createdAt DESC');
    for (const post of posts) {
      post.images = JSON.parse(post.images || '[]');
      post.tags = JSON.parse(post.tags || '[]');
      const likes = await db.allAsync('SELECT handle FROM post_likes WHERE postId = ?', [post.id]);
      post.likes = likes.map(l => l.handle);
      const bookmarks = await db.allAsync('SELECT handle FROM post_bookmarks WHERE postId = ?', [post.id]);
      post.bookmarks = bookmarks.map(b => b.handle);
    }
    res.json({ posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts', verifyToken, async (req, res) => {
  const { title, images, caption, tags, location } = req.body;
  const id = uid();
  const createdAt = new Date().toISOString();
  
  try {
    await db.runAsync(
      'INSERT INTO posts (id, title, authorHandle, images, caption, tags, location, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, req.user.handle, JSON.stringify(images || []), caption, JSON.stringify(tags || []), location, createdAt]
    );
    res.json({ id, title, authorHandle: req.user.handle, images: images || [], caption, tags: tags || [], location, createdAt, likes: [], bookmarks: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/posts/:id', verifyToken, async (req, res) => {
  const { caption, tags } = req.body;
  try {
    const post = await db.getAsync('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.authorHandle !== req.user.handle) return res.status(403).json({ error: 'Unauthorized' });
    
    await db.runAsync('UPDATE posts SET caption = ?, tags = ? WHERE id = ?', [caption, JSON.stringify(tags || []), req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/posts/:id', verifyToken, async (req, res) => {
  try {
    const post = await db.getAsync('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.authorHandle !== req.user.handle) return res.status(403).json({ error: 'Unauthorized' });
    
    await db.runAsync('DELETE FROM posts WHERE id = ?', [req.params.id]);
    await db.runAsync('DELETE FROM comments WHERE postId = ?', [req.params.id]);
    await db.runAsync('DELETE FROM post_likes WHERE postId = ?', [req.params.id]);
    await db.runAsync('DELETE FROM post_bookmarks WHERE postId = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts/:id/like', verifyToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const handle = req.user.handle;
    const exists = await db.getAsync('SELECT * FROM post_likes WHERE postId = ? AND handle = ?', [postId, handle]);
    
    if (exists) {
      await db.runAsync('DELETE FROM post_likes WHERE postId = ? AND handle = ?', [postId, handle]);
      res.json({ liked: false });
    } else {
      await db.runAsync('INSERT INTO post_likes (postId, handle) VALUES (?, ?)', [postId, handle]);
      const post = await db.getAsync('SELECT authorHandle FROM posts WHERE id = ?', [postId]);
      if (post && post.authorHandle !== handle) {
        await db.runAsync('INSERT INTO notifications (id, type, fromHandle, toHandle, postId, createdAt) VALUES (?, ?, ?, ?, ?, ?)', [uid(), 'like', handle, post.authorHandle, postId, new Date().toISOString()]);
      }
      res.json({ liked: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts/:id/bookmark', verifyToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const handle = req.user.handle;
    const exists = await db.getAsync('SELECT * FROM post_bookmarks WHERE postId = ? AND handle = ?', [postId, handle]);
    
    if (exists) {
      await db.runAsync('DELETE FROM post_bookmarks WHERE postId = ? AND handle = ?', [postId, handle]);
      res.json({ bookmarked: false });
    } else {
      await db.runAsync('INSERT INTO post_bookmarks (postId, handle) VALUES (?, ?)', [postId, handle]);
      res.json({ bookmarked: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Comment Routes ---
app.get('/api/comments', async (req, res) => {
  try {
    const comments = await db.allAsync('SELECT * FROM comments ORDER BY createdAt ASC');
    for (const comment of comments) {
      const likes = await db.allAsync('SELECT handle FROM comment_likes WHERE commentId = ?', [comment.id]);
      comment.likes = likes.map(l => l.handle);
    }
    res.json({ comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/comments', verifyToken, async (req, res) => {
  const { postId, parentId, text } = req.body;
  const id = uid();
  const createdAt = new Date().toISOString();
  
  try {
    await db.runAsync(
      'INSERT INTO comments (id, postId, parentId, authorHandle, text, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [id, postId, parentId, req.user.handle, text, createdAt]
    );
    const post = await db.getAsync('SELECT authorHandle FROM posts WHERE id = ?', [postId]);
    if (post && post.authorHandle !== req.user.handle) {
      await db.runAsync('INSERT INTO notifications (id, type, fromHandle, toHandle, postId, createdAt) VALUES (?, ?, ?, ?, ?, ?)', [uid(), 'comment', req.user.handle, post.authorHandle, postId, new Date().toISOString()]);
    }
    res.json({ id, postId, parentId, authorHandle: req.user.handle, text, createdAt, likes: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/comments/:id', verifyToken, async (req, res) => {
  const { text } = req.body;
  try {
    const comment = await db.getAsync('SELECT * FROM comments WHERE id = ?', [req.params.id]);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.authorHandle !== req.user.handle) return res.status(403).json({ error: 'Unauthorized' });
    
    await db.runAsync('UPDATE comments SET text = ? WHERE id = ?', [text, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/comments/:id', verifyToken, async (req, res) => {
  try {
    const comment = await db.getAsync('SELECT * FROM comments WHERE id = ?', [req.params.id]);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.authorHandle !== req.user.handle) return res.status(403).json({ error: 'Unauthorized' });
    
    await db.runAsync('DELETE FROM comments WHERE id = ?', [req.params.id]);
    await db.runAsync('DELETE FROM comments WHERE parentId = ?', [req.params.id]);
    await db.runAsync('DELETE FROM comment_likes WHERE commentId = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/comments/:id/like', verifyToken, async (req, res) => {
  try {
    const commentId = req.params.id;
    const handle = req.user.handle;
    const exists = await db.getAsync('SELECT * FROM comment_likes WHERE commentId = ? AND handle = ?', [commentId, handle]);
    
    if (exists) {
      await db.runAsync('DELETE FROM comment_likes WHERE commentId = ? AND handle = ?', [commentId, handle]);
      res.json({ liked: false });
    } else {
      await db.runAsync('INSERT INTO comment_likes (commentId, handle) VALUES (?, ?)', [commentId, handle]);
      res.json({ liked: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Stories Routes ---
app.get('/api/stories', async (req, res) => {
  try {
    const stories = await db.allAsync('SELECT * FROM stories');
    for (const story of stories) {
      story.layers = JSON.parse(story.layers || '[]');
      const likes = await db.allAsync('SELECT handle FROM story_likes WHERE storyId = ?', [story.id]);
      story.likes = likes.map(l => l.handle);
      const views = await db.allAsync('SELECT handle FROM story_views WHERE storyId = ?', [story.id]);
      story.viewers = views.map(v => v.handle);
    }
    res.json({ stories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stories', verifyToken, async (req, res) => {
  const { layers } = req.body;
  const id = uid();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString();
  
  try {
    await db.runAsync(
      'INSERT INTO stories (id, authorHandle, layers, createdAt, expiresAt) VALUES (?, ?, ?, ?, ?)',
      [id, req.user.handle, JSON.stringify(layers || []), createdAt.toISOString(), expiresAt]
    );
    res.json({ id, authorHandle: req.user.handle, layers: layers || [], createdAt: createdAt.toISOString(), expiresAt, likes: [], viewers: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/stories/:id', verifyToken, async (req, res) => {
  try {
    const story = await db.getAsync('SELECT * FROM stories WHERE id = ?', [req.params.id]);
    if (!story) return res.status(404).json({ error: 'Story not found' });
    if (story.authorHandle !== req.user.handle) return res.status(403).json({ error: 'Unauthorized' });
    
    await db.runAsync('DELETE FROM stories WHERE id = ?', [req.params.id]);
    await db.runAsync('DELETE FROM story_likes WHERE storyId = ?', [req.params.id]);
    await db.runAsync('DELETE FROM story_views WHERE storyId = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stories/:id/view', verifyToken, async (req, res) => {
  try {
    await db.runAsync('INSERT INTO story_views (storyId, handle) VALUES (?, ?) ON CONFLICT DO NOTHING', [req.params.id, req.user.handle]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stories/:id/like', verifyToken, async (req, res) => {
  try {
    const storyId = req.params.id;
    const handle = req.user.handle;
    const exists = await db.getAsync('SELECT * FROM story_likes WHERE storyId = ? AND handle = ?', [storyId, handle]);
    
    if (exists) {
      await db.runAsync('DELETE FROM story_likes WHERE storyId = ? AND handle = ?', [storyId, handle]);
      res.json({ liked: false });
    } else {
      await db.runAsync('INSERT INTO story_likes (storyId, handle) VALUES (?, ?)', [storyId, handle]);
      const story = await db.getAsync('SELECT authorHandle FROM stories WHERE id = ?', [storyId]);
      if (story && story.authorHandle !== handle) {
        await db.runAsync('INSERT INTO notifications (id, type, fromHandle, toHandle, createdAt) VALUES (?, ?, ?, ?, ?)', [uid(), 'like', handle, story.authorHandle, new Date().toISOString()]);
      }
      res.json({ liked: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Notifications ---
app.get('/api/notifications', verifyToken, async (req, res) => {
  try {
    const notifications = await db.allAsync('SELECT * FROM notifications WHERE toHandle = ? ORDER BY createdAt DESC', [req.user.handle]);
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/read', verifyToken, async (req, res) => {
  try {
    const { id } = req.body; // if id is provided, read one, else all
    if (id) {
      await db.runAsync('UPDATE notifications SET read = 1 WHERE id = ? AND toHandle = ?', [id, req.user.handle]);
    } else {
      await db.runAsync('UPDATE notifications SET read = 1 WHERE toHandle = ?', [req.user.handle]);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Drafts ---
app.get('/api/drafts', verifyToken, async (req, res) => {
  try {
    const drafts = await db.allAsync('SELECT * FROM drafts WHERE authorHandle = ? ORDER BY updatedAt DESC', [req.user.handle]);
    for (const d of drafts) d.data = JSON.parse(d.data);
    res.json({ drafts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/drafts', verifyToken, async (req, res) => {
  const { id, type, data } = req.body;
  const draftId = id || uid();
  const now = new Date().toISOString();
  try {
    const existing = await db.getAsync('SELECT * FROM drafts WHERE id = ?', [draftId]);
    if (existing) {
      await db.runAsync('UPDATE drafts SET data = ?, updatedAt = ? WHERE id = ?', [JSON.stringify(data), now, draftId]);
    } else {
      await db.runAsync('INSERT INTO drafts (id, type, authorHandle, data, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)', [draftId, type, req.user.handle, JSON.stringify(data), now, now]);
    }
    res.json({ id: draftId, type, data, updatedAt: now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/drafts/:id', verifyToken, async (req, res) => {
  try {
    await db.runAsync('DELETE FROM drafts WHERE id = ? AND authorHandle = ?', [req.params.id, req.user.handle]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SPA Fallback
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    next();
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
