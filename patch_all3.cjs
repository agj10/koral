const fs = require('fs');

// 1. Add Cache-Control to index.html and bump to v=7
let index = fs.readFileSync('public/index.html', 'utf8');
if (!index.includes('Cache-Control')) {
  index = index.replace('<title>', '<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />\n  <meta http-equiv="Pragma" content="no-cache" />\n  <meta http-equiv="Expires" content="0" />\n  <title>');
}
index = index.replace(/v=6/g, 'v=7');
fs.writeFileSync('public/index.html', index);

// 2. Fix lang.js: Add kw* and fix Reef/Shell transliteration
let lang = fs.readFileSync('public/js/lang.js', 'utf8');

// Replace Reef/Shell in Chinese
lang = lang.replace(/发布 Reef/g, '发布里夫');
lang = lang.replace(/Reefs/g, '里夫');
// English is fine with Reef/Shell.
// Japanese
// Let's manually replace in lang.js text.

const newTranslations = {
  ko: {
    kwFrontend: '#프론트엔드', kwPhoto: '#감성사진', kwCafe: '#카페투어', kwOotd: 'OOTD', kwPortfolio: '포트폴리오', kwAi: 'AI 활용법'
  },
  en: {
    kwFrontend: '#Frontend', kwPhoto: '#AestheticPhoto', kwCafe: '#CafeTour', kwOotd: 'OOTD', kwPortfolio: 'Portfolio', kwAi: 'AI Tips'
  },
  ja: {
    kwFrontend: '#フロントエンド', kwPhoto: '#エモい写真', kwCafe: '#カフェ巡り', kwOotd: 'OOTD', kwPortfolio: 'ポートフォリオ', kwAi: 'AI活用法'
  },
  zh: {
    kwFrontend: '#前端', kwPhoto: '#唯美照片', kwCafe: '#探店', kwOotd: 'OOTD', kwPortfolio: '作品集', kwAi: 'AI应用'
  }
};

for (const [langCode, keys] of Object.entries(newTranslations)) {
  const replacement = Object.entries(keys).map(([k, v]) => `    ${k}: '${v}',`).join('\n');
  lang = lang.replace(new RegExp(`(${langCode}: \\{\\s*)`), `$1${replacement}\n`);
}

// Fix any leftover 'Reef' in JA/ZH
lang = lang.replace(/reefUpload: 'Publish Reef',/g, "reefUpload: 'Publish Reef',"); // wait, need to be careful not to replace English.
lang = lang.replace(/ja: \{([\s\S]*?)\} ?,/g, (match, inner) => {
  let m = inner.replace(/Reef/g, 'リーフ').replace(/Shell/g, 'シェル');
  return `ja: {${m}},`;
});
lang = lang.replace(/zh: \{([\s\S]*?)\}([\s\S]*?)$/g, (match, inner, rest) => {
  let m = inner.replace(/Reef/g, '里夫').replace(/Shell/g, '雪尔');
  return `zh: {${m}}${rest}`;
});

fs.writeFileSync('public/js/lang.js', lang);

// 3. Bump version in all JS files
const files = ['components.js', 'editor.js', 'main.js', 'pages.js', 'store.js', 'utils.js', 'lang.js', 'icons.js', 'waves.js'];
files.forEach(f => {
  const p = 'public/js/' + f;
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/v=6/g, 'v=7');
    content = content.replace(/from '\.\/([a-z.]+)(\?v=[0-9]+)?'/g, "from './$1?v=7'");
    content = content.replace(/import\('\.\/([a-z.]+)(\?v=[0-9]+)?'\)/g, "import('./$1?v=7')");
    fs.writeFileSync(p, content);
  }
});
console.log('Fixed cache, translation keywords, and transliterations.');
