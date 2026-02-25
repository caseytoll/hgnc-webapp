// ========================================
// OPPOSITION SCOUTING HUB
// ========================================
// Accessible from: game detail "Scouting" button + lineup planner "Scout" button
// Closing returns to the originating view.

import { state } from './state.js';
import { API_CONFIG } from './config.js';
import { escapeHtml } from '../../../../common/utils.js';

let _scoutingOrigin = 'game-detail-view'; // view to return to on close

// Cache: { [cacheKey]: { aiSummary, analytics, generatedAt, opponent, round } }
// Stored on state for session persistence
function _getCacheKey(teamID, opponent, round) {
  return `opp_${teamID}_${String(opponent).toLowerCase().replace(/\s+/g, '_')}_${round}`;
}

/**
 * Open the scouting hub for state.currentGame.
 * @param {'game-detail-view'|'planner-view'} origin - view to return to on close
 */
window.openOppositionScouting = function (origin = 'game-detail-view') {
  const game = state.currentGame;
  if (!game) {
    window.showToast('No game selected', 'error');
    return;
  }
  _scoutingOrigin = origin;

  // Check session cache
  const cached = state._scoutingCache?.[_getCacheKey(state.currentTeam?.teamID, game.opponent, game.round)];

  _renderScoutingHub(game, cached || null);
  window.showView('opposition-scouting-view');
};

window.closeOppositionScouting = function () {
  window.showView(_scoutingOrigin);
};

function _renderScoutingHub(game, data) {
  const subtitle = document.getElementById('scouting-header-subtitle');
  if (subtitle) subtitle.textContent = `R${game.round || '?'} vs ${game.opponent || '?'}`;

  const content = document.getElementById('scouting-content');
  if (!content) return;

  if (!data) {
    content.innerHTML = _renderEmpty(game);
    return;
  }

  content.innerHTML = _renderFull(game, data);
}

// ----------------------------------------
// Empty state
// ----------------------------------------
function _renderEmpty(game) {
  return `
    <div class="scouting-empty">
      <div class="scouting-empty-icon">🔍</div>
      <h3>No scouting data yet</h3>
      <p>Generate AI opposition analysis for R${escapeHtml(String(game.round || '?'))} vs ${escapeHtml(game.opponent || '?')}</p>
      <div id="scouting-action-area">
        <button class="btn btn-primary" onclick="generateOppositionInsights()">
          Generate Insights (~30 sec)
        </button>
        <button class="btn btn-secondary" style="margin-top: 8px;" onclick="refreshOppositionData()">
          Refresh Data Only (fast)
        </button>
      </div>
    </div>
  `;
}

// ----------------------------------------
// Full scouting content
// ----------------------------------------
function _renderFull(game, data) {
  const generatedDate = data.generatedAt
    ? new Date(data.generatedAt).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';

  const groups = data.analytics?.groups || {};
  const groupOrder = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

  const groupSections = groupOrder
    .filter(key => groups[key] && Array.isArray(groups[key].insights) && groups[key].insights.length > 0)
    .map(key => _renderGroup(key, groups[key]))
    .join('');

  return `
    ${data.aiSummary ? `
    <div class="scouting-section">
      <div class="scouting-section-title">AI Summary</div>
      <div class="scouting-summary-card">
        ${escapeHtml(data.aiSummary)}
      </div>
    </div>
    ` : ''}

    ${groupSections || '<div class="scouting-empty"><p>No insights available</p></div>'}

    <div class="scouting-section scouting-footer">
      ${generatedDate ? `<span class="scouting-meta">Generated ${escapeHtml(generatedDate)}</span>` : ''}
      <div class="scouting-footer-actions">
        <button class="btn btn-secondary" onclick="generateOppositionInsights()">Refresh Insights</button>
        <button class="btn btn-secondary" onclick="refreshOppositionData()">Refresh Data</button>
      </div>
    </div>
  `;
}

function _renderGroup(key, group) {
  const insights = group.insights || [];
  const cards = insights.map(ins => _renderInsightCard(ins)).join('');

  return `
    <div class="scouting-section">
      <div class="scouting-section-title">
        <span class="scouting-group-label">Group ${escapeHtml(key)}</span>
        ${escapeHtml(group.label || '')}
      </div>
      <div class="scouting-insights-grid">
        ${cards}
      </div>
    </div>
  `;
}

function _renderInsightCard(ins) {
  const confidence = ins.confidence || 'low';
  const confClass = confidence === 'high' ? 'conf-high' : confidence === 'medium' ? 'conf-medium' : 'conf-low';
  return `
    <div class="scouting-insight-card">
      <div class="scouting-insight-header">
        <span class="scouting-insight-title">${escapeHtml(ins.title || '')}</span>
        <span class="scouting-insight-conf ${confClass}">${escapeHtml(confidence)}</span>
      </div>
      ${ins.metric ? `<div class="scouting-insight-metric">${escapeHtml(ins.metric)}</div>` : ''}
      <p class="scouting-insight-desc">${escapeHtml(ins.description || '')}</p>
    </div>
  `;
}

