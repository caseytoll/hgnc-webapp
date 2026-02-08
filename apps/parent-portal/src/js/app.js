// ========================================
// HGNC GAMEDAY - Read-only Parent Portal
// ========================================

console.log('[DEBUG] app.js loaded and executing - v2025-02-01h');

// Unregister any service workers on startup for read-only portal to avoid SW intercepting API calls
if ('serviceWorker' in navigator) {
  window.__skipSWReload = true;
  navigator.serviceWorker.getRegistrations().then(regs => {
    if (regs.length) console.log('[SW] Found service workers, unregistering for parent portal');
    regs.forEach(r => r.unregister().then(ok => console.log('[SW] Unregistered:', r.scope, ok)));
  }).catch(err => console.warn('[SW] Error listing/unregistering service workers', err));
  if (window.caches) {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))).then(_ => console.log('[SW] Cleared caches'))).catch(() => {});
  }
}

import '../css/styles.css';
import { API_CONFIG, callApi } from './config.js';
import { resolveTeamParamFromLocation } from './router.js';
import { mockTeams, calculateTeamStats } from '../../../../common/mock-data.js';
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
  getInitials,
  isGameInPast
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
  dataSource: 'api',
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
  requestedTeamSlug: null,
  leadersTableState: {
    expanded: {},
    sort: {
      scorers: { column: 'goals', ascending: false },
      defenders: { column: 'avg', ascending: true },
      goalingPairs: { column: 'avg', ascending: false },
      defendingPairs: { column: 'avg', ascending: true }
    }
  }
};

// ========================================
// TEAM SLUG DETECTION
// ========================================

try {
  console.log('[Parent Portal] Checking pathname:', window.location.pathname);
  const m = window.location.pathname.match(/^\/teams\/(?<slug>[a-z0-9\-]+)\/?$/i);
  if (m && m.groups && m.groups.slug) {
    state.requestedTeamSlug = m.groups.slug.toLowerCase();
    console.log('[Parent Portal] DETECTED team slug in URL:', state.requestedTeamSlug);
    state.forceTeamSelection = true;
  }
} catch (e) {
  console.warn('[Parent Portal] Slug parsing failed:', e.message || e);
}

// ========================================
// DISABLE EDITING FEATURES
// ========================================

window.isReadOnlyView = true;

function disableEditing() {
  const editButtons = document.querySelectorAll('[data-edit], .edit-btn, .btn-edit, button[onclick*="edit"], button[onclick*="create"], button[onclick*="add"], button[onclick*="delete"], button[onclick*="save"], button[onclick*="update"]');
  editButtons.forEach(btn => btn.style.display = 'none');

  const inputs = document.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    input.disabled = true;
    input.readOnly = true;
  });

  const adminElements = document.querySelectorAll('[data-admin], .admin-only, .coach-only, #create-parent-portal-btn, .export-btn, .import-btn');
  adminElements.forEach(el => el.style.display = 'none');

  // Add read-only notice if not already present
  if (!document.getElementById('readonly-notice')) {
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
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function showView(viewId) {
  const views = document.querySelectorAll('[id$="-view"]');
  views.forEach(view => view.style.display = 'none');

  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.style.display = 'block';
  }
}

