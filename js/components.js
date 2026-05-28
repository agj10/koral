import { icons } from './icons.js';
import { el, $, $$, timeAgo, renderMarkdown, escapeHtml, getInitials, toast, showModal, confirmDialog, resizeImage, uid, debounce } from './utils.js';
import { store } from './store.js';
import { createRichTextEditor } from './editor.js';

export function renderAvatar(user, sizeClass = 'av-md', hasStoryRing = false) {
  if (!user) return el('div', { className: `avatar ${sizeClass}` });
  
  const inner = el('div', { className: hasStoryRing ? 'av-inner' : `avatar ${sizeClass}` });
  
  if (user.avatar && user.avatar.startsWith('data:')) {
    inner.appendChild(el('img', { src: user.avatar, alt: user.displayName }));
  } else if (user.avatar) {
    inner.style.background = `url(${user.avatar}) center/cover`;
  } else {
    inner.textContent = getInitials(user.displayName);
  }
  
  if (hasStoryRing) {
    return el('div', { className: `av-story ${sizeClass}` }, inner);
  }
  return inner;
}

export function renderPostCard(post, options = {}) {
  const author = store.getUser(post.authorHandle) || { displayName: 'Unknown', handle: post.authorHandle };
  const currentUser = store.getState().currentUser;
  const isOwn = currentUser && currentUser.handle === post.authorHandle;
  const isLiked = currentUser && post.likes.includes(currentUser.handle);
  const isBookmarked = currentUser && post.bookmarks.includes(currentUser.handle);
  const comments = store.getPostComments(post.id);

  const card = el('article', { className: 'post-card flex flex-col bg-element border border-base rounded-2xl overflow-hidden' });

  // Header
  const header = el('div', { className: 'post-header' });
  const authorLink = el('div', { 
    className: 'post-author',
    onclick: () => window.navigateTo(`profile/${post.authorHandle.substring(1)}`)
  },
    renderAvatar(author, 'av-md', true), // give story ring to everyone for aesthetic
    el('div', { className: 'post-author-info' },
      el('div', { className: 'post-author-name' }, 
        el('span', { innerHTML: renderMarkdown(author.displayName) }),
        author.verified ? el('span', { className: 'verified', innerHTML: icons.verified(14) }) : null
      ),
      el('div', { className: 'post-author-handle' }, post.location || post.authorHandle)
    )
  );

  const moreBtn = el('button', { className: 'btn-icon-sm btn-ghost' }, el('span', { innerHTML: icons.more(20) }));
  const dropdown = el('div', { className: 'dropdown-menu' },
    isOwn ? el('div', { className: 'dropdown-item danger', onclick: async () => {
      if (await confirmDialog('정말 이 게시물을 삭제하시겠습니까?')) {
        store.deletePost(post.id);
        toast('삭제되었습니다.', 'success');
        if (options.onNavigate) options.onNavigate('');
      }
    }}, el('span', { innerHTML: icons.trash(16) }), '삭제') : 
    el('div', { className: 'dropdown-item danger', onclick: () => {
      toast('신고가 접수되었습니다.', 'success');
    }}, '신고'),
    el('div', { className: 'dropdown-item', onclick: () => {
      navigator.clipboard.writeText(window.location.origin + window.location.pathname + '#/post/' + post.id);
      toast('링크가 복사되었습니다.', 'success');
    }}, el('span', { innerHTML: icons.link(16) }), '링크 복사')
  );
  
  const moreWrap = el('div', { className: 'dropdown' }, moreBtn, dropdown);
  
  let dropdownOpen = false;
  moreBtn.onclick = (e) => {
    e.stopPropagation();
    dropdownOpen = !dropdownOpen;
    dropdown.classList.toggle('open', dropdownOpen);
  };
  document.addEventListener('click', () => {
    if (dropdownOpen) {
      dropdownOpen = false;
      dropdown.classList.remove('open');
    }
  });

  header.append(authorLink, moreWrap);

  // Images are rendered inline within the caption (markdown/html)

  // Actions
  const actionRow = el('div', { className: 'post-actions' });
  
  const likeBtnSpan = el('span', { innerHTML: isLiked ? icons.heartFilled(24) : icons.heart(24) });
  const likeCountSpan = el('span', { className: 'text-sm font-semibold ml-1', textContent: post.likes.length > 0 ? post.likes.length : '' });
  
  const likeBtn = el('button', { className: `post-action-btn flex items-center ${isLiked?'liked':''}` }, 
    likeBtnSpan,
    likeCountSpan
  );
  
  const shareBtn = el('button', { className: 'post-action-btn', onclick: () => toast('공유 기능 준비중') }, el('span', { innerHTML: icons.share(24) }));
  const bookmarkBtn = el('button', { className: `post-action-btn ${isBookmarked?'bookmarked':''}` }, 
    el('span', { innerHTML: isBookmarked ? icons.bookmarkFilled(24) : icons.bookmark(24) })
  );

  const likePost = () => {
    if (!currentUser) { toast('로그인이 필요합니다', 'error'); return; }
    const nowLiked = store.toggleLike(post.id);
    likeBtn.className = `post-action-btn flex items-center ${nowLiked?'liked':''}`;
    likeBtnSpan.innerHTML = nowLiked ? icons.heartFilled(24) : icons.heart(24);
    const newCount = store.getPost(post.id).likes.length;
    likeCountSpan.textContent = newCount > 0 ? newCount : '';
  };

  likeBtn.onclick = likePost;
  bookmarkBtn.onclick = () => {
    if (!currentUser) { toast('로그인이 필요합니다', 'error'); return; }
    const nowBk = store.toggleBookmark(post.id);
    bookmarkBtn.className = `post-action-btn ${nowBk?'bookmarked':''}`;
    bookmarkBtn.innerHTML = '';
    bookmarkBtn.appendChild(el('span', { innerHTML: nowBk ? icons.bookmarkFilled(24) : icons.bookmark(24) }));
  };

  actionRow.append(likeBtn, shareBtn, el('div', { className: 'post-action-spacer' }), bookmarkBtn);

  // Body
  const body = el('div', { className: 'post-body' });
  
  const captionEl = el('div', { className: 'post-caption' },
    post.title ? el('h1', { className: 'text-2xl font-bold text-tx mb-2' }, post.title) : null,
    el('div', { innerHTML: renderMarkdown(post.caption) })
  );

  const tagsEl = el('div', { className: 'post-tags' });
  (post.tags || []).forEach(tag => {
    const t = el('span', { className: 'post-tag', textContent: tag, onclick: () => window.navigateTo(`tag/${tag.substring(1)}`) });
    tagsEl.appendChild(t);
  });

  const timeEl = el('div', { className: 'post-time' }, timeAgo(post.createdAt));

  body.append(captionEl, tagsEl, timeEl);
  
  // Top/Bottom layout for Post Card
  card.appendChild(header);
  card.appendChild(actionRow);
  
  const bodyScroll = el('div', { className: 'post-card-body-wrap' });
  bodyScroll.appendChild(body);
  card.appendChild(bodyScroll);

  // Quick comment input
  if (options.compact) {
    const commentWrap = el('div', { className: 'px-4 pb-4 border-t border-base' },
      createRichTextEditor({
        placeholder: '댓글 남기기...',
        submitLabel: '게시',
        minHeight: '40px',
        onSubmit: (text) => {
          if (!currentUser) return toast('로그인이 필요합니다.', 'error');
          store.addComment({ postId: post.id, parentId: null, text });
          toast('댓글이 작성되었습니다', 'success');
          if(options.onNavigate) options.onNavigate(`post/${post.id}`);
        }
      })
    );
    card.appendChild(commentWrap);
  }

  return card;
}

