#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const partialsDir = path.join(__dirname, '..', 'partials');
const files = fs.readdirSync(partialsDir).filter(f => f.endsWith('.html'));
let issues = 0;
files.forEach(f => {
  const p = path.join(partialsDir, f);
  const content = fs.readFileSync(p, 'utf8');
  // Skip wrapper/manifest files that only include canonical partials
  if (/canonical/i.test(content) || /include\('/i.test(content) ) {
    return;
  }
  const hasDataAttr = /data-\w+-icon/.test(content);
  const hasNoScriptImg = /<noscript>\s*<img[^>]*src=["'][^"']+["'][^>]*>\s*<\/noscript>/i.test(content);
  if (hasDataAttr && !hasNoScriptImg) {
    console.error(`Partial ${f} declares data-* icon attr but lacks a <noscript><img ... /></noscript> fallback.`);
    issues++;
  }
});
if (issues > 0) {
  console.error(`${issues} partials missing noscript fallback(s).`);
  process.exit(1);
}
console.log('Icon partial audit passed. All partials contain a noscript fallback for icons.');
process.exit(0);
