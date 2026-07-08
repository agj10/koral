import { icons } from './icons.js';
import { el, $, $$, timeAgo, renderMarkdown, escapeHtml, getInitials, toast, showModal, confirmDialog, resizeImage, uid, debounce } from './utils.js';
import { store } from './store.js';
import { t } from './lang.js';
import { createRichTextEditor } from './editor.js';

export function renderAvatar(user, sizeClass = 'av-md', hasStoryRing = false) {
  if (!user) return el('div', { className: `avatar ${sizeClass}` });
  
  const inner = el('div', { className: hasStoryRing ? 'av-inner' : `avatar ${sizeClass}` });
  
  if (user.avatar) {
    inner.style.background = `url("${user.avatar}") center/cover`;
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
    onclick: () => window.navigateTo(`profile/${post.authorHandle.replace(/^@/, '')}`)
  },
    renderAvatar(author, 'av-md', true), // give story ring to everyone for aesthetic
    el('div', { className: 'post-author-info' },
      el('div', { className: 'post-author-name flex items-center gap-1 font-semibold text-tx' }, 
        post.authorHandle,
        author.verified ? el('span', { className: 'verified', innerHTML: icons.verified(14) }) : null
      ),
      post.location ? el('div', { className: 'text-xs text-tx-3' }, post.location) : null
    )
  );

  const moreBtn = el('button', { className: 'btn-icon-sm btn-ghost' }, el('span', { innerHTML: icons.more(20) }));
  const dropdown = el('div', { className: 'dropdown-menu' },
    isOwn ? el('div', { className: 'dropdown-item', onclick: () => {
      dropdownOpen = false; dropdown.classList.remove('open');
      const editWrap = el('div', { className: 'p-4' });
      const modal = showModal(editWrap, { large: true });
      editWrap.appendChild(createRichTextEditor({
        initialValue: post.caption,
        submitLabel: t('editPost'),
        minHeight: '200px',
        onSubmit: (newText) => {
          const plainText = newText.replace(/<[^>]*>?/gm, ' ');
          const tagMatches = [...plainText.matchAll(/(?:^|\s)#([가-힣a-zA-Z0-9_]+)/g)];
          const tags = tagMatches.map(m => '#' + m[1]);
          store.editPost(post.id, newText, tags);
          toast(t('editSuccess'), 'success');
          modal.close();
          // Force a router re-render of the current page so changes appear in real-time
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        }
      }));
    }}, el('span', { innerHTML: icons.edit(16) }), t('edit')) : null,
    isOwn ? el('div', { className: 'dropdown-item danger', onclick: async () => {
      dropdownOpen = false; dropdown.classList.remove('open');
      if (await confirmDialog(t('deleteConfirm'))) {
        store.deletePost(post.id);
        toast(t('deleteSuccess'), 'success');
        if (window.history.length > 2) {
          window.history.back();
        } else if (options.onNavigate) {
          options.onNavigate('');
        }
      }
    }}, el('span', { innerHTML: icons.trash(16) }), t('delete')) : 
    el('div', { className: 'dropdown-item danger', onclick: () => {
      dropdownOpen = false; dropdown.classList.remove('open');
      toast(t('reportSuccess'), 'success');
    }}, t('report')),
    el('div', { className: 'dropdown-item', onclick: () => {
      navigator.clipboard.writeText(window.location.origin + window.location.pathname + '#/post/' + post.id);
      toast(t('linkCopied'), 'success');
    }}, el('span', { innerHTML: icons.link(16) }), localStorage.getItem('koral_language') === 'en' ? 'Copy Link' : '링크 복사')
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
  const likeCountSpan = el('span', { className: 'text-sm font-semibold ml-1', textContent: post.likes.length });
  
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
    likeCountSpan.textContent = newCount;
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
    const t = el('span', { className: 'post-tag', textContent: tag, onclick: () => window.navigateTo(`tag/${tag.replace(/^@/, '')}`) });
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
        placeholder: t('addComment'),
        submitLabel: t('registerBtn'),
        minHeight: '40px',
        onSubmit: (text) => {
          if (!currentUser) return toast(t('loginRequired'), 'error');
          store.addComment({ postId: post.id, parentId: null, text });
          toast(localStorage.getItem('koral_language') === 'en' ? 'Comment added successfully.' : '댓글이 작성되었습니다', 'success');
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
      el('div', { className: 'story-item', onclick: () => window.navigateTo('create/story') },
        el('div', { className: 'story-add' },
          el('span', { innerHTML: icons.plusSquare(24) })
        ),
        el('div', { className: 'story-name' }, t('myShell'))
      )
    );
  }

  const groupedStories = store.getGroupedStories();

  groupedStories.forEach((group, index) => {
    const user = store.getUser(group.authorHandle);
    if (!user) return;
    
    let allSeen = false;
    if (currentUser) {
      allSeen = group.stories.every(s => s.viewers.includes(currentUser.handle));
    }
    
    const item = el('div', { className: 'story-item', onclick: () => renderStoryViewer(index, groupedStories) },
      el('div', { className: `story-ring ${allSeen ? 'seen' : ''}` },
        el('div', { className: 'story-inner' }, el('img', { src: user.avatar || '' }))
      ),
      el('div', { className: `story-name truncate ${allSeen ? 'seen' : ''}` }, user.handle.startsWith('@') ? user.handle : '@' + user.handle)
    );
    row.appendChild(item);
  });

  return row;
}

export function renderStoryCreator(targetContainer = null, options = {}) {
  const currentUser = store.getState().currentUser;
  const currentLang = localStorage.getItem('koral_language') || 'ko';
  
  if (!currentUser) return toast(t('loginRequired') || '로그인이 필요합니다.', 'error');
  
  const wrap = el('div', { className: 'p-6 flex flex-col gap-4 bg-element border border-base rounded-2xl shadow-sm', style: { width: '100%', maxWidth: '548px', margin: '0 auto' } });
  if (!targetContainer) {
    wrap.appendChild(el('h2', { className: 'font-bold text-lg mb-2 text-tx text-center border-b border-base pb-3' }, options.draftId ? t('editDraft', '임시저장 편집') : t('newShell')));
  }
  
  let backgroundLayer = null;
  let textLayers = [];
  let activeLayerId = null;
  let layerElements = {}; 
  
  if (options.draftId) {
    const draft = store.getDraft(options.draftId);
    if (draft && draft.type === 'story' && draft.data && draft.data.layers) {
      draft.data.layers.forEach(l => {
        const absoluteLayer = {
          id: uid(),
          type: l.type,
          x: l.x * 500,
          y: l.y * 500,
          scale: l.scale,
          rotate: l.rotate,
          width: l.width * 500,
          height: l.height * 500
        };
        if (l.type === 'image') absoluteLayer.src = l.content;
        else absoluteLayer.html = l.content;
        
        if (l.type === 'image') backgroundLayer = absoluteLayer;
        else textLayers.push(absoluteLayer);
      });
    }
  }
  
  const canvasArea = el('div', { 
    className: 'relative overflow-hidden bg-gray-100 rounded-lg border border-base flex items-center justify-center shadow-inner',
    style: { width: '500px', height: '500px', maxWidth: '100%', aspectRatio: '1/1', touchAction: 'none', userSelect: 'none', margin: '0 auto' }
  });
  
  canvasArea.onpointerdown = (e) => {
    if (e.target === canvasArea || e.target.classList.contains('pointer-events-none')) {
      if (activeLayerId !== null) {
        activeLayerId = null;
        renderCanvas();
      }
    }
  };
  
  const placeholderText = currentLang === 'ko' ? '이미지를 업로드해주세요' : currentLang === 'ja' ? '画像をアップロードしてください' : currentLang === 'zh' ? '请上传图片' : 'Please upload an image';
  const placeholder = el('div', { className: 'text-tx-3 flex flex-col items-center pointer-events-none', style: { display: backgroundLayer ? 'none' : 'flex' } },
    el('span', { innerHTML: icons.image(32) }),
    placeholderText
  );
  canvasArea.appendChild(placeholder);
  
  const fileInput = el('input', { type: 'file', accept: 'image/*', className: 'hidden' });
  const uploadBtn = el('button', { className: 'btn btn-outline flex-1 flex items-center justify-center gap-2', onclick: () => fileInput.click() },
    el('span', { innerHTML: icons.image(18) }), t('uploadPhoto')
  );
  
  const addTextBtn = el('button', { className: 'btn btn-outline flex-1 flex items-center justify-center gap-2', disabled: true, onclick: () => {
    const textWrap = el('div', { className: 'p-4 flex flex-col gap-4' });
    const editor = createRichTextEditor({
      id: 'story_text_' + uid(),
      placeholder: t('writeSomething'),
      showTitle: false,
      minHeight: '100px',
      submitLabel: t('addText'),
      hideAdvanced: true,
      onSubmit: (html) => {
        if (!html.trim()) return toast(currentLang === 'ko' ? '내용을 입력하세요' : 'Please enter content', 'error');
        const id = uid();
        textLayers.push({ id, type: 'text', html, x: 250, y: 250, scale: 1, rotate: 0, width: 250, height: 50 });
        activeLayerId = id;
        renderCanvas();
        textModal.close();
      }
    });
    textWrap.appendChild(editor);
    const textModal = showModal(textWrap);
  }}, el('span', { innerHTML: icons.hash(18) }), t('addText'));
  
  fileInput.onchange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const src = await resizeImage(e.target.files[0], 1080);
        backgroundLayer = { id: uid(), type: 'image', src, x: 250, y: 250, scale: 1, rotate: 0, width: 350, height: 350 };
        activeLayerId = backgroundLayer.id;
        placeholder.style.display = 'none';
        addTextBtn.disabled = false;
        renderCanvas();
      } catch (err) {
        toast(currentLang === 'ko' ? '이미지 업로드 실패' : 'Failed to upload image', 'error');
      }
    }
  };
  
  let activeElement = null; 
  let startX, startY;
  let initialX, initialY, initialScale, initialRotate, initialWidth, initialHeight;
  let initialCx, initialCy, initialPointerDist;
  
  const handlePointerDown = (e, layer, action, direction) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (activeLayerId !== layer.id) {
      activeLayerId = layer.id;
      renderCanvas();
    }
    
    const el = layerElements[layer.id];
    activeElement = { layer, el, action, direction };
    
    startX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
    startY = e.clientY || (e.touches ? e.touches[0].clientY : 0);
    
    initialX = layer.x;
    initialY = layer.y;
    initialScale = layer.scale;
    initialRotate = layer.rotate;
    initialWidth = layer.width;
    initialHeight = layer.height;
    
    const rect = el.getBoundingClientRect();
    initialCx = rect.left + rect.width / 2;
    initialCy = rect.top + rect.height / 2;
    
    if (action === 'scale') {
      initialPointerDist = Math.hypot(startX - initialCx, startY - initialCy);
    }
  };
  
  const handlePointerMove = (e) => {
    if (!activeElement) return;
    e.preventDefault();
    const cx = e.clientX || (e.touches ? e.touches[0].clientX : 0);
    const cy = e.clientY || (e.touches ? e.touches[0].clientY : 0);
    const dx = cx - startX;
    const dy = cy - startY;
    
    const { layer, action, direction } = activeElement;
    const containerRect = canvasArea.getBoundingClientRect();
    const scaleRatio = 500 / containerRect.width;
    
    if (action === 'move') {
      layer.x = initialX + dx * scaleRatio;
      layer.y = initialY + dy * scaleRatio;
    } 
    else if (action === 'rotate') {
      const angle = Math.atan2(cy - initialCy, cx - initialCx) * 180 / Math.PI;
      layer.rotate = angle + 90;
    } 
    else if (action === 'scale') {
      const currentDist = Math.hypot(cx - initialCx, cy - initialCy);
      if (initialPointerDist > 0) {
        layer.scale = Math.max(0.1, initialScale * (currentDist / initialPointerDist));
      }
    } 
    else if (action === 'crop') {
      const radians = -initialRotate * Math.PI / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      const local_dx = dx * cos - dy * sin;
      const local_dy = dx * sin + dy * cos;
      
      let dw = 0, dh = 0;
      if (direction === 'e') dw = local_dx * scaleRatio;
      if (direction === 'w') dw = -local_dx * scaleRatio;
      if (direction === 's') dh = local_dy * scaleRatio;
      if (direction === 'n') dh = -local_dy * scaleRatio;
      
      layer.width = Math.max(50, initialWidth + dw * 2);
      if (layer.type === 'image') {
        layer.height = Math.max(50, initialHeight + dh * 2);
      }
    }
    
    updateElementTransform(activeElement.el, layer);
  };
  
  const handlePointerUp = () => {
    activeElement = null;
  };
  
  document.addEventListener('pointermove', handlePointerMove);
  document.addEventListener('pointerup', handlePointerUp);
  document.addEventListener('pointercancel', handlePointerUp);
  
  const cleanup = () => {
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);
    document.removeEventListener('pointercancel', handlePointerUp);
  };
  
  const updateElementTransform = (container, layer) => {
    container.style.left = (layer.x / 500 * 100) + '%';
    container.style.top = (layer.y / 500 * 100) + '%';
    container.style.transform = `translate(-50%, -50%) rotate(${layer.rotate}deg) scale(${layer.scale})`;
    container.style.width = (layer.width / 500 * 100) + '%';
    if (layer.type === 'image') {
      container.style.height = (layer.height / 500 * 100) + '%';
    } else {
      container.style.height = 'auto';
    }
  };
  
  const createLayerDOM = (layer) => {
    const isActive = activeLayerId === layer.id;
    const brandColor = 'var(--brand-a, #ff7171)';
    
    const container = el('div', { 
      className: 'absolute flex items-center justify-center',
      style: { transformOrigin: 'center center', cursor: 'move', userSelect: 'none', border: isActive ? `2px solid ${brandColor}` : '2px solid transparent', boxShadow: isActive ? '0 0 0 1px rgba(255,255,255,0.3)' : 'none', boxSizing: 'border-box' },
      ondblclick: () => {
        if (layer.type === 'text') {
          const textWrap = el('div', { className: 'p-4 flex flex-col gap-4' });
          const editor = createRichTextEditor({
            id: 'story_text_edit_' + layer.id,
            placeholder: t('writeSomething'),
            showTitle: false,
            initialValue: layer.html,
            minHeight: '100px',
            submitLabel: t('finishUpload', '완료'),
            hideAdvanced: true,
            onSubmit: (html) => {
              if (!html.trim()) return toast(currentLang === 'ko' ? '내용을 입력하세요' : 'Please enter content', 'error');
              layer.html = html;
              renderCanvas();
              textModal.close();
            }
          });
          textWrap.appendChild(editor);
          const textModal = showModal(textWrap);
        }
      }
    });
    
    if (layer.type === 'image') {
      container.appendChild(el('img', { 
        src: layer.src, 
        style: { width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', borderRadius: '4px' } 
      }));
    } else {
      const textWrap = el('div', { 
        style: { width: '100%', height: '100%', fontSize: '20px', fontWeight: 'bold', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.8)', wordBreak: 'normal', whiteSpace: 'pre-wrap', textAlign: 'center', pointerEvents: 'none', overflow: 'visible', display: 'block' }
      });
      textWrap.innerHTML = layer.html;
      container.appendChild(textWrap);
    }
    
    if (isActive) {
      const rotHandleWrap = el('div', { 
        style: { position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } 
      });
      rotHandleWrap.appendChild(el('div', { 
        dataset: { handle: 'true' },
        style: { width: '24px', height: '24px', backgroundColor: '#fff', border: `2px solid ${brandColor}`, borderRadius: '50%', cursor: 'crosshair', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' },
        onpointerdown: (e) => handlePointerDown(e, layer, 'rotate')
      }, el('span', { innerHTML: icons.plusSquare(12), style: { color: brandColor, pointerEvents: 'none' } }))); 
      rotHandleWrap.appendChild(el('div', { style: { width: '2px', height: '24px', backgroundColor: brandColor } }));
      
      const corners = [
        { dir: 'nw', style: { top: '-6px', left: '-6px', cursor: 'nwse-resize' } },
        { dir: 'ne', style: { top: '-6px', right: '-6px', cursor: 'nesw-resize' } },
        { dir: 'sw', style: { bottom: '-6px', left: '-6px', cursor: 'nesw-resize' } },
        { dir: 'se', style: { bottom: '-6px', right: '-6px', cursor: 'nwse-resize' } }
      ];
      corners.forEach(c => {
        container.appendChild(el('div', {
          dataset: { handle: 'true' },
          style: { position: 'absolute', width: '12px', height: '12px', backgroundColor: '#fff', border: `2px solid ${brandColor}`, borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', zIndex: 10, ...c.style },
          onpointerdown: (e) => handlePointerDown(e, layer, 'scale', c.dir)
        }));
      });
      
      const edges = [
        { dir: 'n', style: { top: '-3px', left: '50%', transform: 'translateX(-50%)', width: '24px', height: '6px', cursor: 'ns-resize' } },
        { dir: 's', style: { bottom: '-3px', left: '50%', transform: 'translateX(-50%)', width: '24px', height: '6px', cursor: 'ns-resize' } },
        { dir: 'w', style: { left: '-3px', top: '50%', transform: 'translateY(-50%)', width: '6px', height: '24px', cursor: 'ew-resize' } },
        { dir: 'e', style: { right: '-3px', top: '50%', transform: 'translateY(-50%)', width: '6px', height: '24px', cursor: 'ew-resize' } }
      ];
      edges.forEach(c => {
        if (layer.type === 'text' && (c.dir === 'n' || c.dir === 's')) return;
        container.appendChild(el('div', {
          dataset: { handle: 'true' },
          style: { position: 'absolute', backgroundColor: '#fff', border: `1px solid ${brandColor}`, borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', zIndex: 10, ...c.style },
          onpointerdown: (e) => handlePointerDown(e, layer, 'crop', c.dir)
        }));
      });
      
      container.appendChild(rotHandleWrap);
    }
    
    container.onpointerdown = (e) => {
      if (e.target === container || (container.contains(e.target) && !e.target.dataset.handle)) {
        handlePointerDown(e, layer, 'move');
      }
    };
    
    updateElementTransform(container, layer);
    return container;
  };
  
  const renderCanvas = () => {
    canvasArea.innerHTML = '';
    layerElements = {};
    if (backgroundLayer) {
      const bgEl = createLayerDOM(backgroundLayer);
      layerElements[backgroundLayer.id] = bgEl;
      canvasArea.appendChild(bgEl);
    } else {
      canvasArea.appendChild(placeholder);
    }
    textLayers.forEach(layer => {
      const textEl = createLayerDOM(layer);
      layerElements[layer.id] = textEl;
      canvasArea.appendChild(textEl);
    });
  };
  
  let modalRef = null;
  const footer = el('div', { className: 'flex justify-end gap-2 mt-4' });
  
  const getLayersToSave = () => {
    const layers = [];
    const toRelative = (layer) => ({
      type: layer.type, 
      content: layer.type === 'image' ? layer.src : layer.html, 
      x: layer.x / 500, 
      y: layer.y / 500, 
      scale: layer.scale, 
      rotate: layer.rotate,
      width: layer.width / 500,
      height: (layer.height || 0) / 500
    });
    if (backgroundLayer) layers.push(toRelative(backgroundLayer));
    textLayers.forEach(t => layers.push(toRelative(t)));
    return layers;
  };

  const draftBtn = el('button', { className: 'btn btn-outline flex-1', onclick: () => {
    store.saveDraft('story', { layers: getLayersToSave() }, options.draftId);
    toast(currentLang === 'ko' ? '임시저장 되었습니다.' : 'Draft saved.', 'success');
  } }, '임시저장');

  const submitBtn = el('button', { className: 'btn btn-primary flex-1', onclick: () => {
    if (!backgroundLayer) return toast(currentLang === 'ko' ? '이미지를 필수로 업로드해야 합니다.' : 'You must upload an image.', 'error');
    
    activeLayerId = null; 
    renderCanvas();
    
    store.addStory(getLayersToSave());
    if (options.draftId) {
      store.deleteDraft(options.draftId);
    }
    toast(currentLang === 'ko' ? '셸이 완성되었습니다.' : 'Shell created successfully.', 'success');
    cleanup();
    if (modalRef) modalRef.close();
    window.location.reload();
  }}, t('finishUpload'));
  
  footer.append(draftBtn, submitBtn);
  wrap.append(canvasArea, el('div', { className: 'flex gap-2 w-full mt-2' }, uploadBtn, addTextBtn), footer);
  
  if (targetContainer) {
    targetContainer.innerHTML = '';
    const pageWrap = el('div', { className: 'page-container anim-fade flex flex-col items-center justify-center', style: { maxWidth: '768px' } });
    const titleHeader = el('div', { className: 'mb-6 text-center w-full' },
      el('h2', { className: 'text-2xl font-bold text-tx' }, options.draftId ? t('editDraft', '임시저장 편집') : t('newShell'))
    );
    pageWrap.append(titleHeader, wrap);
    targetContainer.appendChild(pageWrap);
  } else {
    modalRef = showModal(wrap, { onClose: cleanup });
  }
  
  // Render initial state if draft loaded
  if (backgroundLayer || textLayers.length > 0) {
    addTextBtn.disabled = false;
    renderCanvas();
  }
}

export function renderStoryViewer(startIndex, groupedStories, startStoryIndex = 0) {
  const currentUser = store.getState().currentUser;
  
  // Dynamic WebKit scrollbar hiding styles
  let styleTag = document.getElementById('story-viewer-temp-styles');
  if (!styleTag) {
    styleTag = el('style', {
      id: 'story-viewer-temp-styles',
      textContent: `
        .stories-scroll-container::-webkit-scrollbar {
          display: none !important;
        }
      `
    });
    document.head.appendChild(styleTag);
  }

  // 1. Create a full-screen overlay with dark blur backdrop matching other popups (6px blur, rgba 0.65)
  const overlay = el('div', { 
    className: 'koral-story-viewer-overlay',
    style: { 
      position: 'fixed',
      inset: '0',
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(6px)',
      webkitBackdropFilter: 'blur(6px)',
      zIndex: '9999999',
      overscrollBehavior: 'contain'
    }
  });
  
  // Prevent body scroll while viewing stories
  const originalBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  
  // Define standard close viewer function
  const closeViewer = () => {
    document.body.style.overflow = originalBodyOverflow;
    overlay.remove();
    document.removeEventListener('keydown', keyHandler);
    
    // In-place refresh of story rings to avoid reload flickering
    const storyRow = document.querySelector('.stories-row');
    if (storyRow) {
      const parent = storyRow.parentElement;
      if (parent) {
        const newStoryRow = renderStoryRow();
        parent.replaceChild(newStoryRow, storyRow);
      }
    }
  };
  
  // 2. Create the scroll container (without snap-active initially to prevent snap-back)
  const scrollContainer = el('div', {
    className: 'stories-scroll-container'
  });
  
  // 3. Flatten all stories from all groups
  const flatStories = [];
  let initialActiveIndex = 0;
  
  groupedStories.forEach((group, gIdx) => {
    const user = store.getUser(group.authorHandle) || { displayName: 'Unknown', handle: group.authorHandle };
    group.stories.forEach((story, sIdx) => {
      if (gIdx === startIndex && sIdx === startStoryIndex) {
        initialActiveIndex = flatStories.length;
      }
      flatStories.push({ story, user, group, gIdx, sIdx });
    });
  });
  
  // 4. Create slides for all flat stories
  flatStories.forEach((item, index) => {
    const { story, user } = item;
    
    // Create the slide (100vh, 100vw, flex center, snap align start)
    const slide = el('div', {
      className: 'story-slide-wrap',
      dataset: { storyId: story.id, index: index }
    });
    
    // Centered 500x500 story box
    const storyBox = el('div', { 
      className: 'relative bg-black shadow-2xl rounded-2xl overflow-hidden story-viewer-box',
      style: { 
        width: '500px', height: '500px', maxWidth: '90vw', maxHeight: '90vh',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justify: 'center'
      }
    });
    
    // Virtual 100% canvas inside story box
    const virtualCanvas = el('div', {
      className: 'relative w-full h-full',
      style: { aspectRatio: '1/1' }
    });
    
    const layers = story.layers || [];
    layers.forEach(layer => {
      const container = el('div', { 
        className: 'absolute flex items-center justify-center',
        style: { 
          left: (layer.x * 100) + '%', 
          top: (layer.y * 100) + '%', 
          width: (layer.width * 100) + '%',
          transformOrigin: 'center center',
          transform: `translate(-50%, -50%) rotate(${layer.rotate}deg) scale(${layer.scale})`
        }
      });
      if (layer.type === 'image') {
        container.style.height = (layer.height * 100) + '%';
        container.appendChild(el('img', { 
          src: layer.content, 
          style: { width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', borderRadius: '4px' } 
        }));
      } else {
        container.style.height = 'auto';
        const textWrap = el('div', { 
          style: { width: '100%', height: '100%', fontSize: '20px', fontWeight: 'bold', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.8)', wordBreak: 'break-word', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justify: 'center', pointerEvents: 'none' } 
        });
        textWrap.innerHTML = layer.content;
        container.appendChild(textWrap);
      }
      
      virtualCanvas.appendChild(container);
    });
    
    // Like button & count
    const storyLikes = story.likes || [];
    const isStoryLiked = currentUser && storyLikes.includes(currentUser.handle);
    const storyLikesCount = storyLikes.length;
    
    const storyLikeBtnSpan = el('span', { innerHTML: isStoryLiked ? icons.heartFilled(20) : icons.heart(20) });
    const storyLikeCountSpan = el('span', { className: 'text-xs font-bold text-white ml-2', textContent: storyLikesCount });
    
    const storyLikeBtn = el('button', { 
      className: 'flex items-center text-white bg-black/40 hover:bg-black/60 px-4 py-2 rounded-full cursor-pointer transition-colors border border-white/10 shadow-lg pointer-events-auto',
      style: { 
        position: 'absolute', bottom: '16px', right: '16px', zIndex: 100, 
        color: isStoryLiked ? 'var(--brand-a, #ff7171)' : '#fff' 
      },
      onclick: (e) => {
        e.stopPropagation();
        if (!currentUser) return toast(t('loginRequired') || '로그인이 필요합니다', 'error');
        const nowLiked = store.toggleStoryLike(story.id);
        storyLikeBtn.style.color = nowLiked ? 'var(--brand-a, #ff7171)' : '#fff';
        storyLikeBtnSpan.innerHTML = nowLiked ? icons.heartFilled(20) : icons.heart(20);
        storyLikeCountSpan.textContent = store.getState().stories.find(s => s.id === story.id).likes.length;
      }
    }, storyLikeBtnSpan, storyLikeCountSpan);
    
    // Add header to show the author handle at the bottom left (matching the heart button height)
    const storyHeader = el('div', {
      className: 'absolute flex items-center gap-2 z-10 bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10',
      style: { 
        bottom: '16px', 
        left: '16px', 
        pointerEvents: 'auto', 
        cursor: 'pointer' 
      },
      onclick: (e) => {
        e.stopPropagation();
        document.body.style.overflow = originalBodyOverflow;
        overlay.remove();
        window.navigateTo(`profile/${user.handle.replace(/^@/, '')}`);
      }
    },
      renderAvatar(user, 'av-xs', false),
      el('span', { className: 'text-white font-semibold text-sm', textContent: user.handle })
    );
    
    storyBox.append(storyHeader, virtualCanvas, storyLikeBtn);
    slide.appendChild(storyBox);
    
    // Click outside the story card to close the viewer
    slide.onclick = (e) => {
      if (!storyBox.contains(e.target)) {
        closeViewer();
      }
    };
    
    scrollContainer.appendChild(slide);
  });
  
  // 5. Append scroll container to overlay and attach to body
  overlay.append(scrollContainer);
  document.body.appendChild(overlay);
  
  // 6. Intersection Observer to mark stories as read when scrolled into view
  const observerOptions = {
    root: scrollContainer,
    threshold: 0.6
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const slide = entry.target;
        const storyId = slide.dataset.storyId;
        if (currentUser) {
          store.markStoryViewed(storyId);
        }
      }
    });
  }, observerOptions);
  
  const slides = scrollContainer.querySelectorAll('.story-slide-wrap');
  slides.forEach(s => observer.observe(s));
  
  // Keyboard escape handler
  const keyHandler = (e) => {
    if (e.key === 'Escape') {
      closeViewer();
    }
  };
  document.addEventListener('keydown', keyHandler);
  
  // 7. Scroll smoothly to the clicked index and then enable scroll snap to prevent snap-back bugs
  setTimeout(() => {
    const targetSlide = scrollContainer.children[initialActiveIndex];
    if (targetSlide) {
      scrollContainer.scrollTop = targetSlide.offsetTop;
    }
    // Re-enable scroll snapping after programmatic scroll has finished
    setTimeout(() => {
      scrollContainer.classList.add('snap-active');
    }, 50);
  }, 50);
}

