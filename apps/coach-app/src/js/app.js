// Helper to generate the canonical team slug (matches deploy script)
function teamSlug(team) {
  // Slugify: teamName, year, season (all required)
  const slugify = (s) => (s || '').toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  if (!team.teamName || !team.year || !team.season) return null;
  return [slugify(team.teamName), String(team.year), slugify(team.season)].filter(Boolean).join('-');
}
// --- Early redirect for gameday subdomain ---
try {
  const subdomainMatch = window.location.hostname.match(/^hgnc-gameday-([a-z0-9\-]+)\.pages\.dev$/i);
  if (subdomainMatch && subdomainMatch[1]) {
    const foundSlug = subdomainMatch[1].toLowerCase();
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
      window.location.replace(`/teams/${foundSlug}/`);
      // Prevent further script execution
      throw new Error('Redirecting to team page');
    }
  }
} catch (e) {
  if (e.message !== 'Redirecting to team page') console.warn('[App] Early redirect error:', e.message || e);
}

// ========================================
// TEAM MANAGER - Local Development App
// ========================================

import '../css/styles.css';
import { API_CONFIG } from './config.js';
import { haptic } from '../../../../common/share-utils.js';
import { setDataSource, updateStatus } from './api.js';
import { state, loadFromLocalStorage } from './state.js';

// Feature modules (side-effect imports — each registers its own window.* handlers)
import './help.js';
import './ui.js';
import './scoring.js';
import './stats.js';
import './training.js';
import './lineup-planner.js';
import './player.js';
import './team-settings.js';
import './player-library.js';
import './system-settings.js';
import './game-detail.js';
import './rendering.js';
import './wizard.js';
import { loadTeams } from './data-loader.js';
import './team-selector.js';
import './sync.js';
import './opposition-scouting.js';

// Performance mark: earliest practical marker for app start
try { performance.mark && performance.mark('app-start'); } catch (_e) { /* noop */ }

// ========================================
// MODULE MAP
// ========================================
// This file: app.js — Entry point, theme, initialization
//
// Feature modules (imported above):
//   state.js           — Shared state object, cache, localStorage
//   sync.js            — Google Sheets sync, debounced sync, sync indicator
//   data-loader.js     — Team/data loading, fixture sync, player library, metrics
//   team-selector.js   — Team list rendering, PIN entry
//   rendering.js       — Main app rendering, ladder, schedule, roster
//   wizard.js          — Create team wizard (6-step)
//   scoring.js         — Score inputs, quarter notes, availability
//   stats.js           — Stats rendering (overview, leaders, positions, combos)
//   training.js        — Training session CRUD, AI training focus
//   lineup-planner.js  — Desktop 4-quarter lineup planner
//   game-detail.js     — Game detail view, share/export, lineup builder
//   player.js          — Player + game management
//   player-library.js  — Career stats tracking (player library)
//   team-settings.js   — Team settings, game settings
//   system-settings.js — System settings, cache management
//   ui.js              — View/tab/modal/toast management, loading states
//   help.js            — Help system, walkthrough
//   helpers.js         — Shared helper functions
//   api.js             — API data transformation, config
// ========================================

// Runtime API health check and query-toggle handling
async function checkApiHealth(timeoutMs = 8000) {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(`${API_CONFIG.baseUrl}?api=true&action=ping`, {
      signal: controller.signal,
      cache: 'no-store',
      redirect: 'follow',
    });
    clearTimeout(id);
    if (!resp.ok) throw new Error('Non-OK');
    await resp.json().catch(() => ({}));
    state.apiAvailable = true;
    updateStatus('API OK');
    return true;
  } catch (err) {
    state.apiAvailable = false;
    updateStatus('API unavailable');
    return false;
  }
}

