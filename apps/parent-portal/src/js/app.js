// ========================================
// HGNC GAMEDAY - Read-only Parent Portal
// ========================================

console.log('[DEBUG] app.js loaded and executing');

// Unregister any service workers on startup for read-only portal to avoid SW intercepting API calls
if ('serviceWorker' in navigator) {
  // Prevent controllerchange reload loop by setting a flag the page can check
  window.__skipSWReload = true;
  navigator.serviceWorker.getRegistrations().then(regs => {
    if (regs.length) console.log('[SW] Found service workers, unregistering for parent portal');
    regs.forEach(r => r.unregister().then(ok => console.log('[SW] Unregistered:', r.scope, ok)));
  }).catch(err => console.warn('[SW] Error listing/unregistering service workers', err));
  // Also clear caches to remove old cached assets that may interfere
  if (window.caches) {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))).then(_ => console.log('[SW] Cleared caches'))).catch(() => {});
  }
}

import '../css/styles.css';
import { API_CONFIG, callApi } from './config.js';
import { resolveTeamParamFromLocation } from './router.js';
import { mockTeams, calculateMockStats } from '../../../../common/mock-data.js';
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
import { transformTeamDataFromSheet, transformTeamDataToSheet } from './api.js';
import html2canvas from 'html2canvas';

// ========================================
// READ-ONLY STATE MANAGEMENT
// ========================================

const state = {
  dataSource: 'api', // Always use API for parent portal
  teams: [],
  currentTeam: null,
  currentTeamData: null,
  currentGame: null,
  currentQuarter: 'Q1',
  selectedPlayer: null,
  stats: null,
  analytics: null,
  activeStatsTab: 'overview',
  readOnly: true,
  requestedTeamSlug: null
};

// ========================================
// TEAM SLUG DETECTION
// ========================================

// Check for team URL and set read-only mode
try {
  console.log('[Parent Portal] Checking pathname:', window.location.pathname);
  console.log('[Parent Portal] Full URL:', window.location.href);
  // Check for /teams/<slug>/ path
  const m = window.location.pathname.match(/^\/teams\/(?<slug>[a-z0-9\-]+)\/?$/i);
  console.log('[Parent Portal] Regex match result:', m);
  if (m && m.groups && m.groups.slug) {
    state.requestedTeamSlug = m.groups.slug.toLowerCase();
    console.log('[Parent Portal] DETECTED team slug in URL:', state.requestedTeamSlug, 'pathname:', window.location.pathname);

    // For team-specific URLs, we'll fetch data and auto-select
    state.forceTeamSelection = true;

  } else {
    console.log('[Parent Portal] No team slug detected, showing team selector');
  }
} catch (e) {
  console.warn('[Parent Portal] Slug parsing failed:', e.message || e);
}

// ========================================
// DISABLE EDITING FEATURES
// ========================================

// Override functions that would allow editing
window.isReadOnlyView = true;

