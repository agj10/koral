const fs = require('fs');
const files = ['public/js/pages.js', 'public/js/components.js'];
files.forEach(f => {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (line.match(/['\"][A-Z][a-z]+ [A-Za-z ]+['\"]/) && !line.includes('t(') && !line.includes('className') && !line.match(/theme-/) && !line.match(/^[ \t]*console\./)) {
      console.log(f + ':' + (i+1) + ' -> ' + line.trim());
    }
  });
});
