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

  // --- Auth ---
  async login(handleOrEmail, password) {
    try {
      const res = await this.api('/auth/login', 'POST', { handleOrEmail, password });
      this.token = res.token;
      storage.setItem('koral_token', res.token);
      this.state.currentUser = res.user;
      
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

  getUser(handle) {
    return this.state.users.find(u => u.handle === handle);
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
    
    let isDark = false;
    if (theme === 'system') {
      isDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      isDark = theme === 'dark';
    }
    
    if (typeof document !== 'undefined') {
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    this._notify();
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
}

export const store = new Store();
if (typeof window !== 'undefined') {
  window.store = store;
}