// Disable all edit buttons and forms
function disableEditing() {
  // Hide all edit buttons
  const editButtons = document.querySelectorAll('[data-edit], .edit-btn, .btn-edit, button[onclick*="edit"], button[onclick*="create"], button[onclick*="add"], button[onclick*="delete"], button[onclick*="save"], button[onclick*="update"]');
  editButtons.forEach(btn => {
    btn.style.display = 'none';
  });

  // Disable all form inputs
  const inputs = document.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    input.disabled = true;
    input.readOnly = true;
  });

  // Hide admin/coach specific elements
  const adminElements = document.querySelectorAll('[data-admin], .admin-only, .coach-only, #create-parent-portal-btn, .export-btn, .import-btn');
  adminElements.forEach(el => {
    el.style.display = 'none';
  });

  // Make readonly styling more obvious
  const readonlyNotice = document.createElement('div');
  readonlyNotice.id = 'readonly-notice';
  readonlyNotice.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #7c3aed;
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 1000;
    pointer-events: none;
  `;
  readonlyNotice.textContent = 'Read-Only View';
  document.body.appendChild(readonlyNotice);
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function showView(viewId) {
  // Hide all views
  const views = document.querySelectorAll('[id$="-view"]');
  views.forEach(view => view.style.display = 'none');

  // Show the requested view
  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.style.display = 'block';
  }
}

function showLoading(show) {
  const loader = document.getElementById('loading');
  if (loader) {
    loader.style.display = show ? 'flex' : 'none';
  }
}

function showToast(message, type = 'info') {
  // Simple toast implementation
  console.log(`[TOAST ${type.toUpperCase()}]`, message);
}

// ========================================
// TEAM LOADING AND SELECTION
// ========================================

async function fetchAndRenderTeams() {
  console.log('[Parent Portal] fetchAndRenderTeams() called');
  console.log('[DEBUG] requestedTeamSlug:', state.requestedTeamSlug);
  console.log('[DEBUG] state.forceTeamSelection:', state.forceTeamSelection);

  try {
    console.log('[Teams Fetch] API_CONFIG:', API_CONFIG);
    const result = await callApi('getTeams');
    console.log('[Teams Fetch] Raw result:', result);
    // Defensive: handle both { teams: [...] } and array
    const teamsRaw = Array.isArray(result) ? result : (result.teams || []);
    console.log('[Teams Fetch] teamsRaw:', teamsRaw);
    // Store team metadata directly (don't transform - getTeams returns summaries, not full team data)
    state.teams = teamsRaw.map(t => ({
      teamID: t.teamID || t.id || t.teamId,
      teamName: t.teamName || t.name || 'Unknown Team',
      year: t.year || new Date().getFullYear(),
      season: t.season || 'Season 1',
      sheetName: t.sheetName || null
    }));
    console.log('[Teams Fetch] Teams loaded:', state.teams.length);

    // --- Auto-select team if URL contains a team slug or ID ---
    if (state.requestedTeamSlug) {
      console.log('[DEBUG] Attempting to resolve slug:', state.requestedTeamSlug);
      console.log('[DEBUG] Available teams for resolution:', state.teams.map(t => ({name: t.teamName, id: t.teamID})));
      // Try to resolve the slug to a team ID using the loaded teams
      const teamID = resolveTeamParamFromLocation(state.teams, `/teams/${state.requestedTeamSlug}`, '');
      console.log('[Parent Portal] Requested slug:', state.requestedTeamSlug);
      console.log('[Parent Portal] Resolved teamID:', teamID);

      if (teamID) {
        console.log('[Parent Portal] Auto-selecting team:', teamID, 'for slug:', state.requestedTeamSlug);
        // Show main app and select team
        showView('main-app-view');
        await window.selectTeam(teamID);
        disableEditing();
        return; // Exit early, team is selected
      } else {
        console.warn('[Parent Portal] Could not resolve team slug:', state.requestedTeamSlug);
        console.warn('[Parent Portal] Available teams:', state.teams.map(t => ({name: t.teamName, year: t.year, season: t.season, id: t.teamID})));
        showView('main-app-view');
        const mainAppView = document.getElementById('main-app-view');
        if (mainAppView) {
          mainAppView.innerHTML = '<div class="team-not-found"><h2>Team not found</h2><p>The team you are looking for does not exist or the link is incorrect.</p></div>';
        }
        showToast('Team not found', 'error');
        return;
      }
    } else {
      // If no slug, show a not found message instead of team selector
      showView('main-app-view');
      const mainAppView = document.getElementById('main-app-view');
      if (mainAppView) {
        mainAppView.innerHTML = '<div class="team-not-found"><h2>No team specified</h2><p>Please use a direct team link.</p></div>';
      }
      return;
    }
  } catch (err) {
    showToast('Failed to load teams', 'error');
    console.error('[Teams Load Error]', err);
    state.teams = [];
    renderTeamList();
  } finally {
    showLoading(false);
  }
}

function renderTeamList() {
  const container = document.getElementById('team-list');
  if (!container) return;

  if (state.teams.length === 0) {
    container.innerHTML = '<p>No teams available</p>';
    return;
  }

  container.innerHTML = `
    <h2>Select a Team</h2>
    <div class="team-grid">
      ${state.teams.map(team => `
        <div class="team-card" onclick="selectTeam('${escapeAttr(team.teamID)}')">
          <h3>${escapeHtml(team.teamName)}</h3>
          <p>${escapeHtml(team.year)} ${escapeHtml(team.season)}</p>
        </div>
      `).join('')}
    </div>
  `;
}

window.selectTeam = async function(teamID) {
  console.log('[DEBUG] selectTeam called with teamID:', teamID);

  // Wait for DOM to be ready
  if (document.readyState !== 'complete') {
    await new Promise(resolve => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', resolve);
      }
    });
  }

  const team = state.teams.find(t => t.teamID === teamID);
  if (!team) {
    console.log('[DEBUG] Team not found in list:', teamID);
    showToast('Team not found', 'error');
    return;
  }

  console.log('[DEBUG] Found team metadata:', team);
  state.currentTeam = team;

  // Fetch full team data from API
  try {
    showLoading(true);
    const result = await callApi('getTeamData', { teamID, sheetName: team.sheetName });
    console.log('[DEBUG] getTeamData result:', result);

    const rawData = result.teamData || result;
    if (!rawData) {
      showToast('Failed to load team data', 'error');
      return;
    }

    // Transform the raw data to PWA format
    state.currentTeamData = transformTeamDataFromSheet(rawData, teamID);
    console.log('[DEBUG] Transformed teamData:', state.currentTeamData);
  } catch (err) {
    console.error('[DEBUG] Error fetching team data:', err);
    showToast('Failed to load team data', 'error');
    return;
  } finally {
    showLoading(false);
  }

  if (!state.currentTeamData) {
    showToast('Failed to load team data', 'error');
    return;
  }

  // Show the main app view first
  showView('main-app-view');
  haptic(50);

  // Update header immediately
  const teamNameEl = document.getElementById('current-team-name');
  const teamSeasonEl = document.getElementById('current-team-season');
  console.log('[Parent Portal] Updating team name elements:', teamNameEl, teamSeasonEl);
  console.log('[Parent Portal] Team data:', state.currentTeamData);
  if (teamNameEl) {
    teamNameEl.textContent = state.currentTeamData.teamName || 'Unknown Team';
    console.log('[Parent Portal] Set team name to:', state.currentTeamData.teamName);
  }
  if (teamSeasonEl) {
    teamSeasonEl.textContent = `${state.currentTeamData.year || ''} ${state.currentTeamData.season || ''}`.trim();
  }

  // Render the main app content
  renderMainApp();

  // Disable editing features
  setTimeout(disableEditing, 100);
}

// ========================================
// MAIN APP RENDERING (COPIED FROM COACH APP)
// ========================================

function renderMainApp() {
  // The HTML structure is already in place, just populate the content
  renderSchedule();
  renderRoster();
  renderStats();

  // Update quick stats
  updateQuickStats();
}

function updateQuickStats() {
  const games = state.currentTeamData?.games || [];

  // Count completed games (status === 'normal' means played)
  const completedGames = games.filter(g => g.status === 'normal' && g.scores);
  const upcomingGames = games.filter(g => g.status === 'upcoming' || !g.scores);

  // Calculate wins, losses, draws
  let wins = 0, losses = 0, draws = 0;
  let goalsFor = 0, goalsAgainst = 0;

  completedGames.forEach(g => {
    if (g.scores) {
      goalsFor += g.scores.us || 0;
      goalsAgainst += g.scores.opponent || 0;
      if (g.scores.us > g.scores.opponent) wins++;
      else if (g.scores.us < g.scores.opponent) losses++;
      else draws++;
    }
  });

  const recordEl = document.getElementById('qs-record');
  const gdEl = document.getElementById('qs-gd');
  const nextEl = document.getElementById('qs-next');

  if (recordEl) recordEl.textContent = `${wins}-${losses}-${draws}`;
  if (gdEl) {
    const diff = goalsFor - goalsAgainst;
    gdEl.textContent = diff >= 0 ? `+${diff}` : `${diff}`;
  }
  if (nextEl) {
    const nextGame = upcomingGames[0];
    nextEl.textContent = nextGame ? `Round ${nextGame.round || 'TBD'}` : 'None';
  }
}

function switchTab(tabName) {
  // Update bottom nav buttons
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  // Update tab panels
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

window.switchTab = switchTab;

// ========================================
// SCHEDULE RENDERING
// ========================================

function renderSchedule() {
  const container = document.getElementById('schedule-list');
  if (!container) return;

  if (!state.currentTeamData) {
    container.innerHTML = '<p>No team data available</p>';
    return;
  }

  const games = state.currentTeamData.games || [];
  if (games.length === 0) {
    container.innerHTML = '<p>No games scheduled</p>';
    return;
  }

  container.innerHTML = games.map(game => {
    // Display score if game is completed
    const scoreDisplay = game.scores ? `<span class="score">${game.scores.us} - ${game.scores.opponent}</span>` : '';

    return `
    <div class="game-card" onclick="viewGame('${escapeAttr(game.gameID || game.round || 'unknown')}')">
      <div class="game-header">
        <span class="game-round">Round ${game.round || 'TBD'}</span>
        <span class="game-date">${formatDate(game.date) || 'TBD'}</span>
      </div>
      <div class="game-teams">
        <div class="team-info">
          <span class="team-name">${escapeHtml(state.currentTeamData.teamName)}</span>
          <span class="vs">vs</span>
          <span class="opponent">${escapeHtml(game.opponent || 'TBD')}</span>
        </div>
        ${scoreDisplay}
      </div>
      <div class="game-details">
        <span class="venue">${escapeHtml(game.location || 'TBD')}</span>
        <span class="time">${game.time || 'TBD'}</span>
      </div>
    </div>
  `;
  }).join('');
}

// ========================================
// ROSTER RENDERING
// ========================================

function renderRoster() {
  const container = document.getElementById('roster-grid');
  if (!container) return;

  if (!state.currentTeamData) {
    container.innerHTML = '<p>No team data available</p>';
    return;
  }

  const players = state.currentTeamData.players || [];
  if (players.length === 0) {
    container.innerHTML = '<p>No players in roster</p>';
    return;
  }

  container.innerHTML = players.map(player => `
    <div class="player-card">
      <div class="player-avatar">${getInitials(player.name)}</div>
      <div class="player-info">
        <div class="player-name">${escapeHtml(player.name)}</div>
        <div class="player-position">${escapeHtml(player.favPosition || 'Position TBD')}</div>
      </div>
    </div>
  `).join('');
}

// ========================================
// STATS RENDERING
// ========================================

function renderStats() {
  const container = document.getElementById('stats-container');
  if (!container) return;

  if (!state.currentTeamData) {
    container.innerHTML = '<p>No team data available</p>';
    return;
  }

  // Calculate basic stats
  const games = state.currentTeamData.games || [];
  const players = state.currentTeamData.players || [];

  const totalGames = games.length;
  const completedGames = games.filter(g => g.status === 'normal' && g.scores).length;

  container.innerHTML = `
    <div class="stats-overview">
      <div class="stat-card">
        <div class="stat-value">${totalGames}</div>
        <div class="stat-label">Total Games</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${completedGames}</div>
        <div class="stat-label">Games Played</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${players.length}</div>
        <div class="stat-label">Players</div>
      </div>
    </div>
    <p>Advanced statistics coming soon...</p>
  `;
}

window.viewGame = function(gameId) {
  // For read-only view, just show a toast or do nothing
  showToast('Game details view coming soon', 'info');
};

// ========================================
// INITIALIZATION
// ========================================

// Run on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  console.log('[Parent Portal] DOMContentLoaded fired - starting initialization');
  console.log('[Parent Portal] Current URL:', window.location.href);
  console.log('[Parent Portal] Pathname:', window.location.pathname);

  // Always fetch teams - the function will handle team selection if slug is present
  fetchAndRenderTeams();
});
