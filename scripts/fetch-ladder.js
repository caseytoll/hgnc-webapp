// Script to fetch and parse NFNL ladder for teams with a ladderUrl
// Run this script locally or in CI before deploying to Cloudflare Pages

import fetch from 'node-fetch';
import { load } from 'cheerio';
import fs from 'fs';
import path from 'path';

// Load teams from a JSON file or Google Sheets export (for demo, you may need to adapt this)
// For now, we'll expect a local file: data/teams.json
const TEAMS_PATH = path.resolve('data/teams.json');
let OUTPUT_DIR = path.resolve('public');

function getNowISO() {
  return new Date().toISOString();
}

async function fetchLadder(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
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
  // CLI arguments
  const argv = process.argv.slice(2);
  let onlyLadderUrl = null;
  let onlyTeamID = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--only-ladder-url' && argv[i+1]) {
      onlyLadderUrl = argv[i+1];
      i++;
    }
    if (argv[i] === '--only-team-id' && argv[i+1]) {
      onlyTeamID = argv[i+1];
      i++;
    }
    if (argv[i] === '--api' && argv[i+1]) {
      process.env.GS_API_URL = argv[i+1];
      i++;
    }
    if (argv[i] === '--out' && argv[i+1]) {
      OUTPUT_DIR = path.resolve(argv[i+1]);
      i++;
    }
  }

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

  // Filter teams if requested
  if (onlyTeamID) {
    teams = teams.filter(t => t.teamID === onlyTeamID);
    console.log(`Filtering to teamID=${onlyTeamID} — ${teams.length} match(es)`);
  } else if (onlyLadderUrl) {
    teams = teams.filter(t => (t.ladderUrl || t.ladderApi || '') === onlyLadderUrl);
    console.log(`Filtering to ladderUrl=${onlyLadderUrl} — ${teams.length} match(es)`);
  }

  if (teams.length === 0) {
    console.log('No teams to process after applying filters — exiting.');
    return;
  }

  let failCount = 0;
  for (const team of teams) {
    // Support both ladderUrl (client field) and ladderApi (sheet column)
    const ladderUrl = team.ladderUrl || team.ladderApi || '';
    if (!ladderUrl) {
      console.log(`Skipping ${team.teamName || team.teamID} — no ladderUrl`);
      continue;
    }
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
      failCount++;
    }
  }

  if (failCount > 0) {
    console.error(`${failCount} team(s) failed to fetch ladder data`);
    process.exit(1);
  }
}

main();
