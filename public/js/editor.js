import { el, toast, resizeImage, showModal, createDropdownSelect } from './utils.js';
import { icons } from './icons.js';
import { store } from './store.js';

// Simple HSV to RGB
function hsvToRgb(h, s, v) {
  s /= 100; v /= 100;
  let c = v * s;
  let x = c * (1 - Math.abs((h / 60) % 2 - 1));
  let m = v - c;
  let r=0, g=0, b=0;
  if(h<60) {r=c; g=x; b=0;}
  else if(h<120) {r=x; g=c; b=0;}
  else if(h<180) {r=0; g=c; b=x;}
  else if(h<240) {r=0; g=x; b=c;}
  else if(h<300) {r=x; g=0; b=c;}
  else {r=c; g=0; b=x;}
  return [Math.round((r+m)*255), Math.round((g+m)*255), Math.round((b+m)*255)];
}
function hsvToHex(h, s, v) {
  const [r,g,b] = hsvToRgb(h,s,v);
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
}

function showColorPickerModal(onChange, onClose) {
  const wrap = el('div', { className: 'p-2 flex flex-col items-center w-full max-w-sm' });
  wrap.appendChild(el('div', { className: 'font-bold text-lg text-tx border-b border-base pb-3 mb-4 w-full text-center' }, '색상 선택'));

  let h = 0, s = 100, v = 100;
  
  const hexInput = el('input', { className: 'input p-2 text-sm text-center flex-1 font-mono', value: '#ff0000' });
  const colorPreview = el('div', { style: { width: '32px', height: '32px', borderRadius: '50%', background: '#ff0000', border: '1px solid var(--border)' } });

  function updateColor() {
    const hex = hsvToHex(h, s, v);
    hexInput.value = hex;
    colorPreview.style.background = hex;
    onChange(hex);
  }

  const wheelSize = 160;
  const wheelCanvas = el('canvas', { width: wheelSize, height: wheelSize, style: { borderRadius: '50%', cursor: 'crosshair', margin: '0 auto', display: 'block' } });
  const wheelCtx = wheelCanvas.getContext('2d');
  
  const cx = wheelSize/2, cy = wheelSize/2, outerR = wheelSize/2, innerR = outerR - 20;
  for(let angle = 0; angle < 360; angle++) {
    wheelCtx.beginPath();
    wheelCtx.arc(cx, cy, outerR, (angle-1)*Math.PI/180, (angle+1.5)*Math.PI/180);
    wheelCtx.arc(cx, cy, innerR, (angle+1.5)*Math.PI/180, (angle-1)*Math.PI/180, true);
    wheelCtx.closePath();
    wheelCtx.fillStyle = `hsl(${angle}, 100%, 50%)`;
    wheelCtx.fill();
  }
  
  let isDraggingWheel = false;
  const handleWheel = (e) => {
    const r = wheelCanvas.getBoundingClientRect();
    const x = e.clientX - r.left - cx;
    const y = e.clientY - r.top - cy;
    const dist = Math.sqrt(x*x + y*y);
    if (dist > innerR - 10 && dist < outerR + 10) {
      let angle = Math.atan2(y, x) * 180 / Math.PI;
      if (angle < 0) angle += 360;
      h = angle;
      updateColor();
    }
  };
  wheelCanvas.onmousedown = (e) => { isDraggingWheel = true; handleWheel(e); };
  
  const onMove = (e) => { if (isDraggingWheel) handleWheel(e); };
  const onUp = () => { isDraggingWheel = false; };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);

  const sSlider = el('input', { type: 'range', min: 0, max: 100, value: 100, className: 'w-full', oninput: (e) => { s = e.target.value; updateColor(); } });
  const vSlider = el('input', { type: 'range', min: 0, max: 100, value: 100, className: 'w-full', oninput: (e) => { v = e.target.value; updateColor(); } });

  wrap.append(
    wheelCanvas,
    el('div', { className: 'flex flex-col gap-4 w-full mt-6 px-4' }, 
      el('div', { className: 'flex flex-col gap-3 w-full' },
        el('div', { className: 'flex items-center gap-3 w-full' }, el('label', { className: 'text-sm font-semibold text-tx-2 w-10' }, '채도'), sSlider),
        el('div', { className: 'flex items-center gap-3 w-full' }, el('label', { className: 'text-sm font-semibold text-tx-2 w-10' }, '명도'), vSlider)
      ),
      el('div', { className: 'w-full h-px bg-base my-2' }),
      el('div', { className: 'flex items-center justify-between gap-3 w-full' }, 
        colorPreview, 
        hexInput
      )
    )
  );

  const modal = showModal(wrap, { 
    onClose: () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if(onClose) onClose();
    }
  });

  return modal;
}

