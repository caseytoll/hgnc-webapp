#!/usr/bin/env node
// Generate static redirect pages for each team so parents can use friendly URLs
// Usage: node scripts/generate-team-portals.cjs --api "<GS_API_URL>" --out public/

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

async function main() {
  const argv = require('minimist')(process.argv.slice(2));
  const outDir = path.resolve(argv.out || 'public');
  const apiUrl = argv.api;
  const teamsFile = argv.teams;
  const viewerOut = argv['viewer-out'] ? path.resolve(argv['viewer-out']) : null;
  const baseUrl = argv['base-url'] ? argv['base-url'].replace(/\/$/, '') : null;

  if (!fs.existsSync(outDir)) {
    console.error('Output dir not found:', outDir);
    process.exit(1);
  }

  let teams = [];

  if (apiUrl) {
    // Use Apps Script getTeams
    const url = `${apiUrl.replace(/\/$/, '')}?api=true&action=getTeams`;
    console.log('Fetching teams from API:', url);
    try {
      const data = await fetchJson(url);
      teams = data.teams || [];
    } catch (e) {
      console.error('Failed to fetch teams from API:', e.message || e);
      process.exit(1);
    }
  } else if (teamsFile) {
    const f = path.resolve(teamsFile);
    if (!fs.existsSync(f)) { console.error('Teams file not found:', f); process.exit(1); }
    teams = JSON.parse(fs.readFileSync(f, 'utf8'));
  } else {
    console.error('Specify --api <GS_API_URL> or --teams <file.json>');
    process.exit(1);
  }

  // Create a small index for convenience
  const created = [];
  const usedSlugs = new Set();

  teams.filter(t => !t.archived).forEach(team => {
    const name = team.teamName || team.name || team.sheetName || team.teamID;
    // Build slug: prefer name-season when a season exists, otherwise suffix with teamID
    const base = slugify(name);
    let slug = (team.season && team.season.toString().trim()) ? `${base}-${slugify(team.season)}` : `${base}-${team.teamID}`;
    // Ensure uniqueness across generated slugs
    if (usedSlugs.has(slug)) {
      slug = `${slug}-${team.teamID}`;
    }
    usedSlugs.add(slug);

    // Create compact portal path at /p/<slug>/index.html to avoid exposing project name
    // Primary redirect page
    const filename = `hgnc-team-portal-${slug}.html`;
    const filepath = path.join(outDir, filename);
    // Prefer static team URL (direct read-only page) to avoid viewer auto-select issues
    const target = `${baseUrl ? baseUrl : ''}/teams/${slug}/`;

    // Minimal redirect page with noindex for search engines
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex">
  <title>${name} - HGNC Team Portal</title>
  <meta http-equiv="refresh" content="0; url=${target}">
  <link rel="canonical" href="${target}">
</head>
<body>
  <p>Redirecting to <a href="${target}">${name} portal</a>…</p>
</body>
</html>`;

    // Write to primary output
    fs.writeFileSync(filepath, html, 'utf8');

    // Also option to write into the Viewer public folder so Viewer site can serve compact URLs
    if (viewerOut) {
      const dir = path.join(viewerOut, 'p', slug);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      // Prefer the static /teams/<slug>/ URL so portal short links always land on read-only snapshots
      const viewerTarget = `${baseUrl ? baseUrl : ''}/teams/${slug}/`;
      const viewerHtml = html.replace(new RegExp(target, 'g'), viewerTarget);
      fs.writeFileSync(path.join(dir, 'index.html'), viewerHtml, 'utf8');
      console.log('Also wrote viewer portal at', path.join(dir, 'index.html'));
    }

    created.push({ path: `/p/${slug}/`, teamID: team.teamID, name, slug, target });
    console.log('Created:', filepath, '→', target);
  });

  // Write index file with new path keys
  const indexPath = path.join(outDir, 'team-portal-index.json');
  fs.writeFileSync(indexPath, JSON.stringify(created, null, 2), 'utf8');
  console.log('Wrote index:', indexPath);
}

main().catch(err => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
