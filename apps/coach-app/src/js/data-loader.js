// ========================================
// DATA LOADING, FIXTURE SYNC, & PLAYER LIBRARY
// ========================================

import { API_CONFIG } from './config.js';
import {
  state,
  apiTeamCache,
  teamCacheMetadata,
  teamsListCache,
  setTeamsListCache,
  isTeamCacheValid,
  isTeamsListCacheValid,
  updateTeamCache,
  saveToLocalStorage
} from './state.js';
import {
  escapeHtml,
  formatDate
} from '../../../../common/utils.js';
import { calculateTeamStats, mockTeams } from '../../../../common/mock-data.js';
import { calculateAllAnalytics } from '../../../../common/stats-calculations.js';
import { transformTeamDataFromSheet, setDataSource, updateStatus } from './api.js';
import { syncToGoogleSheets } from './sync.js';
import {
  showLoading,
  hideLoading,
  renderScheduleSkeleton,
  renderRosterSkeleton,
  renderStatsSkeleton
} from './ui.js';
import {
  parseFixtureConfig,
  parseSquadiConfig,
  fuzzyOpponentMatch,
  ordinalSuffix,
  getOpponentDifficulty,
  calculateStrengthOfSchedule
} from './helpers.js';

// ========================================
// DATA LOADING
// ========================================

// Helper to generate the canonical team slug (matches deploy script)
function teamSlug(team) {
  const slugify = (s) => (s || '').toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  if (!team.teamName || !team.year || !team.season) return null;
  return [slugify(team.teamName), String(team.year), slugify(team.season)].filter(Boolean).join('-');
}

