const fs = require('fs');

const langText = fs.readFileSync('public/js/lang.js', 'utf8');
const koStart = langText.indexOf('ko: {');
const enStart = langText.indexOf('en: {');
const koText = langText.slice(koStart, enStart);

const koKeys = [...koText.matchAll(/([a-zA-Z0-9_]+)\s*:/g)].map(m => m[1]);

const jsFiles = ['public/js/pages.js', 'public/js/components.js', 'public/js/editor.js', 'public/js/main.js', 'public/js/utils.js'];
const usedKeys = new Set();
jsFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const matches = content.matchAll(/t\(['\"]([a-zA-Z0-9_]+)['\"]\)/g);
  for (const match of matches) {
    usedKeys.add(match[1]);
  }
});

const missingKeys = [];
for (const key of usedKeys) {
  if (!koKeys.includes(key)) {
    missingKeys.push(key);
  }
}
console.log('Missing keys in lang.js:');
console.log(missingKeys);
