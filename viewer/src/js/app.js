
import '../css/styles.css';
import { API_CONFIG, callApi } from './config.js';
import { resolveTeamParamFromLocation } from './router.js';
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
} from '../../../common/utils.js';
import { calculateAllAnalytics } from '../../../common/stats-calculations.js';
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
} from '../../../common/share-utils.js';
import { mockTeams, calculateMockStats } from '../../../common/mock-data.js';
// ========================================
// HGNC GAMEDAY - Read-only Viewer for Parents & Spectators
// ========================================
// FORCED CHANGE: Trigger Cloudflare Pages redeploy

// Remove all edit controls and editing logic for read-only viewer
// (No-op placeholder, all edit logic removed)

function transformTeamDataFromSheet(data, teamID) {
  const players = (data.players || []).map(p => ({
    id: p.id,
    name: p.name,
    fillIn: p.isFillIn || false,
    favPosition: p.favoritePosition || p.favPosition || ''
  }));

  // Debug: Log the incoming data object and its keys to inspect property names
  console.log('[DEBUG] [transformTeamDataFromSheet] incoming data:', data);
  if (data && typeof data === 'object') {
    console.log('[DEBUG] [transformTeamDataFromSheet] data keys:', Object.keys(data));
  }

  const games = (data.games || []).map(g => {
    let lineup = null;
    if (g.quarters && g.quarters.length > 0) {
      lineup = {};
      const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];
      g.quarters.forEach((q, i) => {
        if (i < 4) {
          const positions = q.positions || {};
          lineup[quarterNames[i]] = {
            GS: positions.GS || '',
            GA: positions.GA || '',
            WA: positions.WA || '',
            C: positions.C || '',
            WD: positions.WD || '',
            GD: positions.GD || '',
            GK: positions.GK || '',
            ourGsGoals: q.ourGsGoals || 0,
            ourGaGoals: q.ourGaGoals || 0,
            oppGsGoals: q.opponentGsGoals || 0,
            oppGaGoals: q.opponentGaGoals || 0
          };
        }
      });
    }

    let scores = null;
    if (g._cachedScores) {
      scores = { us: g._cachedScores.ourScore, opponent: g._cachedScores.opponentScore };
    } else if (g.quarters) {
      let us = 0, opponent = 0;
      g.quarters.forEach(q => {
        us += (q.ourGsGoals || 0) + (q.ourGaGoals || 0);
        opponent += (q.opponentGsGoals || 0) + (q.opponentGaGoals || 0);
      });
      scores = { us, opponent };
    }

    return {
      gameID: g.id || g.gameID,
      round: g.round,
      opponent: g.opponent,
      date: g.date,
      time: g.time || '',
      location: g.court ? `Court ${g.court}` : (g.location || ''),
      status: g.status || 'upcoming',
      captain: g.captain || null,
      scores,
      lineup
    };
  });

  return {
    teamID: teamID,
    teamName: data.teamName || data.TeamName || data.name || data['Team Name'] || '',
    year: data.year || data.Year || data['Year'] || '',
    season: data.season || data.Season || data['Season'] || '',
    players: players,
    games: games
  };
}

// ========================================
// VIEW MANAGEMENT
// ========================================

window.showView = function(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId)?.classList.add('active');
  haptic(30);
};

