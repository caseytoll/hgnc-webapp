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
// EXPORT MOCK DATA (DEV TOOL)
// ========================================
window.exportMockData = function() {
  // Export as JS file for direct replacement
  const js = `// Auto-exported mock data\n\nexport const mockTeams = ${JSON.stringify(window.mockTeams || mockTeams, null, 2)};\n`;
  const blob = new Blob([js], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mock-data.js';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
  if (typeof showToast === 'function') showToast('Mock data exported', 'success');
};
// ========================================
// TEAM MANAGER - Local Development App
// ========================================

import '../css/styles.css';
import { API_CONFIG } from './config.js';
import {
  escapeHtml,
  escapeAttr,
  delay,
  formatDate,
  formatDateTime,
  validatePlayerName,
  validateRound,
  validateYear,
  validatePosition,
  validateLocation,
  validateSeason,
  isDuplicateName,
  generateId,
  getInitials
} from '../../../../common/utils.js';
import { calculateAllAnalytics } from '../../../../common/stats-calculations.js';
import { calculateTeamStats } from '../../../../common/mock-data.js';
import { transformTeamDataFromSheet, transformTeamDataToSheet } from './api.js';
import {
  formatGameShareText,
  formatLineupText,
  copyToClipboard,
  shareData,
  downloadJson,
  toggleFullscreen,
  isFullscreen,
  haptic,
  generateLineupCardHTML,
  shareImageBlob,
  triggerJsonImport,
  validateImportedTeamData
} from '../../../../common/share-utils.js';
import html2canvas from 'html2canvas';

// Performance mark: earliest practical marker for app start
try { performance.mark && performance.mark('app-start'); } catch (e) { /* noop */ }

// ========================================
// STATE MANAGEMENT
// ========================================

const state = {
  teams: [],
  currentTeam: null,
  currentTeamData: null,
  currentGame: null,
  currentQuarter: 'Q1',
  selectedPlayer: null,
  stats: null,
  analytics: null,
  activeStatsTab: 'overview',
  // Leaders table state for sorting and expansion
  leadersTableState: {
    expanded: {}, // { scorers: false, defenders: false, goalingPairs: false, defendingPairs: false }
    sort: {
      scorers: { column: 'goals', ascending: false },
      defenders: { column: 'avg', ascending: true },
      goalingPairs: { column: 'avg', ascending: false },
      defendingPairs: { column: 'avg', ascending: true }
    }
  },
  // Player Library - tracks players across teams/seasons
  playerLibrary: { players: [] },
  showArchivedTeams: false
};

// ========================================
// LOCAL STORAGE PERSISTENCE
// ========================================

const STORAGE_KEY = 'teamManagerData';

// Cache for API team data (separate from mockTeams)
const apiTeamCache = {};

// Cache metadata for TTL tracking
const teamCacheMetadata = {};
const TEAM_CACHE_TTL_MS = 0; // Always fetch fresh when online (localStorage is offline fallback only)

// Teams list cache (for landing page)
let teamsListCache = null;
let teamsListCacheTime = null;

/**
 * Check if cached team data is still valid (within TTL)
 */
function isTeamCacheValid(teamID) {
  const meta = teamCacheMetadata[teamID];
  if (!meta || !apiTeamCache[teamID]) return false;
  const age = Date.now() - new Date(meta.cachedAt).getTime();
  return age < TEAM_CACHE_TTL_MS;
}

/**
 * Check if teams list cache is valid
 */
function isTeamsListCacheValid() {
  if (!teamsListCache || !teamsListCacheTime) return false;
  const age = Date.now() - new Date(teamsListCacheTime).getTime();
  return age < TEAM_CACHE_TTL_MS;
}

/**
 * Invalidate teams list cache (called after create/update team)
 */
function invalidateTeamsListCache() {
  teamsListCache = null;
  teamsListCacheTime = null;
  console.log('[Cache] Teams list cache invalidated');
}

/**
 * Invalidate a specific team's cache (used when stale data is detected)
 */
function invalidateTeamCache(teamID) {
  delete apiTeamCache[teamID];
  delete teamCacheMetadata[teamID];
  console.log('[Cache] Team cache invalidated for', teamID);
}

/**
 * Update team cache with fresh data and timestamp
 */
function updateTeamCache(teamID, teamData) {
  apiTeamCache[teamID] = teamData;
  // Store the lastModified from the data for version checking
  teamCacheMetadata[teamID] = {
    cachedAt: new Date().toISOString(),
    lastModified: teamData._lastModified || 0
  };
}

function saveToLocalStorage() {
  try {
    // If using API and have current team data, cache it with timestamp
    if (state.currentTeamData) {
      const teamID = state.currentTeamData.teamID;
      updateTeamCache(teamID, state.currentTeamData);
    }
    const dataToSave = {
      apiTeams: apiTeamCache,
      teamCacheMeta: teamCacheMetadata,
      teamsListCache: teamsListCache,
      teamsListCacheTime: teamsListCacheTime,
      playerLibrary: state.playerLibrary,
      lastSaved: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    console.log('[Storage] Data saved');
  } catch (e) {
    console.error('[Storage] Failed to save:', e);
  }
}
function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      // Load player library
      if (data.playerLibrary) {
        state.playerLibrary = data.playerLibrary;
      }
      // Load API team cache
      if (data.apiTeams) {
        Object.assign(apiTeamCache, data.apiTeams);
      }
      // Load cache metadata for TTL tracking
      if (data.teamCacheMeta) {
        Object.assign(teamCacheMetadata, data.teamCacheMeta);
      }
      // Load teams list cache
      if (data.teamsListCache) {
        teamsListCache = data.teamsListCache;
        teamsListCacheTime = data.teamsListCacheTime;
      }
      console.log('[Storage] Data loaded from', data.lastSaved);
      return true;
    }
  } catch (e) {
    console.error('[Storage] Failed to load:', e);
  }
  return false;
}
// ========================================
// THEME MANAGEMENT
// ========================================

const THEME_KEY = 'team-manager-theme';

function loadTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }
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
      const m = window.location.pathname.match(/^\/teams\/(?<slug>[a-z0-9\-]+)\/?$/i);
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

  loadTeams(true); // Always fetch fresh teams list on app open
});

  // ========================================
  // ADD NEW TEAM FEATURE
  // ========================================

  document.addEventListener('DOMContentLoaded', () => {
    const addTeamBtn = document.getElementById('add-team-btn');
    if (addTeamBtn) {
      addTeamBtn.addEventListener('click', openAddTeamModal);
    }
  });

  window.openAddTeamModal = function() {
    const currentYear = new Date().getFullYear();
    openModal('Add New Team', `
      <div class="form-group">
        <label class="form-label">Team Name</label>
        <input type="text" class="form-input" id="new-team-name" maxlength="100" placeholder="e.g. U11 Thunder">
      </div>
      <div class="form-group">
        <label class="form-label">Year</label>
        <input type="number" class="form-input" id="new-team-year" min="2000" max="2100" value="${currentYear}">
      </div>
      <div class="form-group">
        <label class="form-label">Season</label>
        <select class="form-select" id="new-team-season">
          <option value="Season 1">Season 1</option>
          <option value="Season 2">Season 2</option>
          <option value="NFNL">NFNL</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Ladder URL <span class="form-label-desc">(optional, for NFNL ladder)</span></label>
        <input type="url" class="form-input" id="new-team-ladder-url" maxlength="300" placeholder="https://websites.mygameday.app/...">
      </div>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="addNewTeam()">Add Team</button>
    `);
  };

  window.addNewTeam = async function() {
    const nameInput = document.getElementById('new-team-name');
    const yearInput = document.getElementById('new-team-year');
    const seasonInput = document.getElementById('new-team-season');
    const ladderUrlInput = document.getElementById('new-team-ladder-url');
    const name = nameInput.value.trim();
    const year = parseInt(yearInput.value);
    const season = seasonInput.value;
    const ladderUrl = ladderUrlInput.value.trim();

    // Validation
    if (!name) {
      showToast('Please enter a team name', 'error');
      nameInput.focus();
      return;
    }
    if (name.length < 2 || name.length > 100) {
      showToast('Team name must be 2-100 characters', 'error');
      nameInput.focus();
      return;
    }
    if (isNaN(year) || year < 2000 || year > 2100) {
      showToast('Year must be between 2000 and 2100', 'error');
      yearInput.focus();
      return;
    }
    const validSeasons = ['Season 1', 'Season 2', 'NFNL'];
    if (!validSeasons.includes(season)) {
      showToast('Invalid season selected', 'error');
      return;
    }

    // Check for duplicate name/year/season
    if (state.teams.some(t => t.teamName.toLowerCase() === name.toLowerCase() && t.year === year && t.season === season)) {
      showToast('A team with this name, year, and season already exists', 'error');
      nameInput.focus();
      return;
    }

    closeModal();
    showLoading();

    try {
      // Add ladderUrl to new team object
      // ...existing code...
      // When saving the new team, include ladderUrl
      // If you have a saveTeam or similar function, update it to accept ladderUrl
      // Example:
      // const newTeam = { teamName: name, year, season, ladderUrl };
      // ...existing code...
      // Call API to create team
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
      const baseUrl = isLocalDev ? '/gas-proxy' : API_CONFIG.baseUrl;
      const url = new URL(baseUrl, isLocalDev ? window.location.origin : undefined);
      url.searchParams.set('api', 'true');
      url.searchParams.set('action', 'createTeam');
      url.searchParams.set('year', year);
      url.searchParams.set('season', season);
      url.searchParams.set('name', name);

      const response = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
      const data = await response.json();

      if (data.success === false) {
        throw new Error(data.error || 'Failed to create team');
      }

      // Reload teams from API to get the new team with proper sheetName
      await loadTeams(true); // Force refresh to bypass cache
      showToast('Team added', 'success');
    } catch (error) {
      console.error('[App] Failed to add team:', error);
      showToast('Failed to add team: ' + error.message, 'error');
    } finally {
      hideLoading();
    }
  };

// ========================================
// VIEW MANAGEMENT
// ========================================

window.showView = function(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const view = document.getElementById(viewId);
  if (view) {
    view.classList.add('active');
  }
  console.log(`[View] Showing: ${viewId}`);
};

// ========================================
// TAB MANAGEMENT
// ========================================

window.switchTab = function(tabId) {
  // Update nav items
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  // Update tab panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tabId}`);
  });

  // Load tab content
  if (tabId === 'stats') {
    renderStats();
  }

  console.log(`[Tab] Switched to: ${tabId}`);
};

window.switchGameTab = function(tabId) {
  document.querySelectorAll('.game-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.gameTab === tabId);
  });

  document.querySelectorAll('.game-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `game-panel-${tabId}`);
  });
};

// ========================================
// LOADING STATES
// ========================================

function showLoading() {
  document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading-overlay').classList.add('hidden');
}

// ========================================
// TOAST NOTIFICATIONS
// ========================================

window.showToast = function(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  // Validate type to prevent class injection
  const validTypes = ['info', 'success', 'error', 'warning'];
  const safeType = validTypes.includes(type) ? type : 'info';
  toast.className = `toast ${safeType}`;
  // textContent is safe - no need for escapeHtml
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};

// Read-only guard helper (use before performing UI/write actions)
window.ensureNotReadOnly = function(action = '') {
  try {
    if (typeof window !== 'undefined' && window.isReadOnlyView) {
      // Friendly notification for parents
      try { showToast('Read-only view: action disabled', 'info'); } catch (e) { /* noop */ }
      console.warn('[Read-only] blocked action:', action);
      return false;
    }
  } catch (e) {
    // If anything goes wrong, don't block by default
    console.warn('[Read-only] guard error:', e.message || e);
  }
  return true;
};

// Show an always-visible small "Read-only" pill in the top bar for parents
window.showReadOnlyPill = function(teamName) {
  try {
    // If already shown, update tooltip/team text
    const existing = document.getElementById('read-only-pill');
    if (existing) {
      existing.title = teamName ? `Read-only — ${teamName}` : 'Read-only';
      return;
    }

    const pill = document.createElement('div');
    pill.id = 'read-only-pill';
    pill.className = 'read-only-pill';
    pill.textContent = 'Read‑only';
    if (teamName) pill.title = `Read-only — ${teamName}`;

    // Place pill in the top-bar title area if available, otherwise append to body
    const topTitle = document.querySelector('.top-bar .top-bar-title');
    if (topTitle) {
      topTitle.appendChild(pill);
    } else {
      document.body.insertBefore(pill, document.body.firstChild);
    }
  } catch (e) {
    console.warn('[Pill] Failed to show read-only pill:', e.message || e);
  }
};

// ========================================
// MODAL MANAGEMENT
// ========================================

window.openModal = function(title, bodyHtml, footerHtml = '') {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-footer').innerHTML = footerHtml;
  document.getElementById('modal-backdrop').classList.remove('hidden');
};

window.closeModal = function() {
  document.getElementById('modal-backdrop').classList.add('hidden');
};

window.toggleScorerExpand = function(card) {
  // Close other open cards
  document.querySelectorAll('.scorer-card.expanded').forEach(c => {
    if (c !== card) c.classList.remove('expanded');
  });
  // Toggle this card
  card.classList.toggle('expanded');
};

window.togglePlayerExpand = function(card) {
  // Close other open cards
  document.querySelectorAll('.player-stats-card.expanded').forEach(c => {
    if (c !== card) c.classList.remove('expanded');
  });
  // Toggle this card
  card.classList.toggle('expanded');
};

// ========================================
// DATA LOADING
// ========================================

