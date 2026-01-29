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
  // Accept API URL and viewer base from CLI or environment variables to support CI and Pages builds
  let apiUrl = argv.api || process.env.GS_API_URL || null;
  const teamsFile = argv.teams;
  const viewerOut = argv['viewer-out'] ? path.resolve(argv['viewer-out']) : null;
  let baseUrl = (argv['base-url'] ? argv['base-url'] : process.env.VIEWER_BASE_URL || null);

  // Handle cases where CI/build may pass the literal "$GS_API_URL" (unexpanded) — fall back to env
  if (apiUrl && apiUrl.startsWith('$')) {
    apiUrl = process.env.GS_API_URL || null;
    if (apiUrl) console.log('Expanded GS_API_URL from environment.');
  }
  if (baseUrl && baseUrl.startsWith('$')) {
    baseUrl = process.env.VIEWER_BASE_URL || null;
    if (baseUrl) console.log('Expanded VIEWER_BASE_URL from environment.');
  }

  if (!fs.existsSync(outDir)) {
    console.error('Output dir not found:', outDir);
    process.exit(1);
  }

  if (!apiUrl && !teamsFile) {
    console.error('Specify --api <GS_API_URL> or set GS_API_URL environment variable, or use --teams <file.json>');
    process.exit(1);
  }

  if (!apiUrl) {
    console.log('Using teams from file or environment; no GS_API_URL provided.');
  } else {
    console.log('Using GS_API_URL:', apiUrl.replace(/([^:\/]+@)?(.{8}).+(.{4})/, '***REDACTED***'));
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

    // Only create /teams/<slug>/ entries, do not generate /p/<slug>/index.html or any redirect files
    created.push({ path: `/teams/${slug}/`, teamID: team.teamID, name, slug });
    console.log('Created team portal path:', `/teams/${slug}/`);
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
