// Script to fetch and parse NFNL ladder for teams with a ladderUrl
// Run this script locally or in CI before deploying to Cloudflare Pages

import fetch from 'node-fetch';
import { load } from 'cheerio';
import fs from 'fs';
import path from 'path';

// Load teams from a JSON file or Google Sheets export (for demo, you may need to adapt this)
// For now, we'll expect a local file: data/teams.json
const TEAMS_PATH = path.resolve('data/teams.json');
const OUTPUT_DIR = path.resolve('public');

function getNowISO() {
  return new Date().toISOString();
}

async function fetchLadder(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ladder: ${url}`);
  return await res.text();
}

function parseLadder(html) {
  const $ = load(html);
  const rows = [];
  const headers = [];
  $('table.stats-table.ranked thead th').each((i, el) => {
    headers.push($(el).text().trim());
  });
  $('table.stats-table.ranked tbody tr').each((i, el) => {
    const cells = $(el).find('td');
    const row = {};
    cells.each((j, cell) => {
      row[headers[j] || `col${j}`] = $(cell).text().trim();
    });
    // Also extract team link if present
    const teamLink = $(cells[1]).find('a').attr('href');
    if (teamLink) row.teamLink = teamLink;
    rows.push(row);
  });
  return { headers, rows };
}

async function main() {
  let teams = [];
  if (fs.existsSync(TEAMS_PATH)) {
    try {
      teams = JSON.parse(fs.readFileSync(TEAMS_PATH, 'utf8'));
    } catch (e) {
      console.warn('Failed to parse local teams.json, falling back to GS API if available');
      teams = [];
    }
  }

  if ((!teams || teams.length === 0) && process.env.GS_API_URL) {
    try {
      console.log('Fetching teams list from Google Sheets API...');
      const res = await fetch(`${process.env.GS_API_URL}?api=true&action=getTeams`);
      const data = await res.json();
      teams = data.teams || [];
    } catch (e) {
      console.error('Failed to fetch teams from API:', e.message);
      process.exit(1);
    }
  }

  if (!teams || teams.length === 0) {
    console.error(`No teams found in ${TEAMS_PATH} and GS_API_URL did not return any teams`);
    process.exit(1);
  }

  for (const team of teams) {
    // Support both ladderUrl (client field) and ladderApi (sheet column)
    const ladderUrl = team.ladderUrl || team.ladderApi || '';
    if (!ladderUrl) continue;
    try {
      console.log(`Fetching ladder for ${team.teamName || team.teamID}...`);
      const html = await fetchLadder(ladderUrl);
      const ladder = parseLadder(html);
      const out = {
        teamID: team.teamID,
        teamName: team.teamName || team.name || '',
        ladderUrl: ladderUrl,
        lastUpdated: getNowISO(),
        ladder
      };
      const outPath = path.join(OUTPUT_DIR, `ladder-${team.teamID}.json`);
      fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
      console.log(`Saved ladder to ${outPath}`);
    } catch (err) {
      console.error(`Error fetching ladder for ${team.teamName || team.teamID}:`, err.message);
    }
  }
}

main();