function showLoading(show) {
  const loader = document.getElementById('loading-overlay');
  if (loader) {
    loader.classList.toggle('hidden', !show);
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) {
    console.log(`[TOAST ${type.toUpperCase()}]`, message);
    return;
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ========================================
// TEAM LOADING AND SELECTION
// ========================================

async function fetchAndRenderTeams() {
  console.log('[Parent Portal] fetchAndRenderTeams() called');

  try {
    const result = await callApi('getTeams');
    const teamsRaw = Array.isArray(result) ? result : (result.teams || []);

    state.teams = teamsRaw.map(t => ({
      teamID: t.teamID || t.id || t.teamId,
      teamName: t.teamName || t.name || 'Unknown Team',
      year: t.year || new Date().getFullYear(),
      season: t.season || 'Season 1',
      sheetName: t.sheetName || null
    }));
    console.log('[Teams Fetch] Teams loaded:', state.teams.length);

    if (state.requestedTeamSlug) {
      const teamID = resolveTeamParamFromLocation(state.teams, `/teams/${state.requestedTeamSlug}`, '');

      if (teamID) {
        console.log('[Parent Portal] Auto-selecting team:', teamID);
        showView('main-app-view');
        await window.selectTeam(teamID);
        disableEditing();
        return;
      } else {
        console.warn('[Parent Portal] Could not resolve team slug:', state.requestedTeamSlug);
        showView('main-app-view');
        const mainAppView = document.getElementById('main-app-view');
        if (mainAppView) {
          mainAppView.innerHTML = '<div class="team-not-found"><h2>Team not found</h2><p>The team you are looking for does not exist or the link is incorrect.</p></div>';
        }
        showToast('Team not found', 'error');
        return;
      }
    } else {
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
  } finally {
    showLoading(false);
  }
}

window.selectTeam = async function(teamID) {
  console.log('[DEBUG] selectTeam called with teamID:', teamID);

  if (document.readyState !== 'complete') {
    await new Promise(resolve => {
      if (document.readyState === 'complete') resolve();
      else window.addEventListener('load', resolve);
    });
  }

  const team = state.teams.find(t => t.teamID === teamID);
  if (!team) {
    showToast('Team not found', 'error');
    return;
  }

  state.currentTeam = team;

  try {
    showLoading(true);
    const result = await callApi('getTeamData', { teamID, sheetName: team.sheetName });

    const rawData = result.teamData || result;
    if (!rawData) {
      showToast('Failed to load team data', 'error');
      return;
    }

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

  // Calculate analytics
  state.stats = calculateTeamStats(state.currentTeamData);
  state.analytics = calculateAllAnalytics(state.currentTeamData);

  showView('main-app-view');
  haptic(50);

  const teamNameEl = document.getElementById('current-team-name');
  const teamSeasonEl = document.getElementById('current-team-season');
  // Use team info from getTeams (state.currentTeam), not getTeamData which doesn't include these fields
  if (teamNameEl) teamNameEl.textContent = state.currentTeam.teamName || state.currentTeamData.teamName || 'Unknown Team';
  if (teamSeasonEl) teamSeasonEl.textContent = `${state.currentTeam.year || state.currentTeamData.year || ''} ${state.currentTeam.season || state.currentTeamData.season || ''}`.trim();

  renderMainApp();
  setTimeout(disableEditing, 100);
};

// ========================================
// MAIN APP RENDERING
// ========================================

function renderMainApp() {
  renderSchedule();
  renderRoster();
  renderStats();
  updateQuickStats();
}

function updateQuickStats() {
  const games = state.currentTeamData?.games || [];
  const completedGames = games.filter(g => g.status === 'normal' && g.scores && isGameInPast(g));
  const upcomingGames = games.filter(g => g.status !== 'bye' && g.status !== 'abandoned' && (g.status === 'upcoming' || !g.scores || !isGameInPast(g)));

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
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
  document.getElementById(`tab-${tabName}`)?.classList.add('active');
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
    container.innerHTML = '<div class="empty-state"><p>No games scheduled</p></div>';
    return;
  }

  // Sort games by date descending (newest first)
  const sortedGames = [...games].sort((a, b) => {
    const dateA = a.date ? new Date(a.date) : new Date(0);
    const dateB = b.date ? new Date(b.date) : new Date(0);
    return dateB - dateA;
  });

  container.innerHTML = sortedGames.map(game => {
    let resultClass = '';
    let scoreDisplay = '';

    if (game.status === 'abandoned') {
      scoreDisplay = `<div class="game-score-label">Abandoned</div>`;
      resultClass = 'abandoned';
    } else if (game.status === 'bye') {
      scoreDisplay = `<div class="game-score-label">Bye</div>`;
      resultClass = 'bye';
    } else if (game.scores) {
      const { us, opponent } = game.scores;
      if (us > opponent) resultClass = 'win';
      else if (us < opponent) resultClass = 'loss';
      else if (us === opponent && (us > 0 || opponent > 0)) resultClass = 'draw';
      scoreDisplay = `<div class="game-score-value">${escapeHtml(us)} - ${escapeHtml(opponent)}</div>`;
    } else {
      scoreDisplay = `<div class="game-score-label">Upcoming</div>`;
    }

    return `
      <div class="game-item ${resultClass}" onclick="openGameDetail('${escapeAttr(game.gameID)}')">
        <div class="game-round">R${escapeHtml(game.round)}</div>
        <div class="game-info">
          <div class="game-opponent">vs ${escapeHtml(game.opponent || 'TBD')}</div>
          <div class="game-meta">${escapeHtml(formatDate(game.date) || 'TBD')} • ${escapeHtml(game.time || '')} • ${escapeHtml(game.location || '')}</div>
        </div>
        <div class="game-score">
          ${scoreDisplay}
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
    container.innerHTML = '<div class="empty-state"><p>No players in roster</p></div>';
    return;
  }

  container.innerHTML = players.map(player => `
    <div class="player-card" onclick="openPlayerDetail('${escapeAttr(player.id)}')">
      <div class="player-avatar">${getInitials(player.name)}</div>
      <div class="player-info">
        <div class="player-name">${escapeHtml(player.name)}</div>
        <div class="player-position">${escapeHtml(player.favPosition || '')}</div>
      </div>
      ${player.fillIn ? '<span class="fill-in-badge">Fill-in</span>' : ''}
    </div>
  `).join('');
}

// ========================================
// MODAL FUNCTIONS
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

// ========================================
// PLAYER STATS
// ========================================

function calculatePlayerStats(player) {
  const games = state.currentTeamData?.games || [];
  const positions = {};
  let totalGoals = 0;
  let quartersPlayed = 0;
  let gamesPlayed = 0;
  let offQuarters = 0;
  let captainCount = 0;
  const recentGames = [];

  games.forEach(game => {
    if (!game.lineup) return;

    let playedInGame = false;
    let gameGoals = 0;
    let quartersOnCourt = 0;
    const gamePositions = [];

    ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
      const qData = game.lineup[q] || {};

      // Check each position
      ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'].forEach(pos => {
        if (qData[pos] === player.name) {
          playedInGame = true;
          quartersPlayed++;
          quartersOnCourt++;
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
      offQuarters += (4 - quartersOnCourt);
      recentGames.push({
        round: game.round,
        opponent: game.opponent,
        positions: gamePositions,
        goals: gameGoals
      });
    }

    if (game.captain === player.name) {
      captainCount++;
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
    offQuarters,
    captainCount,
    totalGoals,
    avgGoalsPerGame: gamesPlayed > 0 ? (totalGoals / gamesPlayed).toFixed(1) : '0.0',
    positionBreakdown,
    recentGames: recentGames.reverse() // Most recent first
  };
}

window.openPlayerDetail = function(playerID) {
  const player = state.currentTeamData.players.find(p => p.id === playerID);
  if (!player) return;

  const playerStats = calculatePlayerStats(player);

  openModal(escapeHtml(player.name), `
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
        <span class="player-stat-value">${playerStats.offQuarters}</span>
        <span class="player-stat-label">Off</span>
      </div>
      <div class="player-stat-card">
        <span class="player-stat-value">${playerStats.totalGoals}</span>
        <span class="player-stat-label">Goals</span>
      </div>
      <div class="player-stat-card">
        <span class="player-stat-value">${playerStats.avgGoalsPerGame}</span>
        <span class="player-stat-label">Avg/Game</span>
      </div>
      <div class="player-stat-card">
        <span class="player-stat-value">${playerStats.captainCount}</span>
        <span class="player-stat-label">Captain</span>
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
      <div class="player-section-title">Games This Season</div>
      <div class="player-games-list">
        ${playerStats.recentGames.map(g => `
          <div class="player-game-row">
            <span class="game-round">R${g.round}</span>
            <span class="game-opponent">vs ${escapeHtml(g.opponent)}</span>
            <span class="game-position">${g.positions.join(', ')}</span>
            <span class="game-goals ${g.goals > 0 ? 'scored' : ''}">${g.goals > 0 ? g.goals + ' goals' : '-'}</span>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
  `);

  haptic(50);
};

// ========================================
// GAME DETAIL VIEW
// ========================================

window.openGameDetail = function(gameID) {
  const game = state.currentTeamData.games.find(g => g.gameID === gameID);
  if (!game) {
    showToast('Game not found', 'error');
    return;
  }

  state.currentGame = game;
  state.currentQuarter = 'Q1';

  document.getElementById('game-detail-title').textContent = `Round ${game.round}`;
  document.getElementById('game-detail-subtitle').textContent = `vs ${game.opponent}`;

  renderGameScoreCard();
  renderLineupDisplay();
  renderScoringDisplay();

  showView('game-detail-view');
  haptic(50);
};

window.closeGameDetail = function() {
  state.currentGame = null;
  showView('main-app-view');
};

function renderGameScoreCard() {
  const game = state.currentGame;
  const container = document.getElementById('game-score-card');
  if (!container) return;

  let us = 0, opponent = 0;
  let hasScores = false;

  if (game.lineup) {
    ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
      const qData = game.lineup[q] || {};
      us += (qData.ourGsGoals || 0) + (qData.ourGaGoals || 0);
      opponent += (qData.oppGsGoals || 0) + (qData.oppGaGoals || 0);
      if (qData.ourGsGoals || qData.ourGaGoals || qData.oppGsGoals || qData.oppGaGoals) {
        hasScores = true;
      }
    });
  }

  if (!hasScores && game.scores) {
    us = game.scores.us || 0;
    opponent = game.scores.opponent || 0;
    hasScores = us > 0 || opponent > 0;
  }

  if (!hasScores) {
    container.innerHTML = `
      <div class="game-result-badge upcoming">Upcoming</div>
      <div style="margin-top: 16px; color: var(--text-secondary);">
        ${escapeHtml(formatDate(game.date) || 'Date TBD')} at ${escapeHtml(game.time || 'Time TBD')}<br>
        ${escapeHtml(game.location || 'Location TBD')}
      </div>
    `;
    const shareActions = document.getElementById('share-actions');
    if (shareActions) shareActions.style.display = 'none';
    return;
  }

  let resultClass = 'draw', resultText = 'Draw';
  if (us > opponent) { resultClass = 'win'; resultText = 'Win'; }
  if (us < opponent) { resultClass = 'loss'; resultText = 'Loss'; }

  container.innerHTML = `
    <div class="game-score-display">
      <div class="score-team">
        <div class="score-label">Us</div>
        <div class="score-value">${us}</div>
      </div>
      <div class="score-divider">-</div>
      <div class="score-team">
        <div class="score-label">${escapeHtml(game.opponent)}</div>
        <div class="score-value">${opponent}</div>
      </div>
    </div>
    <div class="game-result-badge ${resultClass}">${resultText}</div>
  `;

  const shareActions = document.getElementById('share-actions');
  if (shareActions) shareActions.style.display = 'flex';
}

function renderLineupDisplay() {
  const game = state.currentGame;
  const container = document.getElementById('lineup-display');
  if (!container) return;

  if (!game.lineup) {
    container.innerHTML = '<div class="empty-state"><p>No lineup entered yet</p></div>';
    return;
  }

  const lineup = game.lineup;

  container.innerHTML = `
    <div class="lineup-quarter-tabs">
      ${['Q1', 'Q2', 'Q3', 'Q4'].map(q => `
        <button class="quarter-tab ${q === state.currentQuarter ? 'active' : ''}"
                onclick="selectQuarter('${escapeAttr(q)}')">${q}</button>
      `).join('')}
    </div>
    <div class="lineup-court readonly">
      ${renderQuarterLineup(lineup[state.currentQuarter] || {})}
    </div>
  `;
}

function renderQuarterLineup(quarterData) {
  const renderSlot = (position, playerName) => {
    const filled = playerName && playerName.length > 0;
    const isCaptain = filled && state.currentGame?.captain === playerName;
    return `
      <div class="position-slot ${filled ? 'filled' : 'empty'}">
        <div class="position-label">${position}</div>
        ${filled
          ? `<div class="position-player">${escapeHtml(playerName)}${isCaptain ? '<span class="captain-badge">C</span>' : ''}</div>`
          : '<div class="position-empty">-</div>'
        }
      </div>
    `;
  };

  return `
    <div class="court-section">
      <div class="court-section-label">Shooters</div>
      <div class="court-positions">
        ${renderSlot('GS', quarterData.GS)}
        ${renderSlot('GA', quarterData.GA)}
      </div>
    </div>
    <div class="court-section">
      <div class="court-section-label">Mid Court</div>
      <div class="court-positions">
        ${renderSlot('WA', quarterData.WA)}
        ${renderSlot('C', quarterData.C)}
        ${renderSlot('WD', quarterData.WD)}
      </div>
    </div>
    <div class="court-section">
      <div class="court-section-label">Defenders</div>
      <div class="court-positions">
        ${renderSlot('GD', quarterData.GD)}
        ${renderSlot('GK', quarterData.GK)}
      </div>
    </div>
  `;
}

window.selectQuarter = function(quarter) {
  state.currentQuarter = quarter;
  renderLineupDisplay();
};

function renderScoringDisplay() {
  const game = state.currentGame;
  const container = document.getElementById('scoring-display');
  if (!container) return;

  if (!game.lineup) {
    container.innerHTML = '<div class="empty-state"><p>No scoring data yet</p></div>';
    return;
  }

  const lineup = game.lineup;

  const calcQuarterTotal = (qData) => {
    const us = (qData.ourGsGoals || 0) + (qData.ourGaGoals || 0);
    const opp = (qData.oppGsGoals || 0) + (qData.oppGaGoals || 0);
    return { us, opp };
  };

  let runningUs = 0, runningOpp = 0;

  container.innerHTML = `
    <div class="scoring-accordion">
      ${['Q1', 'Q2', 'Q3', 'Q4'].map((q, index) => {
        const qData = lineup[q] || {};
        const qTotal = calcQuarterTotal(qData);
        runningUs += qTotal.us;
        runningOpp += qTotal.opp;
        const isExpanded = index === 0;

        return `
          <div class="scoring-quarter">
            <div class="scoring-quarter-header ${isExpanded ? 'expanded' : ''}" onclick="toggleScoringQuarter('${q}')">
              <div class="quarter-header-left">
                <span class="quarter-name">${q}</span>
                <span class="quarter-score">${qTotal.us} - ${qTotal.opp}</span>
              </div>
              <div class="quarter-header-right">
                <span class="running-score">(${runningUs} - ${runningOpp})</span>
                <svg class="accordion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>
            </div>
            <div class="scoring-quarter-content ${isExpanded ? 'expanded' : ''}" data-quarter="${q}">
              <div class="scoring-team-section">
                <div class="scoring-team-label">Our Scorers</div>
                <div class="scorer-row">
                  <div class="scorer-info">
                    <span class="scorer-name">${qData.GS ? escapeHtml(qData.GS.split(' ')[0]) : 'Not assigned'}</span>
                    <span class="position-badge gs">GS</span>
                  </div>
                  <div class="scorer-goals">${qData.ourGsGoals || 0}</div>
                </div>
                <div class="scorer-row">
                  <div class="scorer-info">
                    <span class="scorer-name">${qData.GA ? escapeHtml(qData.GA.split(' ')[0]) : 'Not assigned'}</span>
                    <span class="position-badge ga">GA</span>
                  </div>
                  <div class="scorer-goals">${qData.ourGaGoals || 0}</div>
                </div>
              </div>
              <div class="scoring-team-section opponent">
                <div class="scoring-team-label">Opponent</div>
                <div class="scorer-row">
                  <div class="scorer-info">
                    <span class="position-badge gs">GS</span>
                  </div>
                  <div class="scorer-goals">${qData.oppGsGoals || 0}</div>
                </div>
                <div class="scorer-row">
                  <div class="scorer-info">
                    <span class="position-badge ga">GA</span>
                  </div>
                  <div class="scorer-goals">${qData.oppGaGoals || 0}</div>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

window.toggleScoringQuarter = function(quarter) {
  const headers = document.querySelectorAll('.scoring-quarter-header');
  const contents = document.querySelectorAll('.scoring-quarter-content');

  headers.forEach(h => {
    const content = h.nextElementSibling;
    if (content.dataset.quarter === quarter) {
      h.classList.toggle('expanded');
      content.classList.toggle('expanded');
    }
  });
};

window.switchGameTab = function(tabName) {
  document.querySelectorAll('.game-tab').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`[data-game-tab="${tabName}"]`)?.classList.add('active');

  document.querySelectorAll('.game-panel').forEach(panel => panel.classList.remove('active'));
  document.getElementById(`game-panel-${tabName}`)?.classList.add('active');
};

// ========================================
// SHARE FUNCTIONS
// ========================================

window.shareCurrentGame = async function() {
  if (!state.currentGame) {
    showToast('No game selected', 'info');
    return;
  }

  const teamName = state.currentTeamData?.teamName || 'Team';
  const location = state.currentGame.location || '';
  const shareText = formatGameShareText(state.currentGame, teamName, location);

  if (!shareText) {
    showToast('Unable to format game data', 'error');
    return;
  }

  haptic(50);

  await shareData(
    {
      title: `${teamName} - Round ${state.currentGame.round}`,
      text: shareText
    },
    showToast
  );
};

window.copyLineup = async function() {
  if (!state.currentGame || !state.currentGame.lineup) {
    showToast('No lineup to share', 'info');
    return;
  }

  haptic(50);

  const teamName = state.currentTeamData?.teamName || 'Team';
  const cardHTML = generateLineupCardHTML(state.currentGame, teamName);

  if (!cardHTML) {
    showToast('Unable to generate lineup', 'error');
    return;
  }

  const cardElement = document.getElementById('lineup-card');
  const cardContainer = document.getElementById('lineup-card-container');

  if (!cardElement || !cardContainer) {
    // Fallback to text
    const lineupText = formatLineupText(state.currentGame);
    const success = await copyToClipboard(lineupText);
    showToast(success ? 'Lineup copied to clipboard' : 'Failed to copy lineup', success ? 'success' : 'error');
    return;
  }

  cardElement.innerHTML = cardHTML;
  cardContainer.style.display = 'block';

  try {
    const canvas = await html2canvas(cardElement, {
      backgroundColor: '#18181b',
      scale: 2,
      logging: false,
      useCORS: true
    });

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    cardContainer.style.display = 'none';

    const filename = `lineup-round-${state.currentGame.round}.png`;
    const title = `${teamName} - Round ${state.currentGame.round} Lineup`;

    await shareImageBlob(blob, filename, title, showToast);
  } catch (err) {
    console.error('Failed to generate lineup image:', err);
    cardContainer.style.display = 'none';

    const lineupText = formatLineupText(state.currentGame);
    const success = await copyToClipboard(lineupText);
    showToast(success ? 'Lineup copied as text' : 'Failed to share lineup', success ? 'info' : 'error');
  }
};

// Helper for multiple favourite positions
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
  if (!container) return;

  if (!state.currentTeamData) {
    container.innerHTML = '<p>No team data available</p>';
    return;
  }

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

    container.innerHTML = `
      <div class="stats-subtabs">
        <button class="stats-subtab ${state.activeStatsTab === 'overview' ? 'active' : ''}" onclick="switchStatsTab('overview')">Overview</button>
        <button class="stats-subtab ${state.activeStatsTab === 'leaders' ? 'active' : ''}" onclick="switchStatsTab('leaders')">Leaders</button>
        <button class="stats-subtab ${state.activeStatsTab === 'positions' ? 'active' : ''}" onclick="switchStatsTab('positions')">Positions</button>
        <button class="stats-subtab ${state.activeStatsTab === 'combos' ? 'active' : ''}" onclick="switchStatsTab('combos')">Combos</button>
      </div>
      <div id="stats-tab-content"></div>
    `;

    renderActiveStatsTab();
  } catch (error) {
    console.error('[Stats] Error rendering stats:', error);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <p>Error loading stats</p>
      </div>
    `;
  }
}

window.switchStatsTab = function(tabId) {
  state.activeStatsTab = tabId;
  document.querySelectorAll('.stats-subtab').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.toLowerCase().includes(tabId.substring(0, 4)));
  });
  renderActiveStatsTab();
};

window.sortLeadersTable = function(tableName, column) {
  const sort = state.leadersTableState.sort[tableName];
  if (sort.column === column) {
    sort.ascending = !sort.ascending;
  } else {
    sort.column = column;
    // Default sort direction based on column type
    sort.ascending = (column === 'avg' && (tableName === 'defenders' || tableName === 'defendingPairs'));
  }
  const container = document.getElementById('stats-tab-content');
  if (container) renderStatsLeaders(container);
};

window.toggleLeadersTable = function(tableName) {
  state.leadersTableState.expanded[tableName] = !state.leadersTableState.expanded[tableName];
  const container = document.getElementById('stats-tab-content');
  if (container) renderStatsLeaders(container);
};

function renderActiveStatsTab() {
  const content = document.getElementById('stats-tab-content');
  if (!content) return;

  switch (state.activeStatsTab) {
    case 'overview': renderStatsOverview(content); break;
    case 'leaders': renderStatsLeaders(content); break;
    case 'positions': renderStatsPositions(content); break;
    case 'combos': renderStatsCombinations(content); break;
    default: renderStatsOverview(content);
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

    <!-- Season Metrics -->
    <div class="stats-section">
      <div class="stats-section-title">Season Metrics</div>
      <div class="stats-metrics-grid">
        <div class="metric-card">
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

    <!-- Quarter Performance -->
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
      ${stats.playerStats.filter(p => p.goals > 0).length > 0 ?
        stats.playerStats.filter(p => p.goals > 0).map((p, i) => `
          <div class="scorer-card ${i === 0 ? 'top-scorer' : ''}" onclick="toggleScorerExpand(this)">
            <div class="scorer-card-header">
              <div class="scorer-rank">${i + 1}</div>
              <div class="scorer-info">
                <div class="scorer-name">${escapeHtml(p.name)}</div>
                <div class="scorer-details">${p.gameBreakdown.length} game${p.gameBreakdown.length !== 1 ? 's' : ''} · ${p.scoringQuarters} quarters</div>
              </div>
              <div class="scorer-goals">
                <div class="scorer-goals-value">${p.goals}</div>
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
                    <span class="breakdown-round">R${g.round}</span>
                    <span class="breakdown-opponent">vs ${escapeHtml(g.opponent)}</span>
                  </div>
                  <div class="breakdown-goals">
                    ${g.gsGoals > 0 ? `<span class="breakdown-position">GS: ${g.gsGoals}</span>` : ''}
                    ${g.gaGoals > 0 ? `<span class="breakdown-position">GA: ${g.gaGoals}</span>` : ''}
                  </div>
                  <div class="breakdown-total">${g.total}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('') : '<div class="empty-state">No goals recorded yet</div>'}
    </div>
  `;
}

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
    let offQuarters = 0;
    let captainCount = 0;

    games.forEach(game => {
      if (!game.lineup) return;

      let playedInGame = false;
      let quartersOnCourt = 0;

      ['Q1', 'Q2', 'Q3', 'Q4'].forEach(quarter => {
        const qData = game.lineup[quarter];
        if (!qData) return;

        positions.forEach(pos => {
          if (qData[pos] === player.name) {
            positionCounts[pos]++;
            totalQuarters++;
            playedInGame = true;
            quartersOnCourt++;
          }
        });
      });

      if (playedInGame) {
        offQuarters += (4 - quartersOnCourt);
      }

      if (game.captain === player.name) {
        captainCount++;
      }
    });

    return {
      id: player.id,
      name: player.name,
      favPosition: player.favPosition,
      positionCounts,
      totalQuarters,
      offQuarters,
      captainCount,
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
          <div class="pos-grid-header pos-grid-pos pos-grid-off">Off</div>
          <div class="pos-grid-header pos-grid-pos pos-grid-capt">C</div>
          <div class="pos-grid-header pos-grid-total">Total</div>

          <!-- Player Rows -->
          ${positionStats.map(player => {
            const hasGaps = player.positionsPlayed < 7;
            const favPositions = normalizeFavPositions(player.favPosition);
            return `
              <div class="pos-grid-name ${hasGaps ? 'needs-exposure' : ''}">${escapeHtml(player.name.split(' ')[0])}</div>
              ${positions.map(pos => {
                const count = player.positionCounts[pos];
                const isFav = favPositions.includes(pos);
                return `
                  <div class="pos-grid-cell ${count > 0 ? 'played' : 'unplayed'} ${isFav ? 'favorite' : ''}">
                    ${count > 0 ? count : '—'}
                  </div>
                `;
              }).join('')}
              <div class="pos-grid-cell pos-grid-off-cell ${player.offQuarters > 0 ? 'has-off' : 'unplayed'}">${player.offQuarters > 0 ? player.offQuarters : '—'}</div>
              <div class="pos-grid-cell pos-grid-capt-cell ${player.captainCount > 0 ? 'has-captain' : 'unplayed'}">${player.captainCount > 0 ? player.captainCount : '—'}</div>
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
                <span class="unit-player">${escapeHtml(u.players.GS?.split(' ')[0] || '-')}</span>
                <span class="unit-player">${escapeHtml(u.players.GA?.split(' ')[0] || '-')}</span>
                <span class="unit-player">${escapeHtml(u.players.WA?.split(' ')[0] || '-')}</span>
                <span class="unit-player">${escapeHtml(u.players.C?.split(' ')[0] || '-')}</span>
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
                <span class="unit-player">${escapeHtml(u.players.GK?.split(' ')[0] || '-')}</span>
                <span class="unit-player">${escapeHtml(u.players.GD?.split(' ')[0] || '-')}</span>
                <span class="unit-player">${escapeHtml(u.players.WD?.split(' ')[0] || '-')}</span>
                <span class="unit-player">${escapeHtml(u.players.C?.split(' ')[0] || '-')}</span>
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
          ${pairings && pairings.offensive && pairings.offensive.length > 0 ? pairings.offensive.slice(0, 5).map(p => `
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
          ${pairings && pairings.defensive && pairings.defensive.length > 0 ? pairings.defensive.slice(0, 5).map(p => `
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

// ========================================
// THEME TOGGLE
// ========================================

window.toggleTheme = function() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
};

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

// ========================================
// INITIALIZATION
// ========================================

window.addEventListener('DOMContentLoaded', () => {
  console.log('[Parent Portal] DOMContentLoaded - starting initialization');

  // Add version indicator for debugging cache issues
  const versionTag = document.createElement('div');
  versionTag.id = 'version-tag';
  versionTag.textContent = 'v2025-02-01h';
  versionTag.style.cssText = 'position:fixed;bottom:80px;left:10px;background:#333;color:#0f0;padding:4px 8px;border-radius:4px;font-size:10px;z-index:9999;opacity:0.8;';
  document.body.appendChild(versionTag);

  fetchAndRenderTeams();
});
