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
    isOwn ? el('div', { className: 'dropdown-item', onclick: () => {
      dropdownOpen = false; dropdown.classList.remove('open');
      const editWrap = el('div', { className: 'p-4' });
      const modal = showModal(editWrap, { large: true });
      editWrap.appendChild(createRichTextEditor({
        initialValue: post.caption,
        submitLabel: '수정 완료',
        minHeight: '200px',
        onSubmit: (newText) => {
          const plainText = newText.replace(/<[^>]*>?/gm, ' ');
          const tagMatches = [...plainText.matchAll(/(?:^|\s)#([가-힣a-zA-Z0-9_]+)/g)];
          const tags = tagMatches.map(m => '#' + m[1]);
          store.editPost(post.id, newText, tags);
          toast('수정되었습니다.', 'success');
          modal.close();
          if (options.onNavigate) options.onNavigate('');
        }
      }));
    }}, el('span', { innerHTML: icons.edit(16) }), '수정') : null,
    isOwn ? el('div', { className: 'dropdown-item danger', onclick: async () => {
      dropdownOpen = false; dropdown.classList.remove('open');
      if (await confirmDialog('정말 이 리프를 삭제하시겠습니까?')) {
        store.deletePost(post.id);
        toast('삭제되었습니다.', 'success');
        if (options.onNavigate) options.onNavigate('');
      }
    }}, el('span', { innerHTML: icons.trash(16) }), '삭제') : 
    el('div', { className: 'dropdown-item danger', onclick: () => {
      dropdownOpen = false; dropdown.classList.remove('open');
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
        submitLabel: '등록',
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
      el('div', { className: 'story-item', onclick: renderStoryCreator },
        el('div', { className: 'story-add' }, '+'),
        el('div', { className: 'story-name' }, '내 셸')
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
      el('div', { className: `story-name truncate ${allSeen ? 'seen' : ''}` }, user.handle)
    );
    row.appendChild(item);
  });

  return row;
}

export function renderStoryCreator() {
  const currentUser = store.getState().currentUser;
  if (!currentUser) return toast('로그인이 필요합니다.', 'error');
  
  const wrap = el('div', { className: 'p-4 flex flex-col gap-4', style: { width: '100%', maxWidth: '400px', margin: '0 auto' } });
  wrap.appendChild(el('h2', { className: 'font-bold text-lg mb-2' }, '새 셸 만들기'));
  
  let backgroundLayer = null;
  let textLayers = [];
  let activeLayerId = null;
  let layerElements = {}; 
  
  const canvasArea = el('div', { 
    className: 'relative w-full overflow-hidden bg-gray-100 rounded-lg border border-base flex items-center justify-center shadow-inner',
    style: { aspectRatio: '1/1', touchAction: 'none', userSelect: 'none' }
  });
  
  canvasArea.onpointerdown = (e) => {
    if (e.target === canvasArea || e.target.classList.contains('pointer-events-none')) {
      if (activeLayerId !== null) {
        activeLayerId = null;
        renderCanvas();
      }
    }
  };
  
  const placeholder = el('div', { className: 'text-tx-3 flex flex-col items-center pointer-events-none' },
    el('span', { innerHTML: icons.image(32) }),
    '이미지를 업로드해주세요'
  );
  canvasArea.appendChild(placeholder);
  
  const fileInput = el('input', { type: 'file', accept: 'image/*', className: 'hidden' });
  const uploadBtn = el('button', { className: 'btn btn-outline flex-1 flex items-center justify-center gap-2', onclick: () => fileInput.click() },
    el('span', { innerHTML: icons.image(18) }), '사진 업로드'
  );
  
  const addTextBtn = el('button', { className: 'btn btn-outline flex-1 flex items-center justify-center gap-2', disabled: true, onclick: () => {
    const textWrap = el('div', { className: 'p-4 flex flex-col gap-4' });
    const editor = createRichTextEditor({
      id: 'story_text_' + uid(),
      placeholder: '셸 문구...',
      showTitle: false,
      minHeight: '100px',
      submitLabel: '텍스트 추가',
      hideAdvanced: true,
      onSubmit: (html) => {
        if (!html.trim()) return toast('내용을 입력하세요', 'error');
        const id = uid();
        textLayers.push({ id, type: 'text', html, x: 200, y: 200, scale: 1, rotate: 0, width: 200, height: 50 });
        activeLayerId = id;
        renderCanvas();
        textModal.close();
      }
    });
    textWrap.appendChild(editor);
    const textModal = showModal(textWrap);
  }}, el('span', { innerHTML: icons.hash(18) }), '텍스트 추가');
  
  fileInput.onchange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const src = await resizeImage(e.target.files[0], 1080);
        backgroundLayer = { id: uid(), type: 'image', src, x: 200, y: 200, scale: 1, rotate: 0, width: 300, height: 300 };
        activeLayerId = backgroundLayer.id;
        placeholder.style.display = 'none';
        addTextBtn.disabled = false;
        renderCanvas();
      } catch (err) {
        toast('이미지 업로드 실패', 'error');
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
    const scaleRatio = 400 / containerRect.width;
    
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
    container.style.left = (layer.x / 400 * 100) + '%';
    container.style.top = (layer.y / 400 * 100) + '%';
    container.style.transform = `translate(-50%, -50%) rotate(${layer.rotate}deg) scale(${layer.scale})`;
    container.style.width = layer.width + 'px';
    if (layer.type === 'image') {
      container.style.height = layer.height + 'px';
    } else {
      container.style.height = 'auto';
    }
  };
  
  const createLayerDOM = (layer) => {
    const isActive = activeLayerId === layer.id;
    const brandColor = 'var(--brand-a, #ff7171)';
    
    const container = el('div', { 
      className: 'absolute flex items-center justify-center',
      style: { transformOrigin: 'center center', cursor: 'move', userSelect: 'none', border: isActive ? `2px solid ${brandColor}` : '2px solid transparent', boxShadow: isActive ? '0 0 0 1px rgba(255,255,255,0.3)' : 'none', boxSizing: 'border-box' }
    });
    
    if (layer.type === 'image') {
      container.appendChild(el('img', { 
        src: layer.src, 
        style: { width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', borderRadius: '4px' } 
      }));
    } else {
      const textWrap = el('div', { 
        style: { width: '100%', height: '100%', fontSize: '20px', fontWeight: 'bold', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.8)', wordBreak: 'break-word', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }
      });
      textWrap.innerHTML = layer.html;
      container.appendChild(textWrap);
    }
    
    if (isActive) {
      const rotHandleWrap = el('div', { 
        style: { position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } 
      });
      // Append circle first (at the top), then line (at the bottom connecting to the box)
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
  const submitBtn = el('button', { className: 'btn btn-primary w-full', onclick: () => {
    if (!backgroundLayer) return toast('이미지를 필수로 업로드해야 합니다.', 'error');
    
    activeLayerId = null; 
    renderCanvas();
    
    const layers = [];
    const toRelative = (layer) => ({
      type: layer.type, 
      content: layer.type === 'image' ? layer.src : layer.html, 
      x: layer.x / 400, 
      y: layer.y / 400, 
      scale: layer.scale, 
      rotate: layer.rotate,
      width: layer.width / 400,
      height: (layer.height || 0) / 400
    });
    
    layers.push(toRelative(backgroundLayer));
    textLayers.forEach(t => layers.push(toRelative(t)));
    
    store.addStory(layers);
    toast('셸이 완성되었습니다.', 'success');
    cleanup();
    if (modalRef) modalRef.close();
    window.location.reload();
  }}, '완성 및 업로드');
  
  footer.appendChild(submitBtn);
  wrap.append(canvasArea, el('div', { className: 'flex gap-2 w-full mt-2' }, uploadBtn, addTextBtn), footer);
  
  modalRef = showModal(wrap, { onClose: cleanup });
}

export function renderStoryViewer(startIndex, groupedStories) {
  const group = groupedStories[startIndex];
  if (!group || !group.stories || group.stories.length === 0) return;
  
  const overlay = el('div', { 
    className: 'fixed inset-0 bg-black/80 z-[9999] flex flex-col',
    style: { 
      overscrollBehavior: 'contain',
      justifyContent: 'center', alignItems: 'center'
    }
  });
  
  // Prevent body scroll while viewing stories
  const originalBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  
  const closeBtn = el('button', { 
    className: 'absolute top-3 right-3 text-white z-50 p-2 cursor-pointer bg-black/50 hover:bg-black/80 rounded-full transition-colors',
    style: { border: 'none' },
    onclick: () => {
      document.body.style.overflow = originalBodyOverflow;
      overlay.remove();
      window.location.reload();
    }
  }, el('span', { innerHTML: icons.x(20) }));
  
  const scrollContainer = el('div', { 
    className: 'relative flex flex-col bg-black shadow-2xl rounded-2xl overflow-hidden',
    style: { 
      width: '450px', height: '450px', maxWidth: '90vw', maxHeight: '90vw',
      overflowY: 'auto', 
      scrollSnapType: 'y mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none',
      border: '1px solid rgba(255,255,255,0.1)'
    }
  });
  scrollContainer.innerHTML = '<style>.stories-scroll::-webkit-scrollbar { display: none; }</style>';
  scrollContainer.classList.add('stories-scroll');
  scrollContainer.appendChild(closeBtn);
  
  group.stories.forEach((story, idx) => {
    store.markStoryViewed(story.id);
    
    const storyBox = el('div', { 
      className: 'relative w-full flex-shrink-0 bg-gray-900 overflow-hidden',
      style: { height: '100%', scrollSnapAlign: 'start', display: 'flex', alignItems: 'center', justifyContent: 'center' }
    });
    
    const virtualCanvas = el('div', {
      className: 'relative',
      style: {
        width: '400px', height: '400px',
        transform: 'scale(1.125)', // 450px / 400px
        transformOrigin: 'center center'
      }
    });
    
    const layers = story.layers || [];
    layers.forEach(layer => {
      const container = el('div', { 
        className: 'absolute flex items-center justify-center',
        style: { 
          left: (layer.x * 400) + 'px', 
          top: (layer.y * 400) + 'px', 
          width: (layer.width * 400) + 'px',
          transformOrigin: 'center center',
          transform: `translate(-50%, -50%) rotate(${layer.rotate}deg) scale(${layer.scale})`
        }
      });
      if (layer.type === 'image') {
        container.style.height = (layer.height * 400) + 'px';
      }
      
      if (layer.type === 'image') {
        container.appendChild(el('img', { 
          src: layer.content, 
          style: { width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', borderRadius: '4px' } 
        }));
      } else if (layer.type === 'text') {
        container.style.height = 'auto';
        const textWrap = el('div', { 
          style: { width: '100%', height: '100%', fontSize: '20px', fontWeight: 'bold', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.8)', wordBreak: 'break-word', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' } 
        });
        textWrap.innerHTML = layer.content;
        container.appendChild(textWrap);
      }
      
      virtualCanvas.appendChild(container);
    });
    
    storyBox.appendChild(virtualCanvas);
    scrollContainer.appendChild(storyBox);
  });
  
  overlay.append(scrollContainer);
  
  if (group.stories.length > 1) {
    const hint = el('div', { className: 'absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm flex flex-col items-center gap-1 z-50 pointer-events-none anim-up' },
      el('span', { innerHTML: icons.chevronDown(20) }),
      '아래로 스크롤하여 더 보기'
    );
    scrollContainer.appendChild(hint);
    scrollContainer.addEventListener('scroll', () => hint.style.opacity = '0', { once: true });
  }
  
  document.body.appendChild(overlay);
}

export function renderSuggestSidebar() {
  const currentUser = store.getState().currentUser;
  if (!currentUser) return el('div');

  const container = el('div', { className: 'aside-content' });
  
  const asideSwitch = el('div', { 
    className: 'aside-switch cursor-pointer flex items-center justify-center p-2 rounded-lg hover:bg-hover transition-colors',
    style: { position: 'relative' }
  }, el('span', { innerHTML: icons.more(20) }));
  
  asideSwitch.onclick = (e) => {
    e.stopPropagation();
    
    const moreWrap = el('div', { className: 'p-2 w-full flex flex-col gap-1' });
    moreWrap.appendChild(el('div', { className: 'font-bold text-lg text-tx px-3 pt-2 pb-3 mb-1 border-b border-base' }, '옵션'));
    
    const switchBtn = el('button', { className: 'btn btn-ghost w-full flex items-center justify-start gap-3 p-3', onclick: () => {
      modal.close();
      showSwitcherModal();
    }}, el('span', { innerHTML: icons.user(18) }), '계정 전환');
    
    const logoutBtn = el('button', { className: 'btn btn-ghost w-full flex items-center justify-start gap-3 p-3 text-red-500 hover:bg-red-50', onclick: () => {
      store.logout();
      window.navigateTo('login');
    }}, el('span', { innerHTML: icons.logout(18) }), '로그아웃');
    
    moreWrap.append(switchBtn, logoutBtn);
    const modal = showModal(moreWrap, { className: 'w-full max-w-sm' });
  };

  const showSwitcherModal = () => {
    const wrap = el('div', { className: 'p-2 w-full flex flex-col gap-1' });
    wrap.appendChild(el('div', { className: 'font-bold text-lg text-tx px-3 pt-2 pb-3 mb-1 border-b border-base' }, '계정 전환'));
    
    const otherUsers = store.getState().users.filter(u => u.id !== currentUser.id).slice(0, 2);
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
      store.logout();
      window.navigateTo('login');
    } }, el('span', { innerHTML: icons.plusSquare(18) }), '기존 계정 추가');
    
    wrap.appendChild(addBtn);
    showModal(wrap, { className: 'w-full max-w-sm' });
  };

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

      const authorProfileWrap = el('div', { className: 'flex items-center gap-3 cursor-pointer mb-2', onclick: () => window.navigateTo(`profile/${author.handle.substring(1)}`) },
        renderAvatar(author, 'av-sm'),
        el('div', { className: 'flex flex-col' },
          el('div', { className: 'font-bold text-tx text-sm flex items-center gap-1' }, 
            author.displayName, 
            author.verified ? el('span', { className: 'text-brand', innerHTML: icons.verified(14) }) : ''
          ),
          el('div', { className: 'text-xs text-tx-2' }, author.handle)
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
  
  const comments = store.getPostComments(post.id);
  if (comments.length > 0) {
    const topComment = comments.reduce((prev, current) => (prev.likes.length > current.likes.length) ? prev : current);
    const topAuthor = store.getUser(topComment.authorHandle);
    if (topAuthor) {
      const commentWrap = el('div', { className: 'mt-4 p-3 bg-hover rounded-xl' },
        el('div', { className: 'flex items-center justify-between mb-1' },
          el('div', { className: 'flex items-center gap-2' },
            renderAvatar(topAuthor, 'av-xs'),
            el('span', { className: 'font-semibold text-xs text-tx' }, topAuthor.displayName),
            el('span', { className: 'text-xs text-tx-3' }, timeAgo(topComment.createdAt))
          ),
          el('div', { className: 'flex items-center gap-1 text-xs text-brand' },
            el('span', { innerHTML: icons.heartFilled(12) }),
            el('span', { className: 'font-semibold' }, topComment.likes.length)
          )
        ),
        el('div', { className: 'text-sm text-tx-2 clamp2 ml-8', innerHTML: renderMarkdown(topComment.text).replace(/^<p>/, '').replace(/<\/p>$/,'') })
      );
      body.appendChild(commentWrap);
    }
  }

  card.appendChild(body);

  return card;
}


