#!/usr/bin/env node
// Automated parent portal deployment script
// 1. Fetches all teams from the API
// 2. Generates a unique slug for each team
// 3. Outputs a deployment plan and writes a system page with all URLs
// 4. (Optional) Triggers deployment for each team (manual step for now)

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_URL = 'https://script.google.com/macros/s/AKfycbx5g7fIW28ncXoI9SeHDKix7umBtqaTdOm1aM-JdgO2l7esQHxu8jViMRRSN7YGtMnd/exec?api=true&action=getTeams';
const PARENT_PORTAL_BASE = 'https://hgnc-gameday-'; // subdomain prefix
const PARENT_PORTAL_SUFFIX = '.pages.dev';
const SYSTEM_PAGE_PATH = path.join(__dirname, '../public/parent-portals.html');

function slugify(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Fetching teams from API...');
  const data = await fetchJson(API_URL);
  if (!data.success || !Array.isArray(data.teams)) {
    throw new Error('API did not return teams list');
  }
  const teams = data.teams;
  const urls = [];
  console.log('Generating parent portal URLs:');
  for (const t of teams) {
    const name = t.teamName || t.name || t.sheetName || t.teamID;
    const year = t.year || '';
    const season = t.season || '';
    // Slug: TeamName-Year-Season (e.g. u11-flames-2025-season-2)
    const slug = [slugify(name), year, slugify(season)].filter(Boolean).join('-');
    const url = `${PARENT_PORTAL_BASE}${slug}${PARENT_PORTAL_SUFFIX}`;
    urls.push({ name, year, season, url });
    console.log(`- ${name} (${year} ${season}): ${url}`);
    // (Optional) Here you would trigger deployment for this team
    // e.g., run a deploy script or API call
  }
  // Write system page
  const html = `<!DOCTYPE html>\n<html><head><title>Parent Portals</title></head><body>\n<h1>Parent Portal Links</h1>\n<ul>\n${urls.map(u => `<li><a href=\"${u.url}\" target=\"_blank\">${u.name} (${u.year} ${u.season})</a></li>`).join('\n')}\n</ul>\n</body></html>`;
  fs.writeFileSync(SYSTEM_PAGE_PATH, html);
  console.log(`\nSystem page written to: ${SYSTEM_PAGE_PATH}`);
}

main().catch(err => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
