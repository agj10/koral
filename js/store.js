import { uid, getInitials, generateGradientAvatar, generatePlaceholderImage } from './utils.js';

class Store {
  constructor() {
    this.state = {
      currentUser: null,
      users: [],
      posts: [],
      comments: [],
      notifications: [],
      theme: 'system'
    };
    this.subscribers = new Set();
    this.init();
  }

  init() {
    const saved = localStorage.getItem('koral_store');
    if (saved) {
      try {
        this.state = JSON.parse(saved);
        
        // Sanitize data to prevent crashes
        if (this.state.posts) {
          this.state.posts.forEach(p => {
            if (!p.likes) p.likes = [];
            if (!p.bookmarks) p.bookmarks = [];
            if (!p.tags) p.tags = [];
          });
        }
        
        this.applyTheme(this.state.theme);
      } catch (e) {
        console.error('Failed to load store', e);
        this._seedData();
      }
    } else {
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

  _save() {
    localStorage.setItem('koral_store', JSON.stringify(this.state));
  }

  _seedData() {
    const defaultTheme = this.state ? this.state.theme : 'system';
    
    this.state = {
      currentUser: null,
      users: [],
      posts: [],
      comments: [],
      notifications: [],
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
    const user = this.state.users.find(u => 
      (u.handle === handleOrEmail || u.email === handleOrEmail) && u.password === password
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
    document.body.className = `theme-${theme}`;
  }
}

export const store = new Store();