export async function loadTeams(forceRefresh = false) {
  showLoading();
  console.log('[App] loadTeams() called, forceRefresh:', forceRefresh);

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
          try { sendClientMetric('background-revalidate', (teamsListCache.teams || []).length); } catch (_e) { /* noop */ }

          const baseUrl = API_CONFIG.baseUrl;
          const resp = await fetch(`${baseUrl}?api=true&action=getTeams&_t=${Date.now()}`, { redirect: 'follow' });
          if (!resp.ok) {
            console.warn('[Cache] Background revalidation fetch failed, status:', resp.status);
            try { sendClientMetric('background-revalidate-failed', resp.status, (teamsListCache.teams || []).length); } catch (_e) { /* noop */ }
            return;
          }
          const data = await resp.json();
          if (data && data.success === false) {
            console.warn('[Cache] Background revalidation server returned error:', data.error);
            try { sendClientMetric('background-revalidate-failed', 1, (teamsListCache.teams || []).length); } catch (_e) { /* noop */ }
            return;
          }
          const freshTeams = (data.teams || []).map(t => ({
            teamID: t.teamID, teamName: t.teamName, playerCount: t.playerCount, sheetName: t.sheetName,
            year: t.year, season: t.season, archived: t.archived, ladderUrl: t.ladderUrl,
            resultsApi: t.resultsApi || '',
            lastModified: t.lastModified, hasPin: t.hasPin || false, coach: t.coach || '',
            competition: t.competition || ''
          }));

          // Lightweight comparison by teamID + playerCount + name + coach + hasPin + competition
          const oldSig = JSON.stringify((teamsListCache.teams || []).map(t => ({ teamID: t.teamID, teamName: t.teamName, playerCount: t.playerCount, coach: t.coach, hasPin: t.hasPin, resultsApi: t.resultsApi, competition: t.competition })));
          const newSig = JSON.stringify(freshTeams.map(t => ({ teamID: t.teamID, teamName: t.teamName, playerCount: t.playerCount, coach: t.coach, hasPin: t.hasPin, resultsApi: t.resultsApi, competition: t.competition })));

          if (oldSig !== newSig) {
            console.log('[Cache] Teams list updated on server; refreshing UI');
            // Update state and caches
            state.teams = freshTeams.map(t => ({ ...t }));
            state.teamSheetMap = {};
            state.teams.forEach(t => { state.teamSheetMap[t.teamID] = t.sheetName; });
            setTeamsListCache({ teams: state.teams, teamSheetMap: state.teamSheetMap }, new Date().toISOString());
            saveToLocalStorage();

            try { window.renderTeamList(); } catch (e) { console.warn('[Cache] Failed to re-render team list after update', e); }
            try { if (typeof showToast === 'function') showToast('Teams updated', 'success'); } catch (e) { /* noop */ }

            try { sendClientMetric('background-revalidate-update', (state.teams || []).length); } catch (e) { /* noop */ }
          } else {
            // Refresh cache timestamp to avoid immediate revalidation
            setTeamsListCache(teamsListCache, new Date().toISOString());
            try { saveToLocalStorage(); } catch (_e) { /* noop */ }
            try { sendClientMetric('background-revalidate-hit', (teamsListCache.teams || []).length); } catch (_e) { /* noop */ }
          }
        } catch (err) {
          console.warn('[Cache] Background teams revalidation failed:', err.message || err);
          try { sendClientMetric('background-revalidate-failed', 1, (teamsListCache.teams || []).length); } catch (e) { /* noop */ }
        }
      })();

    } else {
      // Check if using mock data
      if (API_CONFIG.useMockData) {
        console.log('[App] Using mock data for teams');
        state.teamSheetMap = state.teamSheetMap || {};
        state.teams = mockTeams.map(t => {
          const teamID = t.teamID;
          const sheetName = `Mock-${teamID}`;
          state.teamSheetMap[teamID] = sheetName;
          return {
            teamID,
            teamName: t.teamName,
            playerCount: t.players ? t.players.length : 0,
            sheetName,
            year: t.year,
            season: t.season,
            archived: false,
            ladderUrl: '',
            resultsApi: '',
            lastModified: new Date().toISOString(),
            hasPin: false,
            coach: ''
          };
        });
        // Cache the teams list
        setTeamsListCache({ teams: state.teams, teamSheetMap: state.teamSheetMap }, new Date().toISOString());
        saveToLocalStorage();
        console.log('[Cache] Loaded mock teams list');
        // Send teams fetch metric
        try {
          sendClientMetric('teams-fetch', 0, (state.teams || []).length);
        } catch (e) { void e; }
        try {
          sendClientMetric('app-load', Math.round((performance && performance.now) ? performance.now() : Date.now()), (state.teams || []).length);
        } catch (e) { void e; }
        hideLoading();
        window.renderTeamList();
        return;
      }

      // Use direct API for both dev and production
      const baseUrl = API_CONFIG.baseUrl;
      // Measure teams fetch time
      const teamsFetchStart = (performance && performance.now) ? performance.now() : Date.now();
      const response = await fetch(`${baseUrl}?api=true&action=getTeams&_t=${Date.now()}`, { redirect: 'follow' });
      const teamsFetchMs = Math.round(((performance && performance.now) ? performance.now() : Date.now()) - teamsFetchStart);
      console.log('[App] Response status:', response.status, 'teamsFetchMs:', teamsFetchMs + 'ms');
      const data = await response.json();
      console.log('[App] API response:', data);
      // Quick visible metric for teams fetch
      try { console.log('[Metric] teamsFetchMs:', teamsFetchMs + 'ms'); } catch (e) { void e; }
      if (data.success === false) {
        throw new Error(data.error || 'API request failed');
      }
      // Cache sheetName mapping for later use
      state.teamSheetMap = state.teamSheetMap || {};
      state.teams = (data.teams || []).map(t => {
        state.teamSheetMap[t.teamID] = t.sheetName;
        // Ensure defaults for fields that may be missing from older API responses
        if (t.hasPin === undefined) t.hasPin = false;
        if (!t.coach) t.coach = '';
        if (!t.resultsApi) t.resultsApi = '';
        if (!t.competition) t.competition = '';
        return t;
      });

      // Cache the teams list
      setTeamsListCache({ teams: state.teams, teamSheetMap: state.teamSheetMap }, new Date().toISOString());
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
          window.renderMainApp();
        } catch (e) {
          console.warn('[App] Failed to re-render after teams update', e);
        }
      }
    }
    console.log('[App] Loaded', state.teams.length, 'teams');

    // Load player library in background (not needed for team list rendering)
    loadPlayerLibraryFromAPI().catch(err => console.warn('[App] Background player library load failed:', err.message));

    window.renderTeamList();

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
          try { showReadOnlyPill(matched.teamName); } catch (_e) { /* noop */ }
          window.selectTeam(matched.teamID);
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
    try { window.lastTeamsFetchError = (error && error.message) ? error.message : String(error); } catch (_e) { /* noop */ }

    // If we intended to use live API but it failed, gracefully fall back to
    // mock data so the UI remains usable and the console isn't spammed.
    if (!API_CONFIG.useMockData) {
      console.warn('[App] Live API unavailable — falling back to mock data');
      try { state.apiAvailable = false; } catch (_e) { /* noop */ }

      // Populate teams from mock data
      state.teamSheetMap = state.teamSheetMap || {};
      state.teams = mockTeams.map(t => {
        const teamID = t.teamID;
        const sheetName = `Mock-${teamID}`;
        state.teamSheetMap[teamID] = sheetName;
        return {
          teamID,
          teamName: t.teamName,
          playerCount: t.players ? t.players.length : 0,
          sheetName,
          year: t.year,
          season: t.season,
          archived: false,
          ladderUrl: '',
          resultsApi: '',
          lastModified: new Date().toISOString(),
          hasPin: false,
          coach: ''
        };
      });

      // Cache and render
      setTeamsListCache({ teams: state.teams, teamSheetMap: state.teamSheetMap }, new Date().toISOString());
      saveToLocalStorage();

      try { sendClientMetric('teams-fallback-to-mock', 1, (state.teams || []).length); } catch (e) { /* noop */ }
      showToast('Live API unavailable — using mock data', 'warning');
      try { window.renderTeamList(); } catch (e) { console.warn('[App] renderTeamList after fallback failed', e); }

    } else {
      try { sendClientMetric('teams-load-failed', window.lastTeamsFetchError || 'unknown'); } catch (_e) { /* noop */ }
      showToast('Failed to load teams', 'error');
    }
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
            localStorage.setItem(key, JSON.stringify(history.slice(-20)));
          } catch (e) {
            console.warn('[Metric] Failed to persist metric:', e);
          }

          // Queue via batched metric sender
          sendClientMetric('app-load', duration, state.teams.length);
        }
      }
    } catch (e) {
      console.warn('[Metric] Measurement failed:', e);
    }
  }
}
window.loadTeams = loadTeams;