window.switchTab = function(tabName) {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tabName}`);
  });

  // Block interaction with the Schedule tab if on schedule
  const overlay = document.getElementById('schedule-block-overlay');
  if (tabName === 'schedule' && overlay) {
    overlay.style.display = 'block';
    overlay.onclick = function(e) { e.stopPropagation(); e.preventDefault(); };
  } else if (overlay) {
    overlay.style.display = 'none';
    overlay.onclick = null;
  }

  if (tabName === 'stats') {
    renderStats();
  }

  haptic(30);
};

window.switchGameTab = function(tabName) {
  document.querySelectorAll('.game-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.gameTab === tabName);
  });
  document.querySelectorAll('.game-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `game-panel-${tabName}`);
  });
  haptic(30);
};

// ========================================
// TEAM LIST
// ========================================

function renderTeamList() {
  const container = document.getElementById('team-list');
  if (!container) return;

  if (state.teams.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No teams available</p></div>';
    return;
  }

  // Group teams by year
  const byYear = {};
  state.teams.forEach(team => {
    const year = team.year || 'Unknown';
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(team);
  });

  const years = Object.keys(byYear).sort((a, b) => b - a);

  container.innerHTML = years.map(year => `
    <div class="team-year-group">
      <div class="team-year-header">${escapeHtml(year)}</div>
      ${byYear[year].map(team => `
        <div class="team-card" onclick="selectTeam('${escapeAttr(team.teamID)}')">
          <div class="team-avatar">${escapeHtml(getInitials(team.teamName))}</div>
          <div class="team-info">
            <div class="team-name">${escapeHtml(team.teamName)}</div>
            <div class="team-meta">${escapeHtml(team.season || '')}</div>
          </div>
          <div class="team-arrow">→</div>
        </div>
      `).join('')}
    </div>
  `).join('');
}

window.selectTeam = async function(teamID) {
  const team = state.teams.find(t => t.teamID === teamID);
  if (!team) return;

  state.currentTeam = team;
  await loadTeamData(teamID);
  // Debug: Log the raw teamData object as received from API or mock
  console.log('[DEBUG] Raw teamData (state.currentTeamData):', state.currentTeamData);

  if (!state.currentTeamData) {
    showToast('Failed to load team data', 'error');
    return;
  }

  // Update header
  document.getElementById('current-team-name').textContent = state.currentTeamData.teamName;
  document.getElementById('current-team-season').textContent = `${state.currentTeamData.year} ${state.currentTeamData.season}`;

  // Show Create Parent Portal button if user is coach/admin (stub: always show for now)
  const portalBtn = document.getElementById('create-parent-portal-btn');
  if (portalBtn) {
    portalBtn.style.display = '';
  }

  // Render content
  renderQuickStats();
  renderSchedule();
  renderRoster();

  showView('main-app-view');
  haptic(50);

  // Trap user on team page: push dummy state so back doesn't go to selector
  if (window.history && window.history.pushState) {
    window.history.pushState({teamLock: true}, '', window.location.pathname + window.location.search);
  }
  // Listen for back navigation and force stay on team page
  if (!window.__hgnc_trap_popstate) {
    window.addEventListener('popstate', function (e) {
      // If the state is not our teamLock, push it again
      if (!e.state || !e.state.teamLock) {
        window.history.pushState({teamLock: true}, '', window.location.pathname + window.location.search);
      }
    });
    window.__hgnc_trap_popstate = true;
  }
};

// Handler for Create Parent Portal button
window.createParentPortal = async function() {
  const btn = document.getElementById('create-parent-portal-btn');
  if (!state.currentTeamData) {
    showToast('No team selected', 'error');
    return;
  }
  btn.disabled = true;
  showLoading(true);
  try {
    const resp = await fetch('/api/create-parent-portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamName: state.currentTeamData.teamName,
        teamID: state.currentTeamData.teamID,
        season: state.currentTeamData.season,
        year: state.currentTeamData.year
      })
    });
    const data = await resp.json();
    if (data.success && data.url) {
      showToast('Parent portal created!');
      window.open(data.url, '_blank');
    } else {
      showToast(data.error || 'Failed to create portal', 'error');
    }
  } catch (err) {
    showToast('Error creating portal', 'error');
  } finally {
    btn.disabled = false;
    showLoading(false);
  }
};

// ========================================
// QUICK STATS BANNER
// ========================================

function renderQuickStats() {
  if (!state.stats) return;

  const { wins, losses, draws, goalsFor, goalsAgainst } = state.stats;
  const gd = goalsFor - goalsAgainst;

  console.log('[DEBUG] Rendering quick stats:', { wins, losses, draws, goalsFor, goalsAgainst, gd });

  document.getElementById('qs-record').textContent = `${wins}-${losses}-${draws}`;
  document.getElementById('qs-gd').textContent = gd >= 0 ? `+${gd}` : `${gd}`;

  // Find next game
  const today = new Date().toISOString().split('T')[0];
  const nextGame = state.currentTeamData?.games?.find(g => g.date >= today && g.status !== 'bye');
  document.getElementById('qs-next').textContent = nextGame ? `R${nextGame.round}` : '--';
  console.log('[DEBUG] Next game:', nextGame);
}

// ========================================
// SCHEDULE
// ========================================

function renderSchedule() {
  const container = document.getElementById('schedule-list');
  if (!container || !state.currentTeamData) return;

  const games = state.currentTeamData.games || [];

  if (games.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No games scheduled</p></div>';
    return;
  }

  container.innerHTML = games.map(game => {
    const hasScores = game.scores && (game.scores.us !== null || game.scores.opponent !== null);
    let resultClass = '';
    let scoreDisplay = '';

    if (game.status === 'abandoned') {
      scoreDisplay = 'Abandoned';
      resultClass = 'abandoned';
    } else if (hasScores) {
      const us = game.scores.us || 0;
      const them = game.scores.opponent || 0;
      if (us > them) resultClass = 'win';
      else if (us < them) resultClass = 'loss';
      else resultClass = 'draw';
      scoreDisplay = `${us} - ${them}`;
    } else if (game.status === 'bye') {
      scoreDisplay = 'BYE';
      resultClass = 'bye';
    }

    return `
      <div class="game-card ${resultClass}" onclick="openGameDetail('${escapeAttr(game.gameID)}')">
        <div class="game-round">R${escapeHtml(game.round)}</div>
        <div class="game-info">
          <div class="game-opponent">${escapeHtml(game.opponent)}</div>
          <div class="game-meta">${escapeHtml(formatDate(game.date))} · ${escapeHtml(game.time || '')} · ${escapeHtml(game.location || '')}</div>
        </div>
        <div class="game-score ${resultClass}">${scoreDisplay || '—'}</div>
      </div>
    `;
  }).join('');
}

// ========================================
// ROSTER
// ========================================

function renderRoster() {
  const container = document.getElementById('roster-grid');
  if (!container || !state.currentTeamData) return;

  const players = state.currentTeamData.players || [];

  if (players.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No players on roster</p></div>';
    return;
  }


  container.innerHTML = players.map(player => `
    <div class="roster-card">
      <div class="roster-avatar">${escapeHtml(getInitials(player.name))}</div>
      <div class="roster-name">${escapeHtml(player.name)}</div>
      ${player.favPosition ? `<div class="roster-position">${escapeHtml(player.favPosition)}</div>` : ''}
      ${player.fillIn ? '<div class="roster-badge">Fill-in</div>' : ''}
    </div>
  `).join('');
}

// ========================================
// GAME DETAIL
// ========================================

window.openGameDetail = function(gameID) {
  const game = state.currentTeamData?.games?.find(g => g.gameID === gameID);
  if (!game) return;

  state.currentGame = game;
  state.currentQuarter = 'Q1';

  document.getElementById('game-detail-title').textContent = `Round ${game.round}`;
  document.getElementById('game-detail-subtitle').textContent = `vs ${game.opponent}`;

  renderGameScoreCard();
  renderLineupDisplay();
  renderScoringDisplay();

  showView('game-detail-view');

  if (window.isReadOnlyView) {
    try { showReadOnlyPill(state.currentTeamData?.teamName || state.currentTeamData?.name); } catch (e) { /* noop */ }
  }

  haptic(50);
};

window.closeGameDetail = function() {
  state.currentGame = null;
  showView('main-app-view');
};

function renderGameScoreCard() {
  const game = state.currentGame;
  const container = document.getElementById('game-score-card');
  if (!game || !container) return;

  let us = 0, opponent = 0, hasScores = false;

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
    hasScores = true;
  }

  if (!hasScores) {
    container.innerHTML = `
      <div class="game-result-badge upcoming">Upcoming</div>
      <div style="margin-top: 16px; color: var(--text-secondary);">
        ${escapeHtml(formatDate(game.date))} at ${escapeHtml(game.time || 'TBD')}<br>
        ${escapeHtml(game.location || '')}
      </div>
    `;
    document.getElementById('share-actions').style.display = 'none';
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

  document.getElementById('share-actions').style.display = 'flex';
}

// ========================================
// READ-ONLY LINEUP DISPLAY
// ========================================

function renderLineupDisplay() {
  const game = state.currentGame;
  const container = document.getElementById('lineup-display');
  if (!game || !container) return;

  const lineup = game.lineup || {};

  container.innerHTML = `
    <!-- Quarter Tabs -->
    <div class="lineup-quarter-tabs">
      ${['Q1', 'Q2', 'Q3', 'Q4'].map(q => `
        <button class="quarter-tab ${q === state.currentQuarter ? 'active' : ''}"
                onclick="selectQuarter('${escapeAttr(q)}')">${escapeHtml(q)}</button>
      `).join('')}
    </div>

    <!-- Court Layout (Read-only) -->
    <div class="lineup-court readonly">
      <div class="court-section">
        <div class="court-section-label">Shooters</div>
        <div class="court-positions">
          ${renderReadOnlyPosition('GS', lineup[state.currentQuarter]?.GS)}
          ${renderReadOnlyPosition('GA', lineup[state.currentQuarter]?.GA)}
        </div>
      </div>
      <div class="court-section">
        <div class="court-section-label">Mid Court</div>
        <div class="court-positions">
          ${renderReadOnlyPosition('WA', lineup[state.currentQuarter]?.WA)}
          ${renderReadOnlyPosition('C', lineup[state.currentQuarter]?.C)}
          ${renderReadOnlyPosition('WD', lineup[state.currentQuarter]?.WD)}
        </div>
      </div>
      <div class="court-section">
        <div class="court-section-label">Defenders</div>
        <div class="court-positions">
          ${renderReadOnlyPosition('GD', lineup[state.currentQuarter]?.GD)}
          ${renderReadOnlyPosition('GK', lineup[state.currentQuarter]?.GK)}
        </div>
      </div>
    </div>

    ${game.captain ? `<div class="captain-display">Captain: ${escapeHtml(game.captain)}</div>` : ''}
  `;
}

function renderReadOnlyPosition(position, playerName) {
  const filled = playerName && playerName.length > 0;
  const isCaptain = filled && state.currentGame?.captain === playerName;

  return `
    <div class="position-slot ${filled ? 'filled' : ''} readonly">
      <div class="position-label">${escapeHtml(position)}</div>
      ${filled
        ? `<div class="position-player">${escapeHtml(playerName)}${isCaptain ? '<span class="captain-badge">C</span>' : ''}</div>`
        : '<div class="position-empty">-</div>'
      }
    </div>
  `;
}

window.selectQuarter = function(quarter) {
  state.currentQuarter = quarter;
  renderLineupDisplay();
  haptic(30);
};

// ========================================
// READ-ONLY SCORING DISPLAY
// ========================================

function renderScoringDisplay() {
  const game = state.currentGame;
  const container = document.getElementById('scoring-display');
  if (!game || !container) return;

  const lineup = game.lineup || {};

  const calcQuarterTotal = (qData) => {
    const us = (qData.ourGsGoals || 0) + (qData.ourGaGoals || 0);
    const opp = (qData.oppGsGoals || 0) + (qData.oppGaGoals || 0);
    return { us, opp };
  };

  let gameUs = 0, gameOpp = 0;

  container.innerHTML = `
    <div class="scoring-summary">
      ${['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
        const qData = lineup[q] || {};
        const qTotal = calcQuarterTotal(qData);
        gameUs += qTotal.us;
        gameOpp += qTotal.opp;

        const gsPlayer = qData.GS || 'GS';
        const gaPlayer = qData.GA || 'GA';
        const gsGoals = qData.ourGsGoals || 0;
        const gaGoals = qData.ourGaGoals || 0;
        const oppGsGoals = qData.oppGsGoals || 0;
        const oppGaGoals = qData.oppGaGoals || 0;

        return `
          <div class="scoring-quarter-card">
            <div class="quarter-card-header">
              <span class="quarter-name">${escapeHtml(q)}</span>
              <span class="quarter-score ${qTotal.us > qTotal.opp ? 'win' : qTotal.us < qTotal.opp ? 'loss' : ''}">${qTotal.us} - ${qTotal.opp}</span>
            </div>
            <div class="quarter-card-body">
              <div class="quarter-scorers">
                <div class="scorer-row">
                  <span class="scorer-name">${escapeHtml(gsPlayer)}</span>
                  <span class="scorer-goals">${gsGoals}</span>
                </div>
                <div class="scorer-row">
                  <span class="scorer-name">${escapeHtml(gaPlayer)}</span>
                  <span class="scorer-goals">${gaGoals}</span>
                </div>
              </div>
              <div class="quarter-opponent">
                <div class="opponent-label">Opponent</div>
                <div class="opponent-goals">${oppGsGoals + oppGaGoals}</div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <div class="scoring-total">
      <span>Final Score</span>
      <span class="total-score ${gameUs > gameOpp ? 'win' : gameUs < gameOpp ? 'loss' : ''}">${gameUs} - ${gameOpp}</span>
    </div>
  `;
}

// ========================================
// STATS
// ========================================

function renderStats() {
  const container = document.getElementById('stats-container');
  if (!container || !state.analytics) return;

  container.innerHTML = `
    <div class="stats-tabs">
      ${['overview', 'leaders', 'positions', 'combos'].map(tab => `
        <button class="stats-tab ${state.activeStatsTab === tab ? 'active' : ''}"
                onclick="switchStatsTab('${escapeAttr(tab)}')">${escapeHtml(tab.charAt(0).toUpperCase() + tab.slice(1))}</button>
      `).join('')}
    </div>
    <div id="stats-content" class="stats-content"></div>
  `;

  renderStatsContent();
}

window.switchStatsTab = function(tabName) {
  state.activeStatsTab = tabName;
  document.querySelectorAll('.stats-tab').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.toLowerCase() === tabName);
  });
  renderStatsContent();
  haptic(30);
};

