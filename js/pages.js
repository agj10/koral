import { icons } from './icons.js';
import { el, $, $$, timeAgo, renderMarkdown, escapeHtml, getInitials, toast, showModal, confirmDialog, resizeImage, uid, debounce } from './utils.js';
import { store } from './store.js';
import { t } from './lang.js';
import { renderAvatar, renderPostCard, renderPostPreviewCard, renderStoryRow, renderSuggestSidebar, renderThemeSelector, renderCommentSection, createDropdownSelect } from './components.js';
import { createRichTextEditor } from './editor.js';

export function renderFeedPage(container, params = {}) {
  try {
    container.innerHTML = '';
    const feedLayout = el('div', { className: 'feed-layout anim-fade' });
    
    const main = el('div', { className: 'feed-main' });
    main.appendChild(renderStoryRow());
    const currentUser = store.getState().currentUser;

    const posts = store.getFeed();
    if (posts.length === 0) {
      main.appendChild(el('div', { className: 'text-center flex flex-col items-center justify-center py-16 text-tx-3' },
        el('div', { className: 'mb-4', innerHTML: icons.image(48) }),
        el('p', { className: 'text-lg font-semibold text-tx' }, t('noReefs')),
        el('p', { className: 'text-sm mt-2' }, t('noReefsSub'))
      ));
    } else {
      const colsContainer = el('div', { className: 'flex gap-6 w-full items-start feed-cols-container' });
      
      const createCol = (title, iconName, items) => {
        const col = el('div', { className: 'flex-1 flex flex-col gap-6 w-1/3 min-w-0' });
        const header = el('div', { className: 'flex items-center gap-2 font-bold text-lg text-tx border-b border-base pb-3 mb-2' },
          el('span', { className: 'text-brand', innerHTML: icons[iconName] ? icons[iconName](24) : '' }),
          title
        );
        col.appendChild(header);
        items.forEach(post => {
          col.appendChild(renderPostPreviewCard(post));
        });
        return col;
      };

      const c1 = [], c2 = [], c3 = [];
      posts.forEach((post, i) => {
        if (i % 3 === 0) c1.push(post);
        else if (i % 3 === 1) c2.push(post);
        else c3.push(post);
      });

      colsContainer.append(
        createCol('쉼터 산책', 'user', c1),
        createCol('연안 관광', 'hash', c2),
        createCol('수중 탐사', 'compass', c3)
      );
      main.appendChild(colsContainer);
    }
    
    const aside = el('div', { className: 'feed-aside' });
    aside.appendChild(renderSuggestSidebar());
    
    feedLayout.append(main, aside);
    container.appendChild(feedLayout);
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="p-8 text-center text-red-500">피드 렌더링 에러: ${err.message}</div>`;
  }
}

export function renderExplorePage(container) {
  container.innerHTML = '';
  const posts = store.getExplorePosts();
  
  const wrap = el('div', { className: 'page-container anim-fade flex flex-col gap-8 w-full max-w-5xl mx-auto' });
  
  const searchHeader = el('div', { className: 'flex items-center gap-4 w-full flex-wrap' });
  
  const searchWrap = el('div', { className: 'flex-1 min-w-[200px]', style: { position: 'relative' } });
  const searchInput = el('input', { 
    type: 'text', 
    className: 'input w-full py-3 rounded-2xl bg-element border-base text-lg font-semibold', 
    style: { paddingLeft: '48px' },
    placeholder: '검색어를 입력하세요...' 
  });
  const searchIcon = el('div', { className: 'absolute text-tx-3', style: { left: '16px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }, innerHTML: icons.search(22) });
  searchWrap.append(searchIcon, searchInput);
  
  const categoryOptions = ['전체', '사진', '일상', '개발', '디자인', '기타'].map(cat => ({ value: cat, label: cat }));
  const categorySelectWrap = el('div', { className: 'w-[120px] flex-shrink-0' });
  const categorySelect = createDropdownSelect(categoryOptions, '전체', (val) => {
    // filter logic here
  }, '카테고리');
  categorySelectWrap.appendChild(categorySelect);
  
  searchHeader.append(searchWrap, categorySelectWrap);
  wrap.appendChild(searchHeader);

  const contentArea = el('div', { className: 'w-full' });
  wrap.appendChild(contentArea);
  
  const renderDefaultView = () => {
    contentArea.innerHTML = '';
    const defWrap = el('div', { className: 'flex flex-col gap-10 w-full' });
    
    const keywordsRow = el('div', { className: 'grid gap-6 w-full', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' } });
    
    // Recent Searches
    const recentWrap = el('div', { className: 'flex flex-col gap-4 w-full' });
    recentWrap.appendChild(el('div', { className: 'font-bold text-lg text-tx border-b border-base pb-3 flex justify-between items-center' }, 
      '최근 검색어',
      el('button', { className: 'text-sm text-tx-3 hover:text-tx', onclick: () => { localStorage.removeItem('koral_recent_searches'); renderDefaultView(); } }, '전체 삭제')
    ));
    
    const savedRecent = JSON.parse(localStorage.getItem('koral_recent_searches') || '[]');
    if (savedRecent.length === 0) {
      recentWrap.appendChild(el('div', { className: 'text-tx-3 text-sm py-4 text-center' }, '최근 검색 기록이 없습니다.'));
    } else {
      const recentList = el('div', { className: 'flex flex-col' });
      savedRecent.forEach(kw => {
        const item = el('div', { className: 'flex items-center justify-between py-2 cursor-pointer hover:bg-hover px-2 -mx-2 rounded-lg group' });
        item.onclick = () => {
          searchInput.value = kw;
          renderSearchResults(kw);
        };
        const textSpan = el('span', { className: 'text-tx' }, kw);
        const delBtn = el('button', { 
          className: 'text-tx-3 hover:text-brand p-1 opacity-0 group-hover:opacity-100 transition-opacity',
          onclick: (e) => {
            e.stopPropagation();
            const newRecent = savedRecent.filter(k => k !== kw);
            localStorage.setItem('koral_recent_searches', JSON.stringify(newRecent));
            renderDefaultView();
          }
        }, el('span', { innerHTML: icons.x(16) }));
        
        item.append(textSpan, delBtn);
        recentList.appendChild(item);
      });
      recentWrap.appendChild(recentList);
    }
    
    // Recommended Searches
    const recWrap = el('div', { className: 'flex flex-col gap-4 w-full' });
    recWrap.appendChild(el('div', { className: 'font-bold text-lg text-tx border-b border-base pb-3' }, '추천 검색어'));
    const recList = el('div', { className: 'flex flex-col gap-2' });
    ['#프론트엔드', '#감성사진', '#카페투어', 'OOTD', '포트폴리오', 'AI 활용법'].forEach(kw => {
      recList.appendChild(el('div', { className: 'flex items-center py-2 cursor-pointer hover:bg-hover px-2 -mx-2 rounded-lg text-tx font-medium', textContent: kw, onclick: () => {
        searchInput.value = kw;
        renderSearchResults(kw);
      }}));
    });
    recWrap.appendChild(recList);
    
    keywordsRow.append(recentWrap, recWrap);
    defWrap.appendChild(keywordsRow);
    
    const suggestedWrap = el('div', { className: 'flex flex-col gap-6 mt-4 w-full' });
    suggestedWrap.appendChild(el('div', { className: 'font-bold text-2xl text-tx' }, '탐색 추천'));
    const grid = el('div', { className: 'grid gap-6 w-full', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' } });
    posts.slice(0, 6).forEach(post => {
      grid.appendChild(renderPostPreviewCard(post));
    });
    suggestedWrap.appendChild(grid);
    defWrap.appendChild(suggestedWrap);
    
    contentArea.appendChild(defWrap);
  };
  
  const renderSearchResults = (query) => {
    // Save to recent
    let savedRecent = JSON.parse(localStorage.getItem('koral_recent_searches') || '[]');
    savedRecent = savedRecent.filter(k => k !== query);
    savedRecent.unshift(query);
    if (savedRecent.length > 10) savedRecent.pop();
    localStorage.setItem('koral_recent_searches', JSON.stringify(savedRecent));

    contentArea.innerHTML = '';
    const resWrap = el('div', { className: 'flex flex-col gap-6 w-full' });
    resWrap.appendChild(el('div', { className: 'font-bold text-xl text-tx border-b border-base pb-3' }, `'${query}' 검색 결과`));
    
    const grid = el('div', { className: 'grid gap-6 w-full', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' } });
    const lowerQuery = query.toLowerCase();
    const filteredPosts = posts.filter(post => 
      (post.title && post.title.toLowerCase().includes(lowerQuery)) ||
      (post.caption && post.caption.toLowerCase().includes(lowerQuery)) ||
      (post.tags && post.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) ||
      (post.authorHandle && post.authorHandle.toLowerCase().includes(lowerQuery))
    );
    
    filteredPosts.forEach(post => {
      grid.appendChild(renderPostPreviewCard(post));
    });
    resWrap.appendChild(grid);
    contentArea.appendChild(resWrap);
  };
  
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && searchInput.value.trim()) {
      renderSearchResults(searchInput.value.trim());
    }
  });
  
  searchInput.addEventListener('input', (e) => {
    if (!e.target.value.trim()) {
      renderDefaultView();
    }
  });

  renderDefaultView();
  
  container.appendChild(wrap);
}

export function renderProfilePage(container, { handle }) {
  container.innerHTML = '';
  const user = store.getUser('@' + handle);
  const currentUser = store.getState().currentUser;
  
  if (!user) {
    container.appendChild(el('div', { className: 'empty pt-20' },
      el('h3', { textContent: t('userNotFound') }),
      el('p', { textContent: t('userNotFoundSub') })
    ));
    return;
  }

  const isOwn = currentUser && currentUser.handle === user.handle;
  const posts = store.getUserPosts(user.handle);
  
  const wrap = el('div', { className: 'page-container anim-fade', style: { maxWidth: '935px' } });
  
  // Header
  const header = el('div', { className: 'profile-header' });
  
  const avatarWrap = el('div', { className: 'profile-avatar-wrap' },
    renderAvatar(user, 'av-2xl', true)
  );
  
  const info = el('div', { className: 'profile-info' });
  
  const row1 = el('div', { className: 'profile-row1' });
  row1.appendChild(el('h2', { className: 'profile-handle' }, 
    user.handle.substring(1),
    user.verified ? el('span', { className: 'verified ml-2', innerHTML: icons.verified(18) }) : null
  ));
  
  const actions = el('div', { className: 'profile-actions ml-4' });
  if (isOwn) {
    actions.appendChild(el('button', { className: 'btn-icon btn-ghost', onclick: () => window.navigateTo('settings/profile'), title: '프로필 편집' }, el('span', { innerHTML: icons.edit(24) })));
  } else if (currentUser) {
    const isFollowing = store.isFollowing(user.handle);
    const followBtn = el('button', { 
      className: `btn btn-sm ${isFollowing ? 'btn-secondary' : 'btn-primary'}`,
      onclick: () => {
        store.toggleFollow(user.handle);
        window.navigateTo(`profile/${handle}`); // re-render
      }
    }, isFollowing ? t('following') : t('follow'));
    actions.appendChild(followBtn);
    actions.appendChild(el('button', { className: 'btn btn-secondary btn-sm', onclick: () => toast(t('messageFeatureReady')) }, t('message')));
  }
  row1.appendChild(actions);
  
  const stats = el('div', { className: 'profile-stats mb-4' },
    el('div', { className: 'profile-stat' }, el('span', { className: 'font-semibold text-base' }, posts.length), t('statReefs')),
    el('div', { className: 'profile-stat', onclick: () => toast(t('featureReadyInfo')) }, el('span', { className: 'font-semibold text-base' }, user.followers?.length || 0), t('statFollowers')),
    el('div', { className: 'profile-stat', onclick: () => toast(t('featureReadyInfo')) }, el('span', { className: 'font-semibold text-base' }, user.following?.length || 0), t('statFollowing'))
  );
  
  const nameBio = el('div', {},
    el('div', { className: 'profile-name', innerHTML: renderMarkdown(user.displayName).replace(/^<p>/, '').replace(/<\/p>$/,'') }),
    el('div', { className: 'profile-bio' }, user.bio || ''),
    user.website ? el('a', { className: 'profile-bio-link', href: user.website, target: '_blank' }, user.website.replace(/^https?:\/\//, '')) : null
  );
  
  info.append(row1, stats, nameBio);
  header.append(avatarWrap, info);
  wrap.appendChild(header);
  
  // Tabs and Grid
  let activeTab = 'posts';
  const gridContainer = el('div', { className: 'mt-1' });

  const renderGrid = () => {
    gridContainer.innerHTML = '';
    
    const userStories = store.getState().stories.filter(s => s.authorHandle === user.handle);
    const combinedItems = [];
    
    if (activeTab === 'posts') {
      posts.forEach(post => {
        combinedItems.push({ type: 'post', data: post, date: new Date(post.createdAt) });
      });
      userStories.forEach(story => {
        combinedItems.push({ type: 'story', data: story, date: new Date(story.createdAt) });
      });
      combinedItems.sort((a, b) => b.date - a.date);
    } else {
      const bookmarkedPosts = store.getState().posts.filter(p => p.bookmarks.includes(currentUser.handle)).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      bookmarkedPosts.forEach(post => {
        combinedItems.push({ type: 'post', data: post, date: new Date(post.createdAt) });
      });
    }
    
    const grid = el('div', { className: 'profile-grid' });
    
    // Add create button
    if (activeTab === 'posts' && isOwn) {
      grid.appendChild(el('div', {
        className: 'profile-grid-cell flex flex-col items-center justify-center bg-element border-2 border-dashed border-base text-tx-3 hover:text-brand hover:border-brand transition-colors cursor-pointer',
        onclick: () => window.navigateTo('create')
      },
        el('span', { innerHTML: icons.plusSquare(32) }),
        el('span', { className: 'font-semibold mt-2' }, t('create'))
      ));
    }

    if (combinedItems.length === 0 && (!isOwn || activeTab !== 'posts')) {
      gridContainer.appendChild(el('div', { className: 'empty py-16' },
        el('div', { className: 'empty-icon' }, activeTab === 'posts' ? '📸' : '🔖'),
        el('h3', { textContent: activeTab === 'posts' ? t('noReefsTitle') : t('noSavedReefsTitle') })
      ));
      return;
    }
    
    combinedItems.forEach(item => {
      if (item.type === 'story') {
        const story = item.data;
        const cell = el('div', { 
          className: 'profile-grid-cell group cursor-pointer relative', 
          onclick: () => {
            const groupedStories = [{ authorHandle: user.handle, stories: userStories }];
            import('./components.js').then(m => m.renderStoryViewer(0, groupedStories));
          } 
        });
        const bgLayer = story.layers?.find(l => l.type === 'image');
        if (bgLayer) {
          cell.appendChild(el('img', { src: bgLayer.content, className: 'w-full h-full object-cover group-hover:scale-105 transition-transform' }));
        } else {
          cell.appendChild(el('div', { className: 'w-full h-full bg-gradient-to-br from-brand/20 to-element group-hover:scale-105 transition-transform' }));
        }
        
        // Show likes count overlay on hover
        const storyLikes = story.likes || [];
        const isStoryLiked = currentUser && storyLikes.includes(currentUser.handle);
        const storyLikeBtnSpan = el('span', { innerHTML: icons.heartFilled(20), style: { color: isStoryLiked ? 'var(--brand-a, #ff7171)' : '#fff' } });
        
        const storyOverlay = el('div', { className: 'profile-grid-cell-overlay flex justify-center items-center text-white font-bold text-lg' },
          el('div', { className: 'flex items-center gap-2' }, 
            storyLikeBtnSpan, 
            el('span', { textContent: storyLikes.length })
          )
        );
        
        cell.appendChild(el('div', { className: 'absolute top-2 right-2 bg-black/60 px-2 py-1 rounded-full text-xs font-bold text-white z-10' }, t('shellLabel').split(' ')[0]));
        cell.appendChild(storyOverlay);
        grid.appendChild(cell);
      } else {
        const post = item.data;
        const cell = el('div', { className: 'profile-grid-cell relative', onclick: () => window.navigateTo(`post/${post.id}`) });
        if (post.images && post.images.length) {
          cell.appendChild(el('img', { src: post.images[0] }));
        } else {
          const tmp = document.createElement('div');
          tmp.innerHTML = renderMarkdown(post.caption || '');
          const firstImg = tmp.querySelector('img');
          if (firstImg) {
            cell.appendChild(el('img', { src: firstImg.src }));
          } else {
            cell.appendChild(el('div', { className: 'w-full h-full flex items-center justify-center bg-subtle p-4' },
              el('p', { className: 'text-xs clamp3 text-center text-secondary' }, tmp.textContent || '')
            ));
          }
        }
        const isLiked = currentUser && post.likes.includes(currentUser.handle);
        const comments = store.getPostComments(post.id);
        
        const overlay = el('div', { className: 'profile-grid-cell-overlay flex gap-6 justify-center items-center text-white font-bold text-lg' },
          el('div', { className: 'flex items-center gap-2' },
            el('span', { innerHTML: icons.heartFilled(20), style: { color: isLiked ? 'var(--brand-a, #ff7171)' : '#fff' } }),
            el('span', { textContent: post.likes.length })
          ),
          el('div', { className: 'flex items-center gap-2' },
            el('span', { innerHTML: icons.comment(20) }),
            el('span', { textContent: comments.length })
          )
        );
        cell.appendChild(overlay);
        grid.appendChild(cell);
      }
    });
    gridContainer.appendChild(grid);
  };

  const updateTabs = () => {
    tabPosts.className = `profile-tab ${activeTab === 'posts' ? 'active' : ''}`;
    if (tabSaved) tabSaved.className = `profile-tab ${activeTab === 'saved' ? 'active' : ''}`;
  };

  const tabPosts = el('div', { className: 'profile-tab active', onclick: () => { activeTab = 'posts'; updateTabs(); renderGrid(); } }, el('span', { innerHTML: icons.grid(12) }), t('reefLabel').split(' ')[0]);
  const tabSaved = isOwn ? el('div', { className: 'profile-tab', onclick: () => { activeTab = 'saved'; updateTabs(); renderGrid(); } }, el('span', { innerHTML: icons.bookmark(12) }), t('saved')) : null;

  const tabs = el('div', { className: 'profile-tabs' }, tabPosts, tabSaved);
  
  wrap.appendChild(tabs);
  wrap.appendChild(gridContainer);
  
  renderGrid();
  
  container.appendChild(wrap);
}

export function renderPostPage(container, { postId }) {
  try {
    container.innerHTML = '';
    const post = store.getPost(postId);
    if (!post) {
      container.appendChild(el('div', { className: 'empty pt-20' }, el('h3', { textContent: t('notFound') })));
      return;
    }
    
    const wrap = el('div', { className: 'page-container anim-fade', style: { maxWidth: '768px' } });
    
    wrap.appendChild(renderPostCard(post, { compact: false, onNavigate: window.navigateTo }));
    
    const commentsWrap = el('div', { className: 'mt-6' });
    commentsWrap.appendChild(el('h3', { className: 'text-lg font-semibold mb-4 px-2' }, t('commentsTitle')));
    
    const commentSection = renderCommentSection(post.id);
    
    const currentUser = store.getState().currentUser;
    if (currentUser) {
      const inputWrap = el('div', { className: 'flex gap-3 mb-6 px-2 items-start' },
        renderAvatar(currentUser, 'av-md'),
        el('div', { className: 'flex-1' }, 
          createRichTextEditor({
            placeholder: t('addComment'),
            submitLabel: t('registerBtn'),
            minHeight: '60px',
            onSubmit: (text) => {
              store.addComment({ postId: post.id, parentId: null, text });
              toast(t('commentAdded'), 'success');
              if (commentSection._refreshComments) commentSection._refreshComments();
            }
          })
        )
      );
      commentsWrap.appendChild(inputWrap);
    }
    
    commentsWrap.appendChild(commentSection);
    wrap.appendChild(commentsWrap);
    container.appendChild(wrap);
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="p-8 text-center text-red-500">포스트 렌더링 에러: ${err.message}</div>`;
  }
}

