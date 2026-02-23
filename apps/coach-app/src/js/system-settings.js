// ========================================
// SYSTEM SETTINGS
// ========================================

import { API_CONFIG } from './config.js';
import { escapeHtml } from '../../../../common/utils.js';
import {
  state,
  STORAGE_KEY,
  apiTeamCache,
  teamCacheMetadata,
  teamsListCache,
  teamsListCacheTime,
  setTeamsListCache,
  invalidateTeamsListCache,
  saveToLocalStorage
} from './state.js';
import { showLoading, hideLoading } from './ui.js';

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
  } catch (e) { void e; }

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
  invalidateTeamsListCache();

  // Save cleared state to localStorage
  saveToLocalStorage();

  showToast('Cache cleared', 'success');

  // Reload after short delay to show toast
  setTimeout(() => location.reload(), 500);
};

window.forceFetchTeams = async function() {
  showLoading();
  try {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
    const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;
    const resp = await fetch(`${baseUrl}?api=true&action=getTeams`);
    if (!resp.ok) {
      const errMsg = `Server responded ${resp.status}`;
      window.lastTeamsFetchError = errMsg;
      showToast('Failed to fetch teams', 'error');
      console.warn('[ForceFetch] Failed:', errMsg);
      return;
    }
    const data = await resp.json();
    if (data && data.success === false) {
      window.lastTeamsFetchError = data.error || 'API returned failure';
      showToast('Failed to fetch teams', 'error');
      console.warn('[ForceFetch] API error:', window.lastTeamsFetchError);
      return;
    }

    const teams = (data.teams || []).map(t => ({ ...t }));
    state.teams = teams;
    state.teamSheetMap = state.teamSheetMap || {};
    state.teams.forEach(t => { state.teamSheetMap[t.teamID] = t.sheetName; });

    setTeamsListCache({ teams: state.teams, teamSheetMap: state.teamSheetMap }, new Date().toISOString());
    saveToLocalStorage();

    try { window.renderTeamList(); } catch (e) { console.warn('[ForceFetch] Failed to render', e); }
    showToast('Teams fetched', 'success');
    window.lastTeamsFetchError = null;
  } catch (err) {
    window.lastTeamsFetchError = (err && err.message) ? err.message : String(err);
    console.warn('[ForceFetch] Error:', window.lastTeamsFetchError);
    showToast('Failed to fetch teams', 'error');
  } finally {
    hideLoading();
    renderSystemSettings();
  }
};

window.deleteTeam = async function(teamID, teamName) {
  if (!confirm(`Are you sure you want to delete "${teamName}"?\n\nThis action cannot be undone and will permanently remove the team and all its data.`)) {
    return;
  }

  showLoading();
  try {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
    const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;

    const response = await fetch(`${baseUrl}?api=true&action=deleteTeam&teamID=${encodeURIComponent(teamID)}`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error(`Server responded ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Delete failed');
    }

    // Remove from local state
    state.teams = state.teams.filter(t => t.teamID !== teamID);

    // Clear any cached data for this team
    delete apiTeamCache[teamID];
    delete teamCacheMetadata[teamID];
    delete state.teamPinTokens[teamID];

    // If this was the current team, go back to team selector
    if (state.currentTeam && state.currentTeam.teamID === teamID) {
      state.currentTeam = null;
      state.currentTeamData = null;
      showView('team-selector-view');
    }

    // Update teams list cache
    setTeamsListCache({ teams: state.teams, teamSheetMap: state.teamSheetMap }, new Date().toISOString());
    saveToLocalStorage();

    window.renderTeamList();
    showToast(`Team "${teamName}" deleted`, 'success');

  } catch (error) {
    console.error('[DeleteTeam] Error:', error);
    showToast(`Failed to delete team: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
};