function renderStatsContent() {
  const container = document.getElementById('stats-content');
  if (!container) return;

  switch (state.activeStatsTab) {
    case 'overview':
      renderStatsOverview(container);
      break;
    case 'leaders':
      renderStatsLeaders(container);
      break;
    case 'positions':
      renderStatsPositions(container);
      break;
    case 'combos':
      renderStatsCombinations(container);
      break;
  }
}

function renderStatsOverview(container) {
  const { overview } = state.analytics;
  const { seasonRecord, seasonScoring, form, quarterScoring } = overview;

  container.innerHTML = `
    <div class="stats-section">
      <div class="stats-section-title">Season Record</div>
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-value">${seasonRecord.wins}</span>
          <span class="stat-label">Wins</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">${seasonRecord.losses}</span>
          <span class="stat-label">Losses</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">${seasonRecord.draws}</span>
          <span class="stat-label">Draws</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">${seasonRecord.winRate}%</span>
          <span class="stat-label">Win Rate</span>
        </div>
      </div>
    </div>

    <div class="stats-section">
      <div class="stats-section-title">Scoring</div>
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-value">${seasonScoring.goalsFor}</span>
          <span class="stat-label">Goals For</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">${seasonScoring.goalsAgainst}</span>
          <span class="stat-label">Goals Against</span>
        </div>
        <div class="stat-card">
          <span class="stat-value ${seasonScoring.goalDifference >= 0 ? 'positive' : 'negative'}">${seasonScoring.goalDifference >= 0 ? '+' : ''}${seasonScoring.goalDifference}</span>
          <span class="stat-label">Goal Diff</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">${seasonScoring.avgGoalsFor}</span>
          <span class="stat-label">Avg For</span>
        </div>
      </div>
    </div>

    <div class="stats-section">
      <div class="stats-section-title">Recent Form</div>
      <div class="form-display">
        ${form.map(result => `<span class="form-badge ${result.toLowerCase()}">${result}</span>`).join('')}
      </div>
    </div>

    <div class="stats-section">
      <div class="stats-section-title">Best Quarter</div>
      <div class="quarter-chart">
        ${['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
          const goals = quarterScoring[q] || 0;
          const maxGoals = Math.max(...Object.values(quarterScoring), 1);
          const pct = Math.round((goals / maxGoals) * 100);
          const isBest = q === quarterScoring.bestQuarter;
          return `
            <div class="quarter-bar-container">
              <div class="quarter-bar ${isBest ? 'best' : ''}" style="height: ${pct}%"></div>
              <span class="quarter-label">${q}</span>
              <span class="quarter-value">${goals}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderStatsLeaders(container) {
  const { leaderboards } = state.analytics;
  const { offensive, defensive, minQuarters } = leaderboards;

  container.innerHTML = `
    <div class="stats-section">
      <div class="stats-section-title">Offensive Leaders</div>
      <div class="leaderboard-grid">
        <div class="leaderboard-card">
          <div class="leaderboard-header">Top Scorer</div>
          ${offensive.topScorersByTotal.length > 0 ? `
            <div class="leaderboard-player">
              <div class="leaderboard-name">${escapeHtml(offensive.topScorersByTotal[0].name)}</div>
              <div class="leaderboard-stat">${offensive.topScorersByTotal[0].goals} goals</div>
              <div class="leaderboard-detail">${offensive.topScorersByTotal[0].avg} per qtr</div>
            </div>
          ` : '<div class="leaderboard-empty">No data yet</div>'}
        </div>
        <div class="leaderboard-card">
          <div class="leaderboard-header">Top Scoring Pair</div>
          ${offensive.topScoringPairsByTotal.length > 0 ? `
            <div class="leaderboard-player">
              <div class="leaderboard-name">${escapeHtml(offensive.topScoringPairsByTotal[0].players[0].split(' ')[0])} & ${escapeHtml(offensive.topScoringPairsByTotal[0].players[1].split(' ')[0])}</div>
              <div class="leaderboard-stat">${offensive.topScoringPairsByTotal[0].goals} goals</div>
            </div>
          ` : '<div class="leaderboard-empty">No data yet</div>'}
        </div>
      </div>
    </div>

    <div class="stats-section">
      <div class="stats-section-title">Defensive Leaders</div>
      <div class="leaderboard-grid">
        <div class="leaderboard-card defensive">
          <div class="leaderboard-header">Top Defender</div>
          ${defensive.topDefendersByTotal.length > 0 ? `
            <div class="leaderboard-player">
              <div class="leaderboard-name">${escapeHtml(defensive.topDefendersByTotal[0].name)}</div>
              <div class="leaderboard-stat">${defensive.topDefendersByTotal[0].avg} GA/qtr</div>
              <div class="leaderboard-detail">${defensive.topDefendersByTotal[0].quarters} qtrs</div>
            </div>
          ` : '<div class="leaderboard-empty">No data yet</div>'}
        </div>
        <div class="leaderboard-card defensive">
          <div class="leaderboard-header">Top Defensive Pair</div>
          ${defensive.topDefensivePairsByTotal.length > 0 ? `
            <div class="leaderboard-player">
              <div class="leaderboard-name">${escapeHtml(defensive.topDefensivePairsByTotal[0].players[0].split(' ')[0])} & ${escapeHtml(defensive.topDefensivePairsByTotal[0].players[1].split(' ')[0])}</div>
              <div class="leaderboard-stat">${defensive.topDefensivePairsByTotal[0].avg} GA/qtr</div>
            </div>
          ` : '<div class="leaderboard-empty">No data yet</div>'}
        </div>
      </div>
    </div>

    <div class="stats-section">
      <div class="stats-section-title">All Scorers</div>
      ${offensive.topScorersByTotal.length > 0 ? `
        <div class="scorers-table">
          <div class="scorers-table-header">
            <span class="col-rank">#</span>
            <span class="col-name">Player</span>
            <span class="col-goals">Goals</span>
            <span class="col-avg">Avg</span>
          </div>
          ${offensive.topScorersByTotal.slice(0, 10).map((p, i) => `
            <div class="scorers-table-row ${i === 0 ? 'top' : ''}">
              <span class="col-rank">${i + 1}</span>
              <span class="col-name">${escapeHtml(p.name)}</span>
              <span class="col-goals">${p.goals}</span>
              <span class="col-avg">${p.avg}</span>
            </div>
          `).join('')}
        </div>
      ` : '<div class="empty-state"><p>No scorers yet</p></div>'}
    </div>
  `;
}

function renderStatsPositions(container) {
  const players = state.currentTeamData?.players || [];
  const games = state.currentTeamData?.games?.filter(g => g.lineup) || [];
  const positions = ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'];

  // Calculate position stats per player
  const positionStats = players.map(player => {
    const positionCounts = {};
    positions.forEach(pos => positionCounts[pos] = 0);
    let totalQuarters = 0;

    games.forEach(game => {
      if (!game.lineup) return;
      ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
        const qData = game.lineup[q] || {};
        positions.forEach(pos => {
          if (qData[pos] === player.name) {
            positionCounts[pos]++;
            totalQuarters++;
          }
        });
      });
    });

    return {
      name: player.name,
      positionCounts,
      totalQuarters,
      positionsPlayed: Object.values(positionCounts).filter(c => c > 0).length,
      favPosition: player.favPosition
    };
  }).filter(p => p.totalQuarters > 0).sort((a, b) => b.totalQuarters - a.totalQuarters);

  container.innerHTML = `
    <div class="stats-section">
      <div class="stats-section-title">Position Experience</div>
      <div class="position-grid-container">
        <div class="position-grid">
          <div class="pos-grid-header"></div>
          ${positions.map(pos => `<div class="pos-grid-header">${escapeHtml(pos)}</div>`).join('')}
          <div class="pos-grid-header">Total</div>
          ${positionStats.map(player => `
            <div class="pos-grid-name">${escapeHtml(player.name.split(' ')[0])}</div>
            ${positions.map(pos => {
              const count = player.positionCounts[pos];
              const isFav = player.favPosition === pos;
              return `<div class="pos-grid-cell ${count > 0 ? 'played' : 'unplayed'} ${isFav ? 'favorite' : ''}">${count > 0 ? count : '—'}</div>`;
            }).join('')}
            <div class="pos-grid-total">${player.totalQuarters}</div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderStatsCombinations(container) {
  const { combinations } = state.analytics;
  const { attackingUnits, defensiveUnits } = combinations;

  container.innerHTML = `
    <div class="stats-section">
      <div class="stats-section-title">Top Attacking Units</div>
      ${attackingUnits.length > 0 ? `
        <div class="unit-list">
          ${attackingUnits.slice(0, 5).map((unit, i) => `
            <div class="unit-card ${i === 0 ? 'top' : ''}">
              <div class="unit-players">${unit.players.map(p => escapeHtml(p.split(' ')[0])).join(' · ')}</div>
              <div class="unit-stats">
                <span>${unit.goals} goals</span>
                <span>${unit.avg} per qtr</span>
                <span>${unit.quarters} qtrs</span>
              </div>
            </div>
          `).join('')}
        </div>
      ` : '<div class="empty-state"><p>Not enough data yet</p></div>'}
    </div>

    <div class="stats-section">
      <div class="stats-section-title">Top Defensive Units</div>
      ${defensiveUnits.length > 0 ? `
        <div class="unit-list">
          ${defensiveUnits.slice(0, 5).map((unit, i) => `
            <div class="unit-card defensive ${i === 0 ? 'top' : ''}">
              <div class="unit-players">${unit.players.map(p => escapeHtml(p.split(' ')[0])).join(' · ')}</div>
              <div class="unit-stats">
                <span>${unit.goalsAgainst} GA</span>
                <span>${unit.avg} per qtr</span>
                <span>${unit.quarters} qtrs</span>
              </div>
            </div>
          `).join('')}
        </div>
      ` : '<div class="empty-state"><p>Not enough data yet</p></div>'}
    </div>
  `;
}

