import { icons } from './icons.js?v=8';
import { el, $, $$ } from './utils.js?v=8';
import { store } from './store.js?v=8';
import { t } from './lang.js?v=8';
import { renderFeedPage, renderExplorePage, renderProfilePage, renderPostPage, renderSettingsPage, renderEditProfilePage, renderThemeSettingsPage, renderSecurityPage, renderLanguageSettingsPage, renderLoginPage, renderSignupPage, renderLandingPage, renderCreatePage } from './pages.js?v=8';
import { koralWaves } from './waves.js?v=8';

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
  
  const createNavItem = (id, iconSvg, label, route, onClick) => {
    const item = el('a', { 
      className: 'nav-item', 
      id: `nav-${id}`,
      onclick: onClick || (() => window.navigateTo(route))
    },
      el('div', { className: 'nav-item-icon' }, el('span', { innerHTML: iconSvg })),
      el('div', { className: 'nav-item-label' }, label)
    );
    return item;
  };
  
  const currentUser = store.getState().currentUser;
  
  navItems.append(
    createNavItem('home', icons.home(24), t('home'), 'feed'),
    createNavItem('explore', icons.compass(24), t('explore'), 'explore'),
    currentUser ? createNavItem('profile', icons.user(24), t('profile'), `profile/${currentUser.handle.startsWith('@') ? currentUser.handle.replace(/^@/, '') : currentUser.handle}`) : '',
    createNavItem('create', icons.plusSquare(24), t('create'), 'create')
  );
  
  const bottomNavItems = el('div', { className: 'mt-auto mb-4', style: { display: 'flex', flexDirection: 'column' } },
    createNavItem('settings', icons.settings(24), t('settings'), 'settings/profile'),
    createNavItem('more', icons.more(24), t('more'), '#', () => {
      import('./components.js?v=8').then(c => c.showMoreModal());
    })
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
      currentUser ? createNavItem('m-profile', icons.user(24), '', `profile/${currentUser.handle.replace(/^@/, '')}`) : '',
      createNavItem('m-more', icons.more(24), '', '#', () => {
        import('./components.js?v=8').then(c => c.showMoreModal());
      })
    )
  );
  
  const floatingMoreBtn = el('button', { 
    className: 'floating-more-btn', 
    onclick: () => import('./components.js?v=8').then(c => c.showMoreModal()) 
  }, el('span', { innerHTML: icons.more(24) }));
  
  shell.append(sidebar, mainContent, mobileNav, floatingMoreBtn);
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
  try {
    const hash = window.location.hash.slice(1) || '';
    
    if (currentPath && currentPath !== hash) {
      sessionStorage.setItem(`scroll_${currentPath}`, window.scrollY);
    }
    currentPath = hash;
    store.subscribers.clear();
    
    const parts = hash.split('/').filter(Boolean);
    const route = parts[0] || '';
    const param = decodeURIComponent(parts[1] || '');
    
    const currentUser = store.getState().currentUser;
    
    // Auto-login logic: redirect to feed if already logged in (unless adding an account)
    if (currentUser && ['login', 'signup'].includes(route) && route !== 'add-account') {
      return window.navigateTo('feed');
    }
    if (currentUser && route === '') {
      history.replaceState(null, '', '#feed');
    }
    
    // Routes not requiring auth — use surface wave mode (above water)
    if (route === 'login' || route === 'add-account') {
      koralWaves.init('surface');
      return renderLoginPage(appRoot, route === 'add-account');
    }
    if (route === 'signup') {
      koralWaves.init('surface');
      return renderSignupPage(appRoot);
    }
    if (!currentUser && !['explore', 'profile', 'post', 'tag'].includes(route)) {
      koralWaves.init('surface');
      return renderLandingPage(appRoot);
    }
    
    // Post-login — use submerged wave mode (underwater)
    koralWaves.init('submerged');
    
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
        renderCreatePage(mainContent, { subRoute: param, draftId: parts[2] });
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
        else if (param === 'language') renderLanguageSettingsPage(mainContent);
        else {
          // Direct render without triggering double hash change transition
          renderEditProfilePage(mainContent);
          if (window.location.hash !== '#settings/profile') {
            history.replaceState(null, '', '#settings/profile');
          }
        }
        break;
      case 'tag':
        mainContent.innerHTML = `<div class="p-8 text-center text-xl font-bold">#${param} ${t('searchResultsFor')}</div>`;
        break;
      default:
        renderFeedPage(mainContent);
    }
    
    const savedScroll = sessionStorage.getItem(`scroll_${currentPath}`);
    if (savedScroll) {
      window.scrollTo(0, parseInt(savedScroll, 10));
    } else {
      window.scrollTo(0, 0);
    }
  } catch (err) {
    console.error("Router error, clearing localStorage and self-healing:", err);
    localStorage.removeItem('koral_data_v2');
    localStorage.removeItem('koral_recent_searches');
    // window.location.reload();
  }
}