// ─── Batched client metrics ───────────────────────────────────────────────────
// Metrics are queued locally and flushed as a single batchLogClientMetrics call
// after a 2-second debounce window. This replaces 16+ individual API calls per
// session with one.

let _metricQueue = [];
let _metricFlushTimer = null;

function sendClientMetric(name, value, teams) {
  // Skip metric sending when using mock data or when the API is known to be unavailable
  if (API_CONFIG.useMockData || (typeof state !== 'undefined' && state.apiAvailable === false)) {
    console.log('[Metric] Skipping metric (mock/offline):', name, value, teams);
    return;
  }

  _metricQueue.push({ name, value: value ?? '', teams: teams ?? '', extra: '' });

  // Debounce: flush 2s after the last metric is queued
  clearTimeout(_metricFlushTimer);
  _metricFlushTimer = setTimeout(flushMetrics, 2000);
}

async function flushMetrics() {
  if (_metricQueue.length === 0) return;
  const batch = _metricQueue.splice(0); // drain queue atomically

  try {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
    const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;
    const url = `${baseUrl}?api=true&action=batchLogClientMetrics&metrics=${encodeURIComponent(JSON.stringify(batch))}`;
    const resp = await fetch(url, { method: 'GET', keepalive: true });
    const data = await resp.json().catch(() => null);
    console.log(`[Metric] Flushed ${batch.length} metrics:`, batch.map(m => m.name).join(', '), data);
  } catch (err) {
    console.warn('[Metric] Batch flush failed:', err.message);
  }
}