function createAuthLanguageBar() {
  const currentLang = localStorage.getItem('koral_language') || 'ko';
  const langBar = el('div', {
    className: 'auth-language-bar'
  });
  
  const languages = [
    { id: 'ko', label: 'KR', flag: '🇰🇷' },
    { id: 'en', label: 'EN', flag: '🇺🇸' },
    { id: 'ja', label: 'JA', flag: '🇯🇵' },
    { id: 'zh', label: 'ZH', flag: '🇨🇳' }
  ];
  
  languages.forEach(l => {
    const isSel = currentLang === l.id;
    const btn = el('button', {
      className: `px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${isSel ? 'bg-brand text-white shadow-sm' : 'text-tx-2 hover:bg-hover hover:text-tx'}`,
      style: { border: 'none', background: isSel ? 'var(--brand-a, #ff7171)' : 'transparent' },
      onclick: () => {
        if (currentLang !== l.id) {
          localStorage.setItem('koral_language', l.id);
          let msg = '';
          if (l.id === 'ko') msg = '한국어로 변경되었습니다.';
          else if (l.id === 'en') msg = 'Language changed to English.';
          else if (l.id === 'ja') msg = '日本語に変更されました。';
          else msg = '语言已更改为简体中文。';
          toast(msg, 'success');
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }
      }
    }, `${l.flag} ${l.label}`);
    langBar.appendChild(btn);
  });
  return langBar;
}