export function renderStoryRow() {
  const row = el('div', { className: 'stories-row' });
  const currentUser = store.getState().currentUser;
  
  if (currentUser) {
    row.appendChild(
      el('div', { className: 'story-item' },
        el('div', { className: 'story-add' }, '+'),
        el('div', { className: 'story-name' }, '내 스토리')
      )
    );
  }

  // Sample stories from users
  store.getState().users.filter(u => u.id !== (currentUser?.id)).slice(0, 8).forEach(user => {
    const seen = Math.random() > 0.5;
    const item = el('div', { className: 'story-item', onclick: () => toast('스토리 기능 준비중') },
      el('div', { className: `story-ring ${seen?'seen':''}` },
        el('div', { className: 'story-inner' }, el('img', { src: user.avatar || generatePlaceholderImage() }))
      ),
      el('div', { className: `story-name truncate ${seen?'seen':''}` }, user.handle)
    );
    row.appendChild(item);
  });

  return row;
}

export function renderSuggestSidebar() {
  const currentUser = store.getState().currentUser;
  if (!currentUser) return el('div');

  const container = el('div', { className: 'aside-content' });
  
  const asideSwitch = el('div', { 
    className: 'aside-switch cursor-pointer flex items-center justify-center p-2 rounded-lg hover:bg-hover transition-colors',
    style: { position: 'relative' }
  }, el('span', { innerHTML: icons.more(20) }));
  
  // Floating menus — appended to body so they never affect layout
  const menuStyle = 'position:fixed;width:16rem;background:var(--bg-el);border:1px solid var(--border);border-radius:var(--r-2xl);box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);display:none;flex-direction:column;overflow:hidden;z-index:99999;';
  const moreDropdown = el('div', { style: menuStyle });
  const switcherDropdown = el('div', { style: menuStyle });
  document.body.append(moreDropdown, switcherDropdown);
  
  let dropdownOpen = false;
  let switcherOpen = false;

  const positionMenu = (menu) => {
    const rect = asideSwitch.getBoundingClientRect();
    menu.style.top = (rect.bottom + 4) + 'px';
    menu.style.right = (window.innerWidth - rect.right) + 'px';
    menu.style.left = 'auto';
  };

  const showMenu = (menu) => { positionMenu(menu); menu.style.display = 'flex'; };
  const hideMenu = (menu) => { menu.style.display = 'none'; };

  // Build More Dropdown
  const switchBtn = el('div', { className: 'dropdown-item flex items-center gap-3 px-4 py-3 hover:bg-hover cursor-pointer transition-colors text-sm text-tx', onclick: (e) => {
    e.stopPropagation();
    dropdownOpen = false;
    switcherOpen = true;
    hideMenu(moreDropdown);
    showMenu(switcherDropdown);
  }}, el('span', { innerHTML: icons.user(18) }), '계정 전환');
  
  const logoutBtn = el('div', { className: 'dropdown-item danger flex items-center gap-3 px-4 py-3 border-t border-base hover:bg-red-50 cursor-pointer transition-colors text-sm text-red-500', onclick: () => {
    store.logout();
    window.navigateTo('login');
  }}, el('span', { innerHTML: icons.logout(18) }), '로그아웃');

  moreDropdown.append(switchBtn, logoutBtn);

  // Build Switcher Dropdown
  switcherDropdown.appendChild(el('div', { className: 'px-4 py-3 border-b border-base text-xs font-bold text-tx-3 uppercase tracking-wider flex items-center gap-2' }, 
    el('span', { className: 'cursor-pointer hover:text-tx', innerHTML: icons.chevronLeft(16), onclick: (e) => {
      e.stopPropagation();
      switcherOpen = false;
      dropdownOpen = true;
      hideMenu(switcherDropdown);
      showMenu(moreDropdown);
    }}),
    '계정 전환'
  ));
  
  const otherUsers = store.getState().users.filter(u => u.id !== currentUser.id).slice(0, 2);
  otherUsers.forEach(u => {
    const item = el('div', { className: 'dropdown-item flex items-center gap-3 px-4 py-3 hover:bg-hover cursor-pointer transition-colors', onclick: () => {
      store.getState().currentUser = u;
      store._save();
      window.location.hash = '';
      window.location.reload();
    }},
      renderAvatar(u, 'av-sm'),
      el('div', { className: 'font-semibold text-tx text-sm' }, u.handle)
    );
    switcherDropdown.appendChild(item);
  });
  
  switcherDropdown.appendChild(el('div', { className: 'dropdown-item flex items-center gap-3 px-4 py-3 hover:bg-hover cursor-pointer transition-colors text-sm text-brand font-semibold border-t border-base', onclick: () => {
    store.logout();
    window.navigateTo('login');
  } }, el('span', { innerHTML: icons.plusSquare(18) }), '기존 계정 추가'));

  asideSwitch.onclick = (e) => {
    e.stopPropagation();
    if (switcherOpen) {
      switcherOpen = false;
      hideMenu(switcherDropdown);
    } else {
      dropdownOpen = !dropdownOpen;
      if (dropdownOpen) showMenu(moreDropdown); else hideMenu(moreDropdown);
    }
  };

  document.addEventListener('click', () => {
    if (dropdownOpen || switcherOpen) {
      dropdownOpen = false;
      switcherOpen = false;
      hideMenu(moreDropdown);
      hideMenu(switcherDropdown);
    }
  });

  const myProfile = el('div', { className: 'aside-profile flex items-center justify-between mb-6', style: { position: 'relative' } },
    el('div', { className: 'flex items-center gap-3' },
      renderAvatar(currentUser, 'av-lg'),
      el('div', { className: 'aside-profile-info' },
        el('div', { className: 'aside-profile-name font-bold cursor-pointer hover:underline', onclick: () => window.navigateTo(`profile/${currentUser.handle.substring(1)}`) }, currentUser.handle),
        el('div', { className: 'aside-profile-handle text-sm text-tx-2', innerHTML: renderMarkdown(currentUser.displayName).replace(/^<p>/, '').replace(/<\/p>$/,'') })
      )
    ),
    asideSwitch
  );

  const suggestBox = el('div', { className: 'suggest-card' },
    el('div', { className: 'suggest-header' },
      el('h4', { textContent: '회원님을 위한 추천' }),
      el('a', { textContent: '모두 보기', style: { cursor: 'pointer' } })
    )
  );

  const suggested = store.getSuggestedUsers();
  suggested.forEach(user => {
    const item = el('div', { className: 'suggest-user' },
      renderAvatar(user, 'av-md', true),
      el('div', { className: 'suggest-user-info' },
        el('div', { className: 'suggest-user-name', onclick: () => window.navigateTo(`profile/${user.handle.substring(1)}`) }, user.handle),
        el('div', { className: 'suggest-user-sub' }, '회원님을 위한 추천')
      ),
      el('button', { 
        className: 'btn-ghost btn-sm', 
        style: { color: 'var(--tx-br)', fontWeight: '600' },
        onclick: (e) => {
          store.toggleFollow(user.handle);
          e.target.textContent = store.isFollowing(user.handle) ? '팔로잉' : '팔로우';
          e.target.style.color = store.isFollowing(user.handle) ? 'var(--tx-3)' : 'var(--tx-br)';
        }
      }, '팔로우')
    );
    suggestBox.appendChild(item);
  });

  const footer = el('div', { className: 'aside-footer' },
    '소개 · 도움말 · 홍보 센터 · API · 채용 정보 · 개인정보처리방침 · 약관 · 위치 · 언어 · Meta Verified',
    el('br'), el('br'),
    '© 2026 koral'
  );

  container.append(myProfile, suggestBox, footer);
  return container;
}

