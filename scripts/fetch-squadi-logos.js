/* Fetch ladder Logo URLs from Apps Script getTeamInfo and save into apps/coach-app/public/assets/team-logos/
   Usage: node scripts/fetch-squadi-logos.js
*/
const https = require('https');
const fs = require('fs');
const path = require('path');

const API_URL = 'https://script.google.com/macros/s/AKfycbwss2trWP44QVCxMdvNzk89sXQaCnhyFbUty22s_dXIg0NOA94Heqagt_bndZYR1NWo/exec?api=true&action=getTeamInfo&teamID=team_1770421147222&forceRefresh=true';
const outDir = path.join(__dirname, '..', 'apps', 'coach-app', 'public', 'assets', 'team-logos');
fs.mkdirSync(outDir, { recursive: true });

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^[-]+|[-]+$/g, '');
}

function download(url, outPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outPath);
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // follow redirect
        return download(res.headers.location, outPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error('HTTP ' + res.statusCode));
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(outPath, () => reject(err));
    });
  });
}

https.get(API_URL, (res) => {
  let body = '';
  res.setEncoding('utf8');
  res.on('data', d => body += d);
  res.on('end', async () => {
    let js;
    try { js = JSON.parse(body); } catch (e) { console.error('Failed to parse JSON', e); process.exit(1); }
    const rows = (((js || {}).info || {}).ladder || {}).rows || [];
    console.log('Found ladder rows:', rows.length);
    const tasks = [];
    for (const r of rows) {
      const logo = r.Logo;
      const team = r.TEAM || r.team || 'team';
      if (!logo) continue;
      const m = logo.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
      let ext = (m && m[1]) ? m[1].toLowerCase() : 'png';
      if (!['png','jpg','jpeg','svg','webp'].includes(ext)) ext = 'png';
      const filename = `${slug(team)}.${ext}`;
      const outPath = path.join(outDir, filename);
      if (fs.existsSync(outPath)) { console.log('Skipping existing:', filename); continue; }
      console.log('Downloading', team, '->', filename);
      tasks.push(download(logo, outPath).catch(err => { console.error('Failed', logo, err.message); }));
    }
    await Promise.all(tasks);
    console.log('Done. Directory listing:');
    console.log(fs.readdirSync(outDir).sort().join('\n'));
  });
}).on('error', (err) => { console.error('API fetch failed', err); process.exit(1); });
