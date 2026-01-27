#!/usr/bin/env node
// Generate full read-only static pages for each team at public/teams/<slug>/index.html
// Usage: node scripts/generate-static-team-pages.cjs --api "<GS_API_URL>" --out public/

const fs = require('fs');
const path = require('path');
const https = require('https');

function slugify(s) {
  return (s || '').toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function fetchJson(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (redirects > 5) return reject(new Error('Too many redirects'));
        const next = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).toString();
        return resolve(fetchJson(next, redirects + 1));
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(new Error('Invalid JSON response: ' + e.message + '\n' + data.substring(0, 200)));
        }
      });
    }).on('error', reject);
  });
}

function formatDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-AU'); } catch (e) { return d; }
}

function computeSimpleStats(teamData) {
  const games = (teamData.games || []).filter(g => g.status === 'normal' && g.scores);
  let wins = 0, losses = 0, draws = 0, gf = 0, ga = 0;
  games.forEach(g => {
    const us = g.scores && typeof g.scores.us === 'number' ? g.scores.us : parseInt(g.scores?.us || 0, 10);
    const them = g.scores && typeof g.scores.opponent === 'number' ? g.scores.opponent : parseInt(g.scores?.opponent || 0, 10);
    gf += us; ga += them;
    if (us > them) wins++; else if (us < them) losses++; else draws++;
  });
  return { games: games.length, wins, losses, draws, gf, ga, gd: gf - ga };
}

