const fs = require('fs');
let pages = fs.readFileSync('public/js/pages.js', 'utf8');

// Fix followers modal real-time update
pages = pages.replace(
  /onclick: \(\) => showUserListModal\(t\('statFollowers'\)\.trim\(\), user\.followers \|\| \[\]\)/g,
  "onclick: () => showUserListModal(t('statFollowers').trim(), store.getUser(user.handle).followers || [])"
);
pages = pages.replace(
  /onclick: \(\) => showUserListModal\(t\('statFollowing'\)\.trim\(\), user\.following \|\| \[\]\)/g,
  "onclick: () => showUserListModal(t('statFollowing').trim(), store.getUser(user.handle).following || [])"
);

// Also re-render the followers/following numbers properly in followBtn onclick:
// wait, the previous logic: if (stats && stats.children[1]) { const countEl = ... }
// Let's replace the whole stats block to just be safe. But wait, it's safer to just let the above closure fix it.

fs.writeFileSync('public/js/pages.js', pages);
console.log('Fixed real-time followers modal');