export function renderLoginPage(container) {
  container.innerHTML = '';
  const shell = el('div', { className: 'auth-shell' },
    createAuthLanguageBar(),
    el('div', { className: 'auth-banner-side' },
      el('div', { className: 'auth-orb auth-orb-1' }),
      el('div', { className: 'auth-orb auth-orb-2' }),
      el('div', { innerHTML: '<svg viewBox="0 0 100 100" fill="none" width="80" height="80"><defs><linearGradient id="alg3" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#ef4444"/><stop offset="100%" stop-color="#f43f5e"/></linearGradient></defs><g fill="url(#alg3)" transform="translate(0, 4)"><rect x="10" y="48" width="80" height="24"/><rect x="50" y="48" width="40" height="24" transform="rotate(-60 50 60)"/><rect x="50" y="48" width="40" height="24" transform="rotate(-120 50 60)"/></g></svg>' }),
      el('h1', { className: 'auth-banner-title' }, t('welcomeBanner')),
      el('p', { className: 'auth-banner-sub' }, t('welcomeSub'))
    ),
    el('div', { className: 'auth-form-side' },
      el('div', { className: 'auth-card' },
        el('div', { className: 'auth-logo md:hidden mb-8 flex flex-col items-center' },
          el('div', { className: 'auth-logo-icon', innerHTML: '<svg viewBox="0 0 100 100" fill="none" width="48" height="48"><defs><linearGradient id="alg" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#ef4444"/><stop offset="100%" stop-color="#f43f5e"/></linearGradient></defs><g fill="url(#alg)" transform="translate(0, 4)"><rect x="10" y="48" width="80" height="24"/><rect x="50" y="48" width="40" height="24" transform="rotate(-60 50 60)"/><rect x="50" y="48" width="40" height="24" transform="rotate(-120 50 60)"/></g></svg>' }),
          el('h1', { className: 'auth-title' }, 'koral')
        ),
        el('form', { className: 'auth-form', onsubmit: (e) => {
          e.preventDefault();
          const id = e.target.id.value;
          const pw = e.target.pw.value;
          const res = store.login(id, pw);
          if (res.ok) {
            window.navigateTo('feed');
          } else {
            toast(res.error, 'error');
          }
        }},
          el('h2', { className: 'text-2xl font-bold mb-6 text-tx hidden md:block' }, t('login')),
          el('div', { className: 'input-group mb-4' },
            el('input', { name: 'id', className: 'input', placeholder: t('handleOrEmail'), required: true })
          ),
          el('div', { className: 'input-group mb-8' },
            el('input', { name: 'pw', type: 'password', className: 'input', placeholder: t('password'), required: true })
          ),
          el('button', { type: 'submit', className: 'btn btn-primary w-full' }, t('login'))
        ),
        el('div', { className: 'auth-footer mt-8 border-t border-base pt-6' },
          t('noAccount') + ' ',
          el('a', { onclick: () => window.navigateTo('signup') }, t('signup'))
        )
      )
    )
  );
  
  container.appendChild(shell);
}