// ========================================
// SHARING
// ========================================

window.shareCurrentGame = async function() {
  if (!state.currentGame || !state.currentGame.scores) {
    showToast('No score to share yet', 'info');
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
    await copyToClipboard(lineupText);
    showToast('Lineup copied as text', 'success');
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
    await copyToClipboard(lineupText);
    showToast('Lineup copied as text', 'info');
  }
};

// ========================================
// UI HELPERS
// ========================================

function showLoading(show) {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.toggle('hidden', !show);
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  // Copied from main site for full feature parity, will remove edit controls next
  // ...existing code from /src/js/app.js... 

  // ========================================
  // INITIALIZE APP: FETCH TEAMS ON LOAD
  // ========================================

  console.log('[HGNC Viewer] app.js loaded');
  const state = {
    teams: [],
    currentTeam: null,
    currentTeamData: null,
    currentGame: null,
    currentQuarter: 'Q1',
    stats: null,
    analytics: null,
    activeStatsTab: 'overview',
  };


  async function fetchAndRenderTeams() {
    console.log('[HGNC Viewer] fetchAndRenderTeams() called');
    try {
      console.log('[Teams Fetch] API_CONFIG:', API_CONFIG);
      const result = await callApi('getTeams');
      console.log('[Teams Fetch] Raw result:', result);
      // Defensive: handle both { teams: [...] } and array
      const teamsRaw = Array.isArray(result) ? result : (result.teams || []);
      state.teams = teamsRaw.map((t) => transformTeamDataFromSheet(t, t.teamID || t.id || t.teamId || t.TeamID || t['Team ID']));
      console.log('[Teams Fetch] Transformed teams:', state.teams);
      // --- Auto-select team if URL contains a team slug or ID ---
      const pathname = window.location.pathname;
      const search = window.location.search;
      const teamID = resolveTeamParamFromLocation(state.teams, pathname, search);
      if (teamID) {
        // Hide team selector, show team page directly
        await window.selectTeam(teamID);
        // Trap user on team page: replace history so back doesn't go to selector
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        // Listen for back navigation and force stay on team page
        window.addEventListener('popstate', function (e) {
          // Always push the team page back if user tries to go back
          window.history.pushState(null, '', window.location.pathname + window.location.search);
        });
      } else {
        renderTeamList();
      }
      if (state.teams.length === 0) {
        showToast('No teams found from API', 'error');
        showTeamsError('No teams found from API. Check API response and config.');
      }
    } catch (err) {
      showToast('Failed to load teams', 'error');
      showTeamsError('Failed to load teams. See console for details.');
      console.error('[Teams Load Error]', err);
      state.teams = [];
      renderTeamList();
    } finally {
      showLoading(false);
    }
  }

  function showTeamsError(msg) {
    let el = document.getElementById('teams-error');
    if (!el) {
  // Fallback: also call directly in case event doesn't fire
  setTimeout(fetchAndRenderTeams, 1000);

  // Global error handler
  window.addEventListener('error', function(e) {
    console.error('[HGNC Viewer] Global error:', e.error || e.message || e);
    showTeamsError('A fatal error occurred. See console for details.');
  });
      el = document.createElement('div');
      el.id = 'teams-error';
      el.style.color = 'red';
      el.style.margin = '1em 0';
      el.style.fontWeight = 'bold';
      document.body.prepend(el);
    }
    el.textContent = msg;
  }

  // Run on DOMContentLoaded
  window.addEventListener('DOMContentLoaded', fetchAndRenderTeams);
}
