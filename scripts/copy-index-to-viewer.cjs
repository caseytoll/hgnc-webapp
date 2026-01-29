// Copy main site index.html to viewer/dist after read-only build
const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '../index.html');
const dest = path.resolve(__dirname, '../viewer/dist/index.html');

fs.copyFileSync(src, dest);
console.log('Copied main index.html to viewer/dist for consistent formatting.');