function renderTeamPage(team, teamData) {
  const stats = computeSimpleStats(teamData);
  const playersHtml = (teamData.players || []).map(p => `
    <li class="player">${escapeHtml(p.name)} <span class="pos">${escapeHtml(p.favPosition || '')}</span></li>
  `).join('');

  const gamesHtml = (teamData.games || []).map(g => `
    <tr>
      <td>${escapeHtml(g.round || '')}</td>
      <td>${escapeHtml(g.opponent || '')}</td>
      <td>${formatDate(g.date)}</td>
      <td>${g.scores ? (g.scores.us + ' - ' + g.scores.opponent) : '--'}</td>
    </tr>
  `).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex">
  <title>${escapeHtml(team.teamName)} - HGNC (Read-only)</title>
  <style>
    body{font-family:Inter,system-ui,Arial,sans-serif;background:#09090b;color:#fff;margin:0;padding:0}
    .wrap{max-width:900px;margin:0 auto;padding:24px}
    header{display:flex;align-items:center;gap:16px}
    .avatar{width:64px;height:64px;border-radius:8px;background:#2a2a2a;display:flex;align-items:center;justify-content:center;font-weight:700}
    h1{margin:0;font-size:24px}
    .meta{opacity:0.7;margin-top:4px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px}
    .card{background:#0f0f11;border:1px solid #1a1a1a;padding:12px;border-radius:8px}
    .players{list-style:none;padding:0;margin:0}
    .player{padding:6px 0;border-bottom:1px dashed rgba(255,255,255,0.03)}
    table{width:100%;border-collapse:collapse}
    td,th{padding:6px;border-bottom:1px dashed rgba(255,255,255,0.03)}
    .stats{display:flex;gap:12px;margin-top:12px}
    .stat{background:rgba(255,255,255,0.02);padding:8px;border-radius:6px}
    a.btn{display:inline-block;margin-top:12px;padding:8px 12px;background:#7c3aed;color:#fff;border-radius:6px;text-decoration:none}
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <div class="avatar">${escapeHtml(getInitials(team.teamName))}</div>
      <div>
        <h1>${escapeHtml(team.teamName)}</h1>
        <div class="meta">${escapeHtml(team.season || '')} • ${escapeHtml(team.year || '')}</div>
      </div>
    </header>

    <div class="card stats">
      <div class="stat">Games: <strong>${stats.games}</strong></div>
      <div class="stat">W: <strong>${stats.wins}</strong></div>
      <div class="stat">L: <strong>${stats.losses}</strong></div>
      <div class="stat">D: <strong>${stats.draws}</strong></div>
      <div class="stat">GF: <strong>${stats.gf}</strong></div>
      <div class="stat">GA: <strong>${stats.ga}</strong></div>
      <div class="stat">GD: <strong>${stats.gd}</strong></div>
    </div>

    <div class="grid">
      <div class="card">
        <h3>Roster</h3>
        <ul class="players">
          ${playersHtml}
        </ul>
      </div>

      <div class="card">
        <h3>Upcoming/Recent Games</h3>
        <table>
          <thead><tr><th>Round</th><th>Opponent</th><th>Date</th><th>Score</th></tr></thead>
          <tbody>
            ${gamesHtml}
          </tbody>
        </table>
      </div>
    </div>

    <p><a class="btn" href="/viewer/?team=${encodeURIComponent(team.teamID)}">Open in Viewer (read-only)</a></p>

    <footer style="opacity:0.6;margin-top:24px;font-size:12px">Last updated: ${new Date().toISOString()}</footer>
  </div>
</body>
</html>`;
}

function escapeHtml(str){
  if (str==null) return '';
  return String(str).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

function getInitials(name){
  if (!name) return '';
  return name.split(' ').map(w=>w[0]||'').slice(0,2).join('').toUpperCase();
}

async function main(){
  const argv = require('minimist')(process.argv.slice(2));
  const outDir = path.resolve(argv.out || 'public');
  const apiUrl = argv.api;
  const viewerOut = argv['viewer-out'] ? path.resolve(argv['viewer-out']) : null;
  const baseUrl = argv['base-url'] ? argv['base-url'].replace(/\/$/, '') : null;
  if (!apiUrl){
    console.error('Specify --api <GS_API_URL>'); process.exit(1);
  }
  if (!fs.existsSync(outDir)) { console.error('Output dir missing:', outDir); process.exit(1); }

  const teamsUrl = `${apiUrl.replace(/\/$/, '')}?api=true&action=getTeams`;
  console.log('Fetching teams list...');
  const teamsData = await fetchJson(teamsUrl);
  const teams = teamsData.teams || [];

  const created = [];
  const usedSlugs = new Set();

  for (const t of teams) {
    if (t.archived) continue;
    const sheetName = t.sheetName;
    const teamID = t.teamID;
    try{
      const teamDataUrl = `${apiUrl.replace(/\/$/, '')}?api=true&action=getTeamData&teamID=${encodeURIComponent(teamID)}&sheetName=${encodeURIComponent(sheetName)}`;
      console.log('Fetching team data for', t.teamName);
      const teamResp = await fetchJson(teamDataUrl);
      const teamData = teamResp.teamData;

      // Build slug: prefer name-season when season exists, else append teamID to name
      const base = slugify(t.teamName || t.teamID);
      let slug = (t.season && t.season.toString().trim()) ? `${base}-${slugify(t.season)}` : `${base}-${teamID}`;
      // Ensure uniqueness
      if (usedSlugs.has(slug)) {
        slug = `${slug}-${teamID}`;
      }
      usedSlugs.add(slug);

      const dir = path.join(outDir, 'teams', slug);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const html = renderTeamPage(t, teamData);
      fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');

      // Also write to viewer public if requested
      if (viewerOut) {
        const vdir = path.join(viewerOut, 'teams', slug);
        if (!fs.existsSync(vdir)) fs.mkdirSync(vdir, { recursive: true });
        // Adjust canonical links if baseUrl is set
        let viewerHtml = html;
        if (baseUrl) {
          viewerHtml = viewerHtml.replace(/<link rel="canonical" href="[^"]*">/g, `<link rel="canonical" href="${baseUrl}/teams/${slug}/">`);
        }
        fs.writeFileSync(path.join(vdir, 'index.html'), viewerHtml, 'utf8');
        console.log('Also wrote viewer static page at', path.join(vdir, 'index.html'));
      }

      created.push({ path: `/teams/${slug}/`, teamID, name: t.teamName, slug });
      console.log('Created static team page for', t.teamName);
    } catch (e) {
      console.error('Failed to generate for', t.teamName, e.message || e);
    }
  }

  // write index
  fs.writeFileSync(path.join(outDir, 'team-static-index.json'), JSON.stringify(created, null, 2), 'utf8');
  console.log('Wrote index file, created', created.length, 'pages');
}

main().catch(err=>{ console.error(err); process.exit(1); });