async function loadTeams(forceRefresh = false) {
  showLoading();
  console.log('[App] loadTeams() called, forceRefresh:', forceRefresh);

  // Helper: create slugs from team names to match /teams/<slug>/ URLs
  function slugify(s) {
    return (s || '').toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  try {
    // Determine if cache is usable (invalid if empty)
    const cacheUsable = !forceRefresh && isTeamsListCacheValid() && teamsListCache && Array.isArray(teamsListCache.teams) && teamsListCache.teams.length > 0;

    if (cacheUsable) {
      console.log('[Cache] Using cached teams list');
      state.teams = teamsListCache.teams;
      state.teamSheetMap = teamsListCache.teamSheetMap;

      // Background revalidation: fetch latest teams and update if changed
      (async () => {
        try {
          console.log('[Cache] Background teams revalidation started');
          try { sendClientMetric('background-revalidate', (teamsListCache.teams || []).length); } catch (e) { /* noop */ }

          const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
          const baseUrl = isLocalDev ? '/gas-proxy' : API_CONFIG.baseUrl;
          const resp = await fetch(`${baseUrl}?api=true&action=getTeams`);
          if (!resp.ok) {
            console.warn('[Cache] Background revalidation fetch failed, status:', resp.status);
            try { sendClientMetric('background-revalidate-failed', resp.status, (teamsListCache.teams || []).length); } catch (e) { /* noop */ }
            return;
          }
          const data = await resp.json();
          if (data && data.success === false) {
            console.warn('[Cache] Background revalidation server returned error:', data.error);
            try { sendClientMetric('background-revalidate-failed', 1, (teamsListCache.teams || []).length); } catch (e) { /* noop */ }
            return;
          }
          const freshTeams = (data.teams || []).map(t => ({ teamID: t.teamID, teamName: t.teamName, playerCount: t.playerCount, sheetName: t.sheetName }));

          // Lightweight comparison by teamID + playerCount + name
          const oldSig = JSON.stringify((teamsListCache.teams || []).map(t => ({ teamID: t.teamID, teamName: t.teamName, playerCount: t.playerCount })));
          const newSig = JSON.stringify(freshTeams.map(t => ({ teamID: t.teamID, teamName: t.teamName, playerCount: t.playerCount })));

          if (oldSig !== newSig) {
            console.log('[Cache] Teams list updated on server; refreshing UI');
            // Update state and caches
            state.teams = freshTeams.map(t => ({ ...t }));
            state.teamSheetMap = {};
            state.teams.forEach(t => { state.teamSheetMap[t.teamID] = t.sheetName; });
            teamsListCache = { teams: state.teams, teamSheetMap: state.teamSheetMap };
            teamsListCacheTime = new Date().toISOString();
            saveToLocalStorage();

            try { renderTeamList(); } catch (e) { console.warn('[Cache] Failed to re-render team list after update', e); }
            try { if (typeof showToast === 'function') showToast('Teams updated', 'success'); } catch (e) { /* noop */ }

            try { sendClientMetric('background-revalidate-update', (state.teams || []).length); } catch (e) { /* noop */ }
          } else {
            // Refresh cache timestamp to avoid immediate revalidation
            teamsListCacheTime = new Date().toISOString();
            try { saveToLocalStorage(); } catch (e) { /* noop */ }
            try { sendClientMetric('background-revalidate-hit', (teamsListCache.teams || []).length); } catch (e) { /* noop */ }
          }
        } catch (err) {
          console.warn('[Cache] Background teams revalidation failed:', err.message || err);
          try { sendClientMetric('background-revalidate-failed', 1, (teamsListCache.teams || []).length); } catch (e) { /* noop */ }
        }
      })();

    } else {
      // Use proxy for local dev to bypass CORS
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
      const baseUrl = isLocalDev ? '/gas-proxy' : API_CONFIG.baseUrl;
      console.log('[App] Fetching teams from:', baseUrl);
      // Measure teams fetch time
      const teamsFetchStart = (performance && performance.now) ? performance.now() : Date.now();
      const response = await fetch(`${baseUrl}?api=true&action=getTeams`);
      const teamsFetchMs = Math.round(((performance && performance.now) ? performance.now() : Date.now()) - teamsFetchStart);
      console.log('[App] Response status:', response.status, 'teamsFetchMs:', teamsFetchMs + 'ms');
      const data = await response.json();
      console.log('[App] API response:', data);
      // Quick visible metric for teams fetch
      try { console.log('[Metric] teamsFetchMs:', teamsFetchMs + 'ms'); } catch(e) {}
      if (data.success === false) {
        throw new Error(data.error || 'API request failed');
      }
      // Cache sheetName mapping for later use
      state.teamSheetMap = state.teamSheetMap || {};
      state.teams = (data.teams || []).map(t => {
        state.teamSheetMap[t.teamID] = t.sheetName;
        return t;
      });

      // Cache the teams list
      teamsListCache = {
        teams: state.teams,
        teamSheetMap: state.teamSheetMap
      };
      teamsListCacheTime = new Date().toISOString();
      saveToLocalStorage();
      console.log('[Cache] Fetched and cached teams list');

      // Send teams fetch metric to server-side diagnostics
      try {
        sendClientMetric('teams-fetch', teamsFetchMs, (state.teams || []).length);
      } catch (e) {
        console.warn('[Metric] Failed to send teams-fetch metric:', e);
      }
    }

    // If a team is already selected, update the currentTeam reference so we pick up new fields like ladderUrl
    if (state.currentTeam) {
      const updated = state.teams.find(t => t.teamID === state.currentTeam.teamID);
      if (updated) {
        state.currentTeam = updated;
        try {
          renderMainApp();
        } catch (e) {
          console.warn('[App] Failed to re-render after teams update', e);
        }
      }
    }
    console.log('[App] Loaded', state.teams.length, 'teams');

    // Also load player library from API
    await loadPlayerLibraryFromAPI();

    renderTeamList();

    // If a read-only slug was requested on startup, attempt to auto-select the matching team

    try {
      if (state.readOnly && state.requestedTeamSlug) {
        const slug = state.requestedTeamSlug;
        let matched = null;
        for (const t of state.teams) {
          const canonical = teamSlug(t);
          console.log(`[ReadOnly Debug] Team: ${t.teamName} | Canonical Slug:`, canonical, '| Requested:', slug);
          if (canonical === slug) {
            matched = t;
            break;
          }
        }
        if (matched) {
          console.log('[App] Auto-selecting team for read-only view:', matched.teamID, matched.teamName);
          window.isReadOnlyView = true;
          document.body.classList.add('read-only');
          try { showReadOnlyPill(matched.teamName); } catch (e) { /* noop */ }
          selectTeam(matched.teamID);
        } else {
          console.warn('[App] No team matched canonical slug:', slug);
        }
      }
    } catch (e) {
      console.warn('[App] Error handling read-only selection:', e.message || e);
    }

  } catch (error) {
    console.error('[App] Failed to load teams:', error);
    // Persist a short diagnostic for debugging on devices
    try { window.lastTeamsFetchError = (error && error.message) ? error.message : String(error); } catch (e) { /* noop */ }
    try { sendClientMetric('teams-load-failed', window.lastTeamsFetchError || 'unknown'); } catch (e) { /* noop */ }
    showToast('Failed to load teams', 'error');
  } finally {
    hideLoading();

    // Mark app ready and measure load time (from app-start)
    try {
      if (performance && performance.mark && performance.measure) {
        performance.mark('app-ready');
        performance.measure('app-load', 'app-start', 'app-ready');
        const entries = performance.getEntriesByName('app-load');
        if (entries && entries.length) {
          const duration = Math.round(entries[0].duration);
          console.log(`[Metric] app-load-time: ${duration}ms (teams:${state.teams.length})`);

          // Persist a short history in localStorage for quick inspection
          try {
            const key = 'hgnc.appMetrics';
            const history = JSON.parse(localStorage.getItem(key) || '[]');
            history.push({ t: new Date().toISOString(), metric: 'app-load', value: duration, teams: state.teams.length });
            // keep last 20
            localStorage.setItem(key, JSON.stringify(history.slice(-20)));
          } catch (e) {
            console.warn('[Metric] Failed to persist metric:', e);
          }

          // Send metric to server-side diagnostics (best-effort)
          try {
            const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
            const baseUrl = isLocalDev ? '/gas-proxy' : API_CONFIG.baseUrl;
            // Fire-and-forget with success logging and keepalive for page unloads
            try {
              const metricUrl = `${baseUrl}?api=true&action=logClientMetric&name=app-load&value=${duration}&teams=${state.teams.length}`;

              // Prefer fetch with keepalive (supported in modern browsers) and log server response when available
              const sendMetricWithRetry = async (attempt = 1) => {
                try {
                  const resp = await fetch(metricUrl, { method: 'GET', keepalive: true });
                  try {
                    const data = await resp.json();
                    console.log('[Metric] Sent app-load metric, server response:', data);
                    if (data && data.success === false && attempt <= 1) {
                      console.log('[Metric] Server responded with failure; retrying metric POST (attempt', attempt + 1, ')');
                      await new Promise(r => setTimeout(r, 500));
                      return sendMetricWithRetry(attempt + 1);
                    }
                    return data;
                  } catch (parseErr) {
                    console.log('[Metric] Sent app-load metric, non-JSON response status:', resp.status);
                    if (attempt <= 1) {
                      console.log('[Metric] Retrying metric POST (non-JSON response) - attempt', attempt + 1);
                      await new Promise(r => setTimeout(r, 500));
                      return sendMetricWithRetry(attempt + 1);
                    }
                    return null;
                  }
                } catch (err) {
                  if (attempt <= 1) {
                    console.log('[Metric] Metric send failed, retrying (attempt', attempt + 1, ')', err.message);
                    await new Promise(r => setTimeout(r, 500));
                    return sendMetricWithRetry(attempt + 1);
                  }
                  console.warn('[Metric] Failed to send metric after retry:', err.message);
                  return null;
                }
              };

              sendMetricWithRetry().catch(err => console.warn('[Metric] sendMetricWithRetry error:', err.message));
            } catch (e) {
              console.warn('[Metric] Error while sending metric:', e.message);
            }
          } catch (e) {
            console.warn('[Metric] Error sending metric:', e);
          }
        }
      }
    } catch (e) {
      console.warn('[Metric] Measurement failed:', e);
    }
  }
}

// Helper to send a client metric (used for teams-fetch and other small metrics)
function sendClientMetric(name, value, teams) {
  try {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
    const baseUrl = isLocalDev ? '/gas-proxy' : API_CONFIG.baseUrl;
    const metricUrl = `${baseUrl}?api=true&action=logClientMetric&name=${encodeURIComponent(name)}&value=${encodeURIComponent(value)}&teams=${encodeURIComponent(teams || '')}`;

    const sendMetricWithRetry = async (attempt = 1) => {
      try {
        const resp = await fetch(metricUrl, { method: 'GET', keepalive: true });
        try {
          const data = await resp.json();
          if (data && data.success === false && attempt <= 1) {
            await new Promise(r => setTimeout(r, 500));
            return sendMetricWithRetry(attempt + 1);
          }
          console.log('[Metric] Sent', name, 'metric, server response:', data);
          return data;
        } catch (parseErr) {
          if (attempt <= 1) {
            await new Promise(r => setTimeout(r, 500));
            return sendMetricWithRetry(attempt + 1);
          }
          console.log('[Metric] Sent', name, 'metric, non-JSON response status:', resp.status);
          return null;
        }
      } catch (err) {
        if (attempt <= 1) {
          await new Promise(r => setTimeout(r, 500));
          return sendMetricWithRetry(attempt + 1);
        }
        console.warn('[Metric] Failed to send metric after retry:', err.message);
        return null;
      }
    };

    sendMetricWithRetry().catch(err => console.warn('[Metric] sendClientMetric error:', err.message));
  } catch (e) {
    console.warn('[Metric] sendClientMetric init error:', e);
  }
}

// Dev helper: show persisted app timing metrics
window.showAppMetrics = function() {
  try {
    const history = JSON.parse(localStorage.getItem('hgnc.appMetrics') || '[]');
    console.table(history);
    return history;
  } catch (e) {
    console.warn('Failed to read app metrics:', e);
    return [];
  }
};

async function loadTeamData(teamID) {
  // Show skeletons immediately for better perceived performance
  showView('main-app-view');
  renderScheduleSkeleton();
  renderRosterSkeleton();
  renderStatsSkeleton();

  try {
    if (navigator.onLine) {
      // Get server's lastModified from the teams list (already fetched)
      const serverTeam = state.teams.find(t => t.teamID === teamID);
      const serverLastModified = serverTeam?.lastModified || 0;
      const cachedLastModified = teamCacheMetadata[teamID]?.lastModified || 0;

      // Version check: only fetch if server has newer data or no cache exists
      if (cachedLastModified && serverLastModified && serverLastModified === cachedLastModified && apiTeamCache[teamID]) {
        console.log('[Cache] Version match - using cached data (lastModified:', cachedLastModified, ')');
        state.currentTeamData = apiTeamCache[teamID];
      } else {
        showLoading();
        // Use proxy for local dev to bypass CORS
        const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
        const baseUrl = isLocalDev ? '/gas-proxy' : API_CONFIG.baseUrl;
        const sheetName = state.teamSheetMap?.[teamID] || '';
        console.log('[App] Fetching fresh team data (server:', serverLastModified, 'cached:', cachedLastModified, ')');
        const response = await fetch(`${baseUrl}?api=true&action=getTeamData&teamID=${teamID}&sheetName=${encodeURIComponent(sheetName)}`);
        const data = await response.json();
        if (data.success === false) {
          throw new Error(data.error || 'API request failed');
        }
        // Transform data from Sheet format to PWA format
        state.currentTeamData = transformTeamDataFromSheet(data.teamData, teamID);

        // Update localStorage cache for offline fallback
        updateTeamCache(teamID, state.currentTeamData);
        saveToLocalStorage();
        console.log('[App] Fetched fresh team data, updated localStorage cache');

        hideLoading();
      }
    } else {
      // Offline: use cached data from localStorage
      if (apiTeamCache[teamID]) {
        console.log('[Cache] Offline - using cached data for team', teamID);
        state.currentTeamData = apiTeamCache[teamID];
        showToast('Offline mode - showing cached data', 'info');
      } else {
        throw new Error('No cached data available for offline use');
      }
    }

    state.currentTeam = state.teams.find(t => t.teamID === teamID);

    if (!state.currentTeamData) {
      throw new Error('Team data not found');
    }

    state.stats = calculateTeamStats(state.currentTeamData);
    state.analytics = calculateAllAnalytics(state.currentTeamData);

    renderMainApp();
  } catch (error) {
    console.error('[App] Failed to load team data:', error);
    showToast('Failed to load team data', 'error');
    showView('team-selector-view');
  }
}

// ========================================
// PLAYER LIBRARY API SYNC
// ========================================

/**
 * Load player library from API (called after loadTeams for API mode)
 */
async function loadPlayerLibraryFromAPI() {
  try {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
    const baseUrl = isLocalDev ? '/gas-proxy' : API_CONFIG.baseUrl;

    const response = await fetch(`${baseUrl}?api=true&action=getPlayerLibrary`);
    const data = await response.json();

    if (data.success && data.playerLibrary) {
      // Merge with local data - API takes precedence for existing players
      const apiPlayers = data.playerLibrary.players || [];
      const localPlayers = state.playerLibrary.players || [];

      // Create a map of API players by globalId
      const apiPlayerMap = new Map(apiPlayers.map(p => [p.globalId, p]));

      // Merge: API players + any local players not in API
      const mergedPlayers = [...apiPlayers];
      localPlayers.forEach(lp => {
        if (!apiPlayerMap.has(lp.globalId)) {
          mergedPlayers.push(lp);
        }
      });

      state.playerLibrary = { players: mergedPlayers };
      saveToLocalStorage();
      console.log('[App] Loaded player library from API:', mergedPlayers.length, 'players');
    }
  } catch (error) {
    console.error('[App] Failed to load player library from API:', error);
    // Keep using local data
  }
}

/**
 * Sync player library to API (called after mutations)
 */
async function syncPlayerLibrary() {
  if (!navigator.onLine) return;

  try {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
    const baseUrl = isLocalDev ? '/gas-proxy' : API_CONFIG.baseUrl;

    // Use POST for potentially large data
    const postBody = {
      action: 'savePlayerLibrary',
      playerLibrary: JSON.stringify(state.playerLibrary)
    };

    console.log('[syncPlayerLibrary] Using POST, body size:', JSON.stringify(postBody).length);

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(postBody),
      redirect: 'follow'
    });

    const data = await response.json();

    if (data.success === false) {
      throw new Error(data.error || 'Sync failed');
    }

    console.log('[App] Player library synced to API');
    return data;
  } catch (error) {
    console.error('[App] Failed to sync player library:', error);
    throw error;
  }
}

// ========================================
// TEAM SELECTOR RENDERING
// ========================================