export function renderThemeSelector() {
  const container = el('div', { className: 'theme-options' });
  const currentTheme = store.getTheme();

  const options = [
    { id: 'system', icon: '🖥️', label: '시스템 설정', desc: '기기 설정에 맞춤' },
    { id: 'light', icon: '☀️', label: '라이트 모드', desc: '밝은 테마' },
    { id: 'dark', icon: '🌙', label: '다크 모드', desc: '어두운 테마' }
  ];

  options.forEach(opt => {
    const isSel = currentTheme === opt.id;
    const card = el('div', { 
      className: `theme-option ${isSel ? 'selected' : ''}`,
      onclick: () => {
        store.setTheme(opt.id);
        $$('.theme-option', container).forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
      }
    },
      el('div', { className: 'theme-option-icon' }, opt.icon),
      el('div', { className: 'theme-option-label' }, opt.label),
      el('div', { className: 'theme-option-sub' }, opt.desc)
    );
    container.appendChild(card);
  });

  return container;
}

export function renderSearchBar(onNavigate) {
  const wrap = el('div', { className: 'search-wrap' });
  const input = el('input', { className: 'input', placeholder: '검색', type: 'text' });
  const icon = el('div', { className: 'search-icon', innerHTML: icons.search(16) });
  const results = el('div', { className: 'search-results hidden' });
  
  wrap.append(icon, input, results);

  const doSearch = debounce((q) => {
    if (!q) { results.classList.add('hidden'); return; }
    const users = store.searchUsers(q);
    results.innerHTML = '';
    
    if (users.length === 0) {
      results.appendChild(el('div', { className: 'p-3 text-center text-sm text-muted' }, '검색 결과가 없습니다.'));
    } else {
      users.forEach(u => {
        const item = el('div', { className: 'search-result-item', onclick: () => {
          results.classList.add('hidden');
          input.value = '';
          if (onNavigate) onNavigate(`profile/${u.handle.substring(1)}`);
        }},
          renderAvatar(u, 'av-sm'),
          el('div', {},
            el('div', { className: 'text-sm font-semibold' }, u.handle),
            el('div', { className: 'text-xs text-muted', innerHTML: renderMarkdown(u.displayName) })
          )
        );
        results.appendChild(item);
      });
    }
    results.classList.remove('hidden');
  }, 200);

  input.oninput = (e) => doSearch(e.target.value);
  input.onfocus = (e) => doSearch(e.target.value);
  
  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) results.classList.add('hidden');
  });

  return wrap;
}