// ----------------------------------------
// API: Generate insights (full AI, ~30 sec)
// ----------------------------------------
window.generateOppositionInsights = async function () {
  const game = state.currentGame;
  if (!game || !state.currentTeam) {
    window.showToast('No game/team loaded', 'error');
    return;
  }

  const actionArea = document.getElementById('scouting-action-area');
  const content = document.getElementById('scouting-content');

  if (content) {
    content.innerHTML = `
      <div class="scouting-loading">
        <div class="spinner"></div>
        <p>Generating opposition analysis…</p>
        <p class="scouting-loading-sub">This takes ~30 seconds</p>
      </div>
    `;
  }

  try {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
    const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        api: true,
        action: 'generateOppositionInsightsImmediate',
        teamID: state.currentTeam.teamID,
        round: game.round,
        gameID: game.id || game.gameID,
      }),
      redirect: 'follow',
    });

    const data = await response.json();

    if (data.success && data.analytics) {
      const cached = {
        aiSummary: data.summary || data.analytics.summary || '',
        analytics: data.analytics,
        generatedAt: new Date().toISOString(),
        opponent: data.opponent || game.opponent,
        round: data.round || game.round,
      };
      // Store in session cache
      if (!state._scoutingCache) state._scoutingCache = {};
      state._scoutingCache[_getCacheKey(state.currentTeam.teamID, game.opponent, game.round)] = cached;

      _renderScoutingHub(game, cached);
      window.showToast('Opposition scouting ready', 'success');
    } else {
      throw new Error(data.error || 'Generation failed');
    }
  } catch (err) {
    console.error('[Opposition Scouting] Generate error:', err);
    if (content) {
      content.innerHTML = `
        <div class="scouting-empty">
          <div class="scouting-empty-icon">⚠️</div>
          <p>${escapeHtml(err.message)}</p>
          <button class="btn btn-primary" onclick="generateOppositionInsights()">Try Again</button>
        </div>
      `;
    }
  }
};

// ----------------------------------------
// API: Refresh data only (fast, ~2 sec)
// ----------------------------------------
window.refreshOppositionData = async function () {
  if (!state.currentTeam) return;

  const game = state.currentGame;
  const content = document.getElementById('scouting-content');

  if (content) {
    content.innerHTML = `
      <div class="scouting-loading">
        <div class="spinner"></div>
        <p>Refreshing fixture data…</p>
      </div>
    `;
  }

  try {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
    const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;

    const url = new URL(baseUrl, isLocalDev ? window.location.origin : undefined);
    url.searchParams.set('api', 'true');
    url.searchParams.set('action', 'refreshOppositionMatches');
    url.searchParams.set('teamID', state.currentTeam.teamID);

    const response = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
    const data = await response.json();

    if (data.success) {
      window.showToast(`Fixture data updated (${data.fixturesUpdated || 0} games)`, 'success');
      // Try to load existing scouting data after refresh
      await _tryLoadScoutingFromAPI(game);
    } else {
      throw new Error(data.error || 'Refresh failed');
    }
  } catch (err) {
    console.error('[Opposition Scouting] Refresh error:', err);
    if (content) {
      content.innerHTML = `
        <div class="scouting-empty">
          <div class="scouting-empty-icon">⚠️</div>
          <p>${escapeHtml(err.message)}</p>
          <button class="btn btn-primary" onclick="refreshOppositionData()">Try Again</button>
          <button class="btn btn-secondary" style="margin-top: 8px;" onclick="generateOppositionInsights()">Generate Insights Instead</button>
        </div>
      `;
    }
  }
};

// Try to load existing scouting data from backend for a game
async function _tryLoadScoutingFromAPI(game) {
  if (!game || !state.currentTeam) return;

  try {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
    const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;

    const url = new URL(baseUrl, isLocalDev ? window.location.origin : undefined);
    url.searchParams.set('api', 'true');
    url.searchParams.set('action', 'getOppositionScouting');
    url.searchParams.set('teamID', state.currentTeam.teamID);
    url.searchParams.set('opponent', game.opponent || '');
    url.searchParams.set('round', String(game.round || ''));

    const response = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
    const result = await response.json();

    if (result.success && result.data) {
      const d = result.data;
      const cached = {
        aiSummary: d.aiSummary || '',
        analytics: d.analytics || null,
        generatedAt: d.generatedAt || null,
        opponent: d.opponent || game.opponent,
        round: d.round || game.round,
      };
      if (!state._scoutingCache) state._scoutingCache = {};
      state._scoutingCache[_getCacheKey(state.currentTeam.teamID, game.opponent, game.round)] = cached;
      _renderScoutingHub(game, cached);
    } else {
      // No server-side data — show empty state
      _renderScoutingHub(game, null);
    }
  } catch (err) {
    console.warn('[Opposition Scouting] Load from API failed:', err.message);
    _renderScoutingHub(game, null);
  }
}

// Called from planner — opens hub with planner as origin
window.openScoutingFromPlanner = function () {
  window.openOppositionScouting('planner-view');
};
