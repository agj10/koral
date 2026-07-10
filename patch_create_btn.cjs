const fs = require('fs');
let pages = fs.readFileSync('public/js/pages.js', 'utf8');

// Replace bg-s with bg-element in the create button of renderProfilePage
pages = pages.replace(/bg-s border-2 border-dashed border-base/g, "bg-element border-2 border-dashed border-base");

fs.writeFileSync('public/js/pages.js', pages);
console.log('Fixed bg-s to bg-element');