export function renderCommentSection(postId) {
  const container = el('div', { className: 'comment-section flex flex-col w-full' });
  
  const refreshComments = () => {
    container.innerHTML = '';
    const commentList = buildList(null);
    if (commentList.children.length === 0) {
      container.appendChild(el('div', { className: 'empty-state py-8 text-center' },
        el('div', { className: 'text-lg font-semibold' }, '아직 댓글이 없습니다.'),
        el('div', { className: 'text-sm text-tx-3' }, '가장 먼저 댓글을 남겨보세요.')
      ));
    } else {
      container.appendChild(commentList);
    }
  };

  const buildList = (parentId) => {
    const comments = parentId === null ? store.getPostComments(postId) : store.getCommentReplies(parentId);
    const wrap = el('div', { className: parentId === null ? 'flex flex-col gap-4' : 'flex flex-col pl-6 mt-3 gap-3 border-l-2 border-base ml-4' });
    
    comments.forEach(c => {
      const author = store.getUser(c.authorHandle) || { displayName: 'Unknown', handle: c.authorHandle };
      const currentUser = store.getState().currentUser;
      const isLiked = currentUser && c.likes && c.likes.includes(currentUser.handle);
      const likesCount = c.likes ? c.likes.length : 0;
      
      const likeBtnSpan = el('span', { innerHTML: isLiked ? icons.heartFilled(14) : icons.heart(14) });
      const likeCountSpan = el('span', { textContent: likesCount > 0 ? likesCount : '' });
      
      const toggleCommentLike = (e) => {
        e.stopPropagation();
        if (!currentUser) return toast('로그인이 필요합니다.', 'error');
        const nowLiked = store.toggleCommentLike(c.id);
        const newCount = store.getState().comments.find(cm => cm.id === c.id).likes.length;
        likeBtnSpan.innerHTML = nowLiked ? icons.heartFilled(14) : icons.heart(14);
        e.currentTarget.classList.toggle('text-brand', nowLiked);
        likeCountSpan.textContent = newCount > 0 ? newCount : '';
      };
      
      const itemWrapper = el('div', { className: 'flex flex-col' });
      const repliesContainer = el('div');
      
      // author.handle already contains '@', so don't add another
      const handleForPlaceholder = author.handle.startsWith('@') ? author.handle : '@' + author.handle;
      
      const replyBtn = el('span', { className: 'comment-action cursor-pointer hover:text-tx', onclick: () => {
        const existing = itemWrapper.querySelector('.reply-editor-wrap');
        if (existing) {
          existing.remove();
          return;
        }
        const replyEditorWrap = el('div', { className: 'reply-editor-wrap mt-2' });
        replyEditorWrap.appendChild(
          createRichTextEditor({
            placeholder: `${handleForPlaceholder}에게 답글 남기기...`,
            submitLabel: '답글',
            minHeight: '40px',
            onSubmit: (text) => {
              if (!currentUser) return toast('로그인이 필요합니다.', 'error');
              store.addComment({ postId, parentId: c.id, text });
              toast('답글이 작성되었습니다', 'success');
              refreshComments();
            }
          })
        );
        itemWrapper.insertBefore(replyEditorWrap, repliesContainer);
      }}, '답글 달기');

      const item = el('div', { className: 'comment-item w-full' },
        renderAvatar(author, 'av-sm'),
        el('div', { className: 'comment-body w-full' },
          el('span', { className: 'comment-author cursor-pointer hover:underline', onclick: () => window.navigateTo(`profile/${author.handle.substring(1)}`) }, author.handle),
          ' ',
          el('span', { className: 'comment-text', innerHTML: renderMarkdown(c.text).replace(/^<p>/, '').replace(/<\/p>$/, '') }),
          el('div', { className: 'comment-actions' },
            el('span', { className: 'comment-time' }, timeAgo(c.createdAt)),
            replyBtn
          )
        ),
        el('div', { className: `pt-1 flex items-center gap-1 cursor-pointer hover:text-tx transition-colors text-xs text-tx-3 ${isLiked ? 'text-brand' : ''}`, onclick: toggleCommentLike }, 
          likeBtnSpan,
          likeCountSpan
        )
      );
      
      itemWrapper.appendChild(item);
      
      // Collapsible replies
      const replyData = store.getCommentReplies(c.id);
      if (replyData.length > 0) {
        const repliesContent = buildList(c.id);
        repliesContent.style.display = 'none';
        
        const toggleLabel = el('span', { textContent: `답글 ${replyData.length}개 보기` });
        const toggleBtn = el('div', { 
          className: 'flex items-center gap-2 cursor-pointer text-xs font-semibold text-tx-3 hover:text-tx transition-colors ml-4 pl-6 mt-1',
          onclick: () => {
            const isHidden = repliesContent.style.display === 'none';
            repliesContent.style.display = isHidden ? '' : 'none';
            toggleLabel.textContent = isHidden ? `답글 ${replyData.length}개 숨기기` : `답글 ${replyData.length}개 보기`;
            chevronIcon.style.transform = isHidden ? 'rotate(180deg)' : '';
          }
        });
        const chevronIcon = el('span', { innerHTML: icons.chevronDown(12), style: 'transition:transform 0.2s ease;' });
        toggleBtn.append(el('span', { style: 'width:24px;height:1px;background:var(--tx-3);display:inline-block;vertical-align:middle;' }), toggleLabel, chevronIcon);
        
        repliesContainer.appendChild(toggleBtn);
        repliesContainer.appendChild(repliesContent);
      }
      itemWrapper.appendChild(repliesContainer);
      wrap.appendChild(itemWrapper);
    });
    return wrap;
  };

  // Expose refreshComments so external callers can trigger re-render
  container._refreshComments = refreshComments;
  
  refreshComments();

  return container;
}

