import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const API_BASE = 'https://script.google.com/macros/s/AKfycbz3DmnPOLstWmOmJs4nzDQn42XXWe0E2ujLpmfo4e4WZFkInXxUdeL8-W0SImYj9EQj/exec';
const assetsDir = path.join(process.cwd(), 'apps', 'coach-app', 'public', 'assets', 'team-logos');
const clubLogosPath = path.join(process.cwd(), 'data', 'club-logos.json');

function localFileExists(p) {
  try { return fs.existsSync(p); } catch (e) { return false; }
}

async function getJson(url) {
  const res = await fetch(url, { redirect: 'follow' });
  const text = await res.text();
  try { return JSON.parse(text); } catch (e) { throw new Error('Invalid JSON from ' + url); }
}

function slugify(s) {
  return (s || '').toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function main() {
  console.log('Loading local assets...');
  const localFiles = localFileExists(assetsDir) ? fs.readdirSync(assetsDir) : [];
  const clubLogos = localFileExists(clubLogosPath) ? JSON.parse(fs.readFileSync(clubLogosPath, 'utf8')) : {};

  console.log('Fetching teams from API...');
  const teamsResp = await getJson(`${API_BASE}?api=true&action=getTeams`);
  if (!teamsResp.success) throw new Error('getTeams failed');
  const teams = teamsResp.teams || [];

  const report = [];
  const opponentsMap = new Map(); // key: normalized name -> { name, slug, logoFromApi }

  for (const t of teams) {
    const teamID = t.teamID;
    const name = t.teamName || '';
    const slug = slugify(name);
    let ourLogo = null;
    let teamInfo = null;
    try {
      const info = await getJson(`${API_BASE}?api=true&action=getTeamInfo&teamID=${encodeURIComponent(teamID)}`);
      if (info && info.success && info.info) {
        ourLogo = info.info.ourLogo || null;
        teamInfo = info.info;
      }
    } catch (e) {
      // ignore per-team failures
    }

    // Collect opponents from ladder rows (if present) and nextFixture opponent
    if (teamInfo) {
      const ladderRows = ((teamInfo.ladder && teamInfo.ladder.rows) || []);
      for (const r of ladderRows) {
        const oppName = (r.TEAM || r.team || '').toString().trim();
        if (!oppName) continue;
        const key = oppName.toLowerCase();
        if (!opponentsMap.has(key)) opponentsMap.set(key, { name: oppName, slug: slugify(oppName), logoFromApi: r.Logo || null });
      }
      if (teamInfo.nextFixture && teamInfo.nextFixture.opponentDetails) {
        const od = teamInfo.nextFixture.opponentDetails;
        const oppName = od.name || od.opponent || '';
        if (oppName) {
          const key = oppName.toLowerCase();
          if (!opponentsMap.has(key)) opponentsMap.set(key, { name: oppName, slug: slugify(oppName), logoFromApi: od.logoUrl || od.logo || null });
        }
      }
    }

    // Check local asset by team slug and club logos mapping
    const candidates = [];
    if (ourLogo) candidates.push(ourLogo);
    if (clubLogos[slug]) candidates.push(clubLogos[slug]);
    // common filenames
    ['png','jpg','jpeg','svg','webp'].forEach(ext => candidates.push(`/assets/team-logos/${slug}.${ext}`));

    const exists = candidates.some(c => {
      if (!c) return false;
      const p = c.startsWith('/') ? path.join(process.cwd(), 'apps', 'coach-app', 'public', c.replace(/^\//, '')) : path.join(process.cwd(), 'apps', 'coach-app', 'public', 'assets', 'team-logos', path.basename(c));
      return localFileExists(p);
    });

    report.push({ teamID, name, slug, ourLogo: ourLogo || null, hasLocalAsset: exists, candidates });
  }

  // Build opponent report array from opponentsMap
  console.log('\nTeam logo report:');
  const missing = report.filter(r => !r.hasLocalAsset);
  console.log(`Total teams: ${report.length} — missing local logo assets: ${missing.length}`);
  console.table(report.map(r => ({ teamID: r.teamID, name: r.name, slug: r.slug, ourLogo: r.ourLogo, hasLocalAsset: r.hasLocalAsset })));

  if (missing.length > 0) {
    console.log('\nMissing teams:');
    missing.forEach(m => console.log(`- ${m.name} (${m.teamID}) — slug: ${m.slug} — ourLogo: ${m.ourLogo || 'none'}`));
    process.exitCode = 2;
  }

  // Opponent logos collected from ladder rows / fixtures across all teams
  const opponents = Array.from(opponentsMap.values());
  const oppReport = [];

  for (const o of opponents) {
    const slug = o.slug;
    const candidates = [];
    if (o.logoFromApi) candidates.push(o.logoFromApi);
    if (clubLogos[slug]) candidates.push(clubLogos[slug]);
    ['png','jpg','jpeg','svg','webp'].forEach(ext => candidates.push(`/assets/team-logos/${slug}.${ext}`));

    const exists = candidates.some(c => {
      if (!c) return false;
      const p = c.startsWith('/') ? path.join(process.cwd(), 'apps', 'coach-app', 'public', c.replace(/^\//, '')) : path.join(process.cwd(), 'apps', 'coach-app', 'public', 'assets', 'team-logos', path.basename(c));
      return localFileExists(p);
    });

    oppReport.push({ name: o.name, slug, logoFromApi: o.logoFromApi || null, hasLocalAsset: exists, candidates });
  }

  const missingOpp = oppReport.filter(r => !r.hasLocalAsset);
  console.log('\nOpponent logo report:');
  console.log(`Total opponent names found: ${oppReport.length} — missing local logo assets: ${missingOpp.length}`);
  console.table(oppReport.map(r => ({ name: r.name, slug: r.slug, logoFromApi: r.logoFromApi, hasLocalAsset: r.hasLocalAsset })));

  if (missingOpp.length > 0) {
    console.log('\nMissing opponent logos:');
    missingOpp.forEach(m => console.log(`- ${m.name} — slug: ${m.slug} — apiLogo: ${m.logoFromApi || 'none'}`));
    process.exitCode = 3;
  }
}

main().catch(err => { console.error(err); process.exit(1); });