// Flush any remaining metrics when the page is about to unload
window.addEventListener('beforeunload', () => {
  clearTimeout(_metricFlushTimer);
  if (_metricQueue.length === 0) return;
  const batch = _metricQueue.splice(0);
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
  const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;
  const url = `${baseUrl}?api=true&action=batchLogClientMetrics&metrics=${encodeURIComponent(JSON.stringify(batch))}`;
  // Use sendBeacon for unload reliability; fall back to keepalive fetch
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url);
  } else {
    fetch(url, { method: 'GET', keepalive: true }).catch(() => {});
  }
});

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

// ========================================
// FIXTURE SYNC (Squadi / GameDay)
// ========================================

// Register fixture config helpers on window for cross-module calls (imported from helpers.js)
window.parseFixtureConfig = parseFixtureConfig;
window.parseSquadiConfig = parseSquadiConfig;

/**
 * Non-blocking fixture sync. Fetches fixture data from backend and merges into team data.
 * @param {boolean} [force] - If true, bypasses the server-side 6-hour cache
 */
async function syncFixtureData(team, teamData, force) {
  if (!team || !navigator.onLine) return;
  const config = parseFixtureConfig(team.resultsApi);
  if (!config) return;

  try {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
    const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;
    const forceParam = force ? '&forceRefresh=true' : '';
    const url = `${baseUrl}?api=true&action=getFixtureData&teamID=${encodeURIComponent(team.teamID)}${forceParam}&_t=${Date.now()}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.success || !data.teamFixtures?.length) {
      return;
    }

    // Store division results for opponent scouting (memory only)
    state.divisionResults = data.divisionResults || [];

    const report = mergeFixtureData(teamData, data.teamFixtures);
    if (report.created > 0 || report.updated > 0) {
      // Recalculate stats with new games
      state.stats = calculateTeamStats(teamData);
      state.analytics = calculateAllAnalytics(teamData);
      saveToLocalStorage();
      window.renderMainApp();

      // Sync merged data to backend (non-blocking)
      syncToGoogleSheets().catch(err => {
        console.warn('[Fixture] Backend sync failed:', err.message);
      });

      const parts = [];
      if (report.created > 0) parts.push(`${report.created} new`);
      if (report.updated > 0) parts.push(`${report.updated} updated`);
      showToast(`Fixtures synced: ${parts.join(', ')}`, 'success');
    }
  } catch (err) {
    console.warn('[Fixture] Auto-sync failed:', err.message);
  }
}

/**
 * Merge fixture data into existing games array.
 * Rules:
 * - Link games to fixtures via fixtureMatchId
 * - Fill empty fields only (never overwrite non-empty)
 * - Status only upgrades from "upcoming" (manual status always wins)
 * - fixtureScore always updated for validation
 * - Never touch: scores, lineup, notes, captain, availablePlayerIDs
 */
function mergeFixtureData(teamData, teamFixtures) {
  const report = { created: 0, updated: 0, skipped: 0 };
  if (!teamData.games) teamData.games = [];

  for (const fixture of teamFixtures) {
    // 1. Find by fixtureMatchId
    let existing = teamData.games.find(g => g.fixtureMatchId === fixture.matchId);

    // 2. Fuzzy match: same round number + no fixtureMatchId set yet
    if (!existing) {
      existing = teamData.games.find(g =>
        !g.fixtureMatchId &&
        g.round == fixture.roundNum &&
        fuzzyOpponentMatch(g.opponent, fixture.opponent)
      );
    }

    if (existing) {
      let changed = false;

      // Link if not already linked
      if (!existing.fixtureMatchId) {
        existing.fixtureMatchId = fixture.matchId;
        changed = true;
      }

      // Fill empty fields only
      if (!existing.opponent || existing.opponent === 'TBD') {
        existing.opponent = fixture.opponent;
        changed = true;
      }
      if (!existing.date && fixture.date) {
        existing.date = fixture.date;
        changed = true;
      }
      if (!existing.time && fixture.time) {
        existing.time = fixture.time;
        changed = true;
      }
      if (!existing.location && fixture.venue) {
        existing.location = fixture.venue;
        changed = true;
      }

      // Status only upgrades from "upcoming"
      if (existing.status === 'upcoming' && fixture.status !== 'upcoming') {
        existing.status = fixture.status;
        changed = true;
      }

      // Always update fixture score for validation
      if (fixture.ourScore !== null && fixture.theirScore !== null) {
        const newScore = { us: fixture.ourScore, opponent: fixture.theirScore };
        if (!existing.fixtureScore ||
            existing.fixtureScore.us !== newScore.us ||
            existing.fixtureScore.opponent !== newScore.opponent) {
          existing.fixtureScore = newScore;
          changed = true;
        }
      }

      if (changed) report.updated++;
      else report.skipped++;
    } else {
      // Create new game from fixture
      teamData.games.push({
        gameID: `g${Date.now()}_${fixture.matchId}`,
        fixtureMatchId: fixture.matchId,
        round: fixture.roundNum,
        opponent: fixture.opponent,
        date: fixture.date || '',
        time: fixture.time || '',
        location: fixture.venue || '',
        status: fixture.status,
        captain: null,
        scores: null,
        fixtureScore: (fixture.ourScore !== null && fixture.theirScore !== null)
          ? { us: fixture.ourScore, opponent: fixture.theirScore }
          : null,
        availablePlayerIDs: (teamData.players || []).filter(p => !p.fillIn).map(p => p.id),
        lineup: null
      });
      report.created++;
    }
  }

  // Sort games by round number
  teamData.games.sort((a, b) => (a.round || 0) - (b.round || 0));
  return report;
}

// Register opponent difficulty helper on window for cross-module calls (imported from helpers.js)
window.getOpponentDifficulty = getOpponentDifficulty;

window.showSoSDetail = function() {
  const sos = calculateStrengthOfSchedule();
  if (!sos) return;
  openModal('Strength of Schedule', `
    <div style="margin-bottom: 12px; font-size: 13px; color: var(--text-secondary);">
      Rating: <strong>${sos.rating}/100</strong> (${sos.label}) — based on opponent ladder positions (${sos.gamesWithData} of ${sos.totalGames} games matched).
    </div>
    <div style="display: flex; flex-direction: column; gap: 2px;">
      ${sos.opponents.map(o => `
        <div class="sos-opponent-row">
          <div>
            <span class="form-badge ${o.result === 'W' ? 'win' : o.result === 'L' ? 'loss' : 'draw'}" style="width: 20px; height: 20px; font-size: 0.6rem; display: inline-flex;">${o.result}</span>
            <span style="margin-left: 6px;">${escapeHtml(o.opponent)}</span>
          </div>
          <span class="opp-rank opp-rank-${o.tier}">${o.position}${ordinalSuffix(o.position)}</span>
        </div>
      `).join('')}
    </div>
  `, '<button class="btn btn-primary" onclick="closeModal()">Close</button>');
};

// ========================================
// TEAM DATA LOADING
// ========================================

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
      // Also use cache if within TTL and no version info available
      if (apiTeamCache[teamID] && (
        (cachedLastModified && serverLastModified && serverLastModified === cachedLastModified) ||
        (!serverLastModified && isTeamCacheValid(teamID))
      )) {
        console.log('[Cache] Version match - using cached data (lastModified:', cachedLastModified, ')');
        state.currentTeamData = apiTeamCache[teamID];
      } else {
        showLoading();
        // Use proxy for local dev to bypass CORS
        const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
        const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;
        const sheetName = state.teamSheetMap?.[teamID] || '';
        console.log('[App] Fetching fresh team data (server:', serverLastModified, 'cached:', cachedLastModified, ')');
        const response = await fetch(`${baseUrl}?api=true&action=getTeamData&teamID=${teamID}&sheetName=${encodeURIComponent(sheetName)}&_t=${Date.now()}`);
        const data = await response.json();
        if (data.success === false) {
          throw new Error(data.error || 'API request failed');
        }
        // Parse teamData if it's a string (API returns JSON string)
        const teamDataObj = typeof data.teamData === 'string' ? JSON.parse(data.teamData) : data.teamData;
        // Get teamName from the teams list (needed for logo lookup)
        const teamName = serverTeam?.teamName || '';
        // Transform data from Sheet format to PWA format
        state.currentTeamData = transformTeamDataFromSheet(teamDataObj, teamID, teamName);

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

    // Auto-populate from Squadi fixtures (non-blocking)
    syncFixtureData(state.currentTeam, state.currentTeamData);

    // Pre-warm ladder cache so opponent difficulty is available immediately (non-blocking)
    try { window.prewarmLadderCache(state.currentTeam); } catch (_e) { /* rendering module may not be loaded */ }

    state.stats = calculateTeamStats(state.currentTeamData);
    state.analytics = calculateAllAnalytics(state.currentTeamData);

    window.renderMainApp();
  } catch (error) {
    console.error('[App] Failed to load team data:', error);
    showToast('Failed to load team data', 'error');
    showView('team-selector-view');
  }
}
window.loadTeamData = loadTeamData;

/**
 * Manual "Refresh Data" — force-fetches fresh fixture and ladder data for the
 * current team, bypassing server-side caches. Called from Team Settings.
 */
window.refreshTeamData = async function() {
  if (!state.currentTeam || !state.currentTeamData) {
    showToast('No team selected', 'error');
    return;
  }

  const btn = document.getElementById('btn-refresh-team-data');
  const originalText = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Refreshing…'; }

  let fixtureUpdated = false;
  let ladderUpdated = false;

  // Force-refresh fixture data
  try {
    const prevGameCount = (state.currentTeamData.games || []).length;
    await syncFixtureData(state.currentTeam, state.currentTeamData, true);
    fixtureUpdated = true;
  } catch (e) {
    console.warn('[RefreshData] Fixture refresh failed:', e.message);
  }

  // Force-refresh ladder — bypass both localStorage and server-side CacheService
  try {
    const cacheKey = `ladder.cache.${state.currentTeam.teamID}`;
    localStorage.removeItem(cacheKey);
    window.prewarmLadderCache(state.currentTeam, true); // force=true bypasses server cache
    ladderUpdated = true;
  } catch (e) {
    console.warn('[RefreshData] Ladder refresh failed:', e.message);
  }

  if (btn) { btn.disabled = false; btn.textContent = originalText; }

  const parts = [];
  if (fixtureUpdated) parts.push('fixtures');
  if (ladderUpdated) parts.push('ladder');
  if (parts.length > 0) {
    showToast(`Refreshed ${parts.join(' & ')}`, 'success');
  } else {
    showToast('Refresh failed', 'error');
  }
};

// ========================================
// PLAYER LIBRARY API SYNC
// ========================================

/**
 * Load player library from API (called after loadTeams for API mode)
 */
async function loadPlayerLibraryFromAPI() {
  try {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
    const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;

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
export async function syncPlayerLibrary() {
  if (!navigator.onLine) return;

  try {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
    const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;

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
window.syncPlayerLibrary = syncPlayerLibrary;