export function renderSuggestSidebar() {
  const currentUser = store.getState().currentUser;
  if (!currentUser) return el('div');

  const currentLang = localStorage.getItem('koral_language') || 'ko';
  const recTitle = currentLang === 'ko' ? '회원님을 위한 추천' : currentLang === 'ja' ? 'おすすめのユーザー' : currentLang === 'zh' ? '为您推荐' : 'Suggestions for you';
  const viewAll = currentLang === 'ko' ? '모두 보기' : currentLang === 'ja' ? 'すべて見る' : currentLang === 'zh' ? '查看全部' : 'See All';
  const switchLabel = currentLang === 'ko' ? '계정 전환' : currentLang === 'ja' ? 'アカウント切り替え' : currentLang === 'zh' ? '切换账号' : 'Switch Account';
  const logoutLabel = currentLang === 'ko' ? '로그아웃' : currentLang === 'ja' ? 'ログアウト' : currentLang === 'zh' ? '退出登录' : 'Log out';
  const followingLabel = currentLang === 'ko' ? '팔로잉' : currentLang === 'ja' ? 'フォロー中' : currentLang === 'zh' ? '正在关注' : 'Following';
  const followLabel = currentLang === 'ko' ? '팔로우' : currentLang === 'ja' ? 'フォロー' : currentLang === 'zh' ? '关注' : 'Follow';
  const optionsTitle = currentLang === 'ko' ? '옵션' : currentLang === 'ja' ? 'オプション' : currentLang === 'zh' ? '选项' : 'Options';
  const addAccountLabel = currentLang === 'ko' ? '기존 계정 추가' : currentLang === 'ja' ? '既存のアカウントを追加' : currentLang === 'zh' ? '添加已有账号' : 'Add Existing Account';
  
  const footerText = currentLang === 'ko' ? '소개 · 도움말 · 홍보 센터 · API · 채용 정보 · 개인정보처리방침 · 약관 · 위치 · 언어 · Meta Verified' :
                     currentLang === 'ja' ? '基本情報 · ヘルプ · プレス · API · 求人 · プライバシー · 規約 · 位置 · 言語 · Meta Verified' :
                     currentLang === 'zh' ? '关于 · 帮助 · 新闻 · API · 工作 · 隐私 · 条款 · 位置 · 语言 · Meta Verified' :
                     'About · Help · Press · API · Jobs · Privacy · Terms · Locations · Language · Meta Verified';

  const container = el('div', { className: 'aside-content flex flex-col', style: { display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 80px)' } });
  
  const asideSwitch = el('div', { 
    className: 'aside-switch cursor-pointer flex items-center justify-center p-2 rounded-lg hover:bg-hover transition-colors',
    style: { position: 'relative' }
  }, el('span', { innerHTML: icons.more(20) }));
  
  asideSwitch.onclick = (e) => {
    e.stopPropagation();
    showMoreModal();
  };

  const myProfile = el('div', { className: 'aside-profile flex items-center justify-between mb-6', style: { position: 'relative' } },
    el('div', { className: 'flex items-center gap-3' },
      renderAvatar(currentUser, 'av-lg'),
      el('div', { className: 'aside-profile-info' },
        el('div', { className: 'aside-profile-name font-bold cursor-pointer hover:underline', onclick: () => window.navigateTo(`profile/${currentUser.handle.replace(/^@/, '')}`) }, currentUser.handle.startsWith('@') ? currentUser.handle : '@' + currentUser.handle),
        el('div', { className: 'aside-profile-handle text-sm text-tx-2', innerHTML: renderMarkdown(currentUser.displayName).replace(/^<p>/, '').replace(/<\/p>$/,'') })
      )
    ),
    asideSwitch
  );

  const suggestBox = el('div', { className: 'suggest-card' },
    el('div', { className: 'suggest-header' },
      el('h4', { textContent: recTitle }),
      el('a', { textContent: viewAll, style: { cursor: 'pointer' } })
    )
  );

  const suggested = store.getSuggestedUsers();
  suggested.forEach(user => {
    const item = el('div', { className: 'suggest-user' },
      renderAvatar(user, 'av-md', true),
      el('div', { className: 'suggest-user-info' },
        el('div', { className: 'suggest-user-name', onclick: () => window.navigateTo(`profile/${user.handle.replace(/^@/, '')}`) }, user.handle.startsWith('@') ? user.handle : '@' + user.handle),
        el('div', { className: 'suggest-user-sub' }, recTitle)
      ),
      el('button', { 
        className: 'btn-ghost btn-sm', 
        style: { color: 'var(--tx-br)', fontWeight: '600' },
        onclick: (e) => {
          store.toggleFollow(user.handle);
          e.target.textContent = store.isFollowing(user.handle) ? followingLabel : followLabel;
          e.target.style.color = store.isFollowing(user.handle) ? 'var(--tx-3)' : 'var(--tx-br)';
        }
      }, store.isFollowing(user.handle) ? followingLabel : followLabel)
    );
    suggestBox.appendChild(item);
  });

  const footer = el('div', { 
    className: 'aside-footer pt-6 text-xs text-tx-3',
    style: { marginTop: 'auto' }
  },
    footerText,
    el('br'), el('br'),
    '© 2026 koral'
  );

  container.append(myProfile, suggestBox, footer);
  return container;
}

export function showMoreModal() {
  const currentUser = store.getState().currentUser;
  if (!currentUser) return;
  const currentLang = localStorage.getItem('koral_language') || 'ko';
  const switchLabel = currentLang === 'ko' ? '계정 전환' : currentLang === 'ja' ? 'アカウント切り替え' : currentLang === 'zh' ? '切换账号' : 'Switch Account';
  const logoutLabel = currentLang === 'ko' ? '로그아웃' : currentLang === 'ja' ? 'ログアウト' : currentLang === 'zh' ? '退出登录' : 'Log out';
  const optionsTitle = currentLang === 'ko' ? '옵션' : currentLang === 'ja' ? 'オプション' : currentLang === 'zh' ? '选项' : 'Options';
  const addAccountLabel = currentLang === 'ko' ? '기존 계정 추가' : currentLang === 'ja' ? '既存のアカウントを追加' : currentLang === 'zh' ? '添加已有账号' : 'Add Existing Account';

  const showSwitcherModal = () => {
    const wrap = el('div', { className: 'p-2 w-full flex flex-col gap-1' });
    wrap.appendChild(el('div', { className: 'font-bold text-lg text-tx px-3 pt-2 pb-3 mb-1 border-b border-base' }, switchLabel));
    
    // Read saved accounts and only show them
    const saved = JSON.parse(localStorage.getItem('koral_saved_accounts') || '[]');
    const otherUsers = saved.filter(u => u.id !== currentUser.id);
    
    otherUsers.forEach(u => {
      const item = el('button', { className: 'btn btn-ghost w-full flex items-center justify-start gap-3 text-left p-3', onclick: () => {
        store.getState().currentUser = u;
        store._save();
        window.location.hash = '';
        window.location.reload();
      }},
        renderAvatar(u, 'av-sm'),
        el('div', { className: 'font-semibold text-tx text-sm' }, u.handle)
      );
      wrap.appendChild(item);
    });
    
    const addBtn = el('button', { className: 'btn btn-ghost w-full flex items-center justify-start gap-3 p-3 mt-1 border-t border-base rounded-none text-brand', onclick: () => {
      switchModal.close();
      window.navigateTo('add-account');
    } }, el('span', { innerHTML: icons.plusSquare(18) }), addAccountLabel);
    
    wrap.appendChild(addBtn);
    const switchModal = showModal(wrap, { className: 'w-full max-w-sm' });
  };

  const moreWrap = el('div', { className: 'p-2 w-full flex flex-col gap-1' });
  moreWrap.appendChild(el('div', { className: 'font-bold text-lg text-tx px-3 pt-2 pb-3 mb-1 border-b border-base' }, optionsTitle));
  
  const switchBtn = el('button', { className: 'btn btn-ghost w-full flex items-center justify-start gap-3 p-3', onclick: () => {
    modal.close();
    showSwitcherModal();
  }}, el('span', { innerHTML: icons.user(18) }), switchLabel);
  
  const logoutBtn = el('button', { className: 'btn btn-ghost w-full flex items-center justify-start gap-3 p-3 text-red-500 hover:bg-red-50', onclick: () => {
    modal.close();
    store.logout();
    window.location.reload();
  }}, el('span', { innerHTML: icons.logout(18) }), logoutLabel);
  
  moreWrap.append(switchBtn, logoutBtn);
  const modal = showModal(moreWrap, { className: 'w-full max-w-sm' });
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
          if (onNavigate) onNavigate(`profile/${u.handle.replace(/^@/, '')}`);
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
      const likeCountSpan = el('span', { textContent: likesCount });
      
      const toggleCommentLike = (e) => {
        e.stopPropagation();
        if (!currentUser) return toast('로그인이 필요합니다.', 'error');
        const nowLiked = store.toggleCommentLike(c.id);
        const newCount = store.getState().comments.find(cm => cm.id === c.id).likes.length;
        likeBtnSpan.innerHTML = nowLiked ? icons.heartFilled(14) : icons.heart(14);
        e.currentTarget.classList.toggle('text-brand', nowLiked);
        likeCountSpan.textContent = newCount;
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

      const isOwn = currentUser && c.authorHandle === currentUser.handle;
      const moreDropdown = el('div', { className: 'dropdown-menu', style: { width: '120px' } },
        el('div', { className: 'dropdown-item', onclick: () => {
          moreWrap.querySelector('.dropdown-menu').classList.remove('open');
          const existing = itemWrapper.querySelector('.reply-editor-wrap');
          if (existing) existing.remove();
          
          const editWrap = el('div', { className: 'reply-editor-wrap mt-2' });
          editWrap.appendChild(
            createRichTextEditor({
              initialValue: c.text,
              submitLabel: '수정 완료',
              minHeight: '40px',
              onSubmit: (text) => {
                store.editComment(c.id, text);
                toast('수정되었습니다.', 'success');
                refreshComments();
              }
            })
          );
          itemWrapper.insertBefore(editWrap, repliesContainer);
        }}, el('span', { innerHTML: icons.edit(14) }), '수정'),
        el('div', { className: 'dropdown-item danger', onclick: async () => {
          moreWrap.querySelector('.dropdown-menu').classList.remove('open');
          if (await confirmDialog('이 댓글을 삭제하시겠습니까?')) {
            store.deleteComment(c.id);
            toast('삭제되었습니다.', 'success');
            refreshComments();
          }
        }}, el('span', { innerHTML: icons.trash(14) }), '삭제')
      );
      
      const moreBtn = el('span', { className: 'comment-action cursor-pointer hover:text-tx px-1' }, el('span', { innerHTML: icons.more(14) }));
      const moreWrap = el('div', { className: 'dropdown inline-block ml-2 relative' }, moreBtn, moreDropdown);
      
      let dropdownOpen = false;
      moreBtn.onclick = (e) => {
        e.stopPropagation();
        dropdownOpen = !dropdownOpen;
        moreDropdown.classList.toggle('open', dropdownOpen);
      };
      
      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
        if (dropdownOpen) {
          dropdownOpen = false;
          moreDropdown.classList.remove('open');
        }
      });

      const isLong = c.text.length > 150 || (c.text.match(/\n/g) || []).length > 3;
      const textSpan = el('span', { className: 'comment-text w-full', innerHTML: renderMarkdown(c.text).replace(/^<p>/, '').replace(/<\/p>$/, '') });
      const toggleMoreBtn = isLong ? el('button', { className: 'text-xs font-bold text-tx-3 hover:text-tx bg-transparent p-0 border-none cursor-pointer mt-1' }, '자세히 보기') : null;
      
      if (isLong) {
        textSpan.style.display = '-webkit-box';
        textSpan.style.webkitBoxOrient = 'vertical';
        textSpan.style.overflow = 'hidden';
        textSpan.style.webkitLineClamp = '3';
        textSpan.style.wordBreak = 'break-word';
        
        let expanded = false;
        toggleMoreBtn.onclick = (e) => {
          e.stopPropagation();
          expanded = !expanded;
          if (expanded) {
            textSpan.style.display = 'block';
            textSpan.style.webkitLineClamp = 'unset';
            toggleMoreBtn.textContent = '간단히 보기';
          } else {
            textSpan.style.display = '-webkit-box';
            textSpan.style.webkitLineClamp = '3';
            toggleMoreBtn.textContent = '자세히 보기';
          }
        };
      }

      const authorProfileWrap = el('div', { className: 'flex items-center gap-3 cursor-pointer mb-2', onclick: () => window.navigateTo(`profile/${author.handle.replace(/^@/, '')}`) },
        renderAvatar(author, 'av-sm'),
        el('div', { className: 'flex flex-col' },
          el('div', { className: 'font-bold text-tx text-sm flex items-center gap-1' }, 
            author.handle.startsWith('@') ? author.handle : '@' + author.handle, 
            author.verified ? el('span', { className: 'text-brand', innerHTML: icons.verified(14) }) : ''
          )
        )
      );

      const contentWrap = el('div', { className: 'comment-body w-full min-w-0' },
        textSpan,
        isLong ? el('div', {}, toggleMoreBtn) : null,
        el('div', { className: 'comment-actions flex items-center gap-2 mt-2' },
          el('span', { className: 'comment-time' }, timeAgo(c.createdAt) + (c.editedAt ? ' (수정됨)' : '')),
          replyBtn,
          isOwn ? moreWrap : null
        )
      );

      const item = el('div', { className: 'comment-item w-full flex-col items-start gap-0' },
        el('div', { className: 'flex items-start justify-between w-full' },
          authorProfileWrap,
          el('div', { className: `pt-1 flex items-center gap-1 cursor-pointer hover:text-tx transition-colors text-xs text-tx-3 ${isLiked ? 'text-brand' : ''}`, onclick: toggleCommentLike }, 
            likeBtnSpan,
            likeCountSpan
          )
        ),
        contentWrap
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
        const chevronIcon = el('span', { innerHTML: icons.chevronDown(12), style: { transition: 'transform 0.2s ease' } });
        toggleBtn.append(el('span', { style: { width: '24px', height: '1px', background: 'var(--tx-3)', display: 'inline-block', verticalAlign: 'middle' } }), toggleLabel, chevronIcon);
        
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
      el('div', { className: 'font-semibold text-tx flex items-center gap-1' }, 
        author.handle.startsWith('@') ? author.handle : '@' + author.handle,
        author.verified ? el('span', { className: 'verified text-brand', innerHTML: icons.verified(12) }) : null
      ),
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
  
  const comments = store.getPostComments(post.id);
  if (comments.length > 0) {
    const topComment = comments.reduce((prev, current) => (prev.likes.length > current.likes.length) ? prev : current);
    const topAuthor = store.getUser(topComment.authorHandle);
    if (topAuthor) {
      const isCommentLiked = currentUser && topComment.likes && topComment.likes.includes(currentUser.handle);
      const commentLikeBtnSpan = el('span', { innerHTML: isCommentLiked ? icons.heartFilled(12) : icons.heart(12) });
      const commentLikeCountSpan = el('span', { className: 'font-semibold ml-1', textContent: topComment.likes ? topComment.likes.length : 0 });
      
      const commentLikeBtn = el('button', { 
        className: `flex items-center gap-1 text-xs cursor-pointer hover:scale-110 transition-transform bg-transparent border-none ${isCommentLiked ? 'text-brand' : 'text-tx-3'}`,
        style: { padding: '2px 4px' },
        onclick: (e) => {
          e.stopPropagation(); // prevent navigation
          if (!currentUser) return toast('로그인이 필요합니다', 'error');
          const nowLiked = store.toggleCommentLike(topComment.id);
          commentLikeBtn.className = `flex items-center gap-1 text-xs cursor-pointer hover:scale-110 transition-transform bg-transparent border-none ${nowLiked ? 'text-brand' : 'text-tx-3'}`;
          commentLikeBtnSpan.innerHTML = nowLiked ? icons.heartFilled(12) : icons.heart(12);
          const updatedComment = store.getState().comments.find(cm => cm.id === topComment.id);
          commentLikeCountSpan.textContent = updatedComment.likes ? updatedComment.likes.length : 0;
        }
      }, commentLikeBtnSpan, commentLikeCountSpan);

      const commentWrap = el('div', { className: 'mt-4 p-3 bg-hover rounded-xl' },
        el('div', { className: 'flex items-center justify-between mb-1' },
          el('div', { className: 'flex items-center gap-2' },
            renderAvatar(topAuthor, 'av-xs'),
            el('span', { className: 'font-semibold text-xs text-tx flex items-center gap-1' }, 
              topAuthor.handle.startsWith('@') ? topAuthor.handle : '@' + topAuthor.handle,
              topAuthor.verified ? el('span', { className: 'verified text-brand', innerHTML: icons.verified(10) }) : null
            ),
            el('span', { className: 'text-xs text-tx-3' }, timeAgo(topComment.createdAt))
          ),
          commentLikeBtn
        ),
        el('div', { className: 'text-sm text-tx-2 clamp2 ml-8', innerHTML: renderMarkdown(topComment.text).replace(/^<p>/, '').replace(/<\/p>$/,'') })
      );
      body.appendChild(commentWrap);
    }
  }

  card.appendChild(body);

  return card;
}



export function createDropdownSelect(options, value, onChange, placeholder = '') {
  const wrap = el('div', { className: 'custom-select-wrap relative inline-block' });
  const selectedOpt = options.find(o => o.value === value);
  const selectedText = el('span', { textContent: selectedOpt ? selectedOpt.label : placeholder });
  const menu = el('div', { className: 'custom-select-menu hidden absolute top-full mt-2 left-0 min-w-full bg-element border border-base rounded-2xl shadow-lg z-50 py-2 max-h-[300px] overflow-y-auto' });
  const header = el('div', { className: 'custom-select-header flex items-center justify-between cursor-pointer px-4 py-3 rounded-2xl bg-element border border-base text-lg font-semibold min-w-[120px]', onclick: (e) => { e.stopPropagation(); document.querySelectorAll('.custom-select-menu').forEach(m => { if (m !== menu) m.classList.add('hidden'); }); menu.classList.toggle('hidden'); } }, selectedText, el('div', { innerHTML: icons.chevronDown(20) }));
  const renderOptions = () => { menu.innerHTML = ''; options.forEach(opt => { const isSelected = opt.value === value; const item = el('div', { className: 'custom-select-item px-4 py-3 cursor-pointer hover:bg-hover transition-colors' + (isSelected ? ' text-brand font-bold bg-brand/10' : ''), textContent: opt.label, onclick: (e) => { e.stopPropagation(); value = opt.value; selectedText.textContent = opt.label; renderOptions(); menu.classList.add('hidden'); if (onChange) onChange(value); } }); menu.appendChild(item); }); }; renderOptions(); wrap.append(header, menu); document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) menu.classList.add('hidden'); }); return wrap; }