export function renderSignupPage(container) {
  container.innerHTML = '';
  const shell = el('div', { className: 'auth-shell' },
    createAuthLanguageBar(),
    el('div', { className: 'auth-banner-side' },
      el('div', { className: 'auth-orb auth-orb-1' }),
      el('div', { className: 'auth-orb auth-orb-2' }),
      el('div', { innerHTML: '<svg viewBox="0 0 100 100" fill="none" width="80" height="80"><defs><linearGradient id="alg4" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#ef4444"/><stop offset="100%" stop-color="#f43f5e"/></linearGradient></defs><g fill="url(#alg4)" transform="translate(0, 4)"><rect x="10" y="48" width="80" height="24"/><rect x="50" y="48" width="40" height="24" transform="rotate(-60 50 60)"/><rect x="50" y="48" width="40" height="24" transform="rotate(-120 50 60)"/></g></svg>' }),
      el('h1', { className: 'auth-banner-title' }, t('signupBanner')),
      el('p', { className: 'auth-banner-sub' }, t('signupSub'))
    ),
    el('div', { className: 'auth-form-side' },
      el('div', { className: 'auth-card' },
        el('div', { className: 'auth-logo md:hidden mb-6 flex flex-col items-center' },
          el('div', { className: 'auth-logo-icon', innerHTML: '<svg viewBox="0 0 100 100" fill="none" width="48" height="48"><defs><linearGradient id="alg2" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#ef4444"/><stop offset="100%" stop-color="#f43f5e"/></linearGradient></defs><g fill="url(#alg2)" transform="translate(0, 4)"><rect x="10" y="48" width="80" height="24"/><rect x="50" y="48" width="40" height="24" transform="rotate(-60 50 60)"/><rect x="50" y="48" width="40" height="24" transform="rotate(-120 50 60)"/></g></svg>' }),
          el('h2', { className: 'text-lg font-semibold text-secondary px-4' }, t('signup'))
        ),
        el('h2', { className: 'text-2xl font-bold mb-6 text-tx hidden md:block' }, t('signupTitle')),
        el('form', { className: 'auth-form mt-4', onsubmit: (e) => {
          e.preventDefault();
          const t = e.target;
          let handle = t.handle.value.trim();
          if (!handle.startsWith('@')) handle = '@' + handle;
          
          const res = store.register({
            handle,
            displayName: t.displayName.value.trim(),
            email: t.email.value.trim(),
            password: t.pw.value,
            avatar: avatarDataUrl
          });
          
          if (res.ok) window.navigateTo('feed');
          else toast(res.error, 'error');
        }},
          el('div', { className: 'auth-avatar-upload mb-4' }), // will append preview
          el('div', { className: 'input-group mb-3' }, el('input', { name: 'email', type: 'email', className: 'input', placeholder: t('emailPlaceholder'), required: true })),
          el('div', { className: 'input-group mb-3' }, el('input', { name: 'displayName', className: 'input', placeholder: t('nicknamePlaceholder'), required: true })),
          el('div', { className: 'input-group mb-3' }, 
            el('div', { className: 'input-wrap' },
              el('div', { className: 'input-prefix' }, '@'),
              el('input', { name: 'handle', className: 'input', placeholder: t('handlePlaceholder'), required: true })
            )
          ),
          el('div', { className: 'input-group mb-6' }, el('input', { name: 'pw', type: 'password', className: 'input', placeholder: t('password'), required: true, minLength: 4 })),
          el('label', { className: 'custom-checkbox mb-6' },
            el('input', { type: 'checkbox', required: true }),
            el('div', { className: 'checkbox-box' }),
            (() => {
              const checkboxText = el('div', { className: 'checkbox-text' });
              const fullText = t('agreeTerms');
              const termsWord = t('acceptTerms');
              const parts = fullText.split(termsWord);
              if (parts.length === 2) {
                checkboxText.append(
                  parts[0],
                  el('a', { 
                    className: 'text-tx-br font-semibold hover:underline', 
                    onclick: (e) => {
                      e.preventDefault();
                      showModal(el('div', { className: 'p-6' }, 
                        el('h3', { className: 'text-xl font-bold mb-4' }, t('acceptTerms') + ' koral'),
                        el('p', { className: 'text-sm text-tx-2 leading-relaxed' }, 'koral은 개발자를 위한 마크다운 기반 SNS입니다. 건전한 코드 공유 문화를 위해 타인을 비방하거나 악의적인 코드를 공유하지 않을 것에 동의합니다. 사용자의 데이터는 안전하게 보관되며 맞춤형 피드 제공을 위해 쿠키가 사용될 수 있습니다.')
                      ));
                    }
                  }, termsWord),
                  parts[1]
                );
              } else {
                checkboxText.textContent = fullText;
              }
              return checkboxText;
            })()
          ),
          el('button', { type: 'submit', className: 'btn btn-primary w-full' }, t('signup'))
        ),
        el('div', { className: 'auth-footer mt-6 border-t border-base pt-6' },
          t('haveAccount') + ' ',
          el('a', { onclick: () => window.navigateTo('login') }, t('login'))
        )
      )
    )
  );
  
  let avatarDataUrl = '';
  const preview = el('div', { className: 'auth-avatar-preview', onclick: () => fileInput.click() },
    el('span', { className: 'placeholder-icon' }, '+')
  );
  const fileInput = el('input', { type: 'file', accept: 'image/*', onchange: async (e) => {
    if (e.target.files && e.target.files[0]) {
      try {
        avatarDataUrl = await resizeImage(e.target.files[0], 200);
        preview.innerHTML = '';
        preview.appendChild(el('img', { src: avatarDataUrl }));
      } catch (err) {
        toast('이미지 처리 중 오류가 발생했습니다.', 'error');
      }
    }
  }});
  preview.appendChild(fileInput);
  
  const uploadWrap = shell.querySelector('.auth-avatar-upload');
  uploadWrap.appendChild(preview);
  uploadWrap.appendChild(el('span', { className: 'auth-avatar-label' }, t('addAvatar')));
  
  container.appendChild(shell);
}

