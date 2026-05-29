import { icons } from './icons.js';
import { el, $, $$, timeAgo, renderMarkdown, escapeHtml, getInitials, toast, showModal, confirmDialog, resizeImage, uid, debounce } from './utils.js';
import { store } from './store.js';
import { renderAvatar, renderPostCard, renderPostPreviewCard, renderStoryRow, renderSuggestSidebar, renderThemeSelector, renderCommentSection } from './components.js';
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
        el('p', { className: 'text-lg font-semibold text-tx' }, '아직 리프가 없습니다.'),
        el('p', { className: 'text-sm mt-2' }, '첫 번째 리프를 작성하거나 다른 사용자를 팔로우해 보세요.')
      ));
    } else {
      const grid = el('div', { className: 'grid gap-6 w-full', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' } });
      posts.forEach(post => {
        grid.appendChild(renderPostPreviewCard(post));
      });
      main.appendChild(grid);
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
  
  const wrap = el('div', { className: 'page-container anim-fade' });
  
  const tagsRow = el('div', { className: 'explore-tags-row mb-6' });
  ['#사진', '#일상', '#디자인', '#개발', '#여행', '#맛집'].forEach(tag => {
    tagsRow.appendChild(el('div', { className: 'chip', textContent: tag, onclick: () => window.navigateTo(`tag/${tag.substring(1)}`) }));
  });
  wrap.appendChild(tagsRow);
  
  const grid = el('div', { className: 'grid gap-6', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' } });
  posts.forEach(post => {
    grid.appendChild(renderPostPreviewCard(post));
  });
  
  wrap.appendChild(grid);
  container.appendChild(wrap);
}

export function renderProfilePage(container, { handle }) {
  container.innerHTML = '';
  const user = store.getUser('@' + handle);
  const currentUser = store.getState().currentUser;
  
  if (!user) {
    container.appendChild(el('div', { className: 'empty pt-20' },
      el('h3', { textContent: '사용자를 찾을 수 없습니다.' }),
      el('p', { textContent: '링크가 잘못되었거나 삭제된 계정입니다.' })
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
    actions.appendChild(el('button', { className: 'btn btn-secondary btn-sm', onclick: () => window.navigateTo('settings/profile') }, '프로필 편집'));
    actions.appendChild(el('button', { className: 'btn-icon-sm btn-ghost', onclick: () => window.navigateTo('settings') }, el('span', { innerHTML: icons.settings(20) })));
  } else if (currentUser) {
    const isFollowing = store.isFollowing(user.handle);
    const followBtn = el('button', { 
      className: `btn btn-sm ${isFollowing ? 'btn-secondary' : 'btn-primary'}`,
      onclick: () => {
        store.toggleFollow(user.handle);
        window.navigateTo(`profile/${handle}`); // re-render
      }
    }, isFollowing ? '팔로잉' : '팔로우');
    actions.appendChild(followBtn);
    actions.appendChild(el('button', { className: 'btn btn-secondary btn-sm', onclick: () => toast('메시지 기능 준비중') }, '메시지'));
  }
  row1.appendChild(actions);
  
  const stats = el('div', { className: 'profile-stats mb-4' },
    el('div', { className: 'profile-stat' }, el('span', { className: 'font-semibold text-base' }, posts.length), ' 리프'),
    el('div', { className: 'profile-stat', onclick: () => toast('팔로워 목록 준비중') }, el('span', { className: 'font-semibold text-base' }, user.followers?.length || 0), ' 팔로워'),
    el('div', { className: 'profile-stat', onclick: () => toast('팔로잉 목록 준비중') }, el('span', { className: 'font-semibold text-base' }, user.following?.length || 0), ' 팔로우')
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
    const displayPosts = activeTab === 'posts' ? posts : store.getState().posts.filter(p => p.bookmarks.includes(currentUser.handle)).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    
    if (displayPosts.length === 0) {
      gridContainer.appendChild(el('div', { className: 'empty py-16' },
        el('div', { className: 'empty-icon' }, activeTab === 'posts' ? '📸' : '🔖'),
        el('h3', { textContent: activeTab === 'posts' ? '리프 없음' : '저장된 리프 없음' })
      ));
      return;
    }

    const grid = el('div', { className: 'profile-grid' });
    displayPosts.forEach(post => {
      const cell = el('div', { className: 'profile-grid-cell', onclick: () => window.navigateTo(`post/${post.id}`) });
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
      const likeBtnSpan = el('span', { innerHTML: isLiked ? icons.heartFilled(16) : icons.heart(16) });
      const countNode = document.createTextNode(' ' + post.likes.length);
      
      const overlay = el('div', { className: 'profile-grid-cell-overlay flex justify-center items-center text-white' },
        el('div', { className: `flex items-center gap-2 font-bold text-lg cursor-pointer hover:scale-110 transition-transform ${isLiked ? 'text-brand' : ''}`, onclick: (e) => {
          e.stopPropagation();
          if (!currentUser) return toast('로그인이 필요합니다', 'error');
          const nowLiked = store.toggleLike(post.id);
          likeBtnSpan.innerHTML = nowLiked ? icons.heartFilled(20) : icons.heart(20);
          e.currentTarget.className = `flex items-center gap-2 font-bold text-lg cursor-pointer hover:scale-110 transition-transform ${nowLiked ? 'text-brand' : ''}`;
          countNode.textContent = ' ' + store.getPost(post.id).likes.length;
        } }, likeBtnSpan, countNode)
      );
      cell.appendChild(overlay);
      grid.appendChild(cell);
    });
    gridContainer.appendChild(grid);
  };

  const updateTabs = () => {
    tabPosts.className = `profile-tab ${activeTab === 'posts' ? 'active' : ''}`;
    if (tabSaved) tabSaved.className = `profile-tab ${activeTab === 'saved' ? 'active' : ''}`;
  };

  const tabPosts = el('div', { className: 'profile-tab active', onclick: () => { activeTab = 'posts'; updateTabs(); renderGrid(); } }, el('span', { innerHTML: icons.grid(12) }), '리프');
  const tabSaved = isOwn ? el('div', { className: 'profile-tab', onclick: () => { activeTab = 'saved'; updateTabs(); renderGrid(); } }, el('span', { innerHTML: icons.bookmark(12) }), '저장됨') : null;

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
      container.appendChild(el('div', { className: 'empty pt-20' }, el('h3', { textContent: '리프를 찾을 수 없습니다.' })));
      return;
    }
    
    const wrap = el('div', { className: 'page-container anim-fade', style: { maxWidth: '768px' } });
    
    wrap.appendChild(renderPostCard(post, { compact: false, onNavigate: window.navigateTo }));
    
    const commentsWrap = el('div', { className: 'mt-6' });
    commentsWrap.appendChild(el('h3', { className: 'text-lg font-semibold mb-4 px-2' }, '댓글'));
    
    const commentSection = renderCommentSection(post.id);
    
    const currentUser = store.getState().currentUser;
    if (currentUser) {
      const inputWrap = el('div', { className: 'flex gap-3 mb-6 px-2 items-start' },
        renderAvatar(currentUser, 'av-md'),
        el('div', { className: 'flex-1' }, 
          createRichTextEditor({
            placeholder: '댓글 남기기...',
            submitLabel: '등록',
            minHeight: '60px',
            onSubmit: (text) => {
              store.addComment({ postId: post.id, parentId: null, text });
              toast('댓글이 작성되었습니다', 'success');
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

export function renderLoginPage(container) {
  container.innerHTML = '';
  const shell = el('div', { className: 'auth-shell' },
    el('div', { className: 'auth-banner-side' },
      el('div', { className: 'auth-orb auth-orb-1' }),
      el('div', { className: 'auth-orb auth-orb-2' }),
      el('div', { innerHTML: '<svg viewBox="0 0 100 100" fill="none" width="80" height="80"><defs><linearGradient id="alg3" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#ef4444"/><stop offset="100%" stop-color="#f43f5e"/></linearGradient></defs><g fill="url(#alg3)" transform="translate(0, 4)"><rect x="10" y="48" width="80" height="24"/><rect x="50" y="48" width="40" height="24" transform="rotate(-60 50 60)"/><rect x="50" y="48" width="40" height="24" transform="rotate(-120 50 60)"/></g></svg>' }),
      el('h1', { className: 'auth-banner-title' }, 'Welcome to', el('br'), 'koral'),
      el('p', { className: 'auth-banner-sub' }, '개발자를 위한 마크다운 SNS. 멋진 코드와 일상을 공유하세요.')
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
          el('h2', { className: 'text-2xl font-bold mb-6 text-tx hidden md:block' }, '로그인'),
          el('div', { className: 'input-group mb-4' },
            el('input', { name: 'id', className: 'input', placeholder: '핸들 또는 이메일', required: true })
          ),
          el('div', { className: 'input-group mb-8' },
            el('input', { name: 'pw', type: 'password', className: 'input', placeholder: '비밀번호', required: true })
          ),
          el('button', { type: 'submit', className: 'btn btn-primary w-full' }, '로그인')
        ),
        el('div', { className: 'auth-footer mt-8 border-t border-base pt-6' },
          '계정이 없으신가요? ',
          el('a', { onclick: () => window.navigateTo('signup') }, '가입하기')
        )
      )
    )
  );
  
  container.appendChild(shell);
}

export function renderSignupPage(container) {
  container.innerHTML = '';
  const shell = el('div', { className: 'auth-shell' },
    el('div', { className: 'auth-banner-side' },
      el('div', { className: 'auth-orb auth-orb-1' }),
      el('div', { className: 'auth-orb auth-orb-2' }),
      el('div', { innerHTML: '<svg viewBox="0 0 100 100" fill="none" width="80" height="80"><defs><linearGradient id="alg4" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#ef4444"/><stop offset="100%" stop-color="#f43f5e"/></linearGradient></defs><g fill="url(#alg4)" transform="translate(0, 4)"><rect x="10" y="48" width="80" height="24"/><rect x="50" y="48" width="40" height="24" transform="rotate(-60 50 60)"/><rect x="50" y="48" width="40" height="24" transform="rotate(-120 50 60)"/></g></svg>' }),
      el('h1', { className: 'auth-banner-title' }, 'Join', el('br'), 'koral'),
      el('p', { className: 'auth-banner-sub' }, '개발자들의 공간에 합류하세요. 새로운 아이디어와 코드가 기다립니다.')
    ),
    el('div', { className: 'auth-form-side' },
      el('div', { className: 'auth-card' },
        el('div', { className: 'auth-logo md:hidden mb-6 flex flex-col items-center' },
          el('div', { className: 'auth-logo-icon', innerHTML: '<svg viewBox="0 0 100 100" fill="none" width="48" height="48"><defs><linearGradient id="alg2" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#ef4444"/><stop offset="100%" stop-color="#f43f5e"/></linearGradient></defs><g fill="url(#alg2)" transform="translate(0, 4)"><rect x="10" y="48" width="80" height="24"/><rect x="50" y="48" width="40" height="24" transform="rotate(-60 50 60)"/><rect x="50" y="48" width="40" height="24" transform="rotate(-120 50 60)"/></g></svg>' }),
          el('h2', { className: 'text-lg font-semibold text-secondary px-4' }, '가입하세요')
        ),
        el('h2', { className: 'text-2xl font-bold mb-6 text-tx hidden md:block' }, '새 계정 만들기'),
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
          el('div', { className: 'input-group mb-3' }, el('input', { name: 'email', type: 'email', className: 'input', placeholder: '이메일 주소', required: true })),
          el('div', { className: 'input-group mb-3' }, el('input', { name: 'displayName', className: 'input', placeholder: '닉네임', required: true })),
          el('div', { className: 'input-group mb-3' }, 
            el('div', { className: 'input-wrap' },
              el('div', { className: 'input-prefix' }, '@'),
              el('input', { name: 'handle', className: 'input', placeholder: '핸들 입력', required: true })
            )
          ),
          el('div', { className: 'input-group mb-6' }, el('input', { name: 'pw', type: 'password', className: 'input', placeholder: '비밀번호', required: true, minLength: 4 })),
          el('label', { className: 'custom-checkbox mb-6' },
            el('input', { type: 'checkbox', required: true }),
            el('div', { className: 'checkbox-box' }),
            el('div', { className: 'checkbox-text' }, 
              '가입하면 koral의 ',
              el('a', { 
                className: 'text-tx-br font-semibold hover:underline', 
                onclick: (e) => {
                  e.preventDefault();
                  showModal(el('div', { className: 'p-6' }, 
                    el('h3', { className: 'text-xl font-bold mb-4' }, 'koral 서비스 약관'),
                    el('p', { className: 'text-sm text-tx-2 leading-relaxed' }, 'koral은 개발자를 위한 마크다운 기반 SNS입니다. 건전한 코드 공유 문화를 위해 타인을 비방하거나 악의적인 코드를 공유하지 않을 것에 동의합니다. 사용자의 데이터는 안전하게 보관되며 맞춤형 피드 제공을 위해 쿠키가 사용될 수 있습니다.')
                  ));
                }
              }, '약관'),
              ', 데이터 정책 및 쿠키 정책에 동의하게 됩니다.'
            )
          ),
          el('button', { type: 'submit', className: 'btn btn-primary w-full' }, '가입')
        ),
        el('div', { className: 'auth-footer mt-6 border-t border-base pt-6' },
          '계정이 있으신가요? ',
          el('a', { onclick: () => window.navigateTo('login') }, '로그인')
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
  uploadWrap.appendChild(el('span', { className: 'auth-avatar-label' }, '프로필 사진 추가'));
  
  container.appendChild(shell);
}

export function renderLandingPage(container) {
  container.innerHTML = '';
  const landing = el('div', { className: 'landing' },
    el('div', { className: 'mesh-bg' },
      el('div', { className: 'orb-1' }), el('div', { className: 'orb-2' }), el('div', { className: 'orb-3' })
    ),
    el('div', { className: 'landing-logo', innerHTML: '<svg viewBox="0 0 100 100" fill="none" width="64" height="64"><defs><linearGradient id="llg" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#ef4444"/><stop offset="100%" stop-color="#f43f5e"/></linearGradient></defs><g fill="url(#llg)" transform="translate(0, 4)"><rect x="10" y="48" width="80" height="24"/><rect x="50" y="48" width="40" height="24" transform="rotate(-60 50 60)"/><rect x="50" y="48" width="40" height="24" transform="rotate(-120 50 60)"/></g></svg>' }),
    el('h1', { className: 'g-text' }, '코드와 일상을 공유하세요'),
    el('p', { className: 'landing-sub' }, 'koral은 개발자를 위한 마크다운 중심 SNS입니다. 코드와 일상을 공유하세요.'),
    el('div', { className: 'landing-buttons' },
      el('button', { className: 'btn btn-primary btn-lg', onclick: () => window.navigateTo('signup') }, '가입하기'),
      el('button', { className: 'btn btn-secondary btn-lg', onclick: () => window.navigateTo('login') }, '로그인')
    )
  );
  container.appendChild(landing);
}

export function renderCreatePage(container) {
  container.innerHTML = '';
  const wrap = el('div', { className: 'page-container anim-fade', style: { maxWidth: '768px' } });
  
  const form = el('form', { className: 'w-full flex flex-col', onsubmit: (e) => e.preventDefault() });
  
  const editorHeader = el('div', { className: 'mb-6 flex items-center justify-between' },
    el('h2', { className: 'text-2xl font-bold text-tx' }, '새 리프 만들기')
  );
  
  const currentUser = store.getState().currentUser;
  const editorWrap = el('div', { className: 'mb-6' },
    createRichTextEditor({
      id: `create_post_${currentUser ? currentUser.id : 'guest'}`,
      placeholder: '이야기를 나누어 보세요...',
      submitLabel: '리프 올리기',
      minHeight: '400px',
      showTitle: true,
      onSubmit: (text, title) => {
        const imgMatches = [...text.matchAll(/!\[.*?\]\((.*?)\)/g)];
        const images = imgMatches.map(m => m[1]);
        
        const plainText = text.replace(/<[^>]*>?/gm, ' ');
        const tagMatches = [...plainText.matchAll(/(?:^|\s)#([가-힣a-zA-Z0-9_]+)/g)];
        const tags = tagMatches.map(m => '#' + m[1]);

        const post = store.createPost({
          title,
          images,
          caption: text,
          location: '',
          tags
        });
        if (post) {
          toast('리프가 생성되었습니다.', 'success');
          localStorage.removeItem(`koral_editor_draft_create_post_${currentUser ? currentUser.id : 'guest'}`);
          window.navigateTo('post', { postId: post.id });
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
  
  wrap.appendChild(el('h2', { className: 'text-2xl font-bold mb-6 text-tx' }, '설정'));
  
  const links = [
    { id: 'profile', icon: icons.user, label: '프로필 편집', route: 'settings/profile' },
    { id: 'security', icon: icons.lock, label: '계정 보안', route: 'settings/security' },
    { id: 'theme', icon: icons.sun, label: '테마', route: 'settings/theme' }
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
  content.appendChild(el('h3', { className: 'text-2xl font-bold mb-8 text-tx' }, '프로필 편집'));
  
  const form = el('form', { onsubmit: (e) => {
    e.preventDefault();
    store.updateProfile({
      displayName: e.target.displayName.value,
      bio: e.target.bio.value,
      website: e.target.website.value
    });
    toast('프로필이 업데이트되었습니다.', 'success');
    window.navigateTo(`profile/${currentUser.handle.substring(1)}`);
  }});

  form.append(
    el('div', { className: 'input-group mb-6' },
      el('label', { className: 'input-label' }, '닉네임'),
      el('input', { name: 'displayName', className: 'input input-lg', value: currentUser.displayName })
    ),
    el('div', { className: 'input-group mb-6' },
      el('label', { className: 'input-label' }, '소개 (마크다운 지원)'),
      el('textarea', { name: 'bio', className: 'textarea', value: currentUser.bio || '', rows: 4 })
    ),
    el('div', { className: 'input-group mb-8' },
      el('label', { className: 'input-label' }, '웹사이트'),
      el('input', { name: 'website', className: 'input input-lg', value: currentUser.website || '', placeholder: 'https://' })
    ),
    el('div', { className: 'flex justify-end' },
      el('button', { type: 'submit', className: 'btn btn-primary btn-lg shadow-md' }, '변경사항 저장')
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
