export function uid() {
  return Math.random().toString(36).substring(2, 10);
}

export function timeAgo(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "방금";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}일 전`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}주 전`;
  
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderMarkdown(text) {
  if (!text) return '';
  let html = text;

  // Mentions
  html = html.replace(/@([a-zA-Z0-9가-힣_]+)/g, '<span class="mention" style="color:var(--brand);font-weight:bold;" data-handle="$1">@$1</span>');

  // Blockquotes
  html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
  
  // Headings
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
  
  // Strikethrough
  html = html.replace(/~~(.*?)~~/gim, '<del>$1</del>');
  
  // Code Blocks
  html = html.replace(/```([^`]+)```/gim, '<pre><code>$1</code></pre>');
  
  // Inline Code
  html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" style="max-width:100%; border-radius: var(--r-xl); margin: var(--s3) 0; display:block;" />');

  // Videos
  html = html.replace(/\[비디오\]\(([^)]+)\)/gim, '<video src="$1" controls style="max-width:100%; border-radius: var(--r-xl); margin: var(--s3) 0; display:block;"></video>');
  
  // Horizontal Rule
  html = html.replace(/^---$/gim, '<hr />');

  // Newlines to <br> for plain text outside of block elements
  // Very simplistic approach for this example
  html = html.replace(/\n/gim, '<br />');

  return html;
}

export function el(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);
  
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'dataset') {
      for (const [dataKey, dataVal] of Object.entries(value)) {
        element.dataset[dataKey] = dataVal;
      }
    } else if (key === 'style') {
      if (typeof value === 'string') {
        element.style.cssText = value;
      } else {
        for (const [styleKey, styleVal] of Object.entries(value)) {
          element.style[styleKey] = styleVal;
        }
      }
    } else if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.substring(2).toLowerCase(), value);
    } else if (key === 'innerHTML') {
      element.innerHTML = value;
    } else if (key === 'textContent') {
      element.textContent = value;
    } else {
      element.setAttribute(key, value);
    }
  }

  for (const child of children) {
    if (child) {
      if (typeof child === 'string' || typeof child === 'number') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof HTMLElement || child instanceof SVGElement) {
        element.appendChild(child);
      } else if (Array.isArray(child)) {
        child.forEach(c => {
          if (c instanceof HTMLElement || c instanceof SVGElement) element.appendChild(c);
          else if (c) element.appendChild(document.createTextNode(c));
        });
      }
    }
  }

  return element;
}

export function $(sel, parent = document) {
  return parent.querySelector(sel);
}

export function $$(sel, parent = document) {
  return Array.from(parent.querySelectorAll(sel));
}

export function toast(message, type = 'info') {
  const container = document.getElementById('toast-root');
  if (!container) return;

  const toastEl = el('div', { className: `toast toast-${type}` },
    el('div', { className: 'toast-dot' }),
    el('span', { textContent: message })
  );

  container.appendChild(toastEl);

  setTimeout(() => {
    toastEl.classList.add('out');
    setTimeout(() => toastEl.remove(), 250);
  }, 3000);
}

export function showModal(contentEl, options = {}) {
  const container = document.getElementById('modal-root');
  if (!container) return { close: () => {} };

  const close = () => {
    backdrop.remove();
    if (options.onClose) options.onClose();
  };

  const modalClass = ['modal'];
  if (options.large) modalClass.push('modal-lg');
  if (options.xl) modalClass.push('modal-xl');
  if (options.className) modalClass.push(options.className);

  const modal = el('div', { 
    className: modalClass.join(' '),
    onmousedown: (e) => e.stopPropagation(),
    onclick: (e) => e.stopPropagation()
  }, contentEl);

  const backdrop = el('div', { 
    className: 'modal-backdrop',
    onmousedown: (e) => {
      if (e.target === backdrop) close();
    }
  }, modal);

  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);

  container.appendChild(backdrop);
  return { close };
}

export function confirmDialog(message, title = '확인') {
  return new Promise((resolve) => {
    let closeFn;
    const content = el('div', {},
      el('div', { className: 'modal-header' }, el('h3', { textContent: title })),
      el('div', { className: 'modal-body' }, el('p', { textContent: message })),
      el('div', { className: 'modal-footer' },
        el('button', { 
          className: 'btn btn-ghost', 
          textContent: '취소',
          onclick: () => { closeFn(); resolve(false); }
        }),
        el('button', { 
          className: 'btn btn-primary', 
          textContent: '확인',
          onclick: () => { closeFn(); resolve(true); }
        })
      )
    );
    const modal = showModal(content);
    closeFn = modal.close;
  });
}

export function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function debounce(fn, ms = 300) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

export function resizeImage(file, maxSize = 800) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(file.type));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function generateGradientAvatar(initials) {
  const canvas = document.createElement('canvas');
  canvas.width = 120;
  canvas.height = 120;
  const ctx = canvas.getContext('2d');
  
  const colors = [
    ['#ef4444', '#f43f5e'],
    ['#f97316', '#ea580c'],
    ['#f43f5e', '#be123c'],
    ['#f59e0b', '#d97706'],
    ['#ef4444', '#991b1b'],
    ['#fb923c', '#ef4444']
  ];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  const gradient = ctx.createLinearGradient(0, 0, 120, 120);
  gradient.addColorStop(0, color[0]);
  gradient.addColorStop(1, color[1]);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 120, 120);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 50px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, 60, 60);
  
  return canvas.toDataURL('image/png');
}

export function generatePlaceholderImage() {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  
  const colors = [
    ['#f1f5f9', '#cbd5e1'],
    ['#e0e7ff', '#c7d2fe'],
    ['#fae8ff', '#f5d0fe'],
    ['#dcfce7', '#bbf7d0'],
    ['#fef3c7', '#fde68a']
  ];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  const gradient = ctx.createLinearGradient(0, 0, 800, 600);
  gradient.addColorStop(0, color[0]);
  gradient.addColorStop(1, color[1]);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 600);
  
  return canvas.toDataURL('image/png');
}

export function createDropdownSelect(options, value, onChange, placeholder = '') {
  const wrap = el('div', { className: 'custom-select-wrap relative inline-block w-full' });
  let selectedOpt = options.find(o => o.value === value) || options[0];
  const selectedText = el('span', { className: 'truncate', textContent: selectedOpt ? selectedOpt.label : placeholder });
  
  const header = el('div', { 
    className: 'custom-select-header flex items-center justify-between gap-2 cursor-pointer px-4 py-3 rounded-2xl bg-element border border-base text-sm font-semibold min-w-[120px] h-full w-full', 
    onclick: (e) => { 
      e.stopPropagation(); 
      openModalSelect(options, value, (newVal, newLabel) => {
        value = newVal;
        selectedText.textContent = newLabel;
        if (onChange) onChange(value);
      }, placeholder || '선택');
    } 
  }, selectedText, el('div', { innerHTML: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`, className: 'text-tx-3 flex-shrink-0' }));
  
  wrap.appendChild(header);
  return wrap;
}

function openModalSelect(options, currentValue, onSelect, titleText) {
  let modalInstance = null;
  
  const listWrap = el('div', { className: 'flex flex-col w-full max-h-[60vh] overflow-y-auto p-2 gap-1' });
  
  options.forEach(opt => {
    const isSelected = opt.value === currentValue;
    const item = el('div', { 
      className: 'px-4 py-3 cursor-pointer hover:bg-hover transition-colors text-left rounded-xl' + (isSelected ? ' text-brand font-bold bg-brand/10' : ' text-tx font-medium'), 
      textContent: opt.label, 
      onclick: () => {
        onSelect(opt.value, opt.label);
        if (modalInstance) modalInstance.close();
      } 
    });
    listWrap.appendChild(item);
  });
  
  const content = el('div', { className: 'p-0 flex flex-col items-center w-[300px] max-w-[90vw] mx-auto bg-element rounded-2xl overflow-hidden shadow-lg' },
    el('div', { className: 'font-bold text-lg p-4 border-b border-base w-full text-center' }, titleText),
    listWrap
  );
  
  modalInstance = showModal(content, { className: 'select-modal' });
}