export function renderLandingPage(container) {
  container.innerHTML = '';
  const landing = el('div', { className: 'landing' },
    createAuthLanguageBar(),
    el('div', { className: 'mesh-bg' },
      el('div', { className: 'orb-1' }), el('div', { className: 'orb-2' }), el('div', { className: 'orb-3' })
    ),
    el('div', { className: 'landing-logo', innerHTML: '<svg viewBox="0 0 100 100" fill="none" width="64" height="64"><defs><linearGradient id="llg" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#ef4444"/><stop offset="100%" stop-color="#f43f5e"/></linearGradient></defs><g fill="url(#llg)" transform="translate(0, 4)"><rect x="10" y="48" width="80" height="24"/><rect x="50" y="48" width="40" height="24" transform="rotate(-60 50 60)"/><rect x="50" y="48" width="40" height="24" transform="rotate(-120 50 60)"/></g></svg>' }),
    el('h1', { className: 'g-text' }, t('welcomeBanner')),
    el('p', { className: 'landing-sub' }, t('welcomeSub')),
    el('div', { className: 'landing-buttons' },
      el('button', { className: 'btn btn-primary btn-lg', onclick: () => window.navigateTo('signup') }, t('signup')),
      el('button', { className: 'btn btn-secondary btn-lg', onclick: () => window.navigateTo('login') }, t('login'))
    )
  );
  container.appendChild(landing);
}

