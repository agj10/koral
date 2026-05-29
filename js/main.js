import { icons } from './icons.js';
import { el, $, $$ } from './utils.js';
import { store } from './store.js';
import { renderFeedPage, renderExplorePage, renderProfilePage, renderPostPage, renderSettingsPage, renderEditProfilePage, renderThemeSettingsPage, renderSecurityPage, renderLoginPage, renderSignupPage, renderLandingPage, renderCreatePage } from './pages.js';

let appRoot, shell, mainContent;

function buildAppShell() {
  if (document.querySelector('.app-shell')) return;
  
  appRoot.innerHTML = '';
  shell = el('div', { className: 'app-shell' });
  
  // Sidebar
  const sidebar = el('aside', { className: 'sidebar-nav' });
  const logoWrap = el('div', { className: 'sidebar-logo cursor-pointer', onclick: () => window.navigateTo('feed') },
    el('div', { className: 'sidebar-logo-icon', innerHTML: '<svg viewBox="0 0 100 100" fill="none" width="28" height="28"><defs><linearGradient id="slg" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#ef4444"/><stop offset="100%" stop-color="#f43f5e"/></linearGradient></defs><g fill="url(#slg)" transform="translate(0, 4)"><rect x="10" y="48" width="80" height="24"/><rect x="50" y="48" width="40" height="24" transform="rotate(-60 50 60)"/><rect x="50" y="48" width="40" height="24" transform="rotate(-120 50 60)"/></g></svg>' }),
    el('div', { className: 'sidebar-logo-text' }, 'koral')
  );
  
  const navItems = el('div', { className: 'nav-items', style: { flex: 1, display: 'flex', flexDirection: 'column' } });
  
  const createNavItem = (id, iconSvg, label, route) => {
    const item = el('a', { 
      className: 'nav-item', 
      id: `nav-${id}`,
      onclick: () => window.navigateTo(route)
    },
      el('div', { className: 'nav-item-icon' }, el('span', { innerHTML: iconSvg })),
      el('div', { className: 'nav-item-label' }, label)
    );
    return item;
  };
  
  navItems.append(
    createNavItem('home', icons.home(24), '홈', 'feed'),
    createNavItem('explore', icons.compass(24), '탐색', 'explore'),
    createNavItem('create', icons.plusSquare(24), '만들기', 'create')
  );
  
  const currentUser = store.getState().currentUser;
  if (currentUser) {
    navItems.appendChild(createNavItem('profile', icons.user(24), '프로필', `profile/${currentUser.handle.substring(1)}`));
  }
  
  const bottomNavItems = el('div', { className: 'mt-auto mb-4', style: { display: 'flex', flexDirection: 'column' } },
    createNavItem('settings', icons.settings(24), '설정', 'settings')
  );
  
  sidebar.append(logoWrap, navItems, bottomNavItems);
  
  // Main Content
  mainContent = el('main', { className: 'main-content' });
  
  // Mobile Bottom Nav
  const mobileNav = el('nav', { className: 'bottom-nav' },
    el('div', { className: 'bottom-nav-items' },
      createNavItem('m-home', icons.home(24), '', 'feed'),
      createNavItem('m-explore', icons.compass(24), '', 'explore'),
      createNavItem('m-create', icons.plusSquare(24), '', 'create'),
      currentUser ? createNavItem('m-profile', icons.user(24), '', `profile/${currentUser.handle.substring(1)}`) : ''
    )
  );
  
  shell.append(sidebar, mainContent, mobileNav);
  appRoot.appendChild(shell);
}

let lastMainRoute = 'feed';

function updateNavActive(route) {
  $$('.nav-item').forEach(item => item.classList.remove('active'));
  
  if (['feed', 'explore', 'profile', 'settings'].includes(route) || route === '') {
    lastMainRoute = route || 'feed';
  }
  
  let targetId = 'nav-home';
  const activeRoute = ['post', 'tag'].includes(route) ? lastMainRoute : route;
  
  if (activeRoute.startsWith('explore')) targetId = 'nav-explore';
  else if (activeRoute.startsWith('create')) targetId = 'nav-create';
  else if (activeRoute.startsWith('profile')) targetId = 'nav-profile';
  else if (activeRoute.startsWith('settings')) targetId = 'nav-settings';
  
  const target = $(`#${targetId}`);
  if (target) target.classList.add('active');
  const mTarget = $(`#m-${targetId.replace('nav-', '')}`);
  if (mTarget) mTarget.classList.add('active');
}

let currentPath = '';

function router() {
  const hash = window.location.hash.slice(1) || '';
  
  if (currentPath && currentPath !== hash) {
    sessionStorage.setItem(`scroll_${currentPath}`, window.scrollY);
  }
  currentPath = hash;
  
  store.subscribers = [];
  
  const parts = hash.split('/').filter(Boolean);
  const route = parts[0] || '';
  const param = parts[1] || '';
  
  const currentUser = store.getState().currentUser;
  
  // Auto-login logic: redirect to feed if already logged in
  if (currentUser && ['login', 'signup', ''].includes(route)) {
    return window.navigateTo('feed');
  }
  
  // Routes not requiring auth
  if (route === 'login') return renderLoginPage(appRoot);
  if (route === 'signup') return renderSignupPage(appRoot);
  if (!currentUser && !['explore', 'profile', 'post', 'tag'].includes(route)) {
    return renderLandingPage(appRoot);
  }
  
  // Build shell if not auth routes
  buildAppShell();
  updateNavActive(route);
  
  switch(route) {
    case 'feed':
    case '':
      renderFeedPage(mainContent);
      break;
    case 'explore':
      renderExplorePage(mainContent);
      break;
    case 'create':
      renderCreatePage(mainContent);
      break;
    case 'profile':
      renderProfilePage(mainContent, { handle: param });
      break;
    case 'post':
      renderPostPage(mainContent, { postId: param });
      break;
    case 'settings':
      if (param === 'profile') renderEditProfilePage(mainContent);
      else if (param === 'theme') renderThemeSettingsPage(mainContent);
      else if (param === 'security') renderSecurityPage(mainContent);
      else renderSettingsPage(mainContent);
      break;
    case 'tag':
      mainContent.innerHTML = `<div class="p-8 text-center text-xl font-bold">#${param} 태그 검색 결과</div>`;
      break;
    default:
      renderFeedPage(mainContent);
  }
  
  setTimeout(() => {
    const savedScroll = sessionStorage.getItem(`scroll_${currentPath}`);
    if (savedScroll) {
      window.scrollTo(0, parseInt(savedScroll, 10));
    } else {
      window.scrollTo(0, 0);
    }
  }, 10);
}

window.navigateTo = function(path) {
  window.location.hash = path;
};

export function initApp() {
  appRoot = $('#app');
  window.addEventListener('hashchange', router);
  
  // Initial render
  router();
}

// Initialize the app immediately
initApp();
