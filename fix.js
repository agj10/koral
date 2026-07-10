import fs from 'fs';
const files = [
  'c:/Workspace/indi/koral/public/js/components.js',
  'c:/Workspace/indi/koral/public/js/pages.js',
  'c:/Workspace/indi/koral/public/js/main.js'
];
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/\.substring\(1\)/g, ".replace(/^@/, '')");
  fs.writeFileSync(f, content);
});
console.log('Fixed substring bug');
