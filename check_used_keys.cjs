const fs = require('fs');
let code = fs.readFileSync('public/js/lang.js', 'utf8');
code = code.replace('export const translations =', 'module.exports =');
code = code.replace(/export function/g, 'function');
fs.writeFileSync('temp3.cjs', code);
const translations = require('./temp3.cjs');

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
  if (!translations.ko[key]) {
    missingKeys.push(key);
  }
}
console.log('Missing keys in lang.js:');
console.log(missingKeys);