function renderTeamList() {

  const container = document.getElementById('team-list');
  if (!container) return;


  // Define archivedTeams and showArchived for use in UI
  const archivedTeams = state.teams.filter(team => team.archived);
  const activeTeams = state.teams.filter(team => !team.archived);
  let showArchived = state.showArchivedTeams ?? false;

  if (activeTeams.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No active teams available</p></div>';
  } else {
    // Group active teams by year
    const byYear = {};
    activeTeams.forEach(team => {
      const year = team.year || 'Unknown';
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push(team);
    });

    const years = Object.keys(byYear).sort((a, b) => b - a);

    let html = years.map(year => `
      <div class="team-year-group">
        <div class="team-year-header">${escapeHtml(year)}</div>
        ${byYear[year].map(team => `
          <div class="team-card active" onclick="selectTeam('${escapeAttr(team.teamID)}')">
            <div class="team-card-icon">🏐</div>
            <div class="team-card-info">
              <div class="team-card-name">${escapeHtml(team.teamName)}</div>
              <div class="team-card-meta">${escapeHtml(team.year)} ${escapeHtml(team.season)} • ${escapeHtml(team.playerCount)} players</div>
            </div>
            <div class="team-card-arrow">→</div>
          </div>
        `).join('')}
      </div>
    `).join('');
    container.innerHTML = html;
  }

  // Archived teams section (always visible if there are archived teams)
  if (archivedTeams.length > 0) {
    let archivedHtml = `
      <div class="archived-section">
        <button class="archived-section-header" onclick="toggleArchivedTeams()">
          <div class="archived-section-title">
            <svg class="archived-section-icon ${showArchived ? 'expanded' : ''}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
            <span>Archived Teams</span>
            <span class="archived-count">${archivedTeams.length}</span>
          </div>
        </button>
        ${showArchived ? `
          <div class="archived-section-content">
            ${archivedTeams.map(team => `
              <div class="team-card archived" onclick="selectTeam('${escapeAttr(team.teamID)}')">
                <div class="team-card-icon">🏐</div>
                <div class="team-card-info">
                  <div class="team-card-name">${escapeHtml(team.teamName)}</div>
                  <div class="team-card-meta">${escapeHtml(team.year)} ${escapeHtml(team.season)} • ${escapeHtml(team.playerCount)} players</div>
                </div>
                <div class="team-card-arrow">→</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
    // Append archived section after active teams
    container.innerHTML += archivedHtml;
  }

  // Update library count badge
  updateLibraryCount();
}

window.toggleArchivedTeams = function() {
  state.showArchivedTeams = !state.showArchivedTeams;
  renderTeamList();
};

window.selectTeam = function(teamID) {
  loadTeamData(teamID);
};

// ========================================
// SKELETON LOADERS
// ========================================

function renderScheduleSkeleton() {
  const container = document.getElementById('schedule-list');
  container.innerHTML = `
    <div class="skeleton-schedule">
      ${[1,2,3].map(() => '<div class="skeleton skeleton-card"></div>').join('')}
    </div>
  `;
}

function renderRosterSkeleton() {
  const container = document.getElementById('roster-grid');
  container.innerHTML = `
    <div class="skeleton-roster">
      ${[1,2,3,4,5,6].map(() => '<div class="skeleton skeleton-player"></div>').join('')}
    </div>
  `;
}

function renderStatsSkeleton() {
  const container = document.getElementById('stats-container');
  container.innerHTML = `
    <div class="skeleton-stats">
      <div class="skeleton skeleton-stat"></div>
      <div class="skeleton skeleton-text full"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text short"></div>
    </div>
  `;
}

// ========================================
// MAIN APP RENDERING
// ========================================

function renderMainApp() {
  const team = state.currentTeam;
  const data = state.currentTeamData;
  const stats = state.stats;

  // Update header - textContent is safe, no escaping needed
  document.getElementById('current-team-name').textContent = team.teamName;
  document.getElementById('current-team-season').textContent = `${team.year} ${team.season}`;

  // REMOVE any dynamically rendered back/switch team button in the top bar if present
  // (Legacy: some builds injected a back arrow for switching teams)
  const topBar = document.querySelector('#main-app-view .top-bar');
  if (topBar) {
    const legacyBackBtn = topBar.querySelector('.icon-btn.switch-team');
    if (legacyBackBtn) legacyBackBtn.remove();
  }

  // Update quick stats
  document.getElementById('qs-record').textContent = `${stats.wins}-${stats.losses}-${stats.draws}`;

  const gdSign = stats.goalDiff >= 0 ? '+' : '';
  document.getElementById('qs-gd').textContent = `${gdSign}${stats.goalDiff}`;
  document.getElementById('qs-gd').className = `quick-stat-value ${stats.goalDiff >= 0 ? 'text-success' : 'text-error'}`;

  // Next game (find earliest round without scores)
  const nextGame = data.games
    .filter(g => !g.scores)
    .sort((a, b) => a.round - b.round)[0];
  document.getElementById('qs-next').textContent = nextGame ? `R${nextGame.round}` : 'Done';

  // Render content
  renderSchedule();
  renderRoster();

  // Render Ladder Tab if ladderUrl is set
  renderLadderTab(team);
// ========================================
// LADDER TAB RENDERING
// ========================================

function renderLadderTab(team) {
  // Debug: log team ladderUrl presence
  console.log('[Ladder] renderLadderTab called for', team?.teamID, 'ladderUrl:', team?.ladderUrl);

  // Use the bottom nav and main tab content area that are present in the DOM
  const navContainer = document.querySelector('.bottom-nav');
  const tabPanelContainer = document.querySelector('.tab-content-area');
  if (!navContainer || !tabPanelContainer) {
    console.warn('[Ladder] Required DOM containers not found');
    return;
  }

  // Remove existing ladder tab if present
  const existingNav = navContainer.querySelector('.nav-item[data-tab="ladder"]');
  if (existingNav) existingNav.remove();
  const existingPanel = tabPanelContainer.querySelector('#tab-ladder');
  if (existingPanel) existingPanel.remove();

  if (!team.ladderUrl) return; // Hide tab if no ladderUrl

  // Add Ladder tab to nav (insert before the Stats button to keep order)
  const ladderNav = document.createElement('button');
  ladderNav.className = 'nav-item';
  ladderNav.dataset.tab = 'ladder';
  ladderNav.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <line x1="6" y1="2" x2="6" y2="22" />
      <line x1="18" y1="2" x2="18" y2="22" />
      <line x1="6" y1="6" x2="18" y2="6" />
      <line x1="6" y1="12" x2="18" y2="12" />
      <line x1="6" y1="18" x2="18" y2="18" />
    </svg>
    <span>Ladder</span>
  `;
  ladderNav.setAttribute('aria-label', 'Ladder');
  ladderNav.title = 'Ladder';
  ladderNav.onclick = () => window.switchTab('ladder');
  // Insert before the Stats button if present
  const statsBtn = navContainer.querySelector('.nav-item[data-tab="stats"]');
  if (statsBtn) {
    navContainer.insertBefore(ladderNav, statsBtn);
  } else {
    navContainer.appendChild(ladderNav);
  }

  // Add Ladder tab panel
  const ladderPanel = document.createElement('div');
  ladderPanel.className = 'tab-panel';
  ladderPanel.id = 'tab-ladder';
  ladderPanel.innerHTML = `<div id="ladder-content"><div class="ladder-loading">Loading ladder...</div></div>`;
  // Append to the tab content area
  tabPanelContainer.appendChild(ladderPanel);

  // Fetch and render ladder JSON
  fetch(`/ladder-${team.teamID}.json`)
    .then(res => res.json())
    .then(data => {
      const ladderDiv = ladderPanel.querySelector('#ladder-content');
      if (!data.ladder || !data.ladder.rows || !data.ladder.headers) {
        ladderDiv.innerHTML = `<div class="ladder-error">No ladder data available.</div>`;
        return;
      }
      // Build header metadata (determine numeric columns)
      const headers = data.ladder.headers;
      const numericHeaders = headers.map(h => /^(POS|P|W|L|D|B|FF|FG|For|Agst|%|% Won|PTS)$/i.test(h));

      let formatted = formatDateTime(data.lastUpdated || '');

      // per-team persisted toggle key
      const showKey = `ladder.showExtra.${team.teamID}`;
      const showExtra = (localStorage.getItem(showKey) === 'true');

      let html = `<div class="ladder-updated">Last updated: ${escapeHtml(formatted || data.lastUpdated || '')}`;
      html += ` <button class="btn btn-ghost btn-xs show-columns-toggle" aria-pressed="${showExtra ? 'true' : 'false'}">${showExtra ? 'Hide extra columns' : 'Show extra columns'}</button>`;
      html += `</div>`;

      html += `<div class="ladder-container ${showExtra ? 'expanded-columns' : ''}" role="region" aria-label="Ladder" data-teamid="${escapeAttr(team.teamID)}"><table class="ladder-table"><thead><tr>` + headers.map((h, idx) => `<th data-key="${escapeAttr(h)}" class="${numericHeaders[idx] ? 'numeric' : ''}">${escapeHtml(h)}</th>`).join('') + `</tr></thead><tbody>`;

      html += data.ladder.rows.map(row => {
        const rowTeamName = String(row['TEAM'] || row['Team'] || '').toLowerCase();
        const isCurrent = team && team.teamName && rowTeamName.includes(String(team.teamName || '').toLowerCase());
        return `<tr class="${isCurrent ? 'highlight' : ''}">` + headers.map((h, idx) => `<td data-key="${escapeAttr(h)}" class="${numericHeaders[idx] ? 'numeric' : ''}">${escapeHtml(row[h] || '')}</td>`).join('') + `</tr>`;
      }).join('');

      html += `</tbody></table></div>`;
      ladderDiv.innerHTML = html;

      // Animate in (respect prefers-reduced-motion)
      const container = ladderDiv.querySelector('.ladder-container');
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (container) {
        if (!prefersReduced) {
          container.classList.add('ladder-enter');
          requestAnimationFrame(() => requestAnimationFrame(() => container.classList.add('visible')));
          container.addEventListener('transitionend', () => container.classList.remove('ladder-enter'), { once: true });
        } else {
          container.classList.add('visible');
        }
      }

      // Toggle handler
      const toggle = ladderDiv.querySelector('.show-columns-toggle');
      if (toggle && container) {
        toggle.addEventListener('click', () => {
          const expanded = container.classList.toggle('expanded-columns');
          toggle.textContent = expanded ? 'Hide extra columns' : 'Show extra columns';
          toggle.setAttribute('aria-pressed', expanded ? 'true' : 'false');
          try { localStorage.setItem(showKey, expanded ? 'true' : 'false'); } catch (e) { /* ignore */ }
        });
      }
    })
    .catch(() => {
      const ladderDiv = ladderPanel.querySelector('#ladder-content');
      ladderDiv.innerHTML = `<div class="ladder-error">Failed to load ladder. Please try again later.</div>`;
    });
}
}

// ========================================
// SCHEDULE RENDERING
// ========================================

function renderSchedule() {
  const container = document.getElementById('schedule-list');

  try {
    // Sort games by round number for display
    const games = (state.currentTeamData?.games || []).slice().sort((a, b) => a.round - b.round);

    if (games.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📅</div>
          <p>No games scheduled yet.</p>
        </div>
      `;
      return;
    }

  container.innerHTML = games.map(game => {
    let resultClass = '';
    let scoreDisplay = '';

    if (game.status === 'abandoned') {
      scoreDisplay = `<div class="game-score-label">Abandoned</div>`;
      resultClass = 'abandoned';
    } else if (game.scores) {
      const { us, opponent } = game.scores;
      if (us > opponent) resultClass = 'win';
      else if (us < opponent) resultClass = 'loss';
      else resultClass = 'draw';
      scoreDisplay = `<div class="game-score-value">${escapeHtml(us)} - ${escapeHtml(opponent)}</div>`;
    } else {
      scoreDisplay = `<div class="game-score-label">Upcoming</div>`;
    }

    return `
      <div class="game-item ${resultClass}" onclick="openGameDetail('${escapeAttr(game.gameID)}')">
        <div class="game-round">R${escapeHtml(game.round)}</div>
        <div class="game-info">
          <div class="game-opponent">vs ${escapeHtml(game.opponent)}</div>
          <div class="game-meta">${escapeHtml(formatDate(game.date))} • ${escapeHtml(game.time)} • ${escapeHtml(game.location)}</div>
        </div>
        <div class="game-score">
          ${scoreDisplay}
        </div>
      </div>
    `;
  }).join('');
  } catch (error) {
    console.error('[Schedule] Error rendering schedule:', error);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <p>Error loading schedule. Please try again.</p>
      </div>
    `;
  }
}

// ========================================
// ROSTER RENDERING
// ========================================

function renderRoster() {
  const container = document.getElementById('roster-grid');

  try {
    const players = state.currentTeamData?.players || [];

    if (players.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">👥</div>
          <p>No players added yet.</p>
        </div>
      `;
      return;
    }

    const regular = players.filter(p => !p.fillIn);
    const fillIns = players.filter(p => p.fillIn);

    let html = regular.map(player => renderPlayerCard(player)).join('');

    if (fillIns.length > 0) {
      html += `<div class="roster-section-title">Fill-in Players</div>`;
      html += fillIns.map(player => renderPlayerCard(player, true)).join('');
    }

    container.innerHTML = html;
  } catch (error) {
    console.error('[Roster] Error rendering roster:', error);
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">⚠️</div>
        <p>Error loading roster. Please try again.</p>
      </div>
    `;
  }
}

function renderPlayerCard(player, isFillIn = false) {
  const initials = player.name.split(' ').map(n => n[0]).join('').toUpperCase();
  // Handle both string and array formats for favPosition
  const positions = normalizeFavPositions(player.favPosition);
  const positionDisplay = positions.length > 0 ? positions.join(', ') : 'Flexible';
  return `
    <div class="player-card ${isFillIn ? 'fill-in' : ''}" onclick="openPlayerDetail('${escapeAttr(player.id)}')">
      <div class="player-avatar">${escapeHtml(initials)}</div>
      <div class="player-name">${escapeHtml(player.name)}</div>
      <div class="player-position">${escapeHtml(positionDisplay)}</div>
    </div>
  `;
}

/**
 * Normalize favPosition to always be an array (handles legacy string values)
 */
function normalizeFavPositions(favPosition) {
  if (!favPosition) return [];
  if (Array.isArray(favPosition)) return favPosition.filter(p => p);
  if (typeof favPosition === 'string' && favPosition.trim()) return [favPosition.trim()];
  return [];
}

// ========================================
// STATS RENDERING
// ========================================

function renderStats() {
  const container = document.getElementById('stats-container');

  try {
    const analytics = state.analytics;

    if (!analytics || analytics.advanced.gameCount === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <p>Play some games to see stats!</p>
        </div>
      `;
      return;
    }

    // Render sub-tab navigation and content
    container.innerHTML = `
      <div class="stats-subtabs">
        <button class="stats-subtab ${state.activeStatsTab === 'overview' ? 'active' : ''}" onclick="switchStatsTab('overview')">Overview</button>
        <button class="stats-subtab ${state.activeStatsTab === 'leaders' ? 'active' : ''}" onclick="switchStatsTab('leaders')">Leaders</button>
        <button class="stats-subtab ${state.activeStatsTab === 'positions' ? 'active' : ''}" onclick="switchStatsTab('positions')">Positions</button>
        <button class="stats-subtab ${state.activeStatsTab === 'combos' ? 'active' : ''}" onclick="switchStatsTab('combos')">Combos</button>
        <button class="stats-subtab ${state.activeStatsTab === 'attendance' ? 'active' : ''}" onclick="switchStatsTab('attendance')">Attendance</button>
      </div>
      <div id="stats-tab-content"></div>
    `;

    // Render the active sub-tab
    renderActiveStatsTab();
  } catch (error) {
    console.error('[Stats] Error rendering stats:', error);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <p>Error loading stats. Please try again.</p>
      </div>
    `;
  }
}

window.switchStatsTab = function(tabId) {
  state.activeStatsTab = tabId;

  // Update active tab styling
  document.querySelectorAll('.stats-subtab').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.toLowerCase().includes(tabId.substring(0, 4)));
  });

  renderActiveStatsTab();
};

function renderActiveStatsTab() {
  const content = document.getElementById('stats-tab-content');
  if (!content) return;

  switch (state.activeStatsTab) {
    case 'overview':
      renderStatsOverview(content);
      break;
    case 'leaders':
      renderStatsLeaders(content);
      break;
    case 'positions':
      renderStatsPositions(content);
      break;
    case 'combos':
      renderStatsCombinations(content);
      break;
    case 'attendance':
      renderStatsAttendance(content);
      break;
    default:
      renderStatsOverview(content);
  }
}

function renderStatsOverview(container) {
  const { advanced } = state.analytics;
  const stats = state.stats;

  container.innerHTML = `
    <!-- Hero Stats -->
    <div class="stats-hero">
      <div class="stats-record">${advanced.wins}-${advanced.losses}-${advanced.draws}</div>
      <div class="stats-record-label">${advanced.winRate}% Win Rate</div>
      <div class="stats-metrics">
        <div class="stats-metric">
          <div class="stats-metric-value">${advanced.goalsFor}</div>
          <div class="stats-metric-label">Goals For</div>
        </div>
        <div class="stats-metric">
          <div class="stats-metric-value">${advanced.goalsAgainst}</div>
          <div class="stats-metric-label">Goals Against</div>
        </div>
        <div class="stats-metric">
          <div class="stats-metric-value">${advanced.goalDiff > 0 ? '+' : ''}${advanced.goalDiff}</div>
          <div class="stats-metric-label">Goal Diff</div>
        </div>
      </div>
    </div>

    <!-- Form & Metrics -->
    <div class="stats-section">
      <div class="stats-section-title">Season Metrics</div>
      <div class="stats-metrics-grid">
        <div class="metric-card" onclick="showMetricDetail('form')">
          <div class="metric-label">Form</div>
          <div class="metric-value form-badges">
            ${advanced.form.length > 0 ? advanced.form.map(r =>
              `<span class="form-badge ${r === 'W' ? 'win' : r === 'L' ? 'loss' : 'draw'}">${r}</span>`
            ).join('') : '<span class="text-muted">-</span>'}
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Best Quarter</div>
          <div class="metric-value">${advanced.bestQuarter || '-'}</div>
          <div class="metric-sublabel">${advanced.bestQuarter ? `+${advanced.bestQuarterDiff} avg` : ''}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Avg Scored</div>
          <div class="metric-value text-success">${advanced.avgFor}</div>
          <div class="metric-sublabel">per game</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Avg Conceded</div>
          <div class="metric-value text-error">${advanced.avgAgainst}</div>
          <div class="metric-sublabel">per game</div>
        </div>
      </div>
    </div>

    <!-- Quarter Breakdown -->
    <div class="stats-section">
      <div class="stats-section-title">Quarter Performance</div>
      <div class="quarter-breakdown">
        ${['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
          const qs = advanced.quarterStats[q];
          const avgFor = qs.games > 0 ? (qs.for / qs.games).toFixed(1) : '0';
          const avgAgainst = qs.games > 0 ? (qs.against / qs.games).toFixed(1) : '0';
          const diff = qs.games > 0 ? (qs.diff / qs.games).toFixed(1) : '0';
          return `
            <div class="quarter-stat ${advanced.bestQuarter === q ? 'best-quarter' : ''}">
              <div class="quarter-label">${q}</div>
              <div class="quarter-scores">
                <span class="text-success">${avgFor}</span>
                <span class="text-muted">-</span>
                <span class="text-error">${avgAgainst}</span>
              </div>
              <div class="quarter-diff ${parseFloat(diff) >= 0 ? 'positive' : 'negative'}">
                ${parseFloat(diff) >= 0 ? '+' : ''}${diff}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Goal Scorers -->
    <div class="stats-section">
      <div class="stats-section-title">Goal Scorers</div>
      ${stats.playerStats.filter(p => p.goals > 0).map((p, i) => `
        <div class="scorer-card ${i === 0 ? 'top-scorer' : ''}" onclick="toggleScorerExpand(this)">
          <div class="scorer-card-header">
            <div class="scorer-rank">${escapeHtml(i + 1)}</div>
            <div class="scorer-info">
              <div class="scorer-name">${escapeHtml(p.name)}</div>
              <div class="scorer-details">${escapeHtml(p.gameBreakdown.length)} game${p.gameBreakdown.length !== 1 ? 's' : ''} · ${escapeHtml(p.scoringQuarters)} quarters</div>
            </div>
            <div class="scorer-goals">
              <div class="scorer-goals-value">${escapeHtml(p.goals)}</div>
              <div class="scorer-goals-label">goals</div>
            </div>
            <div class="scorer-expand-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
          <div class="scorer-card-breakdown">
            ${p.gameBreakdown.map(g => `
              <div class="breakdown-row">
                <div class="breakdown-game">
                  <span class="breakdown-round">R${escapeHtml(g.round)}</span>
                  <span class="breakdown-opponent">vs ${escapeHtml(g.opponent)}</span>
                </div>
                <div class="breakdown-goals">
                  ${g.gsGoals > 0 ? `<span class="breakdown-position">GS: ${escapeHtml(g.gsGoals)}</span>` : ''}
                  ${g.gaGoals > 0 ? `<span class="breakdown-position">GA: ${escapeHtml(g.gaGoals)}</span>` : ''}
                </div>
                <div class="breakdown-total">${escapeHtml(g.total)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
      ${stats.playerStats.filter(p => p.goals > 0).length === 0 ? `
        <div class="empty-state">
          <p>No goals recorded yet</p>
        </div>
      ` : ''}
    </div>

    <!-- AI Insights -->
    <div class="stats-section">
      <div class="stats-section-title">AI Insights</div>
      <div id="ai-insights-container">
        <button class="btn btn-primary" onclick="fetchAIInsights()" id="ai-insights-btn">
          Get AI Insights
        </button>
      </div>
    </div>
  `;
}

// Fetch AI insights from Gemini
window.fetchAIInsights = async function() {
  const btn = document.getElementById('ai-insights-btn');
  const container = document.getElementById('ai-insights-container');

  if (!state.currentTeam || !state.currentTeamData) {
    showToast('No team data loaded', 'error');
    return;
  }

  // Show loading state
  container.innerHTML = `
    <div class="ai-loading">
      <div class="spinner"></div>
      <p>Analyzing team data...</p>
    </div>
  `;

  try {
    const baseUrl = API_CONFIG.baseUrl;
    const url = \`\${baseUrl}?api=true&action=getAIInsights&teamID=\${encodeURIComponent(state.currentTeam.teamID)}&sheetName=\${encodeURIComponent(state.currentTeam.sheetName)}\`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.success && data.insights) {
      // Convert markdown-style formatting to HTML
      let html = data.insights
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n- /g, '\n• ')
        .replace(/\n/g, '<br>');

      container.innerHTML = \`
        <div class="ai-insights-content">
          \${html}
        </div>
        <button class="btn btn-secondary" onclick="fetchAIInsights()" style="margin-top: 12px;">
          Refresh Insights
        </button>
      \`;
    } else {
      throw new Error(data.error || 'Failed to get insights');
    }
  } catch (err) {
    console.error('[AI Insights] Error:', err);
    container.innerHTML = \`
      <div class="ai-error">
        <p>Failed to get insights: \${escapeHtml(err.message)}</p>
        <button class="btn btn-primary" onclick="fetchAIInsights()">Try Again</button>
      </div>
    \`;
  }
};

function renderStatsLeaders(container) {
  const { leaderboards } = state.analytics;
  const { offensive, defensive, minQuarters } = leaderboards;
  const tableState = state.leadersTableState;

  // Helper to render sort arrow and determine if column is active
  const sortHeader = (tableName, column, label) => {
    const sort = tableState.sort[tableName];
    const isActive = sort.column === column;
    const arrow = isActive ? (sort.ascending ? '▲' : '▼') : '';
    const activeClass = isActive ? 'sort-active' : '';
    return `<span class="col-${column} sortable-header ${activeClass}" onclick="sortLeadersTable('${tableName}', '${column}')">${label}${arrow ? ` ${arrow}` : ''}</span>`;
  };

  // Helper to sort data based on table state
  const sortData = (data, tableName) => {
    const sort = tableState.sort[tableName];
    return [...data].sort((a, b) => {
      let aVal, bVal;
      if (sort.column === 'goals') { aVal = a.goals; bVal = b.goals; }
      else if (sort.column === 'goalsAgainst') { aVal = a.goalsAgainst; bVal = b.goalsAgainst; }
      else if (sort.column === 'avg') { aVal = a.avg; bVal = b.avg; }
      else if (sort.column === 'quarters') { aVal = a.quarters; bVal = b.quarters; }
      else { aVal = a[sort.column]; bVal = b[sort.column]; }
      return sort.ascending ? aVal - bVal : bVal - aVal;
    });
  };

  // Helper to render expand/collapse button
  const expandButton = (tableName, totalCount) => {
    const isExpanded = tableState.expanded[tableName];
    if (totalCount <= 5) return '';
    return `<button class="leaders-expand-btn" onclick="toggleLeadersTable('${tableName}')">${isExpanded ? 'Show less' : `Show all (${totalCount})`}</button>`;
  };

  const getDisplayCount = (tableName, totalCount) => tableState.expanded[tableName] ? totalCount : Math.min(5, totalCount);

  // Sort and prepare data for each table
  const scorersData = sortData(offensive.topScorersByTotal, 'scorers');
  const defendersData = sortData(defensive.topDefendersByTotal, 'defenders');
  const goalingPairsData = sortData(offensive.topScoringPairsByTotal, 'goalingPairs');
  const defendingPairsData = sortData(defensive.topDefensivePairsByTotal, 'defendingPairs');

  container.innerHTML = `
    <!-- Offensive Leaders -->
    <div class="stats-section">
      <div class="stats-section-title">Offensive Leaders</div>
      <div class="leaderboard-grid">
        <div class="leaderboard-card">
          <div class="leaderboard-header">Top Scorer</div>
          ${offensive.topScorersByTotal.length > 0 ? `
            <div class="leaderboard-player">
              <div class="leaderboard-name">${escapeHtml(offensive.topScorersByTotal[0].name)}</div>
              <div class="leaderboard-stat">${offensive.topScorersByTotal[0].goals} goals</div>
              <div class="leaderboard-detail">${offensive.topScorersByTotal[0].avg} per qtr · ${offensive.topScorersByTotal[0].quarters} qtrs</div>
            </div>
          ` : '<div class="leaderboard-empty">No data yet</div>'}
        </div>
        <div class="leaderboard-card">
          <div class="leaderboard-header">Most Efficient</div>
          ${offensive.topScorersByEfficiency.length > 0 ? `
            <div class="leaderboard-player">
              <div class="leaderboard-name">${escapeHtml(offensive.topScorersByEfficiency[0].name)}</div>
              <div class="leaderboard-stat">${offensive.topScorersByEfficiency[0].avg} per qtr</div>
              <div class="leaderboard-detail">${offensive.topScorersByEfficiency[0].goals} goals · ${offensive.topScorersByEfficiency[0].quarters} qtrs</div>
            </div>
          ` : `<div class="leaderboard-empty">Min ${minQuarters} qtrs required</div>`}
        </div>
        <div class="leaderboard-card">
          <div class="leaderboard-header">Top Scoring Pair</div>
          ${offensive.topScoringPairsByTotal.length > 0 ? `
            <div class="leaderboard-player">
              <div class="leaderboard-name">${escapeHtml(offensive.topScoringPairsByTotal[0].players[0].split(' ')[0])} & ${escapeHtml(offensive.topScoringPairsByTotal[0].players[1].split(' ')[0])}</div>
              <div class="leaderboard-stat">${offensive.topScoringPairsByTotal[0].goals} goals</div>
              <div class="leaderboard-detail">${offensive.topScoringPairsByTotal[0].avg} per qtr · ${offensive.topScoringPairsByTotal[0].quarters} qtrs</div>
            </div>
          ` : '<div class="leaderboard-empty">No data yet</div>'}
        </div>
        <div class="leaderboard-card">
          <div class="leaderboard-header">Efficient Pair</div>
          ${offensive.topScoringPairsByEfficiency.length > 0 ? `
            <div class="leaderboard-player">
              <div class="leaderboard-name">${escapeHtml(offensive.topScoringPairsByEfficiency[0].players[0].split(' ')[0])} & ${escapeHtml(offensive.topScoringPairsByEfficiency[0].players[1].split(' ')[0])}</div>
              <div class="leaderboard-stat">${offensive.topScoringPairsByEfficiency[0].avg} per qtr</div>
              <div class="leaderboard-detail">${offensive.topScoringPairsByEfficiency[0].goals} goals · ${offensive.topScoringPairsByEfficiency[0].quarters} qtrs</div>
            </div>
          ` : `<div class="leaderboard-empty">Min ${minQuarters} qtrs required</div>`}
        </div>
      </div>
    </div>

    <!-- Defensive Leaders -->
    <div class="stats-section">
      <div class="stats-section-title">Defensive Leaders</div>
      <div class="leaderboard-grid">
        <div class="leaderboard-card defensive">
          <div class="leaderboard-header">Top Defender</div>
          ${defensive.topDefendersByTotal.length > 0 ? `
            <div class="leaderboard-player">
              <div class="leaderboard-name">${escapeHtml(defensive.topDefendersByTotal[0].name)}</div>
              <div class="leaderboard-stat">${defensive.topDefendersByTotal[0].avg} GA/qtr</div>
              <div class="leaderboard-detail">${defensive.topDefendersByTotal[0].goalsAgainst} conceded · ${defensive.topDefendersByTotal[0].quarters} qtrs</div>
            </div>
          ` : '<div class="leaderboard-empty">No data yet</div>'}
        </div>
        <div class="leaderboard-card defensive">
          <div class="leaderboard-header">Most Efficient</div>
          ${defensive.topDefendersByEfficiency.length > 0 ? `
            <div class="leaderboard-player">
              <div class="leaderboard-name">${escapeHtml(defensive.topDefendersByEfficiency[0].name)}</div>
              <div class="leaderboard-stat">${defensive.topDefendersByEfficiency[0].avg} GA/qtr</div>
              <div class="leaderboard-detail">${defensive.topDefendersByEfficiency[0].goalsAgainst} conceded · ${defensive.topDefendersByEfficiency[0].quarters} qtrs</div>
            </div>
          ` : `<div class="leaderboard-empty">Min ${minQuarters} qtrs required</div>`}
        </div>
        <div class="leaderboard-card defensive">
          <div class="leaderboard-header">Top Defensive Pair</div>
          ${defensive.topDefensivePairsByTotal.length > 0 ? `
            <div class="leaderboard-player">
              <div class="leaderboard-name">${escapeHtml(defensive.topDefensivePairsByTotal[0].players[0].split(' ')[0])} & ${escapeHtml(defensive.topDefensivePairsByTotal[0].players[1].split(' ')[0])}</div>
              <div class="leaderboard-stat">${defensive.topDefensivePairsByTotal[0].avg} GA/qtr</div>
              <div class="leaderboard-detail">${defensive.topDefensivePairsByTotal[0].goalsAgainst} conceded · ${defensive.topDefensivePairsByTotal[0].quarters} qtrs</div>
            </div>
          ` : '<div class="leaderboard-empty">No data yet</div>'}
        </div>
        <div class="leaderboard-card defensive">
          <div class="leaderboard-header">Efficient Pair</div>
          ${defensive.topDefensivePairsByEfficiency.length > 0 ? `
            <div class="leaderboard-player">
              <div class="leaderboard-name">${escapeHtml(defensive.topDefensivePairsByEfficiency[0].players[0].split(' ')[0])} & ${escapeHtml(defensive.topDefensivePairsByEfficiency[0].players[1].split(' ')[0])}</div>
              <div class="leaderboard-stat">${defensive.topDefensivePairsByEfficiency[0].avg} GA/qtr</div>
              <div class="leaderboard-detail">${defensive.topDefensivePairsByEfficiency[0].goalsAgainst} conceded · ${defensive.topDefensivePairsByEfficiency[0].quarters} qtrs</div>
            </div>
          ` : `<div class="leaderboard-empty">Min ${minQuarters} qtrs required</div>`}
        </div>
      </div>
    </div>

    <!-- All Scorers List -->
    <div class="stats-section">
      <div class="stats-section-title">All Scorers</div>
      ${scorersData.length > 0 ? `
        <div class="scorers-table">
          <div class="scorers-table-header">
            <span class="col-rank">#</span>
            <span class="col-name">Player</span>
            ${sortHeader('scorers', 'goals', 'Goals')}
            ${sortHeader('scorers', 'avg', 'Avg')}
            ${sortHeader('scorers', 'quarters', 'Qtrs')}
          </div>
          ${scorersData.slice(0, getDisplayCount('scorers', scorersData.length)).map((p, i) => `
            <div class="scorers-table-row ${i === 0 ? 'top' : ''}">
              <span class="col-rank">${i + 1}</span>
              <span class="col-name">${escapeHtml(p.name)}</span>
              <span class="col-goals">${p.goals}</span>
              <span class="col-avg">${p.avg}</span>
              <span class="col-quarters">${p.quarters}</span>
            </div>
          `).join('')}
        </div>
        ${expandButton('scorers', scorersData.length)}
      ` : '<div class="empty-state"><p>No scorers yet</p></div>'}
    </div>

    <!-- All Defenders List -->
    <div class="stats-section">
      <div class="stats-section-title">All Defenders</div>
      ${defendersData.length > 0 ? `
        <div class="scorers-table">
          <div class="scorers-table-header">
            <span class="col-rank">#</span>
            <span class="col-name">Player</span>
            ${sortHeader('defenders', 'goalsAgainst', 'GA')}
            ${sortHeader('defenders', 'avg', 'Avg')}
            ${sortHeader('defenders', 'quarters', 'Qtrs')}
          </div>
          ${defendersData.slice(0, getDisplayCount('defenders', defendersData.length)).map((p, i) => `
            <div class="scorers-table-row ${i === 0 ? 'top' : ''}">
              <span class="col-rank">${i + 1}</span>
              <span class="col-name">${escapeHtml(p.name)}</span>
              <span class="col-goalsAgainst">${p.goalsAgainst}</span>
              <span class="col-avg">${p.avg}</span>
              <span class="col-quarters">${p.quarters}</span>
            </div>
          `).join('')}
        </div>
        ${expandButton('defenders', defendersData.length)}
      ` : '<div class="empty-state"><p>No defenders yet</p></div>'}
    </div>

    <!-- Goaling Pair Averages -->
    <div class="stats-section">
      <div class="stats-section-title">Goaling Pair Averages</div>
      ${goalingPairsData.length > 0 ? `
        <div class="scorers-table">
          <div class="scorers-table-header">
            <span class="col-rank">#</span>
            <span class="col-name">Pair</span>
            ${sortHeader('goalingPairs', 'avg', 'Avg/Qtr')}
            ${sortHeader('goalingPairs', 'goals', 'Goals')}
            ${sortHeader('goalingPairs', 'quarters', 'Qtrs')}
          </div>
          ${goalingPairsData.slice(0, getDisplayCount('goalingPairs', goalingPairsData.length)).map((p, i) => `
            <div class="scorers-table-row ${i === 0 ? 'top' : ''}">
              <span class="col-rank">${i + 1}</span>
              <span class="col-name">${escapeHtml(p.players[0].split(' ')[0])} & ${escapeHtml(p.players[1].split(' ')[0])}</span>
              <span class="col-avg">${p.avg}</span>
              <span class="col-goals">${p.goals}</span>
              <span class="col-quarters">${p.quarters}</span>
            </div>
          `).join('')}
        </div>
        ${expandButton('goalingPairs', goalingPairsData.length)}
      ` : '<div class="empty-state"><p>No goaling pairs yet</p></div>'}
    </div>

    <!-- Defending Pair Averages -->
    <div class="stats-section">
      <div class="stats-section-title">Defending Pair Averages</div>
      ${defendingPairsData.length > 0 ? `
        <div class="scorers-table">
          <div class="scorers-table-header">
            <span class="col-rank">#</span>
            <span class="col-name">Pair</span>
            ${sortHeader('defendingPairs', 'avg', 'Avg/Qtr')}
            ${sortHeader('defendingPairs', 'goalsAgainst', 'GA')}
            ${sortHeader('defendingPairs', 'quarters', 'Qtrs')}
          </div>
          ${defendingPairsData.slice(0, getDisplayCount('defendingPairs', defendingPairsData.length)).map((p, i) => `
            <div class="scorers-table-row ${i === 0 ? 'top' : ''}">
              <span class="col-rank">${i + 1}</span>
              <span class="col-name">${escapeHtml(p.players[0].split(' ')[0])} & ${escapeHtml(p.players[1].split(' ')[0])}</span>
              <span class="col-avg">${p.avg}</span>
              <span class="col-goalsAgainst">${p.goalsAgainst}</span>
              <span class="col-quarters">${p.quarters}</span>
            </div>
          `).join('')}
        </div>
        ${expandButton('defendingPairs', defendingPairsData.length)}
      ` : '<div class="empty-state"><p>No defending pairs yet</p></div>'}
    </div>
  `;
}

// Sort leaders table by column
window.sortLeadersTable = function(tableName, column) {
  const sort = state.leadersTableState.sort[tableName];
  if (sort.column === column) {
    sort.ascending = !sort.ascending;
  } else {
    sort.column = column;
    // For defensive stats, ascending is better (lower = better), except quarters
    if (tableName === 'defenders' || tableName === 'defendingPairs') {
      sort.ascending = (column === 'quarters') ? false : true;
    } else {
      sort.ascending = false;
    }
  }
  const container = document.getElementById('stats-tab-content');
  if (container) renderStatsLeaders(container);
};

// Toggle expand/collapse for leaders table
window.toggleLeadersTable = function(tableName) {
  state.leadersTableState.expanded[tableName] = !state.leadersTableState.expanded[tableName];
  const container = document.getElementById('stats-tab-content');
  if (container) renderStatsLeaders(container);
};

function renderStatsCombinations(container) {
  const { combinations } = state.analytics;
  const { attackingUnits, defensiveUnits, pairings, minQuarters } = combinations;

  container.innerHTML = `
    <!-- Attacking Units -->
    <div class="stats-section">
      <div class="stats-section-title">Attacking Units (GS-GA-WA-C)</div>
      ${attackingUnits.length > 0 ? `
        <div class="units-table">
          <div class="units-table-header">
            <span class="col-players">Players</span>
            <span class="col-qtrs">Qtrs</span>
            <span class="col-gf">GF/Q</span>
            <span class="col-pm">+/-</span>
          </div>
          ${attackingUnits.slice(0, 8).map((u, i) => `
            <div class="units-table-row ${i === 0 ? 'best' : ''}">
              <span class="col-players">
                <span class="unit-player">${escapeHtml(u.players.GS.split(' ')[0])}</span>
                <span class="unit-player">${escapeHtml(u.players.GA.split(' ')[0])}</span>
                <span class="unit-player">${escapeHtml(u.players.WA.split(' ')[0])}</span>
                <span class="unit-player">${escapeHtml(u.players.C.split(' ')[0])}</span>
              </span>
              <span class="col-qtrs">${u.quarters}</span>
              <span class="col-gf text-success">${u.avgFor}</span>
              <span class="col-pm ${u.plusMinus >= 0 ? 'positive' : 'negative'}">${u.plusMinus >= 0 ? '+' : ''}${u.plusMinus}</span>
            </div>
          `).join('')}
        </div>
      ` : `<div class="empty-state"><p>Min ${minQuarters} quarters together required</p></div>`}
    </div>

    <!-- Defensive Units -->
    <div class="stats-section">
      <div class="stats-section-title">Defensive Units (GK-GD-WD-C)</div>
      ${defensiveUnits.length > 0 ? `
        <div class="units-table">
          <div class="units-table-header">
            <span class="col-players">Players</span>
            <span class="col-qtrs">Qtrs</span>
            <span class="col-ga">GA/Q</span>
            <span class="col-pm">+/-</span>
          </div>
          ${defensiveUnits.slice(0, 8).map((u, i) => `
            <div class="units-table-row ${i === 0 ? 'best' : ''}">
              <span class="col-players">
                <span class="unit-player">${escapeHtml(u.players.GK.split(' ')[0])}</span>
                <span class="unit-player">${escapeHtml(u.players.GD.split(' ')[0])}</span>
                <span class="unit-player">${escapeHtml(u.players.WD.split(' ')[0])}</span>
                <span class="unit-player">${escapeHtml(u.players.C.split(' ')[0])}</span>
              </span>
              <span class="col-qtrs">${u.quarters}</span>
              <span class="col-ga text-error">${u.avgAgainst}</span>
              <span class="col-pm ${u.plusMinus >= 0 ? 'positive' : 'negative'}">${u.plusMinus >= 0 ? '+' : ''}${u.plusMinus}</span>
            </div>
          `).join('')}
        </div>
      ` : `<div class="empty-state"><p>Min ${minQuarters} quarters together required</p></div>`}
    </div>

    <!-- Position Pairings -->
    <div class="stats-section">
      <div class="stats-section-title">Position Pairings</div>

      <div class="pairings-grid">
        <!-- Offensive Pairings -->
        <div class="pairings-column">
          <div class="pairings-header">Offensive</div>
          ${pairings.offensive.length > 0 ? pairings.offensive.slice(0, 5).map(p => `
            <div class="pairing-row">
              <span class="pairing-pos">${escapeHtml(p.positions)}</span>
              <span class="pairing-names">${escapeHtml(p.players[0].split(' ')[0])} & ${escapeHtml(p.players[1].split(' ')[0])}</span>
              <span class="pairing-stat text-success">${p.avgFor} GF/Q</span>
            </div>
          `).join('') : '<div class="pairing-empty">No data</div>'}
        </div>

        <!-- Defensive Pairings -->
        <div class="pairings-column">
          <div class="pairings-header">Defensive</div>
          ${pairings.defensive.length > 0 ? pairings.defensive.slice(0, 5).map(p => `
            <div class="pairing-row">
              <span class="pairing-pos">${escapeHtml(p.positions)}</span>
              <span class="pairing-names">${escapeHtml(p.players[0].split(' ')[0])} & ${escapeHtml(p.players[1].split(' ')[0])}</span>
              <span class="pairing-stat text-error">${p.avgAgainst} GA/Q</span>
            </div>
          `).join('') : '<div class="pairing-empty">No data</div>'}
        </div>
      </div>
    </div>
  `;
}

function renderStatsAttendance(container) {
  const team = state.currentTeamData;
  if (!team || !team.players || !team.games) {
    container.innerHTML = '<div class="empty-state"><p>No data available</p></div>';
    return;
  }

  const players = team.players.filter(p => !p.fillIn);
  const games = team.games.filter(g => g.availablePlayerIDs || g.lineup);

  if (games.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No games with attendance data yet</p></div>';
    return;
  }

  // Calculate attendance stats per player
  const attendanceStats = players.map(player => {
    let available = 0;
    let played = 0;

    games.forEach(game => {
      // Check if player was available
      const wasAvailable = game.availablePlayerIDs?.includes(player.id);
      if (wasAvailable) available++;

      // Check if player actually played (in any quarter lineup)
      if (game.lineup) {
        const playedInGame = ['Q1', 'Q2', 'Q3', 'Q4'].some(q => {
          const qData = game.lineup[q] || {};
          return Object.values(qData).includes(player.name);
        });
        if (playedInGame) played++;
      }
    });

    const attendanceRate = games.length > 0 ? Math.round((available / games.length) * 100) : 0;
    const playedRate = games.length > 0 ? Math.round((played / games.length) * 100) : 0;

    return {
      id: player.id,
      name: player.name,
      available,
      played,
      totalGames: games.length,
      attendanceRate,
      playedRate
    };
  }).sort((a, b) => b.attendanceRate - a.attendanceRate);

  // Calculate team averages
  const avgAttendance = attendanceStats.length > 0
    ? Math.round(attendanceStats.reduce((sum, p) => sum + p.attendanceRate, 0) / attendanceStats.length)
    : 0;

  // Find most/least reliable
  const mostReliable = attendanceStats.filter(p => p.attendanceRate >= 80);
  const needsAttention = attendanceStats.filter(p => p.attendanceRate < 50 && p.totalGames >= 2);

  container.innerHTML = `
    <!-- Attendance Overview -->
    <div class="stats-section">
      <div class="stats-section-title">Attendance Overview</div>
      <div class="attendance-summary">
        <div class="attendance-stat">
          <span class="attendance-value">${games.length}</span>
          <span class="attendance-label">Games Tracked</span>
        </div>
        <div class="attendance-stat">
          <span class="attendance-value">${avgAttendance}%</span>
          <span class="attendance-label">Avg Attendance</span>
        </div>
        <div class="attendance-stat">
          <span class="attendance-value">${mostReliable.length}</span>
          <span class="attendance-label">80%+ Attendance</span>
        </div>
      </div>
    </div>

    <!-- Player Attendance Table -->
    <div class="stats-section">
      <div class="stats-section-title">Player Attendance</div>
      <div class="attendance-table">
        <div class="attendance-header">
          <span class="att-col-name">Player</span>
          <span class="att-col-rate">Available</span>
          <span class="att-col-bar">Trend</span>
        </div>
        ${attendanceStats.map(p => `
          <div class="attendance-row">
            <span class="att-col-name">${escapeHtml(p.name.split(' ')[0])}</span>
            <span class="att-col-rate ${p.attendanceRate >= 80 ? 'high' : p.attendanceRate < 50 ? 'low' : ''}">${p.available}/${p.totalGames}</span>
            <span class="att-col-bar">
              <div class="attendance-bar">
                <div class="attendance-bar-fill ${p.attendanceRate >= 80 ? 'high' : p.attendanceRate < 50 ? 'low' : ''}" style="width: ${p.attendanceRate}%"></div>
              </div>
              <span class="attendance-percent">${p.attendanceRate}%</span>
            </span>
          </div>
        `).join('')}
      </div>
    </div>

    ${needsAttention.length > 0 ? `
    <!-- Needs Attention -->
    <div class="stats-section">
      <div class="stats-section-title">Needs Follow-up</div>
      <div class="attention-list">
        ${needsAttention.map(p => `
          <div class="attention-item">
            <span class="attention-name">${escapeHtml(p.name)}</span>
            <span class="attention-stat">${p.attendanceRate}% attendance (${p.available}/${p.totalGames} games)</span>
          </div>
        `).join('')}
      </div>
      <p class="attention-note">These players have attended less than 50% of games</p>
    </div>
    ` : ''}
  `;
}

function renderStatsPositions(container) {
  const team = state.currentTeamData;
  if (!team || !team.players || !team.games) {
    container.innerHTML = '<div class="empty-state"><p>No data available</p></div>';
    return;
  }

  const players = team.players.filter(p => !p.fillIn);
  const games = team.games.filter(g => g.lineup && g.status === 'normal');

  if (games.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No completed games yet</p></div>';
    return;
  }

  const positions = ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'];

  // Calculate position tracking for each player
  const positionStats = players.map(player => {
    const positionCounts = {
      GS: 0, GA: 0, WA: 0, C: 0, WD: 0, GD: 0, GK: 0
    };
    let totalQuarters = 0;

    games.forEach(game => {
      if (!game.lineup) return;

      ['Q1', 'Q2', 'Q3', 'Q4'].forEach(quarter => {
        const qData = game.lineup[quarter];
        if (!qData) return;

        positions.forEach(pos => {
          if (qData[pos] === player.name) {
            positionCounts[pos]++;
            totalQuarters++;
          }
        });
      });
    });

    return {
      id: player.id,
      name: player.name,
      favPosition: player.favPosition,
      positionCounts,
      totalQuarters,
      positionsPlayed: positions.filter(p => positionCounts[p] > 0).length
    };
  }).sort((a, b) => b.totalQuarters - a.totalQuarters);

  // Calculate total possible quarters
  const totalPossibleQuarters = games.length * 4;

  container.innerHTML = `
    <!-- Position Tracking Overview -->
    <div class="stats-section">
      <div class="stats-section-title">Position Development Tracker</div>
      <p class="section-subtitle">See which positions each player has experienced this season</p>

      <div class="position-grid-wrapper">
        <div class="position-grid">
          <!-- Header Row -->
          <div class="pos-grid-header pos-grid-name">Player</div>
          ${positions.map(pos => `
            <div class="pos-grid-header pos-grid-pos">${escapeHtml(pos)}</div>
          `).join('')}
          <div class="pos-grid-header pos-grid-total">Total</div>

          <!-- Player Rows -->
          ${positionStats.map(player => {
            const hasGaps = player.positionsPlayed < 7;
            return `
              <div class="pos-grid-name ${hasGaps ? 'needs-exposure' : ''}">${escapeHtml(player.name.split(' ')[0])}</div>
              ${positions.map(pos => {
                const count = player.positionCounts[pos];
                const favPositions = normalizeFavPositions(player.favPosition);
                const isFav = favPositions.includes(pos);
                return `
                  <div class="pos-grid-cell ${count > 0 ? 'played' : 'unplayed'} ${isFav ? 'favorite' : ''}">
                    ${count > 0 ? count : '—'}
                  </div>
                `;
              }).join('')}
              <div class="pos-grid-total">${player.totalQuarters}</div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Legend -->
      <div class="position-legend">
        <div class="legend-item">
          <span class="legend-box played"></span>
          <span class="legend-label">Quarters played</span>
        </div>
        <div class="legend-item">
          <span class="legend-box favorite"></span>
          <span class="legend-label">Favorite position</span>
        </div>
        <div class="legend-item">
          <span class="legend-box unplayed"></span>
          <span class="legend-label">No experience yet</span>
        </div>
      </div>
    </div>

    <!-- Development Insights -->
    <div class="stats-section">
      <div class="stats-section-title">Development Insights</div>
      ${positionStats.filter(p => p.positionsPlayed < 7).length > 0 ? `
        <div class="insight-box warning">
          <div class="insight-title">Players Needing Position Exposure</div>
          <div class="insight-list">
            ${positionStats.filter(p => p.positionsPlayed < 7).map(player => {
              const missingPositions = positions.filter(pos => player.positionCounts[pos] === 0);
              return `
                <div class="insight-item">
                  <span class="insight-name">${escapeHtml(player.name)}</span>
                  <span class="insight-detail">Needs: ${missingPositions.join(', ')}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : `
        <div class="insight-box success">
          <div class="insight-title">✓ Great work!</div>
          <p>All players have experienced every position this season</p>
        </div>
      `}

      ${positionStats.filter(p => p.totalQuarters < (totalPossibleQuarters / players.length) * 0.7).length > 0 ? `
        <div class="insight-box info">
          <div class="insight-title">Playing Time Watch</div>
          <div class="insight-list">
            ${positionStats.filter(p => p.totalQuarters < (totalPossibleQuarters / players.length) * 0.7).map(player => {
              const avgQuarters = Math.round(totalPossibleQuarters / players.length);
              return `
                <div class="insight-item">
                  <span class="insight-name">${escapeHtml(player.name)}</span>
                  <span class="insight-detail">${player.totalQuarters} quarters (avg: ${avgQuarters})</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// ========================================
// GAME DETAIL
// ========================================

window.openGameDetail = function(gameID) {
  const game = state.currentTeamData.games.find(g => g.gameID === gameID);
  if (!game) return;

  state.currentGame = game;
  state.currentQuarter = 'Q1';

  // Update header
  document.getElementById('game-detail-title').textContent = `Round ${game.round}`;
  document.getElementById('game-detail-subtitle').textContent = `vs ${game.opponent}`;

  // Render score card
  renderGameScoreCard();

  // Render panels
  renderLineupBuilder();
  renderAvailabilityList();
  renderScoringInputs();
  renderGameNotes();

  showView('game-detail-view');

  // Ensure the Read-only pill is visible on game detail for parents
  if (window.isReadOnlyView) {
    try { showReadOnlyPill(state.currentTeamData?.teamName || state.currentTeamData?.name); } catch (e) { /* noop */ }
  }
};

window.closeGameDetail = async function() {
  // Cancel any pending debounced sync
  clearTimeout(syncDebounceTimer);

  // Sync changes before leaving game detail view
  if (state.currentTeamData && hasPendingChanges) {
    try {
      updateSyncIndicator('syncing');
      await syncToGoogleSheets();
      saveToLocalStorage();
      hasPendingChanges = false;
      console.log('[App] Synced team data on game close');
    } catch (err) {
      console.error('[App] Failed to sync on game close:', err);
      showToast('Changes saved locally, will sync when online', 'warning');
    }
  }

  state.currentGame = null;
  showView('main-app-view');
  // Refresh schedule in case scores changed
  renderSchedule();
};

// ========================================
// SHARE & EXPORT FUNCTIONS
// ========================================

window.shareCurrentGame = async function() {
  if (!state.currentGame || !state.currentGame.scores) {
    showToast('No score to share yet', 'info');
    return;
  }

  const teamName = state.currentTeam?.teamName || state.currentTeamData?.teamName || 'Team';
  const location = state.currentGame.location || '';
  const shareText = formatGameShareText(state.currentGame, teamName, location);

  if (!shareText) {
    showToast('Unable to format game data', 'error');
    return;
  }

  haptic(50);

  const success = await shareData(
    {
      title: `${teamName} - Round ${state.currentGame.round}`,
      text: shareText
    },
    showToast
  );

  if (success && navigator.share) {
    // Web Share API was used successfully
    showToast('Shared successfully', 'success');
  }
};

window.copyLineup = async function() {
  if (!state.currentGame || !state.currentGame.lineup) {
    showToast('No lineup to share', 'info');
    return;
  }

  haptic(50);

  // Generate lineup card HTML
  const teamName = state.currentTeam?.teamName || state.currentTeamData?.teamName || 'Team';
  const cardHTML = generateLineupCardHTML(state.currentGame, teamName);

  if (!cardHTML) {
    showToast('Unable to generate lineup', 'error');
    return;
  }

  // Populate the hidden lineup card container
  const cardElement = document.getElementById('lineup-card');
  const cardContainer = document.getElementById('lineup-card-container');

  if (!cardElement || !cardContainer) {
    showToast('Lineup card container not found', 'error');
    return;
  }

  cardElement.innerHTML = cardHTML;
  cardContainer.style.display = 'block';

  try {
    // Capture the card as an image
    const canvas = await html2canvas(cardElement, {
      backgroundColor: '#18181b',
      scale: 2, // Higher resolution
      logging: false,
      useCORS: true
    });

    // Convert to blob
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

    // Hide the card container
    cardContainer.style.display = 'none';

    // Share or download the image
    const filename = `lineup-round-${state.currentGame.round}.png`;
    const title = `${teamName} - Round ${state.currentGame.round} Lineup`;

    await shareImageBlob(blob, filename, title, showToast);

  } catch (err) {
    console.error('Failed to generate lineup image:', err);
    cardContainer.style.display = 'none';

    // Fallback to text copy
    const lineupText = formatLineupText(state.currentGame);
    const success = await copyToClipboard(lineupText);
    if (success) {
      showToast('Lineup copied as text (image failed)', 'info');
    } else {
      showToast('Failed to generate lineup image', 'error');
    }
  }
};

window.exportTeamData = function() {
  if (!state.currentTeamData) {
    showToast('No team data to export', 'error');
    return;
  }

  const filename = `${state.currentTeamData.teamName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}`;

  haptic(50);
  downloadJson(state.currentTeamData, filename);
  showToast('Team data exported', 'success');
};

window.importTeamData = function() {
  closeModal();

  triggerJsonImport(
    (data, filename) => {
      // Validate the imported data
      const result = validateImportedTeamData(data);

      if (!result.valid) {
        showToast(`Invalid file: ${result.errors[0]}`, 'error');
        return;
      }

      // Show confirmation modal
      openModal('Import Team Data', `
        <div class="import-preview">
          <p>You are about to import:</p>
          <div class="import-details">
            <div class="import-detail-row">
              <span class="import-label">Team:</span>
              <span class="import-value">${escapeHtml(data.teamName)}</span>
            </div>
            <div class="import-detail-row">
              <span class="import-label">Season:</span>
              <span class="import-value">${escapeHtml(data.year)} ${escapeHtml(data.season)}</span>
            </div>
            <div class="import-detail-row">
              <span class="import-label">Players:</span>
              <span class="import-value">${data.players?.length || 0}</span>
            </div>
            <div class="import-detail-row">
              <span class="import-label">Games:</span>
              <span class="import-value">${data.games?.length || 0}</span>
            </div>
          </div>
          <p class="import-warning">This will replace all current team data. This action cannot be undone.</p>
        </div>
      `, `
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="confirmImport()">Import</button>
      `);

      // Store the data temporarily for confirmation
      state.pendingImport = data;
    },
    (err) => {
      showToast('Failed to read file. Please try again.', 'error');
    }
  );
};

window.confirmImport = async function() {
  if (!state.pendingImport) {
    showToast('No import data found', 'error');
    closeModal();
    return;
  }

  const data = state.pendingImport;
  state.pendingImport = null;

  // Ensure the imported data has a teamID
  if (!data.teamID) {
    data.teamID = generateId();
  }

  // Update the current team data
  state.currentTeamData = data;
  state.currentTeam = data;

  // Recalculate stats for imported data
  state.stats = calculateTeamStats(state.currentTeamData);
  state.analytics = calculateAllAnalytics(state.currentTeamData);

  // Save to localStorage
  saveToLocalStorage();

  // Sync to Google Sheets if in API mode and online
  if (navigator.onLine) {
    try {
      showLoading();
      await syncToGoogleSheets();
      showToast('Team data imported and synced!', 'success');
    } catch (err) {
      console.error('[App] Failed to sync imported data:', err);
      showToast('Imported locally. Sync failed: ' + err.message, 'warning');
    } finally {
      hideLoading();
    }
  } else {
    showToast('Team data imported successfully!', 'success');
  }

  // Refresh the UI
  renderSchedule();
  renderRoster();

  // Update header
  document.getElementById('current-team-name').textContent = data.teamName;
  document.getElementById('current-team-season').textContent = `${data.year} ${data.season}`;

  closeModal();
  haptic([50, 30, 50]);
};

window.toggleGameFullscreen = async function() {
  const isNowFullscreen = await toggleFullscreen();
  const btn = document.getElementById('fullscreen-btn');

  if (btn) {
    btn.setAttribute('aria-label', isNowFullscreen ? 'Exit fullscreen' : 'Enter fullscreen');
  }

  haptic(50);
};

function renderGameScoreCard() {
  const game = state.currentGame;
  const container = document.getElementById('game-score-card');

  // Calculate totals from lineup data (real-time scoring)
  let us = 0;
  let opponent = 0;
  let hasLineupScores = false;

  if (game.lineup) {
    ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
      const qData = game.lineup[q] || {};
      us += (qData.ourGsGoals || 0) + (qData.ourGaGoals || 0);
      opponent += (qData.oppGsGoals || 0) + (qData.oppGaGoals || 0);
      if (qData.ourGsGoals || qData.ourGaGoals || qData.oppGsGoals || qData.oppGaGoals) {
        hasLineupScores = true;
      }
    });
  }

  // Fall back to saved scores if no lineup scores entered
  if (!hasLineupScores && game.scores) {
    us = game.scores.us;
    opponent = game.scores.opponent;
    hasLineupScores = true;
  }

  // Show upcoming state if no scores at all
  if (!hasLineupScores) {
    container.innerHTML = `
      <div class="game-result-badge upcoming">Upcoming</div>
      <div style="margin-top: 16px; color: var(--primary-200);">
        ${escapeHtml(formatDate(game.date))} at ${escapeHtml(game.time)}<br>
        ${escapeHtml(game.location)}
      </div>
    `;
    // Hide share actions for upcoming games
    const shareActions = document.getElementById('share-actions');
    if (shareActions) {
      shareActions.style.display = 'none';
    }
    return;
  }

  let resultClass = 'draw';
  let resultText = 'Draw';
  if (us > opponent) { resultClass = 'win'; resultText = 'Win'; }
  if (us < opponent) { resultClass = 'loss'; resultText = 'Loss'; }

  container.innerHTML = `
    <div class="game-score-display">
      <div class="score-team">
        <div class="score-label">Us</div>
        <div class="score-value">${escapeHtml(us)}</div>
      </div>
      <div class="score-divider">-</div>
      <div class="score-team">
        <div class="score-label">${escapeHtml(game.opponent)}</div>
        <div class="score-value">${escapeHtml(opponent)}</div>
      </div>
    </div>
    <div class="game-result-badge ${escapeAttr(resultClass)}">${escapeHtml(resultText)}</div>
  `;

  // Show share actions for games with scores
  const shareActions = document.getElementById('share-actions');
  if (shareActions) {
    shareActions.style.display = hasLineupScores ? 'flex' : 'none';
  }
}

// ========================================
// LINEUP BUILDER
// ========================================

function renderLineupBuilder() {
  const game = state.currentGame;
  const container = document.getElementById('lineup-builder');

  if (!game) return;

  const lineup = game.lineup || {};
  const quarterData = lineup[state.currentQuarter] || {};

  // Use Sets for O(1) lookups instead of O(n) array.includes()
  const availableSet = game.availablePlayerIDs ? new Set(game.availablePlayerIDs) : null;
  const availablePlayers = state.currentTeamData.players.filter(p =>
    !availableSet || availableSet.has(p.id)
  );

  // Find players on bench (not in current quarter)
  const assignedNames = new Set(Object.values(quarterData).filter(v => typeof v === 'string'));
  const benchPlayers = availablePlayers.filter(p => !assignedNames.has(p.name));

  container.innerHTML = `
    <!-- Quarter Tabs -->
    <div class="lineup-quarter-tabs">
      ${['Q1', 'Q2', 'Q3', 'Q4'].map(q => `
        <button class="quarter-tab ${q === state.currentQuarter ? 'active' : ''}"
                onclick="selectQuarter('${escapeAttr(q)}')">${escapeHtml(q)}</button>
      `).join('')}
    </div>

    <!-- Court Layout -->
    <div class="lineup-court">
      <!-- Shooters -->
      <div class="court-section">
        <div class="court-section-label">Shooters</div>
        <div class="court-positions">
          ${renderPositionSlot('GS', quarterData.GS)}
          ${renderPositionSlot('GA', quarterData.GA)}
        </div>
      </div>

      <!-- Mid Court -->
      <div class="court-section">
        <div class="court-section-label">Mid Court</div>
        <div class="court-positions">
          ${renderPositionSlot('WA', quarterData.WA)}
          ${renderPositionSlot('C', quarterData.C)}
          ${renderPositionSlot('WD', quarterData.WD)}
        </div>
      </div>

      <!-- Defenders -->
      <div class="court-section">
        <div class="court-section-label">Defenders</div>
        <div class="court-positions">
          ${renderPositionSlot('GD', quarterData.GD)}
          ${renderPositionSlot('GK', quarterData.GK)}
        </div>
      </div>
    </div>

    <!-- Bench -->
    <div class="bench-section">
      <div class="bench-title">Available Players (${escapeHtml(benchPlayers.length)})</div>
      <div class="bench-players">
        ${benchPlayers.length > 0 ? benchPlayers.map(p => `
          <div class="bench-player ${state.selectedPlayer === p.name ? 'selected' : ''}"
               onclick="selectBenchPlayer('${escapeAttr(p.name)}')">${escapeHtml(p.name)}</div>
        `).join('') : '<span class="text-muted">All players assigned</span>'}
      </div>
    </div>
  `;
}

function renderPositionSlot(position, playerName) {
  const filled = playerName && playerName.length > 0;
  const isCaptain = filled && state.currentGame?.captain === playerName;
  const captainBadge = isCaptain ? '<span class="captain-badge">C</span>' : '';

  return `
    <div class="position-slot ${filled ? 'filled' : ''}" onclick="handlePositionClick('${escapeAttr(position)}', '${filled ? escapeAttr(playerName) : ''}')">
      <div class="position-label">${escapeHtml(position)}</div>
      ${filled
        ? `<div class="position-player">${escapeHtml(playerName)}${captainBadge}</div>`
        : `<div class="position-empty">Tap to assign</div>`
      }
    </div>
  `;
}

window.selectQuarter = function(quarter) {
  state.currentQuarter = quarter;
  state.selectedPlayer = null;
  renderLineupBuilder();
};

window.selectBenchPlayer = function(playerName) {
  state.selectedPlayer = state.selectedPlayer === playerName ? null : playerName;
  renderLineupBuilder();
};

window.handlePositionClick = function(position, playerName) {
  if (state.selectedPlayer) {
    // Assigning a bench player to position
    assignPosition(position);
  } else if (playerName) {
    // Toggle captain on filled position
    toggleCaptain(playerName);
  }
};

window.toggleCaptain = function(playerName) {
  if (!ensureNotReadOnly('toggleCaptain')) return;
  const game = state.currentGame;
  if (!game) return;

  if (game.captain === playerName) {
    game.captain = null;
    showToast('Captain removed', 'info');
  } else {
    game.captain = playerName;
    showToast(`${playerName} is now captain`, 'success');
  }

  renderLineupBuilder();
  saveToLocalStorage();
  debouncedSync();
};

window.assignPosition = function(position) {
  if (!ensureNotReadOnly('assignPosition')) return;
  const game = state.currentGame;
  if (!game) return;

  // Initialize lineup structure if needed
  if (!game.lineup) game.lineup = {};
  if (!game.lineup[state.currentQuarter]) {
    game.lineup[state.currentQuarter] = {};
  }

  const currentAssigned = game.lineup[state.currentQuarter][position];

  if (state.selectedPlayer) {
    // Remove player from any other position in this quarter
    Object.keys(game.lineup[state.currentQuarter]).forEach(pos => {
      if (game.lineup[state.currentQuarter][pos] === state.selectedPlayer) {
        game.lineup[state.currentQuarter][pos] = null;
      }
    });

    // Assign to new position
    game.lineup[state.currentQuarter][position] = state.selectedPlayer;
    state.selectedPlayer = null;
    showToast(`Assigned to ${position}`, 'success');
  } else if (currentAssigned) {
    // Clear the position
    game.lineup[state.currentQuarter][position] = null;
    showToast(`Cleared ${position}`, 'info');
  }

  renderLineupBuilder();
  saveToLocalStorage();
  debouncedSync();
};

// ========================================
// AVAILABILITY
// ========================================

function renderAvailabilityList() {
  const game = state.currentGame;
  const container = document.getElementById('availability-list');

  if (!game) return;

  const players = state.currentTeamData.players;
  const availableIDs = game.availablePlayerIDs || players.map(p => p.id);

  container.innerHTML = `
    <div class="availability-list">
      ${players.map(p => {
        const isAvailable = availableIDs.includes(p.id);
        const disabled = window.isReadOnlyView ? 'disabled' : '';
        return `
          <div class="availability-item">
            <input type="checkbox" class="availability-checkbox"
                   data-player-id="${escapeAttr(p.id)}"
                   ${isAvailable ? 'checked' : ''} ${disabled} aria-disabled="${window.isReadOnlyView ? 'true' : 'false'}"
                   onchange="toggleAvailability('${escapeAttr(p.id)}', this.checked)">
            <div class="availability-name">${escapeHtml(p.name)}</div>
            <div class="availability-status">${isAvailable ? 'Available' : 'Unavailable'}</div>
          </div>
        `; 
      }).join('')}
    </div>
  `;
}

window.toggleAvailability = function(playerID, available) {
  if (!ensureNotReadOnly('toggleAvailability')) {
    // If blocked, re-render to reset any transient UI changes (checkbox flip from click)
    try { renderAvailabilityList(); } catch (e) { /* noop */ }
    return;
  }
  const game = state.currentGame;
  if (!game) return; 

  if (!game.availablePlayerIDs) {
    game.availablePlayerIDs = state.currentTeamData.players.map(p => p.id);
  }

  if (available) {
    if (!game.availablePlayerIDs.includes(playerID)) {
      game.availablePlayerIDs.push(playerID);
    }
  } else {
    game.availablePlayerIDs = game.availablePlayerIDs.filter(id => id !== playerID);
  }

  renderAvailabilityList();
  renderLineupBuilder();
  saveToLocalStorage();
  debouncedSync();
};

// ========================================
// SCORING
// ========================================

function renderScoringInputs() {
  const game = state.currentGame;
  const container = document.getElementById('scoring-inputs');

  if (!game) return;

  const lineup = game.lineup || {};

  // Helper to resolve player name from ID or name
  function resolvePlayerName(val) {
    if (!val) return '';
    // Try to find by ID in current team
    const players = state.currentTeamData?.players || [];
    const found = players.find(p => p.id === val);
    if (found) return found.name;
    // If not found by ID, assume it's already a name
    return val;
  }

  const createPlayerScoreRow = (quarter, field, value, position, playerVal) => {
    const playerName = resolvePlayerName(playerVal);
    const disabled = window.isReadOnlyView ? 'disabled' : '';
    const btnProps = window.isReadOnlyView ? '' : `onclick="adjustScore('${escapeAttr(quarter)}', '${escapeAttr(field)}',`;
    return `
      <div class="player-score-row">
        <div class="player-score-info">
          <span class="player-score-name">${escapeHtml(playerName || 'Not assigned')}</span>
          <span class="player-score-position">${escapeHtml(position)}</span>
        </div>
        <div class="score-stepper">
          <button class="stepper-btn stepper-minus" ${window.isReadOnlyView ? 'disabled' : `onclick="adjustScore('${escapeAttr(quarter)}', '${escapeAttr(field)}', -1)"`} aria-label="Decrease">−</button>
          <input type="number" class="scoring-input" id="score-${escapeAttr(quarter)}-${escapeAttr(field)}" min="0" value="${escapeAttr(value)}" ${disabled}
                 onchange="updateScore('${escapeAttr(quarter)}', '${escapeAttr(field)}', this.value)" inputmode="numeric">
          <button class="stepper-btn stepper-plus" ${window.isReadOnlyView ? 'disabled' : `onclick="adjustScore('${escapeAttr(quarter)}', '${escapeAttr(field)}', 1)"`} aria-label="Increase">+</button>
        </div>
      </div>
    `;
  };

  const createOpponentScoreRow = (quarter, field, value, label) => `
    <div class="scoring-row opponent-row">
      <div class="scoring-label">${escapeHtml(label)}</div>
      <div class="score-stepper">
        <button class="stepper-btn stepper-minus" onclick="adjustScore('${escapeAttr(quarter)}', '${escapeAttr(field)}', -1)" aria-label="Decrease">−</button>
        <input type="number" class="scoring-input" id="score-${escapeAttr(quarter)}-${escapeAttr(field)}" min="0" value="${escapeAttr(value)}"
               onchange="updateScore('${escapeAttr(quarter)}', '${escapeAttr(field)}', this.value)" inputmode="numeric">
        <button class="stepper-btn stepper-plus" onclick="adjustScore('${escapeAttr(quarter)}', '${escapeAttr(field)}', 1)" aria-label="Increase">+</button>
      </div>
    </div>
  `;

  const calcQuarterTotal = (qData) => {
    const us = (qData.ourGsGoals || 0) + (qData.ourGaGoals || 0);
    const opp = (qData.oppGsGoals || 0) + (qData.oppGaGoals || 0);
    return { us, opp };
  };

  const calcGameTotal = () => {
    let us = 0, opp = 0;
    ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
      const qData = lineup[q] || {};
      us += (qData.ourGsGoals || 0) + (qData.ourGaGoals || 0);
      opp += (qData.oppGsGoals || 0) + (qData.oppGaGoals || 0);
    });
    return { us, opp };
  };

  const gameTotal = calcGameTotal();

  // Default to Q1 expanded
  const expandedQuarter = state.expandedScoringQuarter || 'Q1';

  container.innerHTML = `
    ${['Q1', 'Q2', 'Q3', 'Q4'].map((q, index) => {
      const qData = lineup[q] || {};
      const qTotal = calcQuarterTotal(qData);
      const isExpanded = q === expandedQuarter;
      return `
        <div class="scoring-quarter-header${isExpanded ? ' expanded' : ''}" data-quarter="${escapeAttr(q)}" onclick="toggleScoringQuarter('${escapeAttr(q)}')">
          <div class="quarter-header-left">
            <span class="quarter-name">${escapeHtml(q)}</span>
            <span class="quarter-score" id="qscore-${escapeAttr(q)}">${escapeHtml(qTotal.us)} : ${escapeHtml(qTotal.opp)}</span>
          </div>
          <svg class="accordion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
        <div class="scoring-quarter-content${isExpanded ? ' expanded' : ''}" data-quarter="${escapeAttr(q)}">
          <div class="scoring-team-section">
            <div class="scoring-team-label">Our Scorers</div>
            ${createPlayerScoreRow(q, 'ourGsGoals', qData.ourGsGoals || 0, 'GS', qData.GS)}
            ${createPlayerScoreRow(q, 'ourGaGoals', qData.ourGaGoals || 0, 'GA', qData.GA)}
          </div>
          <div class="scoring-team-section opponent">
            <div class="scoring-team-label">Opponent</div>
            ${createOpponentScoreRow(q, 'oppGsGoals', qData.oppGsGoals || 0, 'GS Goals')}
            ${createOpponentScoreRow(q, 'oppGaGoals', qData.oppGaGoals || 0, 'GA Goals')}
          </div>
          <div class="scoring-notes">
            <div class="notes-header">
              <label>Notes</label>
              ${!window.isReadOnlyView ? `<button type="button" class="timestamp-btn" onclick="insertTimestamp('notes-${escapeAttr(q)}')" title="Insert timestamp">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              </button>` : ''}
            </div>
            <textarea placeholder="Quarter notes..." id="notes-${escapeAttr(q)}" ${window.isReadOnlyView ? 'disabled' : ''} onchange="updateQuarterNotes('${escapeAttr(q)}', this.value)">${escapeHtml(qData.notes || '')}</textarea>
          </div>
        </div>
      `;
    }).join('')}

    <div class="scoring-autosave-indicator" id="autosave-indicator">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
      <span>Auto-saved</span>
    </div>

    <button class="btn btn-primary btn-block" onclick="finalizeGame()">
      Finalize Game
    </button>
  `;
}

window.toggleScoringQuarter = function(quarter) {
  // Toggle accordion - only one quarter open at a time
  const headers = document.querySelectorAll('.scoring-quarter-header');
  const contents = document.querySelectorAll('.scoring-quarter-content');

  headers.forEach(header => {
    const isTarget = header.dataset.quarter === quarter;
    const wasExpanded = header.classList.contains('expanded');

    if (isTarget && !wasExpanded) {
      // Expand this one
      header.classList.add('expanded');
      state.expandedScoringQuarter = quarter;
    } else {
      // Collapse
      header.classList.remove('expanded');
    }
  });

  contents.forEach(content => {
    const isTarget = content.dataset.quarter === quarter;
    const headerExpanded = document.querySelector(`.scoring-quarter-header[data-quarter="${content.dataset.quarter}"]`)?.classList.contains('expanded');

    if (isTarget && headerExpanded) {
      content.classList.add('expanded');
    } else {
      content.classList.remove('expanded');
    }
  });
};

window.updateScore = function(quarter, field, value) {
  if (!ensureNotReadOnly('updateScore')) return;
  const game = state.currentGame;
  if (!game) return;

  if (!game.lineup) game.lineup = {};
  if (!game.lineup[quarter]) game.lineup[quarter] = {};

  game.lineup[quarter][field] = parseInt(value) || 0;

  // Update quarter and total displays
  updateScoringDisplays();

  // Update the score card at the top
  renderGameScoreCard();

  // Persist to localStorage immediately, sync to API after debounce
  saveToLocalStorage();
  debouncedSync();

  // Flash auto-save indicator
  flashAutosaveIndicator();
};

window.adjustScore = function(quarter, field, delta) {
  if (!ensureNotReadOnly('adjustScore')) return;
  const game = state.currentGame;
  if (!game) return;

  if (!game.lineup) game.lineup = {};
  if (!game.lineup[quarter]) game.lineup[quarter] = {};

  const currentValue = game.lineup[quarter][field] || 0;
  const newValue = Math.max(0, currentValue + delta);
  game.lineup[quarter][field] = newValue;

  // Update the input field
  const input = document.getElementById(`score-${quarter}-${field}`);
  if (input) {
    input.value = newValue;
  }

  // Update the quarter score display
  updateScoringDisplays();

  // Update the score card at the top
  renderGameScoreCard();

  // Persist to localStorage immediately, sync to API after debounce
  saveToLocalStorage();
  debouncedSync();

  // Flash auto-save indicator
  flashAutosaveIndicator();
};

function updateScoringDisplays() {
  const game = state.currentGame;
  if (!game || !game.lineup) return;

  ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
    const qData = game.lineup[q] || {};
    const qUs = (qData.ourGsGoals || 0) + (qData.ourGaGoals || 0);
    const qOpp = (qData.oppGsGoals || 0) + (qData.oppGaGoals || 0);

    // Update quarter score
    const qScoreEl = document.getElementById(`qscore-${q}`);
    if (qScoreEl) {
      qScoreEl.textContent = `${qUs} : ${qOpp}`;
    }
  });
}

function flashAutosaveIndicator() {
  // Now handled by updateSyncIndicator via debouncedSync
  // This function kept for backwards compatibility
}

// ========================================
// QUARTER NOTES
// ========================================

window.insertTimestamp = function(textareaId) {
  const textarea = document.getElementById(textareaId);
  if (!textarea) return;

  // Format time as h:mmam/pm in Melbourne timezone
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Australia/Melbourne'
  }).toLowerCase().replace(' ', '');

  const timestamp = `[${timeStr}] `;

  // Get cursor position
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;

  // Insert timestamp at cursor, adding newline if not at start of line
  let insertText = timestamp;
  if (start > 0 && value[start - 1] !== '\n') {
    insertText = '\n' + timestamp;
  }

  // Insert the timestamp
  textarea.value = value.substring(0, start) + insertText + value.substring(end);

  // Move cursor to end of inserted timestamp
  const newPos = start + insertText.length;
  textarea.selectionStart = newPos;
  textarea.selectionEnd = newPos;
  textarea.focus();

  // Trigger the onchange to save
  textarea.dispatchEvent(new Event('change', { bubbles: true }));
};

window.updateQuarterNotes = function(quarter, value) {
  if (!ensureNotReadOnly('updateQuarterNotes')) return;
  const game = state.currentGame;
  if (!game) return;

  if (!game.lineup) game.lineup = {};
  if (!game.lineup[quarter]) game.lineup[quarter] = {};

  game.lineup[quarter].notes = value;

  // Persist to localStorage immediately, sync to API after debounce
  saveToLocalStorage();
  debouncedSync();

  // Flash auto-save indicator
  flashAutosaveIndicator();

  // Update notes panel if it's currently visible
  renderGameNotes();
};

function renderGameNotes() {
  const game = state.currentGame;
  const container = document.getElementById('notes-content');
  if (!container || !game) return;

  const lineup = game.lineup || {};

  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const hasAnyNotes = quarters.some(q => lineup[q]?.notes);

  if (!hasAnyNotes) {
    container.innerHTML = `
      <div class="notes-empty-state">
        <p>No notes yet. Add notes in the Scoring tab.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="notes-panel">
      ${quarters.map(q => {
        const qData = lineup[q] || {};
        const notes = qData.notes || '';
        return `
          <div class="quarter-notes-card">
            <div class="quarter-notes-header">${escapeHtml(q)}</div>
            <div class="quarter-notes-content ${notes ? '' : 'quarter-notes-empty'}">
              ${notes ? escapeHtml(notes) : 'No notes'}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

window.finalizeGame = async function() {
  if (!ensureNotReadOnly('finalizeGame')) return;
  const game = state.currentGame;
  if (!game || !game.lineup) return;

  let ourTotal = 0;
  let theirTotal = 0;

  ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
    const qData = game.lineup[q] || {};
    ourTotal += (qData.ourGsGoals || 0) + (qData.ourGaGoals || 0);
    theirTotal += (qData.oppGsGoals || 0) + (qData.oppGaGoals || 0);
  });

  game.scores = { us: ourTotal, opponent: theirTotal };

  // Auto-set status to 'normal' if game is in the past and has scores
  const today = new Date();
  const gameDate = game.date ? new Date(game.date) : null;
  if (gameDate && gameDate < today && (!game.status || game.status !== 'normal')) {
    game.status = 'normal';
  }

  renderGameScoreCard();

  // Recalculate stats and analytics
  state.stats = calculateTeamStats(state.currentTeamData);
  state.analytics = calculateAllAnalytics(state.currentTeamData);

  // Persist to localStorage
  saveToLocalStorage();

  // Sync to Google Sheets if using API mode and online
  if (navigator.onLine) {
    try {
      showToast('Syncing to cloud...', 'info');
      await syncToGoogleSheets();
      showToast(`Game finalized: ${ourTotal} - ${theirTotal} (synced)`, 'success');
    } catch (err) {
      console.error('[Sync] Failed to sync:', err);
      showToast(`Saved locally. Sync failed: ${err.message}`, 'warning');
    }
  } else {
    showToast(`Game finalized: ${ourTotal} - ${theirTotal}`, 'success');
  }

  // Also re-render stats if stats tab is active
  if (document.getElementById('stats-container')) {
    renderStats();
  }
};

// Backward compatibility alias
window.calculateGameTotal = window.finalizeGame;

async function syncToGoogleSheets() {
  console.log('[syncToGoogleSheets] Starting...');
  if (window.isReadOnlyView) throw new Error('Read-only view: sync/write operations are disabled');

  if (!state.currentTeamData || !state.teamSheetMap) {
    throw new Error('No team data to sync');
  }

  const teamID = state.currentTeamData.teamID;
  const sheetName = state.teamSheetMap[teamID];
  console.log('[syncToGoogleSheets] teamID:', teamID, 'sheetName:', sheetName);

  if (!sheetName) {
    throw new Error('No sheetName found for team');
  }

  // Set timestamp BEFORE sending so client and server use the same value
  const syncTimestamp = Date.now();
  state.currentTeamData._lastModified = syncTimestamp;

  // Transform data to Sheet format (now includes the new timestamp)
  const saveData = transformTeamDataToSheet(state.currentTeamData);
  console.log('[syncToGoogleSheets] saveData players:', saveData.players?.length, 'games:', saveData.games?.length);

  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
  const baseUrl = isLocalDev ? '/gas-proxy' : API_CONFIG.baseUrl;

  // Use POST for large data payloads
  // Include clientLastModified to detect stale data conflicts
  const postBody = {
    action: 'saveTeamData',
    sheetName: sheetName,
    teamData: JSON.stringify(saveData),
    clientLastModified: state.currentTeamData._lastModified || null
  };

  console.log('[syncToGoogleSheets] Using POST, body size:', JSON.stringify(postBody).length);

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' }, // Apps Script requires text/plain for CORS
    body: JSON.stringify(postBody),
    redirect: 'follow'
  });

  console.log('[syncToGoogleSheets] Response status:', response.status);
  const data = await response.json();
  console.log('[syncToGoogleSheets] Response data:', data);

  // Handle stale data conflict
  if (data.error === 'STALE_DATA') {
    console.warn('[syncToGoogleSheets] Stale data detected - server has newer version');
    showToast('Another device has updated this data. Refreshing...', 'warning');
    // Reload fresh data from server
    invalidateTeamCache(teamID);
    await loadTeamData(teamID);
    throw new Error('Data was updated by another device. Your view has been refreshed with the latest data.');
  }

  if (data.success === false) {
    throw new Error(data.error || 'Sync failed');
  }

  // Update cache with the synced data (timestamp was already set before sending)
  saveToLocalStorage();

  return data;
}

// ========================================
// DEBOUNCED SYNC FOR RAPID CHANGES
// ========================================

let syncDebounceTimer = null;
let syncInProgress = false;
let hasPendingChanges = false;

/**
 * Update the sync status indicator with current state
 * @param {'saved'|'syncing'|'synced'|'failed'} status
 */
function updateSyncIndicator(status) {
  const indicator = document.getElementById('autosave-indicator');
  if (!indicator) return;

  // Remove all state classes
  indicator.classList.remove('flash', 'syncing', 'synced', 'failed');

  const iconSpan = indicator.querySelector('svg');
  const textSpan = indicator.querySelector('span');
  if (!textSpan) return;

  switch (status) {
    case 'saved':
      // Saved locally, pending sync
      textSpan.textContent = 'Saved locally';
      indicator.classList.add('flash');
      if (iconSpan) {
        iconSpan.outerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
        </svg>`;
      }
      break;
    case 'syncing':
      textSpan.textContent = 'Syncing...';
      indicator.classList.add('syncing');
      if (iconSpan) {
        iconSpan.outerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>`;
      }
      break;
    case 'synced':
      textSpan.textContent = 'Synced';
      indicator.classList.add('synced');
      hasPendingChanges = false;
      if (iconSpan) {
        iconSpan.outerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 6L9 17l-5-5"/>
        </svg>`;
      }
      break;
    case 'failed':
      textSpan.textContent = 'Sync failed · tap to retry';
      indicator.classList.add('failed');
      indicator.onclick = () => retrySyncNow();
      if (iconSpan) {
        iconSpan.outerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>`;
      }
      break;
  }
}

/**
 * Manual retry sync triggered by tapping failed indicator
 */
async function retrySyncNow() {
  if (syncInProgress || !state.currentTeamData) return;
  await performSync(3); // 3 retries
}

/**
 * Perform sync with retry logic
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} attempt - Current attempt number (internal)
 */
async function performSync(maxRetries = 3, attempt = 1) {
  if (syncInProgress || !state.currentTeamData) return;

  syncInProgress = true;
  updateSyncIndicator('syncing');

  try {
    console.log(`[Sync] Attempt ${attempt}/${maxRetries}...`);
    await syncToGoogleSheets();
    saveToLocalStorage();
    updateSyncIndicator('synced');
    console.log('[Sync] Complete');
  } catch (e) {
    console.error(`[Sync] Attempt ${attempt} failed:`, e);

    if (attempt < maxRetries) {
      // Exponential backoff: 3s, 9s, 27s
      const delay = Math.pow(3, attempt) * 1000;
      console.log(`[Sync] Retrying in ${delay / 1000}s...`);
      syncInProgress = false;
      setTimeout(() => performSync(maxRetries, attempt + 1), delay);
    } else {
      console.error('[Sync] All retries failed');
      updateSyncIndicator('failed');
      syncInProgress = false;
    }
    return;
  }

  syncInProgress = false;
}

/**
 * Debounced sync for rapid changes (scores, lineup, availability, captain)
 * Waits 1.5s after last change before syncing to avoid hammering the API
 */
function debouncedSync() {
  clearTimeout(syncDebounceTimer);
  hasPendingChanges = true;
  updateSyncIndicator('saved');

  syncDebounceTimer = setTimeout(async () => {
    if (!state.currentTeamData || syncInProgress) return;
    await performSync(3);
  }, 1500); // Sync 1.5s after last change
}

/**
 * Update team settings (name, year, season, archived) in the backend
 */
async function updateTeamSettings(teamID, settings) {
  if (window.isReadOnlyView) throw new Error('Read-only view: updateTeamSettings is disabled');

  const sheetName = state.teamSheetMap?.[teamID];
  if (!sheetName) {
    throw new Error('No sheetName found for team');
  }

  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
  const baseUrl = isLocalDev ? '/gas-proxy' : API_CONFIG.baseUrl;

  const url = new URL(baseUrl, isLocalDev ? window.location.origin : undefined);
  url.searchParams.set('api', 'true');
  url.searchParams.set('action', 'updateTeam');
  url.searchParams.set('teamID', teamID);
  url.searchParams.set('settings', JSON.stringify(settings));

  const response = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
  const data = await response.json();

  if (data.success === false) {
    throw new Error(data.error || 'Failed to update team settings');
  }

  // Invalidate teams list cache since team settings changed
  invalidateTeamsListCache();

  return data;
}

// ========================================
// PLAYER MANAGEMENT
// ========================================

window.openPlayerDetail = function(playerID) {
  const player = state.currentTeamData.players.find(p => p.id === playerID);
  if (!player) return;

  // Calculate player stats
  const playerStats = calculatePlayerStats(player);

  // Check if player is already in library
  const teamID = state.currentTeamData.teamID;
  const isInLibrary = state.playerLibrary.players.some(lp =>
    lp.linkedInstances.some(li => li.teamID === teamID && li.playerID === playerID)
  );

  openModal(`${escapeHtml(player.name)}`, `
    <div class="player-detail-tabs">
      <button class="player-detail-tab active" onclick="switchPlayerTab('stats')">Stats</button>
      ${!window.isReadOnlyView ? `<button class="player-detail-tab" onclick="switchPlayerTab('edit')">Edit</button>` : ''}
    </div>

    <div id="player-tab-stats" class="player-tab-content active">
      <div class="player-stats-grid">
        <div class="player-stat-card">
          <span class="player-stat-value">${playerStats.gamesPlayed}</span>
          <span class="player-stat-label">Games</span>
        </div>
        <div class="player-stat-card">
          <span class="player-stat-value">${playerStats.quartersPlayed}</span>
          <span class="player-stat-label">Quarters</span>
        </div>
        <div class="player-stat-card">
          <span class="player-stat-value">${playerStats.totalGoals}</span>
          <span class="player-stat-label">Goals</span>
        </div>
        <div class="player-stat-card">
          <span class="player-stat-value">${playerStats.avgGoalsPerGame}</span>
          <span class="player-stat-label">Avg/Game</span>
        </div>
      </div>

      ${playerStats.positionBreakdown.length > 0 ? `
      <div class="player-positions-section">
        <div class="player-section-title">Positions Played</div>
        <div class="positions-breakdown">
          ${playerStats.positionBreakdown.map(p => `
            <div class="position-item">
              <span class="position-name">${escapeHtml(p.position)}</span>
              <div class="position-bar-container">
                <div class="position-bar" style="width: ${p.percentage}%"></div>
              </div>
              <span class="position-count">${p.count}</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${playerStats.recentGames.length > 0 ? `
      <div class="player-games-section">
        <div class="player-section-title">Recent Games</div>
        <div class="player-games-list">
          ${playerStats.recentGames.slice(0, 5).map(g => `
            <div class="player-game-row">
              <span class="game-round">R${g.round}</span>
              <span class="game-opponent">${escapeHtml(g.opponent)}</span>
              <span class="game-position">${escapeHtml(g.positions.join(', '))}</span>
              <span class="game-goals ${g.goals > 0 ? 'scored' : ''}">${g.goals > 0 ? g.goals + ' goals' : '-'}</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : '<div class="empty-state"><p>No game data yet</p></div>'}
    </div>

    ${!window.isReadOnlyView ? `
    <div id="player-tab-edit" class="player-tab-content">
      <div class="form-group">
        <label class="form-label">Name</label>
        <input type="text" class="form-input" id="edit-player-name" value="${escapeAttr(player.name)}">
      </div>
      <div class="form-group">
        <label class="form-label">Favourite Positions</label>
        <div class="position-checkboxes" id="edit-player-positions">
          ${['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'].map(pos => {
            const favPositions = normalizeFavPositions(player.favPosition);
            const isChecked = favPositions.includes(pos);
            return `
              <label class="position-checkbox-label">
                <input type="checkbox" class="position-checkbox" value="${escapeAttr(pos)}" ${isChecked ? 'checked' : ''}>
                <span class="position-checkbox-text">${escapeHtml(pos)}</span>
              </label>
            `;
          }).join('')}
        </div>
        <p class="text-muted" style="font-size: 0.75rem; margin-top: 4px;">Select one or more preferred positions, or leave blank for flexible</p>
      </div>
      <div class="form-group">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" id="edit-player-fillin" ${player.fillIn ? 'checked' : ''}>
          Mark as fill-in player
        </label>
      </div>
      <div class="form-group">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" id="edit-player-track-career" ${isInLibrary ? 'checked' : ''}>
          Track career stats
        </label>
        <p class="text-muted" style="font-size: 0.75rem; margin-top: 4px; margin-left: 24px;">Track this player's stats across teams and seasons</p>
      </div>
      <div class="player-edit-actions">
        <button class="btn btn-ghost" onclick="deletePlayer('${escapeAttr(playerID)}')">Delete Player</button>
        <button class="btn btn-primary" onclick="savePlayer('${escapeAttr(playerID)}')">Save Changes</button>
      </div>
    </div>
    ` : ''}
  `);
};

window.switchPlayerTab = function(tabId) {
  document.querySelectorAll('.player-detail-tab').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.toLowerCase() === tabId);
  });
  document.querySelectorAll('.player-tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `player-tab-${tabId}`);
  });
};

function calculatePlayerStats(player) {
  const games = state.currentTeamData?.games || [];
  const positions = {};
  let totalGoals = 0;
  let quartersPlayed = 0;
  let gamesPlayed = 0;
  const recentGames = [];

  games.forEach(game => {
    if (!game.lineup) return;

    let playedInGame = false;
    let gameGoals = 0;
    const gamePositions = [];

    ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
      const qData = game.lineup[q] || {};

      // Check each position
      ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'].forEach(pos => {
        if (qData[pos] === player.name) {
          playedInGame = true;
          quartersPlayed++;
          positions[pos] = (positions[pos] || 0) + 1;

          if (!gamePositions.includes(pos)) {
            gamePositions.push(pos);
          }

          // Track goals for GS/GA
          if (pos === 'GS' && qData.ourGsGoals) {
            totalGoals += qData.ourGsGoals;
            gameGoals += qData.ourGsGoals;
          }
          if (pos === 'GA' && qData.ourGaGoals) {
            totalGoals += qData.ourGaGoals;
            gameGoals += qData.ourGaGoals;
          }
        }
      });
    });

    if (playedInGame) {
      gamesPlayed++;
      recentGames.push({
        round: game.round,
        opponent: game.opponent,
        positions: gamePositions,
        goals: gameGoals
      });
    }
  });

  // Sort positions by count
  const positionBreakdown = Object.entries(positions)
    .map(([position, count]) => ({
      position,
      count,
      percentage: quartersPlayed > 0 ? Math.round((count / quartersPlayed) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count);

  return {
    gamesPlayed,
    quartersPlayed,
    totalGoals,
    avgGoalsPerGame: gamesPlayed > 0 ? (totalGoals / gamesPlayed).toFixed(1) : '0.0',
    positionBreakdown,
    recentGames: recentGames.reverse() // Most recent first
  };
}

window.savePlayer = async function(playerID) {
  if (!ensureNotReadOnly('savePlayer')) return;
  const player = state.currentTeamData.players.find(p => p.id === playerID);
  if (!player) {
    showToast('Player not found', 'error');
    closeModal();
    return;
  }

  const nameInput = document.getElementById('edit-player-name');
  const name = nameInput.value.trim();

  // Validation
  if (!name) {
    showToast('Please enter a name', 'error');
    nameInput.focus();
    return;
  }

  if (name.length < 2) {
    showToast('Name must be at least 2 characters', 'error');
    nameInput.focus();
    return;
  }

  if (name.length > 100) {
    showToast('Name is too long (max 100 characters)', 'error');
    nameInput.focus();
    return;
  }

  // Check for duplicate names (excluding current player)
  const existingPlayer = state.currentTeamData.players.find(
    p => p.id !== playerID && p.name.toLowerCase() === name.toLowerCase()
  );
  if (existingPlayer) {
    showToast('A player with this name already exists', 'error');
    nameInput.focus();
    return;
  }

  // Collect selected favourite positions
  const positionCheckboxes = document.querySelectorAll('#edit-player-positions .position-checkbox:checked');
  const selectedPositions = Array.from(positionCheckboxes).map(cb => cb.value);
  const validPositions = ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'];
  if (selectedPositions.some(pos => !validPositions.includes(pos))) {
    showToast('Invalid position selected', 'error');
    return;
  }

  player.name = name;
  player.favPosition = selectedPositions; // Now stores array
  player.fillIn = document.getElementById('edit-player-fillin').checked;

  // Handle career tracking checkbox
  const trackCareer = document.getElementById('edit-player-track-career').checked;
  const teamID = state.currentTeamData.teamID;
  const isCurrentlyTracked = state.playerLibrary.players.some(lp =>
    lp.linkedInstances.some(li => li.teamID === teamID && li.playerID === playerID)
  );

  const libraryChanged = (trackCareer && !isCurrentlyTracked) || (!trackCareer && isCurrentlyTracked);

  if (trackCareer && !isCurrentlyTracked) {
    // Add to library
    addToPlayerLibraryDirect(teamID, playerID);
  } else if (!trackCareer && isCurrentlyTracked) {
    // Remove from library
    removePlayerFromLibrary(teamID, playerID);
  }

  saveToLocalStorage();

  closeModal();
  renderRoster();

  // Sync to Google Sheets if using API mode and online
  if (navigator.onLine) {
    try {
      await syncToGoogleSheets();
      // Also sync player library if it changed
      if (libraryChanged) {
        await syncPlayerLibrary();
      }
      showToast('Player updated (synced)', 'success');
    } catch (err) {
      console.error('[Sync] Failed to sync player update:', err);
      showToast('Player updated locally. Sync failed.', 'warning');
    }
  } else {
    showToast('Player updated', 'success');
  }
};

window.deletePlayer = async function(playerID) {
  if (!ensureNotReadOnly('deletePlayer')) return;
  if (!confirm('Delete this player?')) return;

  state.currentTeamData.players = state.currentTeamData.players.filter(p => p.id !== playerID);
  saveToLocalStorage();

  closeModal();
  renderRoster();

  // Sync to Google Sheets if using API mode and online
  if (navigator.onLine) {
    try {
      await syncToGoogleSheets();
      showToast('Player deleted (synced)', 'info');
    } catch (err) {
      console.error('[Sync] Failed to sync player delete:', err);
      showToast('Player deleted locally. Sync failed.', 'warning');
    }
  } else {
    showToast('Player deleted', 'info');
  }
};

window.openAddPlayerModal = function() {
  if (!ensureNotReadOnly('openAddPlayerModal')) return;
  openModal('Add Player', `
    <div class="form-group">
      <label class="form-label">Name</label>
      <input type="text" class="form-input" id="new-player-name" placeholder="Player name" maxlength="100">
    </div>
    <div class="form-group">
      <label class="form-label">Favourite Positions</label>
      <div class="position-checkboxes" id="new-player-positions">
        ${['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'].map(pos => `
          <label class="position-checkbox-label">
            <input type="checkbox" class="position-checkbox" value="${escapeAttr(pos)}">
            <span class="position-checkbox-text">${escapeHtml(pos)}</span>
          </label>
        `).join('')}
      </div>
      <p class="text-muted" style="font-size: 0.75rem; margin-top: 4px;">Select one or more preferred positions, or leave blank for flexible</p>
    </div>
    <div class="form-group">
      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
        <input type="checkbox" id="new-player-fillin">
        Mark as fill-in player
      </label>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="addPlayer()">Add Player</button>
  `);
};

// Form validation helper
function setFieldError(input, message) {
  input.classList.add('error');
  input.classList.remove('success');

  // Remove any existing error message
  const existingError = input.parentElement.querySelector('.form-error');
  if (existingError) existingError.remove();

  // Add error message
  const errorDiv = document.createElement('div');
  errorDiv.className = 'form-error';
  errorDiv.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
    ${escapeHtml(message)}
  `;
  input.parentElement.appendChild(errorDiv);
  input.focus();
}

function clearFieldError(input) {
  input.classList.remove('error');
  const existingError = input.parentElement.querySelector('.form-error');
  if (existingError) existingError.remove();
}

function setFieldSuccess(input) {
  input.classList.remove('error');
  input.classList.add('success');
  const existingError = input.parentElement.querySelector('.form-error');
  if (existingError) existingError.remove();
}

window.addPlayer = async function() {
  if (!ensureNotReadOnly('addPlayer')) return;
  const nameInput = document.getElementById('new-player-name');
  const name = nameInput.value.trim();

  // Clear previous errors
  clearFieldError(nameInput);

  // Validation with inline feedback
  if (!name) {
    setFieldError(nameInput, 'Please enter a name');
    return;
  }

  if (name.length < 2) {
    setFieldError(nameInput, 'Name must be at least 2 characters');
    return;
  }

  if (name.length > 100) {
    setFieldError(nameInput, 'Name is too long (max 100 characters)');
    return;
  }

  // Check for duplicate names
  const existingPlayer = state.currentTeamData.players.find(
    p => p.name.toLowerCase() === name.toLowerCase()
  );
  if (existingPlayer) {
    setFieldError(nameInput, 'A player with this name already exists');
    return;
  }

  // Collect selected favourite positions
  const positionCheckboxes = document.querySelectorAll('#new-player-positions .position-checkbox:checked');
  const selectedPositions = Array.from(positionCheckboxes).map(cb => cb.value);
  const validPositions = ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'];
  if (selectedPositions.some(pos => !validPositions.includes(pos))) {
    showToast('Invalid position selected', 'error');
    return;
  }

  const newPlayer = {
    id: `p${Date.now()}`,
    name: name,
    favPosition: selectedPositions, // Now stores array
    fillIn: document.getElementById('new-player-fillin').checked
  };

  state.currentTeamData.players.push(newPlayer);
  saveToLocalStorage();

  closeModal();
  renderRoster();

  // Sync to Google Sheets if using API mode and online
  console.log('[Sync] addPlayer - online:', navigator.onLine);
  if (navigator.onLine) {
    try {
      console.log('[Sync] Calling syncToGoogleSheets...');
      await syncToGoogleSheets();
      console.log('[Sync] syncToGoogleSheets succeeded');
      showToast('Player added (synced)', 'success');
    } catch (err) {
      console.error('[Sync] Failed to sync player add:', err);
      showToast('Player added locally. Sync failed.', 'warning');
    }
  } else {
    console.log('[Sync] Skipping sync - not in API mode or offline');
    showToast('Player added', 'success');
  }
};

// ========================================
// GAME MANAGEMENT
// ========================================

window.openAddGameModal = function() {
  if (!ensureNotReadOnly('openAddGameModal')) return;
  const nextRound = (state.currentTeamData?.games?.length || 0) + 1;

  openModal('Add Game', `
    <div class="form-group">
      <label class="form-label">Round</label>
      <input type="number" class="form-input" id="new-game-round" value="${escapeAttr(nextRound)}" min="1" max="99">
    </div>
    <div class="form-group">
      <label class="form-label">Opponent</label>
      <input type="text" class="form-input" id="new-game-opponent" placeholder="Team name" maxlength="100">
    </div>
    <div class="form-group">
      <label class="form-label">Date</label>
      <input type="date" class="form-input" id="new-game-date">
    </div>
    <div class="form-group">
      <label class="form-label">Time</label>
      <input type="time" class="form-input" id="new-game-time" value="09:00">
    </div>
    <div class="form-group">
      <label class="form-label">Court</label>
      <input type="text" class="form-input" id="new-game-location" placeholder="e.g. 1 or Banyule Court 1" maxlength="50">
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="addGame()">Add Game</button>
  `);
};

window.addGame = async function() {
  if (!ensureNotReadOnly('addGame')) return;
  const opponentInput = document.getElementById('new-game-opponent');
  const opponent = opponentInput.value.trim();
  const roundInput = document.getElementById('new-game-round');
  const round = parseInt(roundInput.value);
  const dateInput = document.getElementById('new-game-date');
  const timeInput = document.getElementById('new-game-time');
  const locationInput = document.getElementById('new-game-location');

  // Validation
  if (!opponent) {
    showToast('Please enter opponent name', 'error');
    opponentInput.focus();
    return;
  }

  if (opponent.length < 2) {
    showToast('Opponent name must be at least 2 characters', 'error');
    opponentInput.focus();
    return;
  }

  if (opponent.length > 100) {
    showToast('Opponent name is too long (max 100 characters)', 'error');
    opponentInput.focus();
    return;
  }

  if (isNaN(round) || round < 1 || round > 99) {
    showToast('Round must be between 1 and 99', 'error');
    roundInput.focus();
    return;
  }

  const location = locationInput.value.trim();

  const newGame = {
    gameID: `g${Date.now()}`,
    round: round,
    opponent: opponent,
    date: dateInput.value,
    time: timeInput.value,
    location: location,
    status: 'upcoming',
    scores: null,
    availablePlayerIDs: state.currentTeamData.players.filter(p => !p.fillIn).map(p => p.id),
    lineup: null
  };

  state.currentTeamData.games.push(newGame);

  // Sort by round
  state.currentTeamData.games.sort((a, b) => a.round - b.round);

  saveToLocalStorage();

  closeModal();
  renderSchedule();
  renderMainApp();

  // Sync to Google Sheets if using API mode and online
  if (navigator.onLine) {
    try {
      await syncToGoogleSheets();
      showToast('Game added (synced)', 'success');
    } catch (err) {
      console.error('[Sync] Failed to sync game add:', err);
      showToast('Game added locally. Sync failed.', 'warning');
    }
  } else {
    showToast('Game added', 'success');
  }
};

// ========================================
// TEAM SETTINGS
// ========================================

window.openTeamSettings = function() {
  const team = state.currentTeam;
  const isArchived = team.archived || false;
  // Generate canonical parent portal link
  const slugify = (s) => (s || '').toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const slug = team.teamName && team.year && team.season
    ? [slugify(team.teamName), String(team.year), slugify(team.season)].filter(Boolean).join('-')
    : '';
  const portalUrl = slug ? `https://hgnc-gameday.pages.dev/teams/${slug}/` : '';
  openModal('Team Settings', `
    <div class="form-group">
      <label class="form-label">Team Name</label>
      <input type="text" class="form-input" id="edit-team-name" value="${escapeAttr(team.teamName)}" maxlength="100">
    </div>
    <div class="form-group">
      <label class="form-label">Year</label>
      <input type="number" class="form-input" id="edit-team-year" value="${escapeAttr(team.year)}" min="2000" max="2100">
    </div>
    <div class="form-group">
      <label class="form-label">Season</label>
      <select class="form-select" id="edit-team-season">
        ${['Season 1', 'Season 2', 'NFNL'].map(s =>
          `<option value="${escapeAttr(s)}" ${team.season === s ? 'selected' : ''}>${escapeHtml(s)}</option>`
        ).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Ladder URL <span class="form-label-desc">(optional, for NFNL ladder)</span></label>
      <input type="url" class="form-input" id="edit-team-ladder-url" maxlength="300" placeholder="https://websites.mygameday.app/..." value="${escapeAttr(team.ladderUrl || '')}">
    </div>
    <div class="form-group">
      <label class="form-label">Parent Portal Link <span class="form-label-desc">(read-only, for parents)</span></label>
      <div style="display:flex;gap:8px;align-items:center;">
        <input type="text" class="form-input" value="${portalUrl}" readonly style="flex:1;min-width:0;">
        <button class="btn btn-sm btn-outline" onclick="navigator.clipboard.writeText('${portalUrl}').then(()=>showToast('Copied!','success'))">Copy</button>
        <a class="btn btn-sm" href="${portalUrl}" target="_blank" rel="noopener">Open</a>
      </div>
    </div>
    <div class="settings-divider"></div>
    <div class="form-group">
      <label class="form-label">Data Management</label>
      <div class="data-management-buttons">
        <button type="button" class="btn btn-outline" onclick="exportTeamData()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export
        </button>
        <button type="button" class="btn btn-outline" onclick="importTeamData()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Import
        </button>
      </div>
    </div>
    <div class="settings-divider"></div>
    <div class="form-group">
      <label class="form-label">Archive</label>
      <p class="form-hint">${isArchived ? 'This team is archived. Unarchive to show it on the main page.' : 'Archive this team to hide it from the main page. Data is preserved.'}</p>
      <button type="button" class="btn ${isArchived ? 'btn-primary' : 'btn-outline'}" onclick="${isArchived ? 'unarchiveTeam' : 'archiveTeam'}()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
        </svg>
        ${isArchived ? 'Unarchive Team' : 'Archive Team'}
      </button>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveTeamSettings()">Save</button>
  `);
};

window.archiveTeam = async function() {
  const team = state.currentTeam;
  if (!team) return;

  const teamName = team.teamName;
  closeModal();
  showLoading();

  try {
    // Update local state
    team.archived = true;
    if (state.currentTeamData) state.currentTeamData.archived = true;

    // Update in teams list too
    const teamInList = state.teams.find(t => t.teamID === team.teamID);
    if (teamInList) teamInList.archived = true;

    // Save to backend
    await updateTeamSettings(team.teamID, { archived: true });

    saveToLocalStorage();
    showToast(`${teamName} archived`, 'success');

    // Go back to team selector
    showView('team-selector-view');
    renderTeamList();
  } catch (error) {
    console.error('[App] Failed to archive team:', error);
    // Revert local changes
    team.archived = false;
    if (state.currentTeamData) state.currentTeamData.archived = false;
    const teamInList = state.teams.find(t => t.teamID === team.teamID);
    if (teamInList) teamInList.archived = false;
    showToast('Failed to archive team: ' + error.message, 'error');
  } finally {
    hideLoading();
  }
};

window.unarchiveTeam = async function() {
  const team = state.currentTeam;
  if (!team) return;

  const teamName = team.teamName;
  closeModal();
  showLoading();

  try {
    // Update local state
    team.archived = false;
    if (state.currentTeamData) state.currentTeamData.archived = false;

    // Update in teams list too
    const teamInList = state.teams.find(t => t.teamID === team.teamID);
    if (teamInList) teamInList.archived = false;

    // Save to backend
    await updateTeamSettings(team.teamID, { archived: false });

    saveToLocalStorage();
    showToast(`${teamName} restored`, 'success');

    // Refresh the settings modal
    openTeamSettings();
  } catch (error) {
    console.error('[App] Failed to unarchive team:', error);
    // Revert local changes
    team.archived = true;
    if (state.currentTeamData) state.currentTeamData.archived = true;
    const teamInList = state.teams.find(t => t.teamID === team.teamID);
    if (teamInList) teamInList.archived = true;
    showToast('Failed to restore team: ' + error.message, 'error');
  } finally {
    hideLoading();
  }
};

window.saveTeamSettings = async function() {
  const nameInput = document.getElementById('edit-team-name');
  const name = nameInput.value.trim();
  const yearInput = document.getElementById('edit-team-year');
  const year = parseInt(yearInput.value);
  const season = document.getElementById('edit-team-season').value;
  const ladderUrlInput = document.getElementById('edit-team-ladder-url');
  const ladderUrl = ladderUrlInput.value.trim();

  // Validation
  if (!name) {
    showToast('Please enter a team name', 'error');
    nameInput.focus();
    return;
  }

  if (name.length < 2 || name.length > 100) {
    showToast('Team name must be 2-100 characters', 'error');
    nameInput.focus();
    return;
  }

  if (isNaN(year) || year < 2000 || year > 2100) {
    showToast('Year must be between 2000 and 2100', 'error');
    yearInput.focus();
    return;
  }

  const validSeasons = ['Season 1', 'Season 2', 'NFNL'];
  if (!validSeasons.includes(season)) {
    showToast('Invalid season selected', 'error');
    return;
  }

  // Store old values for rollback
  const oldName = state.currentTeam.teamName;
  const oldYear = state.currentTeam.year;
  const oldSeason = state.currentTeam.season;

  closeModal();
  showLoading();

  try {
    // Update local state
    state.currentTeam.teamName = name;
    state.currentTeam.year = year;
    state.currentTeam.season = season;
    state.currentTeam.ladderUrl = ladderUrl;

    // Also update in currentTeamData
    if (state.currentTeamData) {
      state.currentTeamData.teamName = name;
      state.currentTeamData.year = year;
      state.currentTeamData.season = season;
      state.currentTeamData.ladderUrl = ladderUrl;
    }

    // Update in teams list
    const teamInList = state.teams.find(t => t.teamID === state.currentTeam.teamID);
    if (teamInList) {
      teamInList.teamName = name;
      teamInList.year = year;
      teamInList.season = season;
      teamInList.ladderUrl = ladderUrl;
    }

    // Save to backend
    await updateTeamSettings(state.currentTeam.teamID, { teamName: name, year, season, ladderUrl });

    saveToLocalStorage();
    renderMainApp();
    showToast('Team updated', 'success');
  } catch (error) {
    console.error('[App] Failed to save team settings:', error);
    // Rollback
    state.currentTeam.teamName = oldName;
    state.currentTeam.year = oldYear;
    state.currentTeam.season = oldSeason;
    if (state.currentTeamData) {
      state.currentTeamData.teamName = oldName;
      state.currentTeamData.year = oldYear;
      state.currentTeamData.season = oldSeason;
    }
    showToast('Failed to save: ' + error.message, 'error');
  } finally {
    hideLoading();
  }
};

window.openGameSettings = function() {
  if (!ensureNotReadOnly('openGameSettings')) return;
  const game = state.currentGame;
  if (!game) return;

  openModal('Game Settings', `
    <div class="form-group">
      <label class="form-label">Round</label>
      <input type="number" class="form-input" id="edit-game-round" value="${escapeAttr(game.round)}" min="1" max="99">
    </div>
    <div class="form-group">
      <label class="form-label">Opponent</label>
      <input type="text" class="form-input" id="edit-game-opponent" value="${escapeAttr(game.opponent)}" maxlength="100">
    </div>
    <div class="form-group">
      <label class="form-label">Date</label>
      <input type="date" class="form-input" id="edit-game-date" value="${escapeAttr(game.date)}">
    </div>
    <div class="form-group">
      <label class="form-label">Time</label>
      <input type="time" class="form-input" id="edit-game-time" value="${escapeAttr(game.time)}">
    </div>
    <div class="form-group">
      <label class="form-label">Court</label>
      <input type="text" class="form-input" id="edit-game-location" value="${escapeAttr(game.location || '')}" placeholder="e.g. 1 or Banyule Court 1" maxlength="50">
    </div>
    <div class="form-group">
      <label class="form-label">Status</label>
      <select class="form-select" id="edit-game-status">
        <option value="upcoming" ${game.status === 'upcoming' ? 'selected' : ''}>Upcoming</option>
        <option value="normal" ${game.status === 'normal' ? 'selected' : ''}>Normal</option>
        <option value="abandoned" ${game.status === 'abandoned' ? 'selected' : ''}>Abandoned</option>
        <option value="forfeit" ${game.status === 'forfeit' ? 'selected' : ''}>Forfeit</option>
      </select>
    </div>
  `, `
    <button class="btn btn-ghost text-error" onclick="deleteGame()">Delete</button>
    <button class="btn btn-primary" onclick="saveGameSettings()">Save</button>
  `);
};

window.saveGameSettings = function() {
  const game = state.currentGame;
  if (!game) {
    showToast('Game not found', 'error');
    closeModal();
    return;
  }

  // If status is set to 'abandoned', prompt to clear unplayed quarters
  const newStatus = document.getElementById('edit-game-status').value;
  if (newStatus === 'abandoned') {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const unplayed = quarters.filter(q => !game.lineup || !game.lineup[q] || (!game.lineup[q].GS && !game.lineup[q].GA && !game.lineup[q].C));
    if (unplayed.length > 0) {
      if (confirm(`Game marked as Abandoned. Clear all data for unplayed quarters (${unplayed.join(', ')})?`)) {
        unplayed.forEach(q => { if (game.lineup) game.lineup[q] = {}; });
      }
    }
  }

  const opponentInput = document.getElementById('edit-game-opponent');
  const opponent = opponentInput.value.trim();
  const roundInput = document.getElementById('edit-game-round');
  const round = parseInt(roundInput.value);

  // Validation
  if (!opponent) {
    showToast('Please enter opponent name', 'error');
    opponentInput.focus();
    return;
  }

  if (opponent.length < 2 || opponent.length > 100) {
    showToast('Opponent name must be 2-100 characters', 'error');
    opponentInput.focus();
    return;
  }

  if (isNaN(round) || round < 1 || round > 99) {
    showToast('Round must be between 1 and 99', 'error');
    roundInput.focus();
    return;
  }

  const location = document.getElementById('edit-game-location').value.trim();

  game.round = round;
  game.opponent = opponent;
  game.date = document.getElementById('edit-game-date').value;
  game.time = document.getElementById('edit-game-time').value;
  game.location = location;
  game.status = document.getElementById('edit-game-status').value;

  saveToLocalStorage();

  closeModal();
  document.getElementById('game-detail-title').textContent = `Round ${game.round}`;
  document.getElementById('game-detail-subtitle').textContent = `vs ${game.opponent}`;
  showToast('Game updated', 'success');
};

window.deleteGame = function() {
  if (!confirm('Delete this game?')) return;

  state.currentTeamData.games = state.currentTeamData.games.filter(
    g => g.gameID !== state.currentGame.gameID
  );

  saveToLocalStorage();

  closeModal();
  closeGameDetail(); // This triggers sync to API
  showToast('Game deleted', 'info');
};

// ========================================
// HOME SEGMENT CONTROL (Teams/Players)
// ========================================

window.switchHomeSegment = function(segment) {
  // Update button states
  document.querySelectorAll('.segment-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.toLowerCase() === segment);
  });

  // Update indicator position
  const control = document.querySelector('.segment-control');
  if (control) {
    control.dataset.active = segment;
  }

  // Show/hide content
  document.getElementById('teams-segment')?.classList.toggle('active', segment === 'teams');
  document.getElementById('players-segment')?.classList.toggle('active', segment === 'players');

  // Render players content when switching to players tab
  if (segment === 'players') {
    renderPlayerLibrary();
  }
};

// ========================================
// PLAYERS (Career Stats Tracking)
// ========================================

function updateLibraryCount() {
  // No longer needed with segmented control, but keep for compatibility
}

// Current sort preference for players list
let playersSortOrder = 'recent';
const sortOptions = ['recent', 'games', 'name'];
const sortLabels = { recent: 'Recent', games: 'Games', name: 'A-Z' };

window.cyclePlayerSort = function() {
  const currentIndex = sortOptions.indexOf(playersSortOrder);
  playersSortOrder = sortOptions[(currentIndex + 1) % sortOptions.length];

  // Update button label
  const label = document.getElementById('sort-label');
  if (label) label.textContent = sortLabels[playersSortOrder];

  renderPlayerLibrary();
};

function renderPlayerLibrary() {
  const container = document.getElementById('library-player-list');
  if (!container) return;

  const players = state.playerLibrary.players;

  if (players.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">👤</div>
        <p>No players yet.</p>
        <p class="text-muted">Add players from your team rosters to track their stats across seasons.</p>
      </div>
    `;
    return;
  }

  // Calculate stats for each player
  const playersWithStats = players.map(p => ({
    ...p,
    stats: calculateLibraryPlayerStats(p)
  }));

  // Sort based on current preference
  playersWithStats.sort((a, b) => {
    switch (playersSortOrder) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'games':
        return b.stats.allTime.gamesPlayed - a.stats.allTime.gamesPlayed;
      case 'recent':
      default:
        // Sort by most recent activity date (null dates go to end)
        const dateA = a.stats.allTime.lastActivityDate;
        const dateB = b.stats.allTime.lastActivityDate;
        if (!dateA && !dateB) return a.name.localeCompare(b.name);
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB - dateA;
    }
  });

  container.innerHTML = playersWithStats.map(player => {
    const stats = player.stats;
    const primaryPosition = getPrimaryPosition(stats.allTime.positionsPlayed);
    const hasAttacking = stats.allTime.attackingQuarters > 0;
    const hasDefensive = stats.allTime.defensiveQuarters > 0;

    // Build stat line showing both if applicable
    const statParts = [];
    if (hasAttacking) {
      const avg = (stats.allTime.goalsScored / stats.allTime.attackingQuarters).toFixed(1);
      statParts.push(`${stats.allTime.goalsScored} goals (${avg}/q)`);
    }
    if (hasDefensive) {
      const avg = (stats.allTime.goalsAgainst / stats.allTime.defensiveQuarters).toFixed(1);
      statParts.push(`${stats.allTime.goalsAgainst} GA (${avg}/q)`);
    }
    if (statParts.length === 0) {
      statParts.push(`${stats.allTime.quartersPlayed} quarters played`);
    }
    const statLine = statParts.join(' · ');

    return `
      <div class="library-player-card" onclick="openLibraryPlayerDetail('${escapeAttr(player.globalId)}')">
        <div class="library-player-avatar">${escapeHtml(getInitials(player.name))}</div>
        <div class="library-player-info">
          <div class="library-player-name">${escapeHtml(player.name)}</div>
          <div class="library-player-meta">
            ${player.linkedInstances.length} season${player.linkedInstances.length !== 1 ? 's' : ''} • ${stats.allTime.gamesPlayed} games
          </div>
          <div class="library-player-stats">${statLine}</div>
          ${primaryPosition ? `<div class="library-player-position">${escapeHtml(primaryPosition)} specialist</div>` : ''}
        </div>
        <div class="library-player-arrow">→</div>
      </div>
    `;
  }).join('');
}

function calculateLibraryPlayerStats(libraryPlayer) {
  const stats = {
    allTime: {
      gamesPlayed: 0,
      quartersPlayed: 0,
      goalsScored: 0,
      goalsAgainst: 0,
      attackingQuarters: 0,
      defensiveQuarters: 0,
      positionsPlayed: {},
      lastActivityDate: null
    },
    seasons: []
  };

  const gamesSet = new Set();

  libraryPlayer.linkedInstances.forEach(instance => {
    // Check mockTeams, apiTeamCache, and current loaded team for the team data
    let team = mockTeams.find(t => t.teamID === instance.teamID);
    if (!team && apiTeamCache[instance.teamID]) {
      team = apiTeamCache[instance.teamID];
    }
    if (!team && state.currentTeamData?.teamID === instance.teamID) {
      team = state.currentTeamData;
    }
    if (!team) return;

    const player = team.players.find(p => p.id === instance.playerID);
    if (!player) return;

    const seasonStats = {
      year: instance.year || team.year,
      season: instance.season || team.season,
      teamName: instance.teamName || team.teamName,
      gamesPlayed: 0,
      quartersPlayed: 0,
      goalsScored: 0,
      goalsAgainst: 0,
      attackingQuarters: 0,
      defensiveQuarters: 0,
      positionsPlayed: {}
    };

    // Iterate through all games for this team
    team.games.forEach(game => {
      if (!game.lineup || game.status === 'bye' || game.status === 'abandoned') return;

      let playedInGame = false;

      ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
        const quarter = game.lineup[q];
        if (!quarter) return;

        // Check all positions for this player
        ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'].forEach(pos => {
          const assignedPlayer = quarter[pos];
          if (assignedPlayer === player.name || assignedPlayer === player.id) {
            playedInGame = true;
            seasonStats.quartersPlayed++;
            seasonStats.positionsPlayed[pos] = (seasonStats.positionsPlayed[pos] || 0) + 1;

            // Track goals scored for attackers (GS/GA)
            if (pos === 'GS') {
              seasonStats.goalsScored += parseInt(quarter.ourGsGoals) || 0;
              seasonStats.attackingQuarters++;
            } else if (pos === 'GA') {
              seasonStats.goalsScored += parseInt(quarter.ourGaGoals) || 0;
              seasonStats.attackingQuarters++;
            }

            // Track goals against for defenders (GK/GD)
            if (pos === 'GK' || pos === 'GD') {
              const oppGoals = (parseInt(quarter.oppGsGoals) || 0) + (parseInt(quarter.oppGaGoals) || 0);
              seasonStats.goalsAgainst += oppGoals;
              seasonStats.defensiveQuarters++;
            }
          }
        });
      });

      if (playedInGame) {
        const gameKey = `${instance.teamID}-${game.gameID}`;
        if (!gamesSet.has(gameKey)) {
          gamesSet.add(gameKey);
          seasonStats.gamesPlayed++;

          // Track most recent activity date
          if (game.date) {
            const gameDate = new Date(game.date);
            if (!stats.allTime.lastActivityDate || gameDate > stats.allTime.lastActivityDate) {
              stats.allTime.lastActivityDate = gameDate;
            }
          }
        }
      }
    });

    // Add season stats to all-time
    stats.allTime.gamesPlayed += seasonStats.gamesPlayed;
    stats.allTime.quartersPlayed += seasonStats.quartersPlayed;
    stats.allTime.goalsScored += seasonStats.goalsScored;
    stats.allTime.goalsAgainst += seasonStats.goalsAgainst;
    stats.allTime.attackingQuarters += seasonStats.attackingQuarters;
    stats.allTime.defensiveQuarters += seasonStats.defensiveQuarters;

    Object.keys(seasonStats.positionsPlayed).forEach(pos => {
      stats.allTime.positionsPlayed[pos] = (stats.allTime.positionsPlayed[pos] || 0) + seasonStats.positionsPlayed[pos];
    });

    if (seasonStats.quartersPlayed > 0) {
      stats.seasons.push(seasonStats);
    }
  });

  // Sort seasons by year/season (most recent first)
  stats.seasons.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return b.season.localeCompare(a.season);
  });

  return stats;
}

function getPrimaryPosition(positionsPlayed) {
  const entries = Object.entries(positionsPlayed);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

window.openLibraryPlayerDetail = function(globalId) {
  const player = state.playerLibrary.players.find(p => p.globalId === globalId);
  if (!player) return;

  const stats = calculateLibraryPlayerStats(player);
  const primaryPos = getPrimaryPosition(stats.allTime.positionsPlayed);
  const isAttacker = ['GS', 'GA'].includes(primaryPos);
  const isDefender = ['GK', 'GD'].includes(primaryPos);

  // Build position breakdown
  const totalQuarters = stats.allTime.quartersPlayed || 1;
  const positionBreakdown = Object.entries(stats.allTime.positionsPlayed)
    .sort((a, b) => b[1] - a[1])
    .map(([pos, count]) => ({
      pos,
      count,
      pct: Math.round((count / totalQuarters) * 100)
    }));

  // Build seasons HTML - show both offensive and defensive stats if they played those positions
  const seasonsHtml = stats.seasons.length > 0 ? stats.seasons.map((s, i) => {
    const seasonPositions = Object.keys(s.positionsPlayed).join('/');
    const seasonHasAttacking = s.attackingQuarters > 0;
    const seasonHasDefensive = s.defensiveQuarters > 0;

    // Build stat items based on what positions they played this season
    const statItems = [`${s.gamesPlayed} games`, `${s.quartersPlayed} qtrs`];

    if (seasonHasAttacking) {
      const avg = (s.goalsScored / s.attackingQuarters).toFixed(1);
      statItems.push(`${s.goalsScored} goals (${avg}/q)`);
    }
    if (seasonHasDefensive) {
      const avg = (s.goalsAgainst / s.defensiveQuarters).toFixed(1);
      statItems.push(`${s.goalsAgainst} GA (${avg}/q)`);
    }

    return `
      <div class="season-row">
        <div class="season-header">
          <span class="season-name">${escapeHtml(s.year)} ${escapeHtml(s.season)}</span>
          <span class="season-team">${escapeHtml(s.teamName)}</span>
        </div>
        <div class="season-stats">
          ${statItems.map(item => `<span>${item}</span>`).join('')}
          <span>${seasonPositions}</span>
        </div>
      </div>
    `;
  }).join('') : '<p class="text-muted">No game data yet.</p>';

  // Show offensive stats if they've played GS/GA
  const hasAttackingStats = stats.allTime.attackingQuarters > 0;
  // Show defensive stats if they've played GK/GD
  const hasDefensiveStats = stats.allTime.defensiveQuarters > 0;

  openModal(escapeHtml(player.name), `
    <div class="library-detail">
      <div class="library-detail-section">
        <div class="library-detail-title">All-Time Stats</div>
        <div class="library-stats-grid">
          <div class="library-stat">
            <span class="library-stat-value">${stats.allTime.gamesPlayed}</span>
            <span class="library-stat-label">Games</span>
          </div>
          <div class="library-stat">
            <span class="library-stat-value">${stats.allTime.quartersPlayed}</span>
            <span class="library-stat-label">Quarters</span>
          </div>
          ${hasAttackingStats ? `
          <div class="library-stat">
            <span class="library-stat-value">${stats.allTime.goalsScored}</span>
            <span class="library-stat-label">Goals Scored</span>
            <span class="library-stat-avg">${(stats.allTime.goalsScored / stats.allTime.attackingQuarters).toFixed(1)}/qtr (${stats.allTime.attackingQuarters} qtrs)</span>
          </div>
          ` : ''}
          ${hasDefensiveStats ? `
          <div class="library-stat">
            <span class="library-stat-value">${stats.allTime.goalsAgainst}</span>
            <span class="library-stat-label">Goals Against</span>
            <span class="library-stat-avg">${(stats.allTime.goalsAgainst / stats.allTime.defensiveQuarters).toFixed(1)}/qtr (${stats.allTime.defensiveQuarters} qtrs)</span>
          </div>
          ` : ''}
        </div>
        ${positionBreakdown.length > 0 ? `
        <div class="library-positions">
          ${positionBreakdown.map(p => `
            <span class="position-chip">${escapeHtml(p.pos)} <small>${p.pct}%</small></span>
          `).join('')}
        </div>
        ` : ''}
      </div>

      <div class="library-detail-section">
        <div class="library-detail-title">Season Breakdown</div>
        <div class="season-list">
          ${seasonsHtml}
        </div>
      </div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Close</button>
    <button class="btn btn-outline btn-danger" onclick="removeFromLibrary('${escapeAttr(globalId)}')">Remove from Library</button>
  `);
};

window.filterLibraryPlayers = function(query) {
  const cards = document.querySelectorAll('.library-player-card');
  const lowerQuery = query.toLowerCase();

  cards.forEach(card => {
    const name = card.querySelector('.library-player-name')?.textContent.toLowerCase() || '';
    card.style.display = name.includes(lowerQuery) ? '' : 'none';
  });
};

window.removeFromLibrary = async function(globalId) {
  if (!confirm('Remove from career tracking? This only removes them from the Players library - their stats and history in each team will not be affected.')) return;

  state.playerLibrary.players = state.playerLibrary.players.filter(p => p.globalId !== globalId);
  saveToLocalStorage();
  closeModal();
  renderPlayerLibrary();
  updateLibraryCount();

  // Sync to API
  if (navigator.onLine) {
    try {
      await syncPlayerLibrary();
      showToast('Player removed (synced)', 'info');
    } catch (err) {
      console.error('[Sync] Failed to sync player library:', err);
      showToast('Player removed locally. Sync failed.', 'warning');
    }
  } else {
    showToast('Player removed', 'info');
  }
};

// Add player to library (called from player detail modal)
window.addToPlayerLibrary = function(teamID, playerID) {
  let team = mockTeams.find(t => t.teamID === teamID);
  if (!team && apiTeamCache[teamID]) team = apiTeamCache[teamID];
  if (!team && state.currentTeamData?.teamID === teamID) team = state.currentTeamData;
  if (!team) return;

  const player = team.players.find(p => p.id === playerID);
  if (!player) return;

  // Check if already linked
  const existingLink = state.playerLibrary.players.find(lp =>
    lp.linkedInstances.some(li => li.teamID === teamID && li.playerID === playerID)
  );
  if (existingLink) {
    showToast('Player already tracked', 'info');
    return;
  }

  // Check for name matches
  const nameMatches = state.playerLibrary.players.filter(lp =>
    lp.name.toLowerCase() === player.name.toLowerCase()
  );

  if (nameMatches.length > 0) {
    // Ask to link to existing
    openLinkPlayerModal(player, team, nameMatches);
  } else {
    // Create new library entry
    createLibraryEntry(player, team);
  }
};

function openLinkPlayerModal(player, team, matches) {
  const matchesHtml = matches.map(m => `
    <div class="link-option" onclick="linkToExistingPlayer('${escapeAttr(m.globalId)}', '${escapeAttr(team.teamID)}', '${escapeAttr(player.id)}')">
      <div class="link-option-name">${escapeHtml(m.name)}</div>
      <div class="link-option-meta">${m.linkedInstances.length} season${m.linkedInstances.length !== 1 ? 's' : ''}</div>
    </div>
  `).join('');

  openModal('Link Player', `
    <p>A player named "${escapeHtml(player.name)}" already exists. Link to existing or create new?</p>
    <div class="link-options">
      ${matchesHtml}
    </div>
    <div class="link-divider">or</div>
    <button class="btn btn-outline btn-block" onclick="createLibraryEntry(null, null, '${escapeAttr(team.teamID)}', '${escapeAttr(player.id)}')">
      Create New Entry
    </button>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
  `);
}

window.linkToExistingPlayer = async function(globalId, teamID, playerID) {
  let team = mockTeams.find(t => t.teamID === teamID);
  if (!team && apiTeamCache[teamID]) team = apiTeamCache[teamID];
  if (!team && state.currentTeamData?.teamID === teamID) team = state.currentTeamData;
  const player = team?.players.find(p => p.id === playerID);
  const libraryPlayer = state.playerLibrary.players.find(p => p.globalId === globalId);

  if (!libraryPlayer || !team || !player) return;

  libraryPlayer.linkedInstances.push({
    teamID,
    playerID,
    teamName: team.teamName,
    year: team.year,
    season: team.season
  });

  saveToLocalStorage();
  closeModal();
  updateLibraryCount();

  // Sync to API
  if (navigator.onLine) {
    try {
      await syncPlayerLibrary();
      showToast(`${player.name} linked (synced)`, 'success');
    } catch (err) {
      console.error('[Sync] Failed to sync player library:', err);
      showToast(`${player.name} linked locally. Sync failed.`, 'warning');
    }
  } else {
    showToast(`${player.name} linked`, 'success');
  }
};

window.createLibraryEntry = async function(player, team, teamID, playerID) {
  // Handle being called from modal with string params
  if (!player && teamID && playerID) {
    team = mockTeams.find(t => t.teamID === teamID);
    if (!team && apiTeamCache[teamID]) team = apiTeamCache[teamID];
    if (!team && state.currentTeamData?.teamID === teamID) team = state.currentTeamData;
    player = team?.players.find(p => p.id === playerID);
  }

  if (!player || !team) return;

  const newEntry = {
    globalId: `gp_${Date.now()}`,
    name: player.name,
    linkedInstances: [{
      teamID: team.teamID,
      playerID: player.id,
      teamName: team.teamName,
      year: team.year,
      season: team.season
    }],
    createdAt: new Date().toISOString()
  };

  state.playerLibrary.players.push(newEntry);
  saveToLocalStorage();
  closeModal();
  updateLibraryCount();

  // Sync to API
  if (navigator.onLine) {
    try {
      await syncPlayerLibrary();
      showToast(`${player.name} added to Players (synced)`, 'success');
    } catch (err) {
      console.error('[Sync] Failed to sync player library:', err);
      showToast(`${player.name} added locally. Sync failed.`, 'warning');
    }
  } else {
    showToast(`${player.name} added to Players`, 'success');
  }
};

// Direct add to library (from checkbox, no modal prompts)
function addToPlayerLibraryDirect(teamID, playerID) {
  let team = mockTeams.find(t => t.teamID === teamID);
  if (!team && apiTeamCache[teamID]) team = apiTeamCache[teamID];
  if (!team && state.currentTeamData?.teamID === teamID) team = state.currentTeamData;
  if (!team) return;

  const player = team.players.find(p => p.id === playerID);
  if (!player) return;

  // Check for existing player with same name to link to
  const existingPlayer = state.playerLibrary.players.find(lp =>
    lp.name.toLowerCase() === player.name.toLowerCase()
  );

  if (existingPlayer) {
    // Link to existing
    existingPlayer.linkedInstances.push({
      teamID,
      playerID,
      teamName: team.teamName,
      year: team.year,
      season: team.season
    });
  } else {
    // Create new entry
    state.playerLibrary.players.push({
      globalId: `gp_${Date.now()}`,
      name: player.name,
      linkedInstances: [{
        teamID,
        playerID,
        teamName: team.teamName,
        year: team.year,
        season: team.season
      }],
      createdAt: new Date().toISOString()
    });
  }
}

// Remove player from library (from checkbox)
function removePlayerFromLibrary(teamID, playerID) {
  state.playerLibrary.players.forEach(lp => {
    lp.linkedInstances = lp.linkedInstances.filter(
      li => !(li.teamID === teamID && li.playerID === playerID)
    );
  });

  // Clean up any library entries with no linked instances
  state.playerLibrary.players = state.playerLibrary.players.filter(
    lp => lp.linkedInstances.length > 0
  );
}

// ========================================
// ========================================
// SYSTEM SETTINGS
// ========================================

/**
 * Show system settings view
 */
window.showSystemSettings = function() {
  showView('system-settings-view');
  renderSystemSettings();
};

/**
 * Render system settings content
 */
function renderSystemSettings() {
  const content = document.getElementById('system-settings-content');
  if (!content) return;

  // Calculate cache stats
  const teamsCached = Object.keys(apiTeamCache).length;
  const teamsListCached = teamsListCache ? 'Yes' : 'No';
  const teamsListAge = teamsListCacheTime ? formatCacheAge(teamsListCacheTime) : 'N/A';

  // Get individual team cache ages
  const teamCacheDetails = Object.keys(teamCacheMetadata).map(teamID => {
    const meta = teamCacheMetadata[teamID];
    const team = state.teams?.find(t => t.teamID === teamID);
    const name = team?.teamName || teamID;
    const year = team?.year || '';
    const season = team?.season || '';
    const subtitle = year && season ? `${year} - ${season}` : '';
    const age = meta?.cachedAt ? formatCacheAge(meta.cachedAt) : 'Unknown';
    return `<div class="settings-row">
      <span>
        <div>${escapeHtml(name)}</div>
        ${subtitle ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${escapeHtml(subtitle)}</div>` : ''}
      </span>
      <span>${age}</span>
    </div>`;
  }).join('');

  // Calculate localStorage usage
  let storageUsed = 0;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    storageUsed = data ? (data.length / 1024).toFixed(1) : 0;
  } catch (e) {}

  // Calculate last sync time from teams list cache
  const lastSyncTime = teamsListCacheTime ? formatCacheAge(teamsListCacheTime) + ' ago' : 'Never';

  content.innerHTML = `
    <div class="settings-section">
      <h3>App Info</h3>
      <div class="settings-row"><span>Version</span><span>v${__APP_VERSION__}</span></div>
      <div class="settings-row"><span>API Endpoint</span><span>${API_CONFIG.baseUrl}</span></div>
      <div class="settings-row"><span>API Status</span><span class="api-status-live">Live</span></div>
      <div class="settings-row"><span>Online</span><span>${navigator.onLine ? 'Yes' : 'No'}</span></div>
      <div class="settings-row"><span>Teams Loaded</span><span>${state.teams?.length || 0}</span></div>
      <div class="settings-row"><span>Last Sync</span><span>${lastSyncTime}</span></div>
      <div class="settings-row"><span>Last teams fetch error</span><span id="last-teams-error">${(window.lastTeamsFetchError) ? window.lastTeamsFetchError : 'None'}</span></div>
    </div>

    <div class="settings-section">
      <h3>Cache Status</h3>
      <div class="settings-row"><span>Teams List Cached</span><span>${teamsListCached}</span></div>
      <div class="settings-row"><span>Teams List Age</span><span>${teamsListAge}</span></div>
      <div class="settings-row"><span>Team Data Cached</span><span>${teamsCached} team(s)</span></div>
      <div class="settings-row"><span>Cache TTL</span><span>7 days</span></div>
    </div>

    ${teamsCached > 0 ? `
    <div class="settings-section">
      <h3>Cached Teams</h3>
      ${teamCacheDetails}
    </div>
    ` : ''}

    <div class="settings-section">
      <h3>Storage</h3>
      <div class="settings-row"><span>localStorage Used</span><span>${storageUsed} KB</span></div>
    </div>

    <div class="settings-section">
      <h3>Performance</h3>
      <div class="settings-row"><span>Page Load Time</span><span>${performance.now ? Math.round(performance.now()) + 'ms' : 'N/A'}</span></div>
      <div class="settings-row"><span>Memory Usage</span><span>${performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB' : 'N/A'}</span></div>
    </div>

    <div class="settings-section">
      <h3>Parent Portal Links</h3>
      <div class="settings-row" style="grid-template-columns: 1fr auto; font-weight: 700;">
        <span>Team</span><span>Parent Portal</span>
      </div>
      ${ (state.teams || []).filter(t => !t.archived).map(t => {
        const slugify = (s) => (s || '').toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const slug = t.teamName && t.year && t.season
          ? [slugify(t.teamName), String(t.year), slugify(t.season)].filter(Boolean).join('-')
          : '';
        const portalUrl = slug ? `https://hgnc-gameday.pages.dev/teams/${slug}/` : '';
        return `<div class="settings-row"><span>${escapeHtml(t.teamName || t.teamID)}<br><small style="color:var(--text-secondary)">${escapeHtml(t.season||'')}</small></span><span style="display:flex;gap:8px;align-items:center;">
              <input type="text" class="form-input" value="${portalUrl}" readonly style="flex:1;min-width:0;max-width:260px;">
              <button class="btn btn-sm btn-outline" onclick="navigator.clipboard.writeText('${portalUrl}').then(()=>showToast('Copied!','success'))">Copy</button>
              <a class="btn btn-sm" href="${portalUrl}" target="_blank" rel="noopener">Open</a>
            </span></div>`;
      }).join('') }
    </div>

    <div class="settings-section">
      <h3>Actions</h3>
      <button class="btn btn-secondary" onclick="clearAllCaches()" style="width: 100%; margin-bottom: 8px;">
        Clear Cache & Reload
      </button>
      <button class="btn btn-outline" onclick="forceFetchTeams()" style="width: 100%; margin-bottom: 8px;">
        Force fetch teams (bypass cache)
      </button>
      <p style="font-size: 12px; color: var(--text-secondary); text-align: center;">
        Clears cached data and forces a fresh teams fetch from the server
      </p>
    </div>
  `;
}

/**
 * Format cache age for display
 */
function formatCacheAge(isoTime) {
  const age = Date.now() - new Date(isoTime).getTime();
  const mins = Math.floor(age / (1000 * 60));
  const hours = Math.floor(age / (1000 * 60 * 60));
  const days = Math.floor(age / (1000 * 60 * 60 * 24));

  if (days > 0) return days + ' day(s) ago';
  if (hours > 0) return hours + 'h ' + (mins % 60) + 'm ago';
  return mins + ' min(s) ago';
}

/**
 * Clear all caches and reload the app
 */
window.clearAllCaches = function() {
  // Clear in-memory caches
  Object.keys(apiTeamCache).forEach(k => delete apiTeamCache[k]);
  Object.keys(teamCacheMetadata).forEach(k => delete teamCacheMetadata[k]);
  teamsListCache = null;
  teamsListCacheTime = null;

  // Save cleared state to localStorage
  saveToLocalStorage();

  showToast('Cache cleared', 'success');

  // Reload after short delay to show toast
  setTimeout(() => location.reload(), 500);
};

// Utility functions are imported from utils.js

// Export for hot module replacement
if (import.meta.hot) {
  import.meta.hot.accept();
}