export function renderCreatePage(container, options = {}) {
  if (options.subRoute === 'story') {
    import('./components.js').then(m => m.renderStoryCreator(container));
    return;
  }

  container.innerHTML = '';
  const wrap = el('div', { className: 'page-container anim-fade flex flex-col items-start', style: { maxWidth: '768px' } });
  
  const header = el('div', { className: 'mb-8 text-left w-full' },
    el('h2', { className: 'text-2xl font-bold text-tx mb-2 text-left' }, t('createTitle')),
    el('p', { className: 'text-tx-3 text-left' }, t('createQuestion'))
  );

  const optionsWrap = el('div', { className: 'flex flex-col gap-4 w-full max-w-md' });

  const createOption = (title, desc, icon, onClick) => {
    return el('button', {
      className: 'w-full flex items-center justify-start gap-6 p-6 bg-element border border-base rounded-2xl hover:bg-hover hover:border-brand transition-all group cursor-pointer text-left',
      onclick: onClick
    },
      el('div', { className: 'w-16 h-16 shrink-0 rounded-full bg-brand/10 text-brand flex items-center justify-center group-hover:scale-110 transition-transform' },
        el('span', { innerHTML: icon(32) })
      ),
      el('div', { className: 'flex-1 text-left' },
        el('h3', { className: 'text-xl font-bold text-tx mb-1 text-left' }, title),
        el('p', { className: 'text-sm text-tx-3 text-left' }, desc)
      )
    );
  };

  optionsWrap.append(
    createOption(t('reefLabel'), t('reefDesc'), icons.grid, () => renderPostEditor(container)),
    createOption(t('shellLabel'), t('shellDesc'), icons.image, () => {
      import('./components.js').then(m => m.renderStoryCreator(container));
    }),
    createOption(t('devNoteLabel'), t('devNoteDesc'), icons.monitor, () => toast(t('featureReadyInfo'), 'info'))
  );

  wrap.append(header, optionsWrap);
  container.appendChild(wrap);
}

