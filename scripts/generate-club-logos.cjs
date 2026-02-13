// Scan `apps/coach-app/public/assets/team-logos` and generate `data/club-logos.json`
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'apps', 'coach-app', 'public', 'assets', 'team-logos');
const outFile = path.join(__dirname, '..', 'data', 'club-logos.json');

const files = fs.readdirSync(assetsDir).filter(f => f.match(/\.(png|svg|jpg|jpeg|webp)$/i));
const map = {};
files.forEach(f => {
  const name = f.replace(/\.[^.]+$/, '');
  map[name] = `/assets/team-logos/${f}`;
});
fs.writeFileSync(outFile, JSON.stringify(map, null, 2) + '\n');
console.log('Wrote', outFile, Object.keys(map).length, 'entries');