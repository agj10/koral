const fs = require('fs');
let code = fs.readFileSync('public/js/lang.js', 'utf8');
const startKo = code.indexOf('ko: {');
const startEn = code.indexOf('en: {');
const startJa = code.indexOf('ja: {');
const startZh = code.indexOf('zh: {');

const blocks = {
  ko: code.slice(startKo, startEn),
  en: code.slice(startEn, startJa),
  ja: code.slice(startJa, startZh),
  zh: code.slice(startZh)
};

const keys = { ko: [], en: [], ja: [], zh: [] };
for (const [lang, text] of Object.entries(blocks)) {
  const matches = text.matchAll(/([a-zA-Z0-9_]+)\s*:/g);
  for (const match of matches) {
    if (['ko', 'en', 'ja', 'zh'].includes(match[1])) continue;
    keys[lang].push(match[1]);
  }
}

const allKeys = [...new Set([...keys.ko, ...keys.en, ...keys.ja, ...keys.zh])];
const missing = {};
for (const lang of ['ko', 'en', 'ja', 'zh']) {
  missing[lang] = allKeys.filter(k => !keys[lang].includes(k));
}
console.log(JSON.stringify(missing, null, 2));