function renderPostEditor(container) {
  const currentLang = localStorage.getItem('koral_language') || 'ko';
  container.innerHTML = '';
  const wrap = el('div', { className: 'page-container anim-fade', style: { maxWidth: '768px' } });
  const form = el('form', { className: 'w-full flex flex-col', onsubmit: (e) => e.preventDefault() });
  const editorHeader = el('div', { className: 'mb-6 flex items-center justify-between' },
    el('h2', { className: 'text-2xl font-bold text-tx' }, t('newReef'))
  );
  
  const currentUser = store.getState().currentUser;
  const editorWrap = el('div', { className: 'mb-6' },
    createRichTextEditor({
      id: `create_post_${currentUser ? currentUser.id : 'guest'}`,
      placeholder: t('writeSomething'),
      submitLabel: t('reefUpload'),
      minHeight: '400px',
      showTitle: true,
      onSubmit: (text, title) => {
        const imgMatches = [...text.matchAll(/!\[.*?\]\((.*?)\)/g)];
        const images = imgMatches.map(m => m[1]);
        const plainText = text.replace(/<[^>]*>?/gm, ' ');
        const tagMatches = [...plainText.matchAll(/(?:^|\s)#([가-힣a-zA-Z0-9_]+)/g)];
        const tags = tagMatches.map(m => '#' + m[1]);

        const post = store.createPost({ title, images, caption: text, location: '', tags });
        if (post) {
          toast(currentLang === 'ko' ? '리프가 생성되었습니다.' : 'Reef created successfully.', 'success');
          localStorage.removeItem(`koral_editor_draft_create_post_${currentUser ? currentUser.id : 'guest'}`);
          window.navigateTo('post/' + post.id);
        }
      }
    })
  );
  
  form.append(editorHeader, editorWrap);
  wrap.appendChild(form);
  container.appendChild(wrap);
}

function renderSettingsLayout(container, activeTab, mainContentEl) {
  container.innerHTML = '';
  const wrap = el('div', { className: 'page-container anim-fade', style: { maxWidth: '768px' } });
  
  wrap.appendChild(el('h2', { className: 'text-2xl font-bold mb-6 text-tx' }, t('settings')));
  
  const links = [
    { id: 'profile', icon: icons.user, label: t('editProfile'), route: 'settings/profile' },
    { id: 'security', icon: icons.lock, label: t('security'), route: 'settings/security' },
    { id: 'theme', icon: icons.sun, label: t('theme'), route: 'settings/theme' },
    { id: 'language', icon: icons.Aa, label: t('language'), route: 'settings/language' }
  ];
  
  const tabs = el('div', { className: 'profile-tabs mb-8' });
  links.forEach(l => {
    const isActive = activeTab === l.id;
    tabs.appendChild(
      el('div', { 
        className: `profile-tab ${isActive ? 'active' : ''}`, 
        onclick: () => window.navigateTo(l.route) 
      }, el('span', { innerHTML: l.icon(14) }), l.label)
    );
  });
  
  wrap.appendChild(tabs);
  
  const main = el('div', { className: 'settings-main-content bg-element border border-base rounded-2xl p-6 shadow-sm mb-10' });
  main.appendChild(mainContentEl);
  wrap.appendChild(main);
  
  container.appendChild(wrap);
}

export function renderSettingsPage(container) {
  window.navigateTo('settings/profile'); // Redirect to first tab
}

export function renderEditProfilePage(container) {
  const currentUser = store.getState().currentUser;
  if (!currentUser) return window.navigateTo('login');

  const content = el('div');
  content.appendChild(el('h3', { className: 'text-2xl font-bold mb-8 text-tx' }, t('editProfile')));
  
  const form = el('form', { onsubmit: (e) => {
    e.preventDefault();
    store.updateProfile({
      displayName: e.target.displayName.value,
      bio: e.target.bio.value,
      website: e.target.website.value
    });
    toast(localStorage.getItem('koral_language') === 'en' ? 'Profile updated successfully.' : '프로필이 업데이트되었습니다.', 'success');
    window.navigateTo(`profile/${currentUser.handle.substring(1)}`);
  }});

  form.append(
    el('div', { className: 'input-group mb-6' },
      el('label', { className: 'input-label' }, t('nickname')),
      el('input', { name: 'displayName', className: 'input input-lg', value: currentUser.displayName })
    ),
    el('div', { className: 'input-group mb-6' },
      el('label', { className: 'input-label' }, t('bio')),
      el('textarea', { name: 'bio', className: 'textarea', value: currentUser.bio || '', rows: 4 })
    ),
    el('div', { className: 'input-group mb-8' },
      el('label', { className: 'input-label' }, t('website')),
      el('input', { name: 'website', className: 'input input-lg', value: currentUser.website || '', placeholder: 'https://' })
    ),
    el('div', { className: 'flex justify-end' },
      el('button', { type: 'submit', className: 'btn btn-primary btn-lg shadow-md' }, t('saveChanges'))
    )
  );
  
  content.appendChild(form);
  renderSettingsLayout(container, 'profile', content);
}

export function renderThemeSettingsPage(container) {
  const content = el('div');
  content.appendChild(el('h3', { className: 'text-2xl font-bold mb-2 text-tx' }, '테마'));
  content.appendChild(el('p', { className: 'text-tx-3 mb-8' }, '앱의 화면 모드를 설정하세요.'));
  content.appendChild(renderThemeSelector());
  renderSettingsLayout(container, 'theme', content);
}

export function renderSecurityPage(container) {
  const currentUser = store.getState().currentUser;
  if (!currentUser) return window.navigateTo('login');

  const content = el('div');
  content.appendChild(el('h3', { className: 'text-2xl font-bold mb-8 text-tx' }, '계정 보안'));
  
  const actionsWrap = el('div', { className: 'flex flex-col gap-4' });
  
  const openHandleModal = () => {
    const modal = showModal(
      el('form', { className: 'p-8', onsubmit: (e) => {
        e.preventDefault();
        const currentPw = e.target.currentPw.value;
        let newHandle = e.target.newHandle.value.trim();
        if (!newHandle.startsWith('@')) newHandle = '@' + newHandle;
        
        const res = store.changeHandle(currentPw, newHandle);
        if (res.ok) {
          toast('핸들이 변경되었습니다.', 'success');
          modal.close();
          window.navigateTo('settings/security');
        } else {
          toast(res.error, 'error');
        }
      }},
        el('h3', { className: 'text-2xl font-bold mb-6' }, '핸들 변경'),
        el('div', { className: 'input-group mb-5' },
          el('label', { className: 'input-label' }, '새 핸들'),
          el('div', { className: 'input-wrap' },
            el('div', { className: 'input-prefix' }, '@'),
            el('input', { name: 'newHandle', className: 'input input-lg', placeholder: '새 핸들', required: true })
          )
        ),
        el('div', { className: 'input-group mb-8' },
          el('label', { className: 'input-label' }, '현재 비밀번호'),
          el('input', { name: 'currentPw', type: 'password', className: 'input input-lg', placeholder: '비밀번호 입력', required: true })
        ),
        el('div', { className: 'flex justify-end gap-3' },
          el('button', { type: 'button', className: 'btn btn-ghost', onclick: () => modal.close() }, '취소'),
          el('button', { type: 'submit', className: 'btn btn-primary' }, '변경하기')
        )
      )
    );
  };

  const openPwModal = () => {
    const modal = showModal(
      el('form', { className: 'p-8', onsubmit: (e) => {
        e.preventDefault();
        const currentPw = e.target.currentPw.value;
        const newPw = e.target.newPw.value;
        
        const res = store.changePassword(currentPw, newPw);
        if (res.ok) {
          toast('비밀번호가 변경되었습니다.', 'success');
          modal.close();
          window.navigateTo('settings/security');
        } else {
          toast(res.error, 'error');
        }
      }},
        el('h3', { className: 'text-2xl font-bold mb-6' }, '비밀번호 변경'),
        el('div', { className: 'input-group mb-5' },
          el('label', { className: 'input-label' }, '현재 비밀번호'),
          el('input', { name: 'currentPw', type: 'password', className: 'input input-lg', placeholder: '현재 비밀번호', required: true })
        ),
        el('div', { className: 'input-group mb-8' },
          el('label', { className: 'input-label' }, '새 비밀번호'),
          el('input', { name: 'newPw', type: 'password', className: 'input input-lg', placeholder: '특수문자 포함 8자 이상', required: true })
        ),
        el('div', { className: 'flex justify-end gap-3' },
          el('button', { type: 'button', className: 'btn btn-ghost', onclick: () => modal.close() }, '취소'),
          el('button', { type: 'submit', className: 'btn btn-primary' }, '변경하기')
        )
      )
    );
  };

  const openDeleteModal = () => {
    const modal = showModal(
      el('form', { className: 'p-8', onsubmit: (e) => {
        e.preventDefault();
        const currentPw = e.target.currentPw.value;
        if (confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
          const res = store.deleteAccount(currentPw);
          if (res.ok) {
            toast('계정이 삭제되었습니다. 이용해 주셔서 감사합니다.', 'success');
            modal.close();
            window.navigateTo('login');
          } else {
            toast(res.error, 'error');
          }
        }
      }},
        el('h3', { className: 'text-2xl font-bold mb-4 text-red-500' }, '계정 삭제'),
        el('p', { className: 'text-sm text-tx-2 mb-6' }, '계정을 삭제하려면 현재 비밀번호를 입력하세요. 삭제된 계정은 복구할 수 없습니다.'),
        el('div', { className: 'input-group mb-8' },
          el('label', { className: 'input-label' }, '현재 비밀번호'),
          el('input', { name: 'currentPw', type: 'password', className: 'input input-lg', placeholder: '비밀번호 입력', required: true })
        ),
        el('div', { className: 'flex justify-end gap-3' },
          el('button', { type: 'button', className: 'btn btn-ghost', onclick: () => modal.close() }, '취소'),
          el('button', { type: 'submit', className: 'btn btn-danger', style: { backgroundColor: 'var(--accent-red)', color: '#fff' } }, '계정 삭제하기')
        )
      )
    );
  };

  actionsWrap.append(
    el('div', { 
      className: 'flex items-center gap-4 p-5 rounded-2xl border border-base bg-subtle hover:bg-hover hover:border-str transition-all cursor-pointer shadow-sm', 
      onclick: openHandleModal 
    },
      el('div', { className: 'w-12 h-12 rounded-xl bg-element flex items-center justify-center text-tx-2 shadow-sm' }, el('span', { innerHTML: icons.atSign(24) })),
      el('div', { className: 'flex-1' }, 
        el('div', { className: 'font-bold text-tx text-lg' }, '핸들 변경'),
        el('div', { className: 'text-sm text-tx-3 mt-1' }, '고유한 사용자 아이디를 변경합니다.')
      ),
      el('div', { className: 'text-tx-3' }, el('span', { innerHTML: icons.chevronRight(24) }))
    ),
    el('div', { 
      className: 'flex items-center gap-4 p-5 rounded-2xl border border-base bg-subtle hover:bg-hover hover:border-str transition-all cursor-pointer shadow-sm', 
      onclick: openPwModal 
    },
      el('div', { className: 'w-12 h-12 rounded-xl bg-element flex items-center justify-center text-tx-2 shadow-sm' }, el('span', { innerHTML: icons.lock(24) })),
      el('div', { className: 'flex-1' }, 
        el('div', { className: 'font-bold text-tx text-lg' }, '비밀번호 변경'),
        el('div', { className: 'text-sm text-tx-3 mt-1' }, '계정의 비밀번호를 안전하게 재설정합니다.')
      ),
      el('div', { className: 'text-tx-3' }, el('span', { innerHTML: icons.chevronRight(24) }))
    ),
    el('div', { 
      className: 'flex items-center gap-4 p-5 rounded-2xl border border-base bg-subtle hover:bg-hover hover:border-str transition-all cursor-pointer shadow-sm mt-4', 
      style: { borderColor: 'var(--accent-red)' },
      onclick: openDeleteModal 
    },
      el('div', { className: 'w-12 h-12 rounded-xl flex items-center justify-center shadow-sm', style: { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)' } }, el('span', { innerHTML: icons.trash(24) })),
      el('div', { className: 'flex-1' }, 
        el('div', { className: 'font-bold text-lg', style: { color: 'var(--accent-red)' } }, '계정 삭제'),
        el('div', { className: 'text-sm mt-1', style: { color: 'rgba(239, 68, 68, 0.8)' } }, '계정과 모든 데이터를 영구적으로 삭제합니다.')
      ),
      el('div', { style: { color: 'rgba(239, 68, 68, 0.5)' } }, el('span', { innerHTML: icons.chevronRight(24) }))
    )
  );

  content.appendChild(actionsWrap);
  renderSettingsLayout(container, 'security', content);
}

export function renderLanguageSettingsPage(container) {
  const content = el('div');
  content.appendChild(el('h3', { className: 'text-2xl font-bold mb-2 text-tx' }, t('language')));
  content.appendChild(el('p', { className: 'text-tx-3 mb-8' }, t('languageSelectorDesc')));
  
  const containerSelect = el('div', { className: 'theme-options' });
  
  const currentLang = localStorage.getItem('koral_language') || 'ko';
  
  const languages = [
    { id: 'ko', icon: '🇰🇷', label: '한국어', desc: 'Korean' },
    { id: 'en', icon: '🇺🇸', label: 'English', desc: '영어' },
    { id: 'ja', icon: '🇯🇵', label: '日本語', desc: '일본어' },
    { id: 'zh', icon: '🇨🇳', label: '简体中文', desc: '중국어 간체' }
  ];
  
  languages.forEach(lang => {
    const isSel = currentLang === lang.id;
    const card = el('div', { 
      className: `theme-option ${isSel ? 'selected' : ''}`,
      onclick: () => {
        localStorage.setItem('koral_language', lang.id);
        $$('.theme-option', containerSelect).forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        
        let msg = '';
        if (lang.id === 'ko') msg = '한국어로 변경되었습니다.';
        else if (lang.id === 'en') msg = 'Language changed to English.';
        else if (lang.id === 'ja') msg = '日本語に変更されました。';
        else msg = '语言已更改为简体中文。';
        toast(msg, 'success');
        
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    },
      el('div', { className: 'theme-option-icon' }, lang.icon),
      el('div', { className: 'theme-option-label' }, lang.label),
      el('div', { className: 'theme-option-sub' }, lang.desc)
    );
    containerSelect.appendChild(card);
  });
  
  content.appendChild(containerSelect);
  renderSettingsLayout(container, 'language', content);
}