// Inspect URL query for a runtime data override: ?data=mock|live
function applyRuntimeDataOverride() {
  try {
    const params = new URLSearchParams(window.location.search || '');
    const val = params.get('data');
    if (val === 'mock') {
      setDataSource('mock');
      console.log('[App] Runtime override: using mock data (URL param)');
      return true;
    }
    if (val === 'live') {
      setDataSource('api');
      console.log('[App] Runtime override: using live API (URL param)');
      return true;
    }
  } catch (e) {
    /* noop */
  }
  return false;
}

// Cache variables and localStorage functions imported from state.js
// ========================================
// THEME MANAGEMENT
// ========================================

const THEME_KEY = 'team-manager-theme';

function loadTheme() {
  try {
    const savedTheme = (typeof localStorage !== 'undefined') ? localStorage.getItem(THEME_KEY) : null;
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
      return;
    }
  } catch (e) {
    console.warn('[App] loadTheme: localStorage unavailable', e && e.message ? e.message : e);
  }

  // Default to dark theme for new users
  document.documentElement.setAttribute('data-theme', 'dark');
}

window.toggleTheme = function() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem(THEME_KEY, newTheme);

  haptic(30);
};

// Load theme immediately to prevent flash
loadTheme();

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('[App] Initializing Team Manager...');
  loadFromLocalStorage();

  // Detect read-only mode and team slug from gameday subdomain or /teams/<slug>/ path
  try {
    let foundSlug = null;
    // 1. Check for gameday subdomain: hgnc-gameday-<slug>.pages.dev
    const subdomainMatch = window.location.hostname.match(/^hgnc-gameday-([a-z0-9\-]+)\.pages\.dev$/i);
    if (subdomainMatch && subdomainMatch[1]) {
      foundSlug = subdomainMatch[1].toLowerCase();
      state.readOnly = true;
      state.requestedTeamSlug = foundSlug;
      state.forceApiForReadOnly = true;
      window.isReadOnlyView = true;
      console.log('[App] Read-only mode (gameday subdomain):', foundSlug);
      // If on the root or team selection page, redirect to the team page
      if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        window.location.replace(`/teams/${foundSlug}/`);
        return;
      }
    } else {
      // 2. Fallback: /teams/<slug>/ path (for local dev)
      const m = window.location.pathname.match(/^\/teams\/(?<slug>[a-z0-9-]+)\/?$/i);
      if (m && m.groups && m.groups.slug) {
        foundSlug = m.groups.slug.toLowerCase();
        state.readOnly = true;
        state.requestedTeamSlug = foundSlug;
        state.forceApiForReadOnly = true;
        window.isReadOnlyView = true;
        console.log('[App] Read-only team slug requested (local dev):', foundSlug);
      } else {
        state.readOnly = false;
      }
    }
  } catch (e) {
    console.warn('[App] Slug/subdomain parsing failed:', e.message || e);
  }

  // Apply runtime override (URL: ?data=mock|live). If none, perform health-check and use live by default.
  if (!applyRuntimeDataOverride()) {
    checkApiHealth().then(ok => {
      if (!ok) {
        // Only switch to mock data when there are no real cached teams to show
        const hasCachedTeams = state.teams && state.teams.length > 0;
        if (!hasCachedTeams) {
          setDataSource('mock');
          console.warn('[App] API health-check failed — no cached data, switched to mock');
        } else {
          console.warn('[App] API health-check failed — using cached data, staying on live mode');
        }
      }
    });
    // Periodic health-check to recover if API comes back
    setInterval(checkApiHealth, 60 * 1000);
  }

  loadTeams(); // Use cache if valid, fetch fresh otherwise
});

// Create team wizard imported from wizard.js
// Data loading, fixture sync, player library imported from data-loader.js
// Team selector rendering and PIN entry imported from team-selector.js
// Main app rendering, ladder, schedule, roster imported from rendering.js

// ========================================
// Utility functions are imported from utils.js

// Export state and functions for testing and runtime control
export { state, loadTeams };

// Export for hot module replacement
if (import.meta.hot) {
  import.meta.hot.accept();
}
