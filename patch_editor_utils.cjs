const fs = require('fs');
let utils = fs.readFileSync('public/js/utils.js', 'utf8');
utils = utils.replace(/\\\[비디오\\\]/g, '\\[(비디오|Video|video|ビデオ|视频)\\]');
fs.writeFileSync('public/js/utils.js', utils);

let editor = fs.readFileSync('public/js/editor.js', 'utf8');
editor = editor.replace(/: '색',/g, ": typeof window.t === 'function' ? window.t('colorSelect') : '색',");
fs.writeFileSync('public/js/editor.js', editor);
