const storage = typeof window !== 'undefined' ? window.localStorage : {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

class Store {
  constructor() {
    this.state = {
      currentUser: null,
      users: [],
      posts: [],
      comments: [],
      notifications: [],
      stories: [],
      drafts: [],
      theme: 'system'
    };
    this.subscribers = new Set();
    this.token = storage.getItem('koral_token') || null;
    this.apiUrl = '/api';
  }

  async api(endpoint, method = 'GET', body = null) {
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    if (body) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${this.apiUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });
    
    let data;
    try {
      data = await res.json();
    } catch(e) {
      if(!res.ok) throw new Error(res.statusText);
      return;
    }
    
    if (!res.ok) throw new Error(data.error || 'API Error');
    return data;
  }

  async init() {
    try {
      this.state.theme = storage.getItem('koral_theme') || 'system';
      this.applyTheme(this.state.theme);
      
      const [usersRes, postsRes, commentsRes, storiesRes] = await Promise.all([
        this.api('/users').catch(()=>({users:[]})),
        this.api('/posts').catch(()=>({posts:[]})),
        this.api('/comments').catch(()=>({comments:[]})),
        this.api('/stories').catch(()=>({stories:[]}))
      ]);
      
      this.state.users = usersRes.users || [];
      this.state.posts = postsRes.posts || [];
      this.state.comments = commentsRes.comments || [];
      this.state.stories = storiesRes.stories || [];
      
      if (this.token) {
        try {
          const meRes = await this.api('/users/me');
          this.state.currentUser = meRes.user;
          this._syncSettings(meRes.user);
          const notifsRes = await this.api('/notifications');
          this.state.notifications = notifsRes.notifications || [];
          const draftsRes = await this.api('/drafts');
          this.state.drafts = draftsRes.drafts || [];
        } catch (e) {
          this.token = null;
          storage.removeItem('koral_token');
        }
      }
      this._notify();
    } catch (e) {
      console.error('Failed to init store', e);
    }
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  _notify() {
    this.subscribers.forEach(cb => cb(this.state));
  }

  async _uploadImage(dataUrl) {
    if (!dataUrl.startsWith('data:')) return dataUrl; // Already a URL
    const res = await this.api('/upload-base64', 'POST', { dataUrl });
    return res.url;
  }

  _syncSettings(user) {
    if (!user || !user.settings) return;
    const settings = user.settings;
    if (settings.theme) {
      this.applyTheme(settings.theme);
    }
    if (settings.language && settings.language !== storage.getItem('koral_language')) {
      storage.setItem('koral_language', settings.language);
      if (typeof window !== 'undefined') {
        setTimeout(() => location.reload(), 100);
      }
    }
  }

  // --- Auth ---
  async login(handleOrEmail, password) {
    try {
      const res = await this.api('/auth/login', 'POST', { handleOrEmail, password });
      this.token = res.token;
      storage.setItem('koral_token', res.token);
      this.state.currentUser = res.user;
      this._syncSettings(res.user);
      
      const saved = JSON.parse(storage.getItem('koral_saved_accounts') || '[]');
      const existingIdx = saved.findIndex(u => u.id === res.user.id);
      if (existingIdx === -1) {
        saved.push({ ...res.user, token: res.token });
      } else {
        saved[existingIdx] = { ...res.user, token: res.token };
      }
      storage.setItem('koral_saved_accounts', JSON.stringify(saved));
      
      const notifsRes = await this.api('/notifications');
      this.state.notifications = notifsRes.notifications || [];
      const draftsRes = await this.api('/drafts');
      this.state.drafts = draftsRes.drafts || [];
      
      this._notify();
      return { ok: true };
    } catch(err) {
      return { ok: false, error: err.message };
    }
  }

  async sendVerificationCode(email) {
    try {
      await this.api('/auth/send-verification', 'POST', { email });
      return { ok: true };
    } catch(err) {
      return { ok: false, error: err.message };
    }
  }

  async register(userData) {
    try {
      let avatarUrl = userData.avatar;
      if (avatarUrl && avatarUrl.startsWith('data:')) {
         avatarUrl = await this._uploadImage(avatarUrl);
      }
      const res = await this.api('/auth/register', 'POST', { ...userData, avatar: avatarUrl });
      this.token = res.token;
      storage.setItem('koral_token', res.token);
      this.state.currentUser = res.user;
      this.state.users.push(res.user);
      
      const saved = JSON.parse(storage.getItem('koral_saved_accounts') || '[]');
      const existingIdx = saved.findIndex(u => u.id === res.user.id);
      if (existingIdx === -1) {
        saved.push({ ...res.user, token: res.token });
      } else {
        saved[existingIdx] = { ...res.user, token: res.token };
      }
      storage.setItem('koral_saved_accounts', JSON.stringify(saved));
      
      this._notify();
      return { ok: true };
    } catch(err) {
      return { ok: false, error: err.message };
    }
  }

  logout() {
    this.token = null;
    storage.removeItem('koral_token');
    this.state.currentUser = null;
    this.state.notifications = [];
    this.state.drafts = [];
    this._notify();
    window.location.reload();
  }

  switchAccount(user) {
    if (user && user.token) {
      storage.setItem('koral_token', user.token);
      this.token = user.token;
      window.location.hash = '';
      window.location.reload();
    } else {
      // Fallback if token is missing (old data)
      storage.removeItem('koral_token');
      window.location.hash = '#login';
      window.location.reload();
    }
  }

  // --- Posts ---
  async createPost(postData) {
    try {
      const uploadedImages = await Promise.all((postData.images || []).map(img => this._uploadImage(img)));
      const res = await this.api('/posts', 'POST', { ...postData, images: uploadedImages });
      this.state.posts.unshift(res);
      this._notify();
      return { ok: true, post: res };
    } catch(err) {
      return { ok: false, error: err.message };
    }
  }

  async deletePost(postId) {
    try {
      await this.api(`/posts/${postId}`, 'DELETE');
      this.state.posts = this.state.posts.filter(p => p.id !== postId);
      this.state.comments = this.state.comments.filter(c => c.postId !== postId);
      this._notify();
    } catch (err) {
      if(typeof window !== 'undefined' && window.showToast) window.showToast('Failed to delete post');
    }
  }

  async editPost(postId, caption, tags) {
    try {
      await this.api(`/posts/${postId}`, 'PUT', { caption, tags });
      const post = this.state.posts.find(p => p.id === postId);
      if (post) {
        post.caption = caption;
        post.tags = tags;
        this._notify();
      }
    } catch (err) {
      if(typeof window !== 'undefined' && window.showToast) window.showToast('Failed to edit post');
    }
  }

  async toggleLike(postId) {
    const post = this.state.posts.find(p => p.id === postId);
    if (!post || !this.state.currentUser) return;
    
    const handle = this.state.currentUser.handle;
    const isLiked = post.likes.includes(handle);
    
    // Optimistic update
    if (isLiked) {
      post.likes = post.likes.filter(h => h !== handle);
    } else {
      post.likes.push(handle);
    }
    this._notify();
    
    try {
      await this.api(`/posts/${postId}/like`, 'POST');
    } catch(err) {
      // Revert on error
      if (isLiked) post.likes.push(handle);
      else post.likes = post.likes.filter(h => h !== handle);
      this._notify();
    }
  }

  async toggleBookmark(postId) {
    const post = this.state.posts.find(p => p.id === postId);
    if (!post || !this.state.currentUser) return;
    
    const handle = this.state.currentUser.handle;
    const isBookmarked = post.bookmarks.includes(handle);
    
    if (isBookmarked) {
      post.bookmarks = post.bookmarks.filter(h => h !== handle);
    } else {
      post.bookmarks.push(handle);
    }
    this._notify();
    
    try {
      await this.api(`/posts/${postId}/bookmark`, 'POST');
    } catch(err) {
      if (isBookmarked) post.bookmarks.push(handle);
      else post.bookmarks = post.bookmarks.filter(h => h !== handle);
      this._notify();
    }
  }

  // --- Comments ---
  async addComment(postIdOrObj, text, parentId = null) {
    // Support both: addComment({ postId, text, parentId }) and addComment(postId, text, parentId)
    let postId = postIdOrObj;
    if (typeof postIdOrObj === 'object') {
      postId = postIdOrObj.postId;
      text = postIdOrObj.text;
      parentId = postIdOrObj.parentId || null;
    }
    try {
      const res = await this.api('/comments', 'POST', { postId, text, parentId });
      this.state.comments.push(res);
      this._notify();
      return { ok: true, comment: res };
    } catch(err) {
      return { ok: false, error: err.message };
    }
  }

  async deleteComment(commentId) {
    try {
      await this.api(`/comments/${commentId}`, 'DELETE');
      this.state.comments = this.state.comments.filter(c => c.id !== commentId && c.parentId !== commentId);
      this._notify();
    } catch (err) {
      if(typeof window !== 'undefined' && window.showToast) window.showToast('Failed to delete comment');
    }
  }

  async editComment(commentId, text) {
    try {
      await this.api(`/comments/${commentId}`, 'PUT', { text });
      const comment = this.state.comments.find(c => c.id === commentId);
      if (comment) {
        comment.text = text;
        this._notify();
      }
    } catch (err) {
      if(typeof window !== 'undefined' && window.showToast) window.showToast('Failed to edit comment');
    }
  }

  async toggleCommentLike(commentId) {
    const comment = this.state.comments.find(c => c.id === commentId);
    if (!comment || !this.state.currentUser) return;
    
    const handle = this.state.currentUser.handle;
    const isLiked = comment.likes.includes(handle);
    
    if (isLiked) comment.likes = comment.likes.filter(h => h !== handle);
    else comment.likes.push(handle);
    this._notify();
    
    try {
      await this.api(`/comments/${commentId}/like`, 'POST');
    } catch(err) {
      if (isLiked) comment.likes.push(handle);
      else comment.likes = comment.likes.filter(h => h !== handle);
      this._notify();
    }
  }

  // --- Stories ---
  getGroupedStories() {
    const groups = {};
    const me = this.state.currentUser?.handle;
    this.state.stories.forEach(s => {
      const handle = s.authorHandle;
      if (!groups[handle]) {
        groups[handle] = {
          authorHandle: handle,
          author: this.getUser(handle),
          stories: [],
          hasUnread: false
        };
      }
      groups[handle].stories.push(s);
      if (me && (!s.views || !s.views.includes(me))) {
        groups[handle].hasUnread = true;
      }
    });
    const arr = Object.values(groups);
    arr.sort((a, b) => {
      if (a.authorHandle === me) return -1;
      if (b.authorHandle === me) return 1;
      if (a.hasUnread && !b.hasUnread) return -1;
      if (!a.hasUnread && b.hasUnread) return 1;
      return 0;
    });
    return arr;
  }


  async addStory(layers) {
    return this.createStory(layers);
  }

  async createStory(layers) {
    try {
      // For stories, layers may contain images in 'content' if type is image
      const processedLayers = await Promise.all(layers.map(async layer => {
        if (layer.type === 'image' && layer.content.startsWith('data:')) {
          const url = await this._uploadImage(layer.content);
          return { ...layer, content: url };
        }
        return layer;
      }));
      
      const res = await this.api('/stories', 'POST', { layers: processedLayers });
      this.state.stories.push(res);
      this._notify();
      return { ok: true, story: res };
    } catch(err) {
      return { ok: false, error: err.message };
    }
  }

  async markStoryViewed(storyId) {
    if (!this.state.currentUser) return;
    const story = this.state.stories.find(s => s.id === storyId);
    if (!story || story.viewers.includes(this.state.currentUser.handle)) return;
    
    story.viewers.push(this.state.currentUser.handle);
    this._notify();
    this.api(`/stories/${storyId}/view`, 'POST').catch(()=>{});
  }

  async toggleStoryLike(storyId) {
    const story = this.state.stories.find(s => s.id === storyId);
    if (!story || !this.state.currentUser) return;
    
    const handle = this.state.currentUser.handle;
    const isLiked = story.likes.includes(handle);
    
    if (isLiked) story.likes = story.likes.filter(h => h !== handle);
    else story.likes.push(handle);
    this._notify();
    
    try {
      await this.api(`/stories/${storyId}/like`, 'POST');
    } catch(err) {
      if (isLiked) story.likes.push(handle);
      else story.likes = story.likes.filter(h => h !== handle);
      this._notify();
    }
  }

  // --- Users ---
  async toggleFollow(handle) {
    if (!this.state.currentUser || handle === this.state.currentUser.handle) return;
    const targetUser = this.state.users.find(u => u.handle === handle);
    const myHandle = this.state.currentUser.handle;
    
    if(!targetUser) return;
    if (!targetUser.followers) targetUser.followers = [];
    if (!this.state.currentUser.following) this.state.currentUser.following = [];
    
    const isFollowing = targetUser.followers.includes(myHandle);
    
    if (isFollowing) {
      targetUser.followers = targetUser.followers.filter(h => h !== myHandle);
      this.state.currentUser.following = this.state.currentUser.following.filter(h => h !== handle);
    } else {
      targetUser.followers.push(myHandle);
      this.state.currentUser.following.push(handle);
    }
    this._notify();
    
    try {
      await this.api('/users/follow', 'POST', { handle });
    } catch(err) {
      // Revert
      if (isFollowing) {
        targetUser.followers.push(myHandle);
        this.state.currentUser.following.push(handle);
      } else {
        targetUser.followers = targetUser.followers.filter(h => h !== myHandle);
        this.state.currentUser.following = this.state.currentUser.following.filter(h => h !== handle);
      }
      this._notify();
    }
  }

  async updateProfile(data) {
    try {
      await this.api(`/users/me`, 'PUT', data);
      const user = this.state.currentUser;
      if (user) {
        Object.assign(user, data);
        const allUser = this.state.users.find(u => u.handle === user.handle);
        if (allUser) Object.assign(allUser, data);
        this._notify();
      }
    } catch (err) {
      if(typeof window !== 'undefined' && window.showToast) window.showToast(err.message || 'Failed to update profile');
      throw err;
    }
  }

  async changePassword(oldPassword, newPassword) {
    await this.api(`/users/me/password`, 'PUT', { oldPassword, newPassword });
  }

  async changeHandle(newHandle) {
    const res = await this.api(`/users/me/handle`, 'PUT', { newHandle });
    this.token = res.token;
    if (typeof localStorage !== 'undefined') localStorage.setItem('koral_token', res.token);
    
    const oldHandle = this.state.currentUser.handle;
    this.state.currentUser.handle = newHandle;
    
    this.state.posts.forEach(p => { if (p.authorHandle === oldHandle) p.authorHandle = newHandle; });
    this.state.comments.forEach(c => { if (c.authorHandle === oldHandle) c.authorHandle = newHandle; });
    this.state.stories.forEach(s => { if (s.authorHandle === oldHandle) s.authorHandle = newHandle; });
    this.state.users.forEach(u => { if (u.handle === oldHandle) u.handle = newHandle; });
    this._notify();
  }

  async deleteAccount() {
    await this.api(`/users/me`, 'DELETE');
    this.logout();
  }

  searchUsers(q) {
    if (!q) return [];
    q = q.toLowerCase();
    return this.state.users.filter(u => 
      u.handle.toLowerCase().includes(q) || 
      (u.displayName && u.displayName.toLowerCase().includes(q))
    );
  }

  isFollowing(handle) {
    const me = this.state.currentUser;
    if (!me || !me.following) return false;
    return me.following.includes(handle);
  }

  getUser(handle) {
    const h = handle.replace(/^@/, '');
    if (this.state.currentUser && this.state.currentUser.handle.replace(/^@/, '') === h) {
      return this.state.currentUser;
    }
    return this.state.users.find(u => u.handle === handle || u.handle === '@' + handle || u.handle.replace(/^@/, '') === h);
  }

  getCommentsForPost(postId) {
    return this.state.comments.filter(c => c.postId === postId);
  }
  
  getPostsByAuthor(handle) {
    return this.state.posts.filter(p => p.authorHandle === handle);
  }

  getHasUnreadNotifications() {
    return this.state.notifications.some(n => !n.read);
  }

  async markNotificationRead(id) {
    const notif = this.state.notifications.find(n => n.id === id);
    if(notif) {
      notif.read = true;
      this._notify();
      this.api('/notifications/read', 'POST', { id }).catch(()=>{});
    }
  }

  async markAllNotificationsRead() {
    this.state.notifications.forEach(n => n.read = true);
    this._notify();
    this.api('/notifications/read', 'POST', {}).catch(()=>{});
  }

  // --- Drafts ---
  async saveDraft(type, data, id = null) {
    try {
      // Upload images in draft to save local storage size, but it's okay to skip for now
      // Actually we'll let drafts hold base64 until posted to avoid spamming server with temp files.
      // But if we want actual operation, we should just stringify it.
      const res = await this.api('/drafts', 'POST', { id, type, data });
      const idx = this.state.drafts.findIndex(d => d.id === res.id);
      if (idx > -1) this.state.drafts[idx] = res;
      else this.state.drafts.unshift(res);
      this._notify();
      return res.id;
    } catch(err) {
      console.error("Failed to save draft", err);
      return null;
    }
  }

  async removeDraft(id) {
    this.state.drafts = this.state.drafts.filter(d => d.id !== id);
    this._notify();
    this.api(`/drafts/${id}`, 'DELETE').catch(()=>{});
  }

  getDraft(id) {
    return this.state.drafts.find(d => d.id === id);
  }

  // --- Settings ---
  applyTheme(theme) {
    this.state.theme = theme;
    storage.setItem('koral_theme', theme);
    
    if (typeof document !== 'undefined') {
      document.body.classList.remove('theme-light', 'theme-dark', 'theme-system');
      document.documentElement.classList.remove('dark', 'light');
      
      if (theme === 'light') {
        document.body.classList.add('theme-light');
        document.documentElement.classList.add('light');
      } else if (theme === 'dark') {
        document.body.classList.add('theme-dark');
        document.documentElement.classList.add('dark');
      } else {
        document.body.classList.add('theme-system');
        const isDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.add('light');
        }
      }
    }
    this._notify();
  }

  async deleteDraft(draftId) {
    try {
      await this.api(`/drafts/${draftId}`, 'DELETE');
      if (this.state.drafts[draftId]) {
        delete this.state.drafts[draftId];
        this._notify();
      }
    } catch(err) {}
  }

  _save() {
    // No-op for compatibility with old components.js logic
  }

  async updateSetting(key, value) {
    if (key === 'theme') {
      this.applyTheme(value);
    } else if (key === 'language') {
      storage.setItem('koral_language', value);
    }
    
    if (this.state.currentUser) {
      if (!this.state.currentUser.settings) this.state.currentUser.settings = {};
      this.state.currentUser.settings[key] = value;
      try {
        await this.api('/users/settings', 'PUT', { settings: this.state.currentUser.settings });
      } catch (err) {
        console.error('Failed to save settings:', err);
      }
    }
    this._notify();
  }

  setTheme(themeId) {
    this.updateSetting('theme', themeId);
  }

  setLanguage(langId) {
    this.updateSetting('language', langId);
  }

  // --- Compatibility methods for existing frontend code ---
  getState() {
    return this.state;
  }

  getFeed() {
    return this.state.posts;
  }
  
  getTheme() {
    return this.state.theme;
  }

  getSuggestedUsers() {
    const me = this.state.currentUser;
    if (!me) return [];
    return this.state.users.filter(u => u.handle !== me.handle && !u.followers?.includes(me.handle)).slice(0, 5);
  }

  getPost(id) {
    return this.state.posts.find(p => p.id === id);
  }

  getPostComments(postId) {
    return this.state.comments.filter(c => c.postId === postId && !c.parentId);
  }

  getCommentReplies(parentId) {
    return this.state.comments.filter(c => c.parentId === parentId);
  }

  getExplorePosts() {
    return [...this.state.posts].sort((a, b) => b.likes.length - a.likes.length || new Date(b.createdAt) - new Date(a.createdAt));
  }

  getUserPosts(handle) {
    return this.state.posts.filter(p => p.authorHandle === handle).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getDrafts(handle) {
    return Object.values(this.state.drafts || {}).filter(d => d.authorHandle === handle).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }
}

export const store = new Store();
if (typeof window !== 'undefined') {
  window.store = store;
}
