import { uid, getInitials, generateGradientAvatar, generatePlaceholderImage } from './utils.js';

const DB_NAME = 'koral_db';
const STORE_NAME = 'koral_store';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function idbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function idbSet(key, val) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(val, key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

class Store {
  constructor() {
    this.state = {
      currentUser: null,
      users: [],
      posts: [],
      comments: [],
      notifications: [],
      stories: [],
      theme: 'system'
    };
    this.subscribers = new Set();
  }

  async init() {
    try {
      let saved = await idbGet('koral_data_v2');
      
      // Migrate from localStorage if no data in IDB yet
      if (!saved) {
        const localSaved = localStorage.getItem('koral_data_v2');
        if (localSaved) {
          saved = JSON.parse(localSaved);
          await idbSet('koral_data_v2', saved);
          localStorage.removeItem('koral_data_v2'); // Cleanup migrated data
        }
      }

      if (saved) {
        this.state = saved;
        
        // Ensure core arrays exist
        if (!this.state.users) this.state.users = [];
        if (!this.state.posts) this.state.posts = [];
        if (!this.state.comments) this.state.comments = [];
        if (!this.state.notifications) this.state.notifications = [];
        if (!this.state.stories) this.state.stories = [];
        if (!this.state.drafts) this.state.drafts = [];
        
        // Sanitize data to prevent crashes
        this.state.posts.forEach(p => {
          if (!p.likes) p.likes = [];
          if (!p.bookmarks) p.bookmarks = [];
          if (!p.tags) p.tags = [];
        });
        
        this.state.stories.forEach(s => {
          if (!s.likes) s.likes = [];
          if (!s.viewers) s.viewers = [];
        });
        
        this.applyTheme(this.state.theme);
      } else {
        this._seedData();
      }
    } catch (e) {
      console.error('Failed to load store', e);
      this._seedData();
    }
  }

  getState() {
    return this.state;
  }

  subscribe(fn) {
    this.subscribers.add(fn);
    fn(this.state);
    return () => this.subscribers.delete(fn);
  }

  _notify() {
    this.subscribers.forEach(fn => fn(this.state));
    this._save();
  }

  async _save() {
    try {
      await idbSet('koral_data_v2', this.state);
    } catch (e) {
      console.error('Failed to save to IndexedDB', e);
    }
  }

  _seedData() {
    const defaultTheme = this.state ? this.state.theme : 'system';
    
    this.state = {
      currentUser: null,
      users: [],
      posts: [],
      comments: [],
      notifications: [],
      stories: [],
      theme: defaultTheme
    };
    
    this.applyTheme(this.state.theme);
    this._save();
  }

  // Auth
  register({ handle, displayName, email, password, avatar }) {
    if (!handle.startsWith('@')) return { ok: false, error: '핸들은 @로 시작해야 합니다.' };
    if (this.state.users.find(u => u.handle.toLowerCase() === handle.toLowerCase())) return { ok: false, error: '이미 사용 중인 핸들입니다.' };
    if (handle.length < 3 || handle.length > 20) return { ok: false, error: '핸들은 3~20자여야 합니다.' };
    
    // 비밀번호 정규식 검사 (8~20자, 영어, 숫자, 일부 특수문자 포함)
    const pwRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*?_~])[a-zA-Z\d!@#$%^&*?_~]{8,20}$/;
    if (!pwRegex.test(password)) return { ok: false, error: '비밀번호는 8~20자 영문, 숫자, 특수문자(!@#$%^&*?_~)를 포함해야 합니다.' };
    
    const user = {
      id: uid(), handle, displayName, email, password,
      avatar: avatar || generateGradientAvatar(getInitials(displayName)),
      bio: '', website: '', joinedAt: new Date().toISOString(), verified: false,
      following: [], followers: []
    };
    this.state.users.push(user);
    this.state.currentUser = user;
    this._notify();
    return { ok: true, user };
  }

  login(handleOrEmail, password) {
    const isEmail = handleOrEmail.includes('@') && handleOrEmail.includes('.');
    let queryHandle = handleOrEmail;
    if (!isEmail && !queryHandle.startsWith('@')) {
      queryHandle = '@' + queryHandle;
    }
    
    const user = this.state.users.find(u => 
      (u.handle.toLowerCase() === queryHandle.toLowerCase() || 
       u.handle.toLowerCase() === handleOrEmail.toLowerCase() || 
       u.email.toLowerCase() === handleOrEmail.toLowerCase()) && 
      u.password === password
    );
    if (user) {
      this.state.currentUser = user;
      this._notify();
      return { ok: true, user };
    }
    return { ok: false, error: '이메일(핸들) 또는 비밀번호가 일치하지 않습니다.' };
  }

  logout() {
    this.state.currentUser = null;
    this._notify();
  }

  updateProfile(updates) {
    if (!this.state.currentUser) return;
    const userIndex = this.state.users.findIndex(u => u.handle === this.state.currentUser.handle);
    if (userIndex !== -1) {
      this.state.users[userIndex] = { ...this.state.users[userIndex], ...updates };
      this.state.currentUser = this.state.users[userIndex];
      this._notify();
    }
  }

  changePassword(currentPw, newPw) {
    if (!this.state.currentUser) return { ok: false };
    if (this.state.currentUser.password !== currentPw) return { ok: false, error: '현재 비밀번호가 일치하지 않습니다.' };
    const pwRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*?_~])[a-zA-Z\d!@#$%^&*?_~]{8,20}$/;
    if (!pwRegex.test(newPw)) return { ok: false, error: '비밀번호는 8~20자 영문, 숫자, 특수문자를 포함해야 합니다.' };
    
    const userIndex = this.state.users.findIndex(u => u.handle === this.state.currentUser.handle);
    this.state.users[userIndex].password = newPw;
    this.state.currentUser.password = newPw;
    this._save();
    return { ok: true };
  }

  deleteAccount(password) {
    if (!this.state.currentUser) return { ok: false };
    if (this.state.currentUser.password !== password) return { ok: false, error: '현재 비밀번호가 일치하지 않습니다.' };
    
    const handle = this.state.currentUser.handle;
    const userIndex = this.state.users.findIndex(u => u.handle === handle);
    if (userIndex !== -1) {
      this.state.users.splice(userIndex, 1);
    }
    
    // Cleanup their data
    this.state.posts = this.state.posts.filter(p => p.authorHandle !== handle);
    this.state.posts.forEach(p => {
      p.likes = p.likes.filter(l => l !== handle);
      p.bookmarks = p.bookmarks.filter(b => b !== handle);
    });
    this.state.comments = this.state.comments.filter(c => c.authorHandle !== handle);
    this.state.notifications = this.state.notifications.filter(n => n.toHandle !== handle && n.fromHandle !== handle);
    this.state.stories = this.state.stories.filter(s => s.authorHandle !== handle);
    if (this.state.drafts) {
      this.state.drafts = this.state.drafts.filter(d => d.authorHandle !== handle);
    }
    this.state.users.forEach(u => {
      u.following = u.following.filter(f => f !== handle);
      u.followers = u.followers.filter(f => f !== handle);
    });
    
    this.state.currentUser = null;
    this._save();
    this._notify();
    return { ok: true };
  }

  changeHandle(currentPw, newHandle) {
    if (!this.state.currentUser) return { ok: false };
    if (this.state.currentUser.password !== currentPw) return { ok: false, error: '현재 비밀번호가 일치하지 않습니다.' };
    if (!newHandle.startsWith('@')) newHandle = '@' + newHandle;
    
    if (this.state.users.find(u => u.handle.toLowerCase() === newHandle.toLowerCase() && u.id !== this.state.currentUser.id)) {
      return { ok: false, error: '이미 사용 중인 핸들입니다.' };
    }
    
    const oldHandle = this.state.currentUser.handle;
    const userIndex = this.state.users.findIndex(u => u.handle === oldHandle);
    
    // Update all references in posts, comments, notifications, follows
    this.state.users[userIndex].handle = newHandle;
    this.state.currentUser.handle = newHandle;
    
    this.state.posts.forEach(p => {
      if (p.authorHandle === oldHandle) p.authorHandle = newHandle;
      const lIdx = p.likes.indexOf(oldHandle);
      if (lIdx !== -1) p.likes[lIdx] = newHandle;
      const bIdx = p.bookmarks.indexOf(oldHandle);
      if (bIdx !== -1) p.bookmarks[bIdx] = newHandle;
    });
    
    this.state.comments.forEach(c => {
      if (c.authorHandle === oldHandle) c.authorHandle = newHandle;
    });
    
    this.state.notifications.forEach(n => {
      if (n.fromHandle === oldHandle) n.fromHandle = newHandle;
      if (n.toHandle === oldHandle) n.toHandle = newHandle;
    });
    
    this.state.users.forEach(u => {
      const fIdx = u.following.indexOf(oldHandle);
      if (fIdx !== -1) u.following[fIdx] = newHandle;
      const erIdx = u.followers.indexOf(oldHandle);
      if (erIdx !== -1) u.followers[erIdx] = newHandle;
    });

    this._notify();
    return { ok: true, newHandle };
  }

  getUser(handle) {
    return this.state.users.find(u => u.handle === handle) || null;
  }

  searchUsers(query) {
    if (!query) return [];
    const q = query.toLowerCase();
    return this.state.users.filter(u => 
      u.handle.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q)
    );
  }

  // Posts
  createPost({ title, images, caption, tags, location }) {
    if (!this.state.currentUser) return null;
    const post = {
      id: uid(),
      title: title || '',
      authorHandle: this.state.currentUser.handle,
      images, caption, tags, location,
      likes: [], bookmarks: [],
      createdAt: new Date().toISOString()
    };
    this.state.posts.unshift(post);
    this._notify();
    return post;
  }

  deletePost(postId) {
    this.state.posts = this.state.posts.filter(p => p.id !== postId);
    this.state.comments = this.state.comments.filter(c => c.postId !== postId);
    this._notify();
  }

  editPost(postId, caption, tags) {
    const post = this.state.posts.find(p => p.id === postId);
    if (post && post.authorHandle === this.state.currentUser?.handle) {
      post.caption = caption;
      post.tags = tags;
      this._notify();
    }
  }

  toggleLike(postId) {
    if (!this.state.currentUser) return false;
    const post = this.state.posts.find(p => p.id === postId);
    if (!post) return false;
    
    const handle = this.state.currentUser.handle;
    const idx = post.likes.indexOf(handle);
    let liked = false;
    
    if (idx !== -1) {
      post.likes.splice(idx, 1);
    } else {
      post.likes.push(handle);
      liked = true;
      if (post.authorHandle !== handle) {
        this.addNotification({ type: 'like', fromHandle: handle, toHandle: post.authorHandle, postId });
      }
    }
    this._notify();
    return liked;
  }

  toggleBookmark(postId) {
    if (!this.state.currentUser) return false;
    const post = this.state.posts.find(p => p.id === postId);
    if (!post) return false;
    
    const handle = this.state.currentUser.handle;
    const idx = post.bookmarks.indexOf(handle);
    let bookmarked = false;
    
    if (idx !== -1) {
      post.bookmarks.splice(idx, 1);
    } else {
      post.bookmarks.push(handle);
      bookmarked = true;
    }
    this._notify();
    return bookmarked;
  }

  getPost(postId) {
    return this.state.posts.find(p => p.id === postId) || null;
  }

  getFeed() {
    if (!this.state.currentUser) {
      return [...this.state.posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    const following = this.state.currentUser.following || [];
    const feed = this.state.posts
      .filter(p => following.includes(p.authorHandle) || p.authorHandle === this.state.currentUser.handle)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
    // Fallback: If feed is empty (user follows nobody and has no posts), show all recent posts
    if (feed.length === 0) {
      return [...this.state.posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return feed;
  }

  getExplorePosts() {
    return [...this.state.posts].sort((a, b) => b.likes.length - a.likes.length);
  }

  getUserPosts(handle) {
    return this.state.posts
      .filter(p => p.authorHandle === handle)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  
  getDrafts(handle) {
    if (!this.state.drafts) return [];
    return this.state.drafts
      .filter(d => d.authorHandle === handle)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  }
  
  saveDraft(type, data, draftId = null) {
    if (!this.state.currentUser) return null;
    this.state.drafts = this.state.drafts || [];
    
    if (draftId) {
      const draft = this.state.drafts.find(d => d.id === draftId);
      if (draft && draft.authorHandle === this.state.currentUser.handle) {
        draft.data = data;
        draft.updatedAt = new Date().toISOString();
        this._notify();
        return draft;
      }
    }
    
    const newDraft = {
      id: uid(),
      type, // 'post' or 'story'
      authorHandle: this.state.currentUser.handle,
      data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.state.drafts.push(newDraft);
    this._notify();
    return newDraft;
  }
  
  getDraft(draftId) {
    if (!this.state.drafts) return null;
    return this.state.drafts.find(d => d.id === draftId);
  }
  
  deleteDraft(draftId) {
    if (!this.state.drafts) return;
    const initialLength = this.state.drafts.length;
    this.state.drafts = this.state.drafts.filter(d => d.id !== draftId);
    if (this.state.drafts.length !== initialLength) {
      this._notify();
    }
  }

  getPostsByTag(tag) {
    return this.state.posts
      .filter(p => p.tags.includes(tag))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Comments
  toggleCommentLike(commentId) {
    if (!this.state.currentUser) return false;
    const comment = this.state.comments.find(c => c.id === commentId);
    if (!comment) return false;
    
    const handle = this.state.currentUser.handle;
    comment.likes = comment.likes || [];
    const idx = comment.likes.indexOf(handle);
    let liked = false;
    
    if (idx !== -1) {
      comment.likes.splice(idx, 1);
    } else {
      comment.likes.push(handle);
      liked = true;
    }
    this._notify();
    return liked;
  }

  addComment({ postId, parentId, text }) {
    if (!this.state.currentUser) return null;
    const comment = {
      id: uid(), postId, parentId,
      authorHandle: this.state.currentUser.handle,
      text, likes: [],
      createdAt: new Date().toISOString(), editedAt: null
    };
    this.state.comments.push(comment);
    
    const post = this.getPost(postId);
    if (post && post.authorHandle !== this.state.currentUser.handle) {
      this.addNotification({ type: 'comment', fromHandle: this.state.currentUser.handle, toHandle: post.authorHandle, postId });
    }
    
    this._notify();
    return comment;
  }

  deleteComment(commentId) {
    this.state.comments = this.state.comments.filter(c => c.id !== commentId && c.parentId !== commentId);
    this._notify();
  }

  editComment(commentId, newText) {
    const comment = this.state.comments.find(c => c.id === commentId);
    if (comment && comment.authorHandle === this.state.currentUser?.handle) {
      comment.text = newText;
      comment.editedAt = new Date().toISOString();
      this._notify();
    }
  }

  getPostComments(postId) {
    return this.state.comments
      .filter(c => c.postId === postId && !c.parentId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  getCommentReplies(commentId) {
    return this.state.comments
      .filter(c => c.parentId === commentId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  // Social
  toggleFollow(handle) {
    if (!this.state.currentUser) return false;
    const myHandle = this.state.currentUser.handle;
    if (myHandle === handle) return false;

    const me = this.state.users.find(u => u.handle === myHandle);
    const them = this.state.users.find(u => u.handle === handle);
    if (!me || !them) return false;

    me.following = me.following || [];
    them.followers = them.followers || [];

    const idx = me.following.indexOf(handle);
    let following = false;
    
    if (idx !== -1) {
      me.following.splice(idx, 1);
      them.followers = them.followers.filter(h => h !== myHandle);
    } else {
      me.following.push(handle);
      them.followers.push(myHandle);
      following = true;
      this.addNotification({ type: 'follow', fromHandle: myHandle, toHandle: handle, postId: null });
    }
    this.state.currentUser = me;
    this._notify();
    return following;
  }

  isFollowing(handle) {
    if (!this.state.currentUser) return false;
    return (this.state.currentUser.following || []).includes(handle);
  }

  getFollowers(handle) {
    const user = this.getUser(handle);
    return user ? (user.followers || []) : [];
  }

  getFollowing(handle) {
    const user = this.getUser(handle);
    return user ? (user.following || []) : [];
  }

  getSuggestedUsers() {
    if (!this.state.currentUser) return [];
    const myHandle = this.state.currentUser.handle;
    const following = this.state.currentUser.following || [];
    return this.state.users
      .filter(u => u.handle !== myHandle && !following.includes(u.handle))
      .slice(0, 5);
  }

  // Notifications
  addNotification({ type, fromHandle, toHandle, postId }) {
    if (fromHandle === toHandle) return;
    const notif = {
      id: uid(), type, fromHandle, toHandle, postId,
      read: false, createdAt: new Date().toISOString()
    };
    this.state.notifications.unshift(notif);
    this._save(); // don't trigger full notify for background events
  }

  getNotifications() {
    if (!this.state.currentUser) return [];
    return this.state.notifications
      .filter(n => n.toHandle === this.state.currentUser.handle)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  markRead(notifId) {
    const notif = this.state.notifications.find(n => n.id === notifId);
    if (notif) {
      notif.read = true;
      this._notify();
    }
  }

  markAllRead() {
    if (!this.state.currentUser) return;
    const myHandle = this.state.currentUser.handle;
    let changed = false;
    this.state.notifications.forEach(n => {
      if (n.toHandle === myHandle && !n.read) {
        n.read = true;
        changed = true;
      }
    });
    if (changed) this._notify();
  }

  getUnreadCount() {
    if (!this.state.currentUser) return 0;
    return this.state.notifications.filter(n => n.toHandle === this.state.currentUser.handle && !n.read).length;
  }

  // --- Stories ---
  addStory(layers) {
    if (!this.state.currentUser) return null;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours later
    const story = {
      id: uid(),
      authorHandle: this.state.currentUser.handle,
      layers: layers || [],
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      viewers: [],
      likes: []
    };
    this.state.stories.push(story);
    this._notify();
    return story;
  }

  toggleStoryLike(storyId) {
    if (!this.state.currentUser) return false;
    const story = this.state.stories.find(s => s.id === storyId);
    if (!story) return false;
    
    story.likes = story.likes || [];
    const handle = this.state.currentUser.handle;
    const idx = story.likes.indexOf(handle);
    let liked = false;
    
    if (idx !== -1) {
      story.likes.splice(idx, 1);
    } else {
      story.likes.push(handle);
      liked = true;
      if (story.authorHandle !== handle) {
        this.addNotification({ type: 'like', fromHandle: handle, toHandle: story.authorHandle, postId: null });
      }
    }
    this._notify();
    return liked;
  }

  getGroupedStories() {
    const now = new Date().getTime();
    
    // 1. Filter active stories
    const activeStories = this.state.stories.filter(s => new Date(s.expiresAt).getTime() > now);
    
    // 2. Group by author
    const map = new Map();
    activeStories.forEach(s => {
      if (!map.has(s.authorHandle)) map.set(s.authorHandle, []);
      map.get(s.authorHandle).push(s);
    });
    
    // 3. Format result and sort stories by time
    const result = [];
    map.forEach((stories, handle) => {
      stories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      result.push({ authorHandle: handle, stories });
    });
    
    // 4. Sort grouped stories so that current user is first, then others by most recent story
    result.sort((a, b) => {
      if (this.state.currentUser) {
        if (a.authorHandle === this.state.currentUser.handle) return -1;
        if (b.authorHandle === this.state.currentUser.handle) return 1;
      }
      const aLatest = new Date(a.stories[a.stories.length - 1].createdAt).getTime();
      const bLatest = new Date(b.stories[b.stories.length - 1].createdAt).getTime();
      return bLatest - aLatest;
    });
    
    return result;
  }

  markStoryViewed(storyId) {
    if (!this.state.currentUser) return;
    const story = this.state.stories.find(s => s.id === storyId);
    if (story && !story.viewers.includes(this.state.currentUser.handle)) {
      story.viewers.push(this.state.currentUser.handle);
      this._save(); // don't full _notify() just for a view update to avoid aggressive re-renders
    }
  }

  // Theme
  setTheme(theme) {
    this.state.theme = theme;
    this.applyTheme(theme);
    this._notify();
  }

  getTheme() {
    return this.state.theme;
  }

  applyTheme(theme) {
    // Remove existing classes starting with 'theme-' to preserve other classes
    Array.from(document.body.classList).forEach(cls => {
      if (cls.startsWith('theme-')) {
        document.body.classList.remove(cls);
      }
    });
    document.body.classList.add(`theme-${theme}`);
  }
}

export const store = new Store();
