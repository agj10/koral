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
        const col = el('div', { className: 'flex-1 flex flex-col gap-6 w-1/3 min-w-0 feed-column' });
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
  
  const wrap = el('div', { className: 'page-container explore-page anim-fade flex flex-col gap-8 w-full max-w-5xl mx-auto' });
  
  const searchHeader = el('div', { className: 'flex items-center gap-4 w-full flex-wrap explore-search-bar' });
  
  const searchWrap = el('div', { className: 'flex-1 min-w-[200px] explore-search-input-wrap', style: { position: 'relative' } });
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
      el('button', { className: 'text-sm text-tx-3 hover:text-tx btn-text-link', onclick: () => { localStorage.removeItem('koral_recent_searches'); renderDefaultView(); } }, '전체 삭제')
    ));
    
    const savedRecent = JSON.parse(localStorage.getItem('koral_recent_searches') || '[]');
    if (savedRecent.length === 0) {
      recentWrap.appendChild(el('div', { className: 'text-tx-3 text-sm py-4 text-center' }, '최근 검색 기록이 없습니다.'));
    } else {
      const recentList = el('div', { className: 'flex flex-col gap-2' });
      savedRecent.forEach(kw => {
        const item = el('div', { className: 'search-keyword-card group' });
        item.onclick = () => {
          searchInput.value = kw;
          renderSearchResults(kw);
        };
        const textSpan = el('span', { className: 'text-tx font-medium' }, kw);
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
      recList.appendChild(el('div', { className: 'search-keyword-card font-medium', textContent: kw, onclick: () => {
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

function showUserListModal(title, handles) {
  const listWrap = el('div', { className: 'flex flex-col gap-4 max-h-[60vh] overflow-y-auto' });
  
  if (!handles || handles.length === 0) {
    listWrap.appendChild(el('div', { className: 'text-center text-tx-3 py-8' }, '사용자가 없습니다.'));
  } else {
    handles.forEach(handle => {
      const u = store.getUser(handle);
      if (!u) return;
      
      const item = el('div', { className: 'flex items-center justify-between' });
      const profileInfo = el('div', { className: 'flex items-center gap-3 cursor-pointer', onclick: () => { modal.close(); window.navigateTo('profile/' + u.handle); } });
      profileInfo.appendChild(renderAvatar(u, 'av-md', true));
      profileInfo.appendChild(el('div', { className: 'flex flex-col' },
        el('span', { className: 'font-bold text-sm text-tx' }, u.displayName),
        el('span', { className: 'text-xs text-tx-2' }, '@' + u.handle)
      ));
      item.appendChild(profileInfo);
      
      const currentUser = store.getState().currentUser;
      if (currentUser && currentUser.handle !== u.handle) {
        const isFollowing = store.isFollowing(u.handle);
        const followBtn = el('button', {
          className: `btn btn-sm ${isFollowing ? 'btn-secondary' : 'btn-primary'}`,
          onclick: (e) => {
            e.stopPropagation();
            store.toggleFollow(u.handle);
            const following = store.isFollowing(u.handle);
            followBtn.className = `btn btn-sm ${following ? 'btn-secondary' : 'btn-primary'}`;
            followBtn.textContent = following ? t('following') : t('follow');
            
            const match = window.location.hash.match(/^#profile\/([^/]+)/);
            if (match) {
              const viewedHandle = match[1];
              const profileStats = document.querySelector('.profile-stats');
              if (profileStats) {
                // If viewing u's profile, update their followers count
                if (viewedHandle === u.handle && profileStats.children[1]) {
                  const countEl = profileStats.children[1].querySelector('.font-semibold');
                  if (countEl) countEl.textContent = store.getUser(u.handle).followers?.length || 0;
                  
                  // Also update the main profile follow button
                  const mainFollowBtn = document.querySelector('.profile-actions .btn');
                  if (mainFollowBtn && mainFollowBtn.textContent !== t('message')) {
                    mainFollowBtn.className = `btn btn-sm ${following ? 'btn-secondary' : 'btn-primary'}`;
                    mainFollowBtn.textContent = following ? t('following') : t('follow');
                  }
                }
                // If viewing own profile, update my following count
                if (currentUser && viewedHandle === currentUser.handle && profileStats.children[2]) {
                  const countEl = profileStats.children[2].querySelector('.font-semibold');
                  if (countEl) countEl.textContent = store.getUser(currentUser.handle).following?.length || 0;
                }
              }
            }
          }
        }, isFollowing ? t('following') : t('follow'));
        item.appendChild(followBtn);
      }
      
      listWrap.appendChild(item);
    });
  }
  
  const wrap = el('div', { className: 'p-6 flex flex-col gap-4' },
    el('h2', { className: 'text-xl font-bold text-tx mb-2' }, title),
    listWrap
  );
  
  const modal = showModal(wrap, { className: 'w-full max-w-sm' });
}

export function renderProfilePage(container, { handle }) {
  container.innerHTML = '';
  const user = store.getUser(handle.replace(/^@/, ''));
  const currentUser = store.getState().currentUser;
  
  if (!user) {
    container.appendChild(el('div', { className: 'empty', style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' } },
      el('div', { className: 'mb-6', innerHTML: '<svg viewBox="0 0 100 100" fill="none" width="80" height="80"><g fill="#ffffff" transform="translate(0, 4)"><rect x="10" y="48" width="80" height="24"/><rect x="50" y="48" width="40" height="24" transform="rotate(-60 50 60)"/><rect x="50" y="48" width="40" height="24" transform="rotate(-120 50 60)"/></g></svg>' }),
      el('h3', { className: 'text-tx text-xl font-bold mb-2', textContent: t('userNotFound') }),
      el('p', { className: 'text-tx-3 text-sm', textContent: t('userNotFoundSub') })
    ));
    return;
  }

  const isOwn = currentUser && currentUser.handle === user.handle;
  const posts = store.getUserPosts(user.handle);
  
  const wrap = el('div', { className: 'page-container profile-page anim-fade', style: { maxWidth: '935px' } });
  
  // Header
  const header = el('div', { className: 'profile-header' });
  
  const avatarWrap = el('div', { className: 'profile-avatar-wrap' },
    renderAvatar(user, 'av-2xl', true)
  );
  
  const info = el('div', { className: 'profile-info' });
  const row1 = el('div', { className: 'profile-row1' });
  
  row1.appendChild(el('h2', { className: 'profile-handle flex items-center flex-wrap gap-2' }, 
    el('span', { className: 'font-bold' }, user.displayName),
    el('span', { className: 'opacity-80 ml-2' }, user.handle.startsWith('@') ? user.handle : '@' + user.handle),
    user.verified ? el('span', { className: 'verified flex-shrink-0', innerHTML: icons.verified(18) }) : null
  ));
  
  const actions = el('div', { className: 'profile-actions ml-4' });
  if (isOwn) {
    actions.appendChild(el('button', { className: 'btn-icon btn-ghost', onclick: () => window.navigateTo('settings/profile'), title: '프로필 편집' }, el('span', { innerHTML: icons.edit(24) })));
  } else if (currentUser) {
    const isFollowing = store.isFollowing(user.handle);
    const followBtn = el('button', { 
      className: `btn btn-sm ${isFollowing ? 'btn-secondary' : 'btn-primary'}`,
      onclick: (e) => {
        store.toggleFollow(user.handle);
        const following = store.isFollowing(user.handle);
        e.target.className = `btn btn-sm ${following ? 'btn-secondary' : 'btn-primary'}`;
        e.target.textContent = following ? t('following') : t('follow');
        if (stats && stats.children[1]) {
          const countEl = stats.children[1].querySelector('.font-semibold');
          if (countEl) countEl.textContent = store.getUser(user.handle).followers?.length || 0;
        }
      }
    }, isFollowing ? t('following') : t('follow'));
    actions.appendChild(followBtn);
    actions.appendChild(el('button', { className: 'btn btn-secondary btn-sm', onclick: () => toast(t('messageFeatureReady')) }, t('message')));
  }
  row1.appendChild(actions);
  
  const stats = el('div', { className: 'profile-stats mb-4' },
    el('div', { className: 'profile-stat' }, el('span', { className: 'text-tx-2 text-sm mr-1' }, t('statReefs').trim()), el('span', { className: 'font-semibold text-base' }, posts.length)),
    el('div', { className: 'profile-stat', onclick: () => showUserListModal(t('statFollowers').trim(), user.followers || []) }, el('span', { className: 'text-tx-2 text-sm mr-1' }, t('statFollowers').trim()), el('span', { className: 'font-semibold text-base' }, user.followers?.length || 0)),
    el('div', { className: 'profile-stat', onclick: () => showUserListModal(t('statFollowing').trim(), user.following || []) }, el('span', { className: 'text-tx-2 text-sm mr-1' }, t('statFollowing').trim()), el('span', { className: 'font-semibold text-base' }, user.following?.length || 0))
  );
  
  const nameBio = el('div', { className: 'w-full min-w-0 flex flex-col gap-1 mt-3' });
  
  if (user.bio) {
    const isLongBio = user.bio.length > 150 || (user.bio.match(/\n/g) || []).length > 3;
    const bioText = el('div', { 
      className: 'profile-bio text-base break-words whitespace-pre-wrap text-tx-2', 
      textContent: user.bio 
    });
    
    if (isLongBio) {
      bioText.style.display = '-webkit-box';
      bioText.style.webkitBoxOrient = 'vertical';
      bioText.style.webkitLineClamp = '3';
      bioText.style.overflow = 'hidden';
      
      const toggleMoreBtn = el('button', { className: 'text-sm font-bold text-brand bg-transparent p-0 border-none cursor-pointer mt-1' }, '자세히 보기');
      let expanded = false;
      toggleMoreBtn.onclick = () => {
        expanded = !expanded;
        if (expanded) {
          bioText.style.webkitLineClamp = 'unset';
          toggleMoreBtn.textContent = '간략히 보기';
        } else {
          bioText.style.webkitLineClamp = '3';
          toggleMoreBtn.textContent = '자세히 보기';
        }
      };
      const bioWrap = el('div', { className: 'flex flex-col items-start w-full min-w-0 mt-1 mb-1' },
        bioText,
        toggleMoreBtn
      );
      nameBio.appendChild(bioWrap);
    } else {
      nameBio.appendChild(el('div', { className: 'w-full min-w-0 mb-1' }, bioText));
    }
  }

  if (user.website) {
    nameBio.appendChild(el('a', { 
      className: 'profile-bio-link hover:underline break-words text-sm text-tx-2 block', 
      href: user.website.startsWith('http') ? user.website : 'https://' + user.website, target: '_blank' 
    }, 
      el('span', { innerHTML: icons.link ? icons.link(14) : '🔗', className: 'inline-block align-middle mr-1' }),
      el('span', { className: 'align-middle' }, user.website.replace(/^https?:\/\//, ''))
    ));
  }
  
  info.append(row1, stats, nameBio);
  header.append(avatarWrap, info);
  wrap.appendChild(header);
  
  // Tabs and Grid
  let activeTab = 'posts';
  const gridContainer = el('div', { className: 'mt-1' });

  const renderGrid = () => {
    gridContainer.innerHTML = '';
    
    const userStories = store.getState().stories.filter(s => s.authorHandle === user.handle).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const combinedItems = [];
    
    if (activeTab === 'posts') {
      let drafts = [];
      if (isOwn) {
        drafts = store.getDrafts(user.handle);
      }
      
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
        className: 'profile-grid-cell flex flex-col items-center justify-center bg-element border-2 border-dashed border-base text-tx-3 hover:text-brand hover:border-brand cursor-pointer',
        style: { transition: 'transform 0.3s ease, border-color 0.3s, color 0.3s' },
        onclick: () => window.navigateTo('create'),
        onmouseenter: (e) => e.currentTarget.style.transform = 'translateY(-4px)',
        onmouseleave: (e) => e.currentTarget.style.transform = 'none'
      },
        el('span', { innerHTML: icons.plusSquare(32) }),
        el('span', { className: 'font-semibold mt-2' }, t('create'))
      ));
      
      // Render drafts
      const drafts = store.getDrafts(user.handle);
      drafts.forEach(draft => {
        const cell = el('div', { 
          className: 'profile-grid-cell relative group cursor-pointer border-2 border-brand/50', 
          onclick: () => window.navigateTo(`create/draft/${draft.id}`) 
        });
        
        cell.appendChild(el('div', { className: 'absolute top-2 left-2 bg-brand px-2 py-1 rounded-full text-xs font-bold text-white z-10' }, '작성 중'));
        cell.appendChild(el('div', { className: 'absolute top-2 right-2 bg-black/60 px-2 py-1 rounded-full text-xs font-bold text-white z-10' }, draft.type === 'story' ? t('shellLabel').split(' ')[0] : t('reefLabel').split(' ')[0]));
        
        if (draft.type === 'story' && draft.data && draft.data.layers) {
          const bgLayer = draft.data.layers.find(l => l.type === 'image');
          if (bgLayer) {
            cell.appendChild(el('img', { src: bgLayer.content, className: 'w-full h-full object-cover group-hover:scale-105 transition-transform opacity-70' }));
          } else {
            cell.appendChild(el('div', { className: 'w-full h-full bg-gradient-to-br from-brand/20 to-element group-hover:scale-105 transition-transform opacity-70' }));
          }
        } else if (draft.type === 'post') {
          if (draft.data.images && draft.data.images.length) {
            cell.appendChild(el('img', { src: draft.data.images[0], className: 'opacity-70 group-hover:scale-105 transition-transform w-full h-full object-cover' }));
          } else {
            cell.appendChild(el('div', { className: 'w-full h-full flex items-center justify-center bg-subtle p-4 opacity-70' }, 
              el('p', { className: 'text-sm text-tx-2 line-clamp-3 text-center' }, draft.data.caption || '내용 없음')
            ));
          }
        }
        
        grid.appendChild(cell);
      });
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
            const clickedIndex = userStories.indexOf(story);
            const groupedStories = [{ authorHandle: user.handle, stories: userStories }];
            import('./components.js').then(m => m.renderStoryViewer(0, groupedStories, clickedIndex));
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
      container.appendChild(el('div', { className: 'empty', style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' } }, 
        el('div', { className: 'mb-6', innerHTML: '<svg viewBox="0 0 100 100" fill="none" width="80" height="80"><g fill="#ffffff" transform="translate(0, 4)"><rect x="10" y="48" width="80" height="24"/><rect x="50" y="48" width="40" height="24" transform="rotate(-60 50 60)"/><rect x="50" y="48" width="40" height="24" transform="rotate(-120 50 60)"/></g></svg>' }),
        el('h3', { className: 'text-tx text-xl font-bold mb-2', textContent: t('notFound') })
      ));
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

  // Vertical divider
  const divider = el('div', { 
    style: { 
      width: '1px', 
      height: '16px', 
      background: 'var(--border)', 
      alignSelf: 'center', 
      margin: '0 4px' 
    } 
  });
  langBar.appendChild(divider);

  // Theme Toggle Button
  const isDark = document.body.classList.contains('theme-dark') || 
    (store.getTheme() === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  const themeBtn = el('button', {
    className: 'px-2 py-1 flex items-center justify-center rounded-full transition-all cursor-pointer text-tx-2 hover:bg-hover hover:text-tx',
    style: { border: 'none', background: 'transparent' },
    onclick: () => {
      const currentTheme = document.body.classList.contains('theme-dark') || 
        (store.getTheme() === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
        ? 'dark' : 'light';
      
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      store.setTheme(nextTheme);
      
      themeBtn.innerHTML = nextTheme === 'dark' ? icons.sun(16) : icons.moon(16);
      
      let msg = '';
      if (localStorage.getItem('koral_language') === 'ko') {
        msg = nextTheme === 'dark' ? '다크 모드로 변경되었습니다.' : '라이트 모드로 변경되었습니다.';
      } else if (localStorage.getItem('koral_language') === 'ja') {
        msg = nextTheme === 'dark' ? 'ダークモードに変更されました。' : 'ライトモードに変更されました。';
      } else if (localStorage.getItem('koral_language') === 'zh') {
        msg = nextTheme === 'dark' ? '已切换至深色模式。' : '已切换至浅色模式。';
      } else {
        msg = nextTheme === 'dark' ? 'Changed to Dark Mode.' : 'Changed to Light Mode.';
      }
      toast(msg, 'success');
    }
  });
  
  themeBtn.innerHTML = isDark ? icons.sun(16) : icons.moon(16);
  langBar.appendChild(themeBtn);

  return langBar;
}

export function renderLoginPage(container, isAddAccount = false) {
  container.innerHTML = '';
  
  const currentLang = localStorage.getItem('koral_language') || 'ko';
  const addAccountTitle = currentLang === 'ko' ? '계정 추가' : currentLang === 'ja' ? 'アカウント追加' : currentLang === 'zh' ? '添加账号' : 'Add Account';
  const addAccountSub = currentLang === 'ko' ? '기존 계정으로 로그인하여 여러 계정을 쉽게 전환하세요.' : currentLang === 'ja' ? '既存のアカウントでログインして、簡単に切り替えます。' : currentLang === 'zh' ? '登录现有账号以轻松切换。' : 'Log in to an existing account to easily switch between them.';
  
  const shell = el('div', { className: 'auth-shell' },
    createAuthLanguageBar(),
    el('div', { className: 'auth-banner-side' },
      el('div', { className: 'auth-orb auth-orb-1' }),
      el('div', { className: 'auth-orb auth-orb-2' }),
      el('div', { innerHTML: '<svg viewBox="0 0 100 100" fill="none" width="80" height="80"><defs><linearGradient id="alg3" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#ef4444"/><stop offset="100%" stop-color="#f43f5e"/></linearGradient></defs><g fill="url(#alg3)" transform="translate(0, 4)"><rect x="10" y="48" width="80" height="24"/><rect x="50" y="48" width="40" height="24" transform="rotate(-60 50 60)"/><rect x="50" y="48" width="40" height="24" transform="rotate(-120 50 60)"/></g></svg>' }),
      el('h1', { className: 'auth-banner-title' }, isAddAccount ? addAccountTitle : t('welcomeBanner')),
      el('p', { className: 'auth-banner-sub' }, isAddAccount ? addAccountSub : t('welcomeSub'))
    ),
    el('div', { className: 'auth-form-side' },
      el('div', { className: 'auth-card' },
        el('div', { className: 'auth-logo md:hidden mb-8 flex flex-col items-center' },
          el('div', { className: 'auth-logo-icon', innerHTML: '<svg viewBox="0 0 100 100" fill="none" width="48" height="48"><defs><linearGradient id="alg" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#ef4444"/><stop offset="100%" stop-color="#f43f5e"/></linearGradient></defs><g fill="url(#alg)" transform="translate(0, 4)"><rect x="10" y="48" width="80" height="24"/><rect x="50" y="48" width="40" height="24" transform="rotate(-60 50 60)"/><rect x="50" y="48" width="40" height="24" transform="rotate(-120 50 60)"/></g></svg>' }),
          el('h1', { className: 'auth-title' }, isAddAccount ? addAccountTitle : 'koral')
        ),
        el('form', { className: 'auth-form', onsubmit: async (e) => {
          e.preventDefault();
          const id = e.target.id.value;
          const pw = e.target.pw.value;
          const res = await store.login(id, pw);
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
        (() => {
          const form = el('form', { className: 'auth-form mt-4', onsubmit: async (e) => {
            e.preventDefault();
            const t = e.target;
            
            let handle = t.handle.value.trim();
            if (!handle.startsWith('@')) handle = '@' + handle;
            
            if (t.pw.value !== t.pwConfirm.value) {
              toast('비밀번호가 일치하지 않습니다.', 'error');
              return;
            }
            
            const res = await store.register({
              handle,
              displayName: t.displayName.value.trim(),
              email: t.email.value.trim(),
              password: t.pw.value,
              avatar: avatarDataUrl,
              verificationCode: t.verificationCode.value.trim()
            });
            
            if (res.ok) window.navigateTo('feed');
            else toast(res.error, 'error');
          }},
            el('div', { className: 'auth-avatar-upload mb-4' }), // will append preview
            
            el('div', { className: 'input-group mb-3 flex gap-2' }, 
              el('input', { name: 'email', type: 'email', className: 'input flex-1', placeholder: t('emailPlaceholder'), required: true }),
              el('button', { type: 'button', className: 'btn btn-secondary whitespace-nowrap', onclick: async (e) => {
                const emailInput = e.target.previousElementSibling;
                const email = emailInput.value.trim();
                if (!email || !email.includes('@')) {
                  toast('유효한 이메일을 입력해주세요.', 'error');
                  return;
                }
                const btn = e.target;
                btn.disabled = true;
                btn.textContent = '발송중...';
                
                const res = await store.sendVerificationCode(email);
                if (res.ok) {
                  toast('입력하신 이메일로 인증코드가 발송되었습니다.', 'success');
                  btn.textContent = '재발송';
                  
                  // Show OTP container with animation
                  const otpWrap = btn.closest('.auth-form').querySelector('.otp-container');
                  if (otpWrap) {
                    otpWrap.style.display = 'block';
                    otpWrap.classList.add('anim-fade');
                    otpWrap.querySelector('input').focus();
                  }
                } else {
                  toast(res.error || '발송 실패', 'error');
                  btn.textContent = '인증 발송';
                }
                btn.disabled = false;
              } }, '인증 발송')
            ),
            
            (() => {
              const otpContainer = el('div', { className: 'input-group mb-3 otp-container', style: { display: 'none' } });
              const hiddenInput = el('input', { type: 'hidden', name: 'verificationCode', required: true });
              
              const boxContainer = el('div', { className: 'flex gap-2 justify-between' });
              const boxes = Array.from({ length: 6 }, () => el('input', { 
                type: 'text', 
                className: 'input text-center text-xl font-bold font-mono', 
                style: { width: '40px', height: '48px', padding: '0' },
                maxLength: 1 
              }));
              
              const updateHidden = () => {
                hiddenInput.value = boxes.map(b => b.value).join('');
              };
              
              boxes.forEach((box, i) => {
                box.addEventListener('input', (e) => {
                  updateHidden();
                  if (e.target.value && i < boxes.length - 1) boxes[i + 1].focus();
                });
                box.addEventListener('keydown', (e) => {
                  if (e.key === 'Backspace' && !e.target.value && i > 0) boxes[i - 1].focus();
                  if (e.key === 'ArrowLeft' && i > 0) boxes[i - 1].focus();
                  if (e.key === 'ArrowRight' && i < boxes.length - 1) boxes[i + 1].focus();
                });
                box.addEventListener('paste', (e) => {
                  e.preventDefault();
                  const pasted = (e.clipboardData || window.clipboardData).getData('text').slice(0, 6);
                  [...pasted].forEach((char, idx) => {
                    if (idx < 6) {
                      boxes[idx].value = char;
                      if (idx < 5) boxes[idx+1].focus();
                      else boxes[5].blur();
                    }
                  });
                  updateHidden();
                });
                boxContainer.appendChild(box);
              });
              
              otpContainer.append(el('label', { className: 'input-label text-sm mb-2 block' }, '인증코드 6자리'), boxContainer, hiddenInput);
              return otpContainer;
            })(),
            
            el('div', { className: 'input-group mb-3' }, el('input', { name: 'displayName', className: 'input', placeholder: t('nicknamePlaceholder'), required: true })),
            el('div', { className: 'input-group mb-3' }, 
              el('div', { className: 'input-wrap' },
                el('div', { className: 'input-prefix' }, '@'),
                el('input', { name: 'handle', className: 'input', placeholder: t('handlePlaceholder'), required: true })
              )
            ),
            el('div', { className: 'input-group mb-3' }, el('input', { name: 'pw', type: 'password', className: 'input', placeholder: t('password'), required: true, minLength: 4 })),
            el('div', { className: 'input-group mb-6' }, el('input', { name: 'pwConfirm', type: 'password', className: 'input', placeholder: '비밀번호 확인', required: true, minLength: 4 })),
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
          );
          return form;
        })(),
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
  
  const langBar = createAuthLanguageBar();
  langBar.classList.add('animate-entrance');
  langBar.style.animationDelay = '800ms';

  const landing = el('div', { className: 'landing' },
    langBar,
    el('div', { className: 'mesh-bg' },
      el('div', { className: 'orb-1' }), el('div', { className: 'orb-2' }), el('div', { className: 'orb-3' })
    ),
    el('div', { className: 'landing-logo animate-entrance', style: { animationDelay: '1000ms' }, innerHTML: '<svg viewBox="0 0 100 100" fill="none" width="64" height="64"><defs><linearGradient id="llg" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#ef4444"/><stop offset="100%" stop-color="#f43f5e"/></linearGradient></defs><g fill="url(#llg)" transform="translate(0, 4)"><rect x="10" y="48" width="80" height="24"/><rect x="50" y="48" width="40" height="24" transform="rotate(-60 50 60)"/><rect x="50" y="48" width="40" height="24" transform="rotate(-120 50 60)"/></g></svg>' }),
    el('h1', { className: 'g-text animate-entrance', style: { animationDelay: '1200ms' } }, t('welcomeBanner')),
    el('p', { className: 'landing-sub animate-entrance', style: { animationDelay: '1400ms' } }, t('welcomeSub')),
    el('div', { className: 'landing-buttons animate-entrance', style: { animationDelay: '1600ms' } },
      el('button', { className: 'btn btn-primary btn-lg', onclick: () => window.navigateTo('signup') }, t('signup')),
      el('button', { className: 'btn btn-secondary btn-lg', onclick: () => window.navigateTo('login') }, t('login'))
    )
  );
  container.appendChild(landing);
}

export function renderCreatePage(container, options = {}) {
  if (options.subRoute === 'story' || (options.subRoute === 'draft' && store.getDraft(options.draftId)?.type === 'story')) {
    import('./components.js').then(m => m.renderStoryCreator(container, options));
    return;
  }
  if (options.subRoute === 'post' || (options.subRoute === 'draft' && store.getDraft(options.draftId)?.type === 'post')) {
    renderPostEditor(container, options);
    return;
  }

  container.innerHTML = '';
  const wrap = el('div', { className: 'page-container anim-fade flex flex-col items-start create-page', style: { maxWidth: '768px' } });
  
  const header = el('div', { className: 'mb-8 text-left w-full' },
    el('h2', { className: 'text-2xl font-bold text-tx mb-2 text-left' }, t('createTitle')),
    el('p', { className: 'text-tx-3 text-left' }, t('createQuestion'))
  );

  const optionsWrap = el('div', { className: 'flex flex-col gap-4 w-full max-w-md' });

  const createOption = (title, desc, icon, onClick) => {
    return el('div', {
      className: 'w-full flex items-center justify-start gap-6 p-6 bg-element border border-base rounded-2xl hover:bg-hover hover:border-brand transition-all group cursor-pointer text-left create-option-card',
      onclick: onClick,
      role: 'button',
      tabIndex: 0
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
    createOption(t('reefLabel'), t('reefDesc'), icons.grid, () => window.navigateTo('create/post')),
    createOption(t('shellLabel'), t('shellDesc'), icons.image, () => window.navigateTo('create/story')),
    createOption(t('devNoteLabel'), t('devNoteDesc'), icons.monitor, () => toast(t('featureReadyInfo'), 'info'))
  );

  wrap.append(header, optionsWrap);
  container.appendChild(wrap);
}

function renderPostEditor(container, options = {}) {
  const currentLang = localStorage.getItem('koral_language') || 'ko';
  container.innerHTML = '';
  const wrap = el('div', { className: 'page-container anim-fade', style: { maxWidth: '768px' } });
  const form = el('form', { className: 'w-full flex flex-col', onsubmit: (e) => e.preventDefault() });
  const editorHeader = el('div', { className: 'mb-6 flex items-center justify-between' },
    el('h2', { className: 'text-2xl font-bold text-tx' }, options.draftId ? t('editDraft', '임시저장 편집') : t('newReef'))
  );
  
  const currentUser = store.getState().currentUser;
  let initialValue = '';
  let initialTitle = '';
  
  if (options.draftId) {
    const draft = store.getDraft(options.draftId);
    if (draft && draft.type === 'post') {
      initialValue = draft.data.caption || '';
      initialTitle = draft.data.title || '';
    }
  }

  const editorWrap = el('div', { className: 'mb-6' },
    createRichTextEditor({
      id: options.draftId ? `draft_${options.draftId}` : `create_post_${currentUser ? currentUser.id : 'guest'}`,
      placeholder: t('writeSomething'),
      submitLabel: t('reefUpload'),
      initialValue,
      initialTitle,
      minHeight: '400px',
      showTitle: true,
      onDraftSave: (text, title) => {
        const postDraft = { title, caption: text };
        store.saveDraft('post', postDraft, options.draftId);
        toast(currentLang === 'ko' ? '임시저장 되었습니다.' : 'Draft saved.', 'success');
      },
      onSubmit: async (text, title) => {
        const imgMatches = [...text.matchAll(/!\[.*?\]\((.*?)\)/g)];
        const images = imgMatches.map(m => m[1]);
        const plainText = text.replace(/<[^>]*>?/gm, ' ');
        const tagMatches = [...plainText.matchAll(/(?:^|\s)#([가-힣a-zA-Z0-9_]+)/g)];
        const tags = tagMatches.map(m => '#' + m[1]);

        const result = await store.createPost({ title, images, caption: text, location: '', tags });
        if (result && result.ok) {
          toast(currentLang === 'ko' ? '리프가 생성되었습니다.' : 'Reef created successfully.', 'success');
          localStorage.removeItem(`koral_editor_draft_create_post_${currentUser ? currentUser.id : 'guest'}`);
          if (options.draftId) {
            store.removeDraft(options.draftId);
          }
          window.navigateTo('post/' + result.post.id);
        }
      }
    })
  );
  
  form.append(editorHeader, editorWrap);
  wrap.appendChild(form);
  container.appendChild(wrap);
}

function renderSettingsLayout(container, activeTab, mainContentEl) {
  const existingMain = container.querySelector('.settings-main-content');
  const existingTabs = container.querySelector('.profile-tabs');
  
  if (existingMain && existingTabs) {
    // Settings outer shell already exists! Only update the tab highlights and transition the inner content box
    const tabElements = existingTabs.querySelectorAll('.profile-tab');
    const links = [
      { id: 'profile' },
      { id: 'security' },
      { id: 'theme' },
      { id: 'language' }
    ];
    tabElements.forEach((tabEl, index) => {
      const link = links[index];
      if (link) {
        if (link.id === activeTab) {
          tabEl.classList.add('active');
        } else {
          tabEl.classList.remove('active');
        }
      }
    });
    
    existingMain.innerHTML = '';
    mainContentEl.classList.add('inner-settings-fade');
    existingMain.appendChild(mainContentEl);
    return;
  }
  
  container.innerHTML = '';
  const wrap = el('div', { className: 'page-container settings-page anim-fade', style: { maxWidth: '768px' } });
  
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
  mainContentEl.classList.add('inner-settings-fade');
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

  const cleanVal = (v) => (v === 'undefined' || v === 'null' || v == null) ? '' : v;
  const currentDisplayName = cleanVal(currentUser.displayName);
  const currentBio = cleanVal(currentUser.bio);
  const currentWebsite = cleanVal(currentUser.website);
  let currentAvatar = cleanVal(currentUser.avatar);

  const cleanUser = { ...currentUser, displayName: currentDisplayName, avatar: currentAvatar };

  const content = el('div');
  content.appendChild(el('h3', { className: 'text-2xl font-bold mb-8 text-tx' }, t('editProfile')));
  
  const avatarPreview = el('div', {}, renderAvatar(cleanUser, 'av-2xl'));
  
  const avatarWrap = el('div', { 
    className: 'relative cursor-pointer hover:opacity-80 transition-opacity inline-block',
    title: '프로필 사진 변경',
    onclick: () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      document.body.appendChild(input);
      input.onchange = async (ev) => {
        const file = ev.target.files[0];
        document.body.removeChild(input);
        if (!file) return;
        try {
          const dataUrl = await resizeImage(file, 400);
          currentAvatar = dataUrl;
          avatarPreview.innerHTML = '';
          avatarPreview.appendChild(renderAvatar({ ...cleanUser, avatar: currentAvatar }, 'av-2xl'));
          removeAvatarBtn.style.visibility = 'visible';
        } catch (err) {
          toast('이미지 처리에 실패했습니다.', 'error');
        }
      };
      input.click();
    }
  });

  avatarWrap.append(
    avatarPreview,
    el('div', { className: 'absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full pointer-events-none shadow-md', innerHTML: icons.image(16) })
  );

  const removeAvatarBtn = el('button', {
    type: 'button',
    className: 'btn btn-ghost text-red-500 mt-4 text-sm font-medium',
    style: currentAvatar ? 'visibility: visible;' : 'visibility: hidden;',
    onclick: () => {
      currentAvatar = '';
      avatarPreview.innerHTML = '';
      avatarPreview.appendChild(renderAvatar({ ...cleanUser, avatar: null }, 'av-2xl'));
      removeAvatarBtn.style.visibility = 'hidden';
    }
  }, '프로필 제거');

  const form = el('form', { onsubmit: async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
      let avatarUrl = currentUser.avatar;
      if (currentAvatar && currentAvatar.startsWith('data:')) {
        avatarUrl = await store._uploadImage(currentAvatar);
      } else if (!currentAvatar) {
        avatarUrl = null;
      } else {
        avatarUrl = currentAvatar;
      }

      await store.updateProfile({
        displayName: e.target.displayName.value,
        bio: e.target.bio.value,
        website: e.target.website.value,
        avatar: avatarUrl
      });
      toast(localStorage.getItem('koral_language') === 'en' ? 'Profile updated successfully.' : '프로필이 업데이트되었습니다.', 'success');
      window.navigateTo(`profile/${currentUser.handle.replace(/^@/, '')}`);
    } catch (err) {
      toast('Failed to update profile.', 'error');
      btn.textContent = originalText;
      btn.disabled = false;
    }
  }});

  form.append(
    el('div', { className: 'flex flex-col items-center mb-8' },
      avatarWrap,
      removeAvatarBtn
    ),
    el('div', { className: 'input-group mb-6' },
      el('label', { className: 'input-label' }, t('nickname')),
      el('input', { name: 'displayName', className: 'input input-lg', value: currentDisplayName, required: true })
    ),
    el('div', { className: 'input-group mb-6' },
      el('label', { className: 'input-label' }, t('bio')),
      el('textarea', { name: 'bio', className: 'textarea', value: currentBio, rows: 4 })
    ),
    el('div', { className: 'input-group mb-8' },
      el('label', { className: 'input-label' }, t('website')),
      el('input', { name: 'website', className: 'input input-lg', value: currentWebsite, placeholder: 'https://' })
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
      className: 'settings-item flex items-center gap-4 p-5 rounded-2xl border border-base bg-subtle hover:bg-hover hover:border-str transition-all cursor-pointer shadow-sm', 
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
      className: 'settings-item flex items-center gap-4 p-5 rounded-2xl border border-base bg-subtle hover:bg-hover hover:border-str transition-all cursor-pointer shadow-sm', 
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
      className: 'settings-item flex items-center gap-4 p-5 rounded-2xl border border-base bg-subtle hover:bg-hover hover:border-str transition-all cursor-pointer shadow-sm mt-4', 
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
