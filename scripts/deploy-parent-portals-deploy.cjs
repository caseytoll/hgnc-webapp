#!/usr/bin/env node
// Automated Cloudflare Pages deployment for each team portal
// 1. Fetches all teams (or uses local sample)
// 2. For each team, generates slug and project name
// 3. Creates project if needed, then deploys to Cloudflare Pages

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const API_URL = 'https://script.google.com/macros/s/AKfycbx5g7fIW28ncXoI9SeHDKix7umBtqaTdOm1aM-JdgO2l7esQHxu8jViMRRSN7YGtMnd/exec?api=true&action=getTeams';
const PARENT_PORTAL_PREFIX = 'hgnc-gameday-';
const DIST_PATH = path.resolve(__dirname, '../dist');

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
    require('https').get(url, res => {
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
  // Always use API data (or sample fallback) for deployment
  let data;
  try {
    console.log('Fetching teams from API...');
    data = await fetchJson(API_URL);
    if (!data.success || !Array.isArray(data.teams)) throw new Error('API did not return teams list');
  } catch (e) {
    console.warn('API fetch failed, using local sample data.');
    data = require('./teams-sample.cjs');
  }
  const teams = data.teams;

  for (const t of teams) {
    // Validate required fields
    if (!t.teamName || !t.year || !t.season) {
      console.warn(`Skipping team due to missing data: teamName='${t.teamName}', year='${t.year}', season='${t.season}'`);
      continue;
    }
    // Build slug: team name, year, season (all slugified, no teamID)
    const base = slugify(t.teamName);
    const year = String(t.year);
    const season = slugify(t.season);
    const slug = [base, year, season].filter(Boolean).join('-');
    const name = t.name || t.teamName || t.sheetName || t.teamID;
    const projectName = `${PARENT_PORTAL_PREFIX}${slug}`;
    if (!base || !year || !season) {
      console.warn(`Skipping team due to invalid slug parts: base='${base}', year='${year}', season='${season}'`);
      continue;
    }
    console.log(`\n=== Deploying SPA: ${name} (${year} ${season}) to ${projectName}.pages.dev ===`);
    // Create project if it doesn't exist (interactive, but will continue if exists)
    try {
      execSync(`npx wrangler pages project create ${projectName} --production-branch=master`, { stdio: 'inherit' });
      console.log(`Created Cloudflare Pages project: ${projectName}`);
    } catch (e) {
      if (e.status === 1) {
        console.log(`Project ${projectName} may already exist, continuing...`);
      } else {
        console.error(`Failed to create project: ${projectName}`);
        continue;
      }
    }
    // Deploy the SPA build (dist/) for each team
    try {
      execSync(`npx wrangler pages deploy ${DIST_PATH} --project-name=${projectName}`, { stdio: 'inherit' });
      console.log(`Deployed to: https://${projectName}.pages.dev`);
    } catch (e) {
      console.error(`Failed to deploy to: https://${projectName}.pages.dev`);
    }
  }
}

main().catch(err => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