export function createRichTextEditor(options) {
  const { id = 'default', placeholder = '내용을 입력하세요...', initialValue = '', initialTitle = '', onSubmit, onDraftSave, submitLabel = '등록', minHeight = '100px', showTitle = false } = options;

  const container = el('div', { className: 'rich-editor bg-subtle border border-base rounded-2xl flex flex-col w-full relative', style: { position: 'relative' } });
  
  let titleInput = null;
  if (showTitle) {
    titleInput = el('input', {
      className: 'w-full bg-transparent p-5 text-2xl font-bold border-b border-base outline-none text-tx',
      placeholder: '제목을 입력하세요',
      value: initialTitle
    });
    container.appendChild(titleInput);
  }
  
  const editorArea = el('div', { 
    className: 'w-full bg-transparent p-5 text-base outline-none text-tx',
    contentEditable: 'true',
    style: { minHeight, border: 'none', cursor: 'text' },
  });
  
  const draftKey = `koral_editor_draft_${id}`;
  const savedDraft = localStorage.getItem(draftKey);

  if (initialValue) {
    editorArea.innerHTML = initialValue;
  } else if (savedDraft) {
    editorArea.innerHTML = savedDraft;
  } else {
    editorArea.setAttribute('data-placeholder', placeholder);
    const style = el('style', {}, `
      .rich-editor [contenteditable=true]:empty:before { content: attr(data-placeholder); color: var(--tx-3); pointer-events: none; display: block; }
    `);
    container.appendChild(style);
  }

  let savedRange = null;

  document.addEventListener('selectionchange', () => {
    const sel = document.getSelection();
    if (sel.anchorNode && editorArea.contains(sel.anchorNode)) {
      updateToolbarState();
      if (sel.rangeCount > 0) {
        savedRange = sel.getRangeAt(0);
      }
    }
  });

  // --- Real-time Markdown Parsing (Notion Style) ---
  editorArea.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const node = sel.focusNode;
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        const match = text.match(/^(#{1,3}|>|-|\d+\.)\s/);
        if (match) {
          const type = match[1];
          let blockCmd = '';
          if (type === '#') blockCmd = 'H1';
          else if (type === '##') blockCmd = 'H2';
          else if (type === '###') blockCmd = 'H3';
          else if (type === '>') blockCmd = 'BLOCKQUOTE';
          else if (type === '-') blockCmd = 'InsertUnorderedList';
          else blockCmd = 'InsertOrderedList';

          if (blockCmd.startsWith('Insert')) {
            document.execCommand(blockCmd);
            node.textContent = text.substring(type.length + 1);
          } else {
            document.execCommand('formatBlock', false, blockCmd);
            node.textContent = text.substring(type.length + 1);
          }
          return;
        }

        // Inline markdown (bold, italic, strike)
        if (e.key === ' ') { // only on space
          const inlineMatch = [
            { rx: /\*\*(.*?)\*\*\s$/, cmd: 'bold' },
            { rx: /\*(.*?)\*\s$/, cmd: 'italic' },
            { rx: /~~(.*?)~~\s$/, cmd: 'strikeThrough' }
          ];
          for (let m of inlineMatch) {
            const match = text.match(m.rx);
            if (match) {
              const startOffset = match.index;
              const endOffset = match.index + match[0].length;
              const range = document.createRange();
              range.setStart(node, startOffset);
              range.setEnd(node, endOffset);
              const selection = window.getSelection();
              selection.removeAllRanges();
              selection.addRange(range);
              
              // Replace markdown text with just the inner text
              document.execCommand('insertText', false, match[1]);
              
              // Select the newly inserted text
              const newRange = document.createRange();
              newRange.setStart(node, startOffset);
              newRange.setEnd(node, startOffset + match[1].length);
              selection.removeAllRanges();
              selection.addRange(newRange);
              
              // Apply format
              document.execCommand(m.cmd, false, null);
              
              // Move cursor to end
              selection.collapseToEnd();
              // Toggle format off so subsequent text isn't formatted
              document.execCommand(m.cmd, false, null);
              // Insert a regular space
              document.execCommand('insertText', false, ' ');
              break;
            }
          }
        }
      }
    }
  });

  let mentionPopup = null;
  const hideMentionPopup = () => {
    if (mentionPopup) {
      mentionPopup.remove();
      mentionPopup = null;
    }
  };

  editorArea.addEventListener('keyup', (e) => {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    
    if (!editorArea.contains(node)) return;
    
    let text = '';
    if (node.nodeType === Node.TEXT_NODE) {
      text = node.textContent.substring(0, range.startOffset);
    } else {
      hideMentionPopup();
      return;
    }
    
    const match = text.match(/(?:^|\s)@([a-zA-Z0-9가-힣_]*)$/);
    if (match) {
      const query = match[1];
      const users = store.searchUsers(query).slice(0, 5);
      
      if (users.length === 0) {
        hideMentionPopup();
        return;
      }
      
      if (!mentionPopup) {
        mentionPopup = el('div', { 
          className: 'absolute z-50 bg-element border border-base rounded-xl shadow-lg flex flex-col py-1 overflow-hidden',
          style: { width: '200px' }
        });
        container.appendChild(mentionPopup);
      }
      
      const span = document.createElement('span');
      span.textContent = '\u200b';
      range.insertNode(span);
      const rect = span.getBoundingClientRect();
      const contRect = container.getBoundingClientRect();
      span.remove();
      
      mentionPopup.style.top = (rect.bottom - contRect.top + container.scrollTop + 4) + 'px';
      mentionPopup.style.left = Math.max(0, rect.left - contRect.left) + 'px';
      
      mentionPopup.innerHTML = '';
      users.forEach((u, i) => {
        const item = el('div', { 
          className: `flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-hover ${i===0?'bg-hover':''}`, 
          onmousedown: (ev) => {
            ev.preventDefault();
            const textNode = range.startContainer;
            const startIdx = textNode.textContent.lastIndexOf('@' + query);
            const before = textNode.textContent.substring(0, startIdx);
            
            textNode.textContent = before;
            
            const mentionSpan = document.createElement('span');
            mentionSpan.className = 'mention';
            mentionSpan.style.color = 'var(--brand)';
            mentionSpan.style.fontWeight = 'bold';
            mentionSpan.textContent = u.handle;
            mentionSpan.contentEditable = 'false';
            
            const space = document.createTextNode('\u00A0');
            
            const newRange = document.createRange();
            newRange.setStartAfter(textNode);
            newRange.collapse(true);
            newRange.insertNode(mentionSpan);
            newRange.setStartAfter(mentionSpan);
            newRange.collapse(true);
            newRange.insertNode(space);
            
            newRange.setStartAfter(space);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
            
            hideMentionPopup();
          }
        },
          el('img', { src: u.avatar, className: 'w-6 h-6 rounded-full object-cover border border-base', style: !u.avatar ? 'display:none' : '' }),
          el('div', { className: 'w-6 h-6 rounded-full bg-base flex items-center justify-center text-xs font-bold border border-base', style: u.avatar ? 'display:none' : '' }, u.displayName.charAt(0)),
          el('span', { className: 'text-sm font-semibold' }, u.handle)
        );
        mentionPopup.appendChild(item);
      });
    } else {
      hideMentionPopup();
    }
  });
  
  editorArea.addEventListener('blur', () => {
    setTimeout(hideMentionPopup, 100);
  });

  // --- Canva-Style Image Overlay ---
  const overlay = el('div', { 
    style: { display: 'none', position: 'absolute', pointerEvents: 'none', border: '2px solid var(--brand-a)', zIndex: 10 } 
  });
  container.appendChild(overlay);

  let activeImage = null;
  let isDraggingHandle = false;

  const hideOverlay = () => { if (!isDraggingHandle) overlay.style.display = 'none'; };
  const showOverlay = (img) => {
    activeImage = img;
    updateOverlay();
    overlay.style.display = 'block';
  };
  const updateOverlay = () => {
    if (!activeImage) return;
    const editorRect = container.getBoundingClientRect();
    const imgRect = activeImage.getBoundingClientRect();
    overlay.style.top = (imgRect.top - editorRect.top + container.scrollTop) + 'px';
    overlay.style.left = (imgRect.left - editorRect.left) + 'px';
    overlay.style.width = imgRect.width + 'px';
    overlay.style.height = imgRect.height + 'px';
  };

  // Resize Handles
  ['nw', 'ne', 'sw', 'se'].forEach(pos => {
    const handle = el('div', { 
      style: { position: 'absolute', width: '12px', height: '12px', background: '#fff', border: '2px solid var(--brand-a)', borderRadius: '50%', pointerEvents: 'auto', cursor: `${pos}-resize` } 
    });
    if (pos.includes('n')) handle.style.top = '-6px'; else handle.style.bottom = '-6px';
    if (pos.includes('w')) handle.style.left = '-6px'; else handle.style.right = '-6px';
    
    handle.onmousedown = (e) => {
      e.preventDefault();
      isDraggingHandle = true;
      const startX = e.clientX;
      const startWidth = activeImage.getBoundingClientRect().width;
      
      const onMove = (ev) => {
        let diffX = ev.clientX - startX;
        if (pos.includes('w')) diffX = -diffX;
        let newWidth = startWidth + diffX;
        if (newWidth > 50) {
          activeImage.style.width = newWidth + 'px';
          updateOverlay();
        }
      };
      const onUp = () => {
        isDraggingHandle = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };
    overlay.appendChild(handle);
  });

  // Crop Handles
  ['top', 'right', 'bottom', 'left'].forEach(edge => {
    const handle = el('div', { 
      style: { position: 'absolute', background: 'var(--brand-a)', pointerEvents: 'auto' } 
    });
    if (edge === 'top' || edge === 'bottom') {
      handle.style.height = '4px'; handle.style.width = '30px'; handle.style.left = '50%'; handle.style.transform = 'translateX(-50%)'; handle.style.cursor = 'ns-resize';
      if (edge === 'top') handle.style.top = '-2px'; else handle.style.bottom = '-2px';
    } else {
      handle.style.width = '4px'; handle.style.height = '30px'; handle.style.top = '50%'; handle.style.transform = 'translateY(-50%)'; handle.style.cursor = 'ew-resize';
      if (edge === 'left') handle.style.left = '-2px'; else handle.style.right = '-2px';
    }
    
    handle.onmousedown = (e) => {
      e.preventDefault();
      isDraggingHandle = true;
      const originalSrc = activeImage.src;
      
      const startX = e.clientX;
      const startY = e.clientY;
      const startRect = activeImage.getBoundingClientRect();
      let cropState = { t: 0, r: 0, b: 0, l: 0 };
      
      const onMove = (ev) => {
        if (edge === 'top') cropState.t = Math.max(0, ev.clientY - startY);
        if (edge === 'bottom') cropState.b = Math.max(0, startY - ev.clientY);
        if (edge === 'left') cropState.l = Math.max(0, ev.clientX - startX);
        if (edge === 'right') cropState.r = Math.max(0, startX - ev.clientX);
        
        activeImage.style.clipPath = `inset(${cropState.t}px ${cropState.r}px ${cropState.b}px ${cropState.l}px)`;
      };
      
      const onUp = () => {
        isDraggingHandle = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        
        if (cropState.t > 0 || cropState.b > 0 || cropState.l > 0 || cropState.r > 0) {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const scaleX = img.naturalWidth / startRect.width;
            const scaleY = img.naturalHeight / startRect.height;
            
            const sx = cropState.l * scaleX;
            const sy = cropState.t * scaleY;
            const sw = img.naturalWidth - ((cropState.l + cropState.r) * scaleX);
            const sh = img.naturalHeight - ((cropState.t + cropState.b) * scaleY);
            
            canvas.width = startRect.width - cropState.l - cropState.r;
            canvas.height = startRect.height - cropState.t - cropState.b;
            
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
            
            activeImage.src = canvas.toDataURL('image/jpeg', 0.9);
            activeImage.style.clipPath = 'none';
            activeImage.style.width = canvas.width + 'px';
            activeImage.style.height = canvas.height + 'px';
            updateOverlay();
          };
          img.src = originalSrc;
        }
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };
    overlay.appendChild(handle);
  });

  // Editor Interaction Listeners
  editorArea.addEventListener('click', (e) => {
    if (e.target.tagName === 'IMG') {
      showOverlay(e.target);
    } else {
      hideOverlay();
    }
  });
  
  editorArea.addEventListener('input', () => {
    if (activeImage) updateOverlay();
  });
  editorArea.addEventListener('scroll', updateOverlay);
  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    if (sel.rangeCount && !sel.containsNode(activeImage, true)) hideOverlay();
    updateToolbarState();
  });

  // --- External Drag & Drop ---
  let isInternalDrag = false;
  editorArea.addEventListener('dragstart', (e) => {
    isInternalDrag = true;
  });
  editorArea.addEventListener('dragend', (e) => {
    isInternalDrag = false;
  });
  
  editorArea.addEventListener('dragover', (e) => {
    if (isInternalDrag) return;
    if (e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      editorArea.classList.add('bg-hover');
    }
  });
  editorArea.addEventListener('dragleave', () => {
    editorArea.classList.remove('bg-hover');
  });
  editorArea.addEventListener('drop', async (e) => {
    if (isInternalDrag) {
      isInternalDrag = false;
      return;
    }
    if (e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      editorArea.classList.remove('bg-hover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        await handleFiles(Array.from(e.dataTransfer.files));
      }
    } else {
      // Allow native drop for internal text/image movement
      editorArea.classList.remove('bg-hover');
    }
  });

  const exec = (cmd, val = null) => {
    editorArea.focus();
    if (savedRange) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange);
    }
    document.execCommand(cmd, false, val);
    if (activeImage) updateOverlay();
    updateToolbarState();
  };
  
  const handleFiles = async (files) => {
    for (const file of files) {
      try {
        if (file.type.startsWith('image/')) {
          const dataUrl = await resizeImage(file, 1080);
          exec('insertHTML', `&nbsp;<img src="${dataUrl}" style="width: 50%; border-radius: var(--r-xl); margin: var(--s3) 0; display: inline-block; vertical-align: middle; cursor: move;" draggable="true" />&nbsp;`);
        } else if (file.type.startsWith('video/')) {
          const url = URL.createObjectURL(file);
          exec('insertHTML', `&nbsp;<video src="${url}" controls style="width: 50%; border-radius: var(--r-xl); margin: var(--s3) 0; display: inline-block; vertical-align: middle;"></video>&nbsp;`);
        } else {
          // General file download link using object URL (temporary)
          const url = URL.createObjectURL(file);
          exec('insertHTML', `&nbsp;<a href="${url}" download="${file.name}" class="text-brand font-semibold underline">${file.name}</a>&nbsp;`);
        }
      } catch (err) {
        toast('미디어 첨부 실패', 'error');
      }
    }
  };

  const fileInput = el('input', { type: 'file', style: { display: 'none' }, multiple: true, onchange: async (e) => {
    if (!e.target.files) return;
    await handleFiles(Array.from(e.target.files));
    e.target.value = '';
  }});

  // Toolbar Buttons
  const createBtn = (iconName, title, cmd, val=null, isAction=false) => {
    const btn = el('button', { type: 'button', className: 'toolbar-btn hover-active p-2 hover:bg-hover rounded-lg flex items-center justify-center transition-all text-tx hover:text-tx', title, onclick: () => {
      if (isAction) {
        if (cmd === 'link') {
          const url = prompt('링크 URL을 입력하세요:', 'https://');
          if (url) exec('createLink', url);
        } else if (cmd === 'file') {
          fileInput.click();
        }
      } else {
        exec(cmd, val);
      }
    }});
    if (iconName.startsWith('text:')) {
      const text = iconName.split(':')[1];
      let style = 'width: 20px; height: 20px; line-height: 20px; text-align: center; font-family: serif; display: block; color: currentColor;';
      if (cmd === 'bold') style += ' font-weight: bold;';
      if (cmd === 'italic') style += ' font-style: italic;';
      if (cmd === 'underline') style += ' text-decoration: underline;';
      if (cmd === 'strikeThrough') style += ' text-decoration: line-through;';
      
      btn.innerHTML = `<span class="text-base leading-none" style="${style}">${text}</span>`;
    } else if (icons[iconName]) {
      btn.innerHTML = icons[iconName](20);
    }
    btn.dataset.cmd = cmd;
    if (val) btn.dataset.val = val;
    return btn;
  };

  // Font Size Select
  const fontSizes = [
    {val: 1, label: '10px'}, {val: 2, label: '13px'}, {val: 3, label: '16px'}, 
    {val: 4, label: '18px'}, {val: 5, label: '24px'}, {val: 6, label: '32px'}, {val: 7, label: '48px'}
  ];
  const sizeSelect = createDropdownSelect(
    fontSizes.map(s => ({ value: s.val, label: s.label })),
    3,
    (val) => exec('fontSize', val),
    '글자 크기'
  );
  sizeSelect.style.width = '100px';

  // Font Family Select
  const fonts = ['Arial', 'Pretendard', 'Inter', 'Courier New', 'Georgia', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Times New Roman'];
  const fontSelect = createDropdownSelect(
    fonts.map(f => ({ value: f, label: f })),
    'Pretendard',
    (val) => exec('fontName', val),
    '폰트'
  );
  fontSelect.style.width = '120px';

  // Color Picker Popup Trigger
  const colorBtnWrap = el('div', { className: 'relative' });
  const colorBtn = el('button', { type: 'button', className: 'toolbar-btn hover-active p-2 hover:bg-hover rounded-lg flex items-center justify-center transition-all text-tx hover:text-tx', title: '글자 색상' }, 
    el('span', { innerHTML: icons.palette ? icons.palette(20) : '색', style: { color: 'currentColor' } })
  );
  let colorPopup = null;
  colorBtn.onclick = () => {
    if (colorPopup) { colorPopup.close(); colorPopup = null; }
    else {
      colorPopup = showColorPickerModal((hex) => {
        colorBtn.firstChild.style.color = hex;
        exec('foreColor', hex);
      }, () => {
        colorPopup = null;
      });
    }
  };
  colorBtnWrap.appendChild(colorBtn);

  const btns = {
    bold: createBtn('text:B', '굵게', 'bold'),
    italic: createBtn('text:I', '기울임', 'italic'),
    underline: createBtn('text:U', '밑줄', 'underline'),
    strike: createBtn('text:S', '취소선', 'strikeThrough'),
    left: createBtn('alignLeft', '왼쪽 정렬', 'justifyLeft'),
    center: createBtn('alignCenter', '가운데 정렬', 'justifyCenter'),
    right: createBtn('alignRight', '오른쪽 정렬', 'justifyRight'),
    justify: createBtn('alignJustify', '양쪽 정렬', 'justifyFull'),
    link: createBtn('link', '링크 삽입', 'link', null, true),
    file: createBtn('paperclip', '미디어/파일 첨부', 'file', null, true)
  };

  function updateToolbarState() {
    const activeClass = 'bg-active text-brand';
    const states = {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough'),
      justifyLeft: document.queryCommandState('justifyLeft'),
      justifyCenter: document.queryCommandState('justifyCenter'),
      justifyRight: document.queryCommandState('justifyRight'),
      justifyFull: document.queryCommandState('justifyFull')
    };
    
    const toggle = (btn, isActive) => {
      if (!btn) return;
      if (isActive) btn.classList.add('bg-hover', 'text-brand');
      else btn.classList.remove('bg-hover', 'text-brand');
    };
    
    toggle(btns.bold, states.bold);
    toggle(btns.italic, states.italic);
    toggle(btns.underline, states.underline);
    toggle(btns.strike, states.strikeThrough);
    toggle(btns.left, states.justifyLeft);
    toggle(btns.center, states.justifyCenter);
    toggle(btns.right, states.justifyRight);
    toggle(btns.justify, states.justifyFull);
    
    try {
      const fontSize = document.queryCommandValue('fontSize');
      if (fontSize) sizeSelect.setValue(fontSize);
      
      const fontName = document.queryCommandValue('fontName');
      if (fontName) {
        const name = fontName.replace(/['"]/g, '');
        fontSelect.setValue(name);
      }
      
      const foreColor = document.queryCommandValue('foreColor');
      if (foreColor && foreColor !== 'false') {
        colorBtn.firstChild.style.color = foreColor;
      }
    } catch (e) {}
  }
  editorArea.addEventListener('keyup', updateToolbarState);
  editorArea.addEventListener('mouseup', updateToolbarState);

  const divider = () => el('div', { className: 'w-px h-4 bg-border mx-1' });

  const toolbar = el('div', { className: 'editor-toolbar flex items-center gap-1 border-b border-base p-2 bg-element overflow-x-auto rounded-t-2xl' },
    sizeSelect, fontSelect, colorBtnWrap,
    divider(),
    btns.bold, btns.italic, btns.underline, btns.strike
  );

  if (!options.hideAdvanced) {
    toolbar.append(
      divider(),
      btns.left, btns.center, btns.right, btns.justify,
      divider(),
      btns.link, btns.file,
      fileInput
    );
  }
  
  container.appendChild(toolbar);
  container.appendChild(editorArea);
  
  const footer = el('div', { className: 'flex items-center justify-end p-3 bg-element border-t border-base gap-2' },
    onDraftSave ? el('button', { type: 'button', className: 'btn btn-outline px-6', onclick: () => {
      const content = editorArea.innerHTML;
      if (!editorArea.textContent.trim() && !content.includes('<img') && !(titleInput && titleInput.value.trim())) return;
      onDraftSave(content, titleInput ? titleInput.value : '');
    } }, '임시저장') : null,
    onSubmit ? el('button', { type: 'button', className: 'btn btn-primary px-6', onclick: (e) => {
      const btn = e.currentTarget;
      if (btn.disabled) return;
      hideOverlay();
      const content = editorArea.innerHTML;
      if (!editorArea.textContent.trim() && !content.includes('<img') && !(titleInput && titleInput.value.trim())) return;
      
      btn.disabled = true;
      try {
        onSubmit(content, titleInput ? titleInput.value : '');
        editorArea.innerHTML = '';
        if (titleInput) titleInput.value = '';
        localStorage.removeItem(draftKey);
      } finally {
        // Re-enable after a short delay in case of errors, or if modal stays open
        setTimeout(() => btn.disabled = false, 1000);
      }
    } }, submitLabel) : null
  );

  container.append(toolbar, editorArea, footer);
  return container;
}
