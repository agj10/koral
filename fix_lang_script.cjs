const fs = require('fs');
let content = fs.readFileSync('public/js/lang.js', 'utf8');
content = content.replace(/themeDarkDesc: '어두운 테마'\r?\n\s*en: \{/g, "themeDarkDesc: '어두운 테마'\n  },\n  en: {");
fs.writeFileSync('public/js/lang.js', content);

// Create parser for lang.js
let code = content;
code = code.replace('export const translations =', 'const translations =');
code += '\nconst keys = [...new Set([...Object.keys(translations.ko), ...Object.keys(translations.en), ...Object.keys(translations.ja), ...Object.keys(translations.zh)])];\n';
code += 'const missing = {};\n';
code += '[\'ko\', \'en\', \'ja\', \'zh\'].forEach(lang => { missing[lang] = keys.filter(k => typeof translations[lang][k] === "undefined"); });\n';
code += 'console.log(JSON.stringify(missing, null, 2));\n';
fs.writeFileSync('temp.cjs', code);