window.navigateTo = function(path) {
  const currentHash = window.location.hash.slice(1) || '';
  
  // Normalize feed and empty paths which are equivalent Home routes
  const normalizedCurrent = (currentHash === 'feed' || currentHash === '') ? 'feed' : currentHash;
  const normalizedNew = (path === 'feed' || path === '') ? 'feed' : path;
  
  if (normalizedCurrent === normalizedNew) {
    return; // Do absolutely nothing if already on the target path
  }
  

  const isSettingsNav = normalizedCurrent.startsWith('settings') && normalizedNew.startsWith('settings');
  if (isSettingsNav) {
    if (normalizedCurrent === normalizedNew) return; // Do nothing if same settings tab
    // Bypass full-page exit transition for settings sub-tabs to allow smooth inner transitions
    window.location.hash = path;
    return;
  }
  
  if (normalizedCurrent.startsWith('profile') && normalizedNew.startsWith('profile')) {
    if (normalizedCurrent === normalizedNew) return; // Do nothing if same profile tab
    window.location.hash = path;
    return;
  }
  const currentContainer = document.querySelector('.main-content') || document.querySelector('#app');
  if (currentContainer) {
    currentContainer.classList.add('page-exit-active');
    setTimeout(() => {
      currentContainer.classList.remove('page-exit-active');
      window.location.hash = path;
    }, 220);
  } else {
    window.location.hash = path;
  }
};

export async function initApp() {
  try {
    appRoot = document.getElementById('app') || document.body;
    if (!appRoot) {
      console.error("App root element not found!");
      return;
    }
    
    // Wait for store (IndexedDB) to load before rendering
    await store.init();
    
    window.addEventListener('hashchange', router);
    
    // Global Event Delegation for Premium Wobbly Hover-In and Hover-Out Decay
    const interactiveSelectors = '.post-card, .btn, .nav-item, .story-item, .search-keyword-card, .suggest-card, .create-option-card, .profile-avatar-wrap, .profile-handle, .profile-name, .profile-bio, .profile-bio-link, .profile-stat, .chip, .settings-item, .input, .textarea, .select, .custom-select-header, .btn-text-link, .btn-icon, .post-action-btn, .profile-tab, .settings-back, .explore-search-input-wrap, .theme-option, .toolbar-btn, .toolbar-dropdown-item';
    
    document.body.addEventListener('mouseover', (e) => {
      if (!e.target || typeof e.target.closest !== 'function') return;
      let target = e.target.closest(interactiveSelectors);
      if (target) {
        const searchWrap = target.closest('.explore-search-input-wrap');
        if (searchWrap) {
          target = searchWrap;
        }
        // Ignore inner child transitions to prevent layout jitter and snapping
        if (e.relatedTarget && target.contains(e.relatedTarget)) return;
        target.classList.add('hover-active');
        target.classList.remove('wobble-out-active');
      }
    });
    
    document.body.addEventListener('mouseout', (e) => {
      if (!e.target || typeof e.target.closest !== 'function') return;
      let target = e.target.closest(interactiveSelectors);
      if (target) {
        const searchWrap = target.closest('.explore-search-input-wrap');
        if (searchWrap) {
          target = searchWrap;
        }
        // Ignore inner child transitions to prevent layout jitter and snapping
        if (e.relatedTarget && target.contains(e.relatedTarget)) return;
        target.classList.remove('hover-active');
        target.classList.add('wobble-out-active');
        setTimeout(() => {
          if (!target.classList.contains('hover-active')) {
            target.classList.remove('wobble-out-active');
          }
        }, 1200);
      }
    });
  
    // Initial render
    router();
  } catch (err) {
    console.error("Critical error during app initialization, clearing state and self-healing:", err);
    localStorage.removeItem('koral_data_v2');
    localStorage.removeItem('koral_recent_searches');
    // window.location.reload();
  }
}

// Initialize the app immediately
initApp();
