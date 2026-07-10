const fs = require('fs');
let text = fs.readFileSync('public/js/lang.js', 'utf8');

// 1. Restore the missing closing braces
text = text.replace(/themeDarkDesc: '어두운 테마'\r?\n\s*en: \{/, "themeDarkDesc: '어두운 테마'\n  },\n  en: {");
text = text.replace(/themeDarkDesc: 'Dark theme'\r?\n\s*ja: \{/, "themeDarkDesc: 'Dark theme'\n  },\n  ja: {");
text = text.replace(/themeDarkDesc: '暗いテーマ'\r?\n\s*zh: \{/, "themeDarkDesc: '暗いテーマ'\n  },\n  zh: {");

// 2. Fix the corrupted keys in ja and zh blocks
// Instead of complex regex, let's just replace the broken keys with the correct ones globally, 
// because keys like 'no里夫:' are obviously broken.
const brokenKeys = {
  'no里夫:': 'noReefs:',
  'no里夫Sub:': 'noReefsSub:',
  'stat里夫:': 'statReefs:',
  'no里夫Title:': 'noReefsTitle:',
  'noSaved里夫Title:': 'noSavedReefsTitle:',
  'new里夫:': 'newReef:',
  'new雪尔:': 'newShell:',
  'reefCreated:': 'reefCreated:', // This key was not broken because 'Reef' was inside the string, wait, 'reef' is lowercase in 'reefCreated', so /Reef/ didn't match! That's good.
  
  'noリーフ:': 'noReefs:',
  'noリーフSub:': 'noReefsSub:',
  'statリーフ:': 'statReefs:',
  'noリーフTitle:': 'noReefsTitle:',
  'noSavedリーフTitle:': 'noSavedReefsTitle:',
  'newリーフ:': 'newReef:',
  'newシェル:': 'newShell:',
};

for (const [broken, fixed] of Object.entries(brokenKeys)) {
  text = text.replaceAll(broken, fixed);
}

fs.writeFileSync('public/js/lang.js', text);
console.log('lang.js repaired!');