export function renderPostPreviewCard(post, options = {}) {
  const author = store.getUser(post.authorHandle) || { displayName: 'Unknown', handle: post.authorHandle };
  const card = el('article', { 
    className: 'post-card cursor-pointer hover:shadow-md transition-all flex flex-col',
    onclick: () => window.navigateTo(`post/${post.id}`)
  });

  // Extract first image from content if post.images is empty
  let coverImage = post.images && post.images.length ? post.images[0] : null;
  const tmp = document.createElement('div');
  tmp.innerHTML = renderMarkdown(post.caption || '');
  
  if (!coverImage) {
    const firstImg = tmp.querySelector('img');
    if (firstImg) coverImage = firstImg.src;
  }

  if (coverImage) {
    const imgWrap = el('div', { className: 'w-full bg-muted rounded-t-2xl', style: { overflow: 'hidden' } });
    imgWrap.appendChild(el('img', { src: coverImage, className: 'w-full h-auto block', style: { maxHeight: '400px', objectFit: 'contain' } }));
    card.appendChild(imgWrap);
  }

  const body = el('div', { className: 'p-5 flex flex-col flex-1' });
  
  if (post.title) {
    body.appendChild(el('h3', { className: 'text-xl font-bold text-tx mb-2 clamp2' }, post.title));
  }
  
  // Remove all images and videos from the preview text, but keep formatting
  tmp.querySelectorAll('img, video').forEach(el => el.remove());
  if (tmp.innerHTML.trim()) {
    body.appendChild(el('div', { className: 'text-tx-2 text-sm clamp3 mb-4', innerHTML: tmp.innerHTML }));
  }

  const meta = el('div', { className: 'flex items-center justify-between mt-auto pt-4 border-t border-base' });
  
  const authorWrap = el('div', { className: 'flex items-center gap-2' },
    renderAvatar(author, 'av-sm'),
    el('div', { className: 'text-xs' },
      el('div', { className: 'font-semibold text-tx' }, author.handle),
      el('div', { className: 'text-tx-3' }, timeAgo(post.createdAt))
    )
  );
  
  const statsWrap = el('div', { className: 'flex items-center gap-3 text-xs text-tx-3' });
  
  const currentUser = store.getState().currentUser;
  const isLiked = currentUser && post.likes.includes(currentUser.handle);
  
  const likeStat = el('div', { 
    className: `flex items-center gap-1 cursor-pointer hover:text-tx transition-colors ${isLiked ? 'text-brand' : ''}`,
    onclick: (e) => {
      e.stopPropagation();
      if (!currentUser) return toast('로그인이 필요합니다.', 'error');
      const nowLiked = store.toggleLike(post.id);
      likeStat.innerHTML = '';
      likeStat.appendChild(el('span', { innerHTML: nowLiked ? icons.heartFilled(14) : icons.heart(14) }));
      likeStat.appendChild(document.createTextNode(' ' + store.getPost(post.id).likes.length));
      likeStat.className = `flex items-center gap-1 cursor-pointer hover:text-tx transition-colors ${nowLiked ? 'text-brand' : ''}`;
    }
  }, el('span', { innerHTML: isLiked ? icons.heartFilled(14) : icons.heart(14) }), ' ' + post.likes.length);
  
  statsWrap.append(likeStat);

  meta.append(authorWrap, statsWrap);
  body.appendChild(meta);
  card.appendChild(body);

  return card;
}


