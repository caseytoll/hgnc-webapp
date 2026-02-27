import { state, saveToLocalStorage } from './state.js';
import { syncToGoogleSheets } from './sync.js';
import { API_CONFIG } from './config.js';
import { escapeHtml } from '../../../../common/utils.js';
import {
  formatAIContent,
  renderAIFeedback,
  getOpponentDifficulty,
  calculateStrengthOfSchedule,
  ordinalSuffix,
  normalizeFavPositions,
} from './helpers.js';
import { contextHelpIcon } from './help.js';

// ========================================
// STATS RENDERING
// ========================================

window.renderStats = renderStats;
export function renderStats() {
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
        <button class="stats-subtab ${state.activeStatsTab === 'patterns' ? 'active' : ''}" onclick="switchStatsTab('patterns')">Patterns</button>
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

window.switchStatsTab = function (tabId) {
  state.activeStatsTab = tabId;

  // Update active tab styling
  document.querySelectorAll('.stats-subtab').forEach((btn) => {
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
    case 'patterns':
      renderStatsPatterns(content);
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
      <div class="stats-hero-help">${contextHelpIcon('stats')}</div>
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
            ${
              advanced.form.length > 0
                ? advanced.form
                    .map(
                      (r) => `<span class="form-badge ${r === 'W' ? 'win' : r === 'L' ? 'loss' : 'draw'}">${r}</span>`
                    )
                    .join('')
                : '<span class="text-muted">-</span>'
            }
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
        ${(() => {
          const sos = calculateStrengthOfSchedule();
          if (!sos) return '';
          return `
            <div class="metric-card" onclick="showSoSDetail()">
              <div class="metric-label">Schedule</div>
              <div class="metric-value">${sos.rating}<span class="sos-max">/100</span></div>
              <div class="metric-sublabel">${sos.label}</div>
            </div>
          `;
        })()}
      </div>
    </div>

    <!-- Quarter Breakdown -->
    <div class="stats-section">
      <div class="stats-section-title">Quarter Performance</div>
      <div class="quarter-breakdown">
        ${['Q1', 'Q2', 'Q3', 'Q4']
          .map((q) => {
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
          })
          .join('')}
      </div>
    </div>

    <!-- Goal Scorers -->
    <div class="stats-section">
      <div class="stats-section-title">Goal Scorers</div>
      ${stats.playerStats
        .filter((p) => p.goals > 0)
        .map(
          (p, i) => `
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
            ${p.gameBreakdown
              .map(
                (g) => `
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
            `
              )
              .join('')}
          </div>
        </div>
      `
        )
        .join('')}
      ${
        stats.playerStats.filter((p) => p.goals > 0).length === 0
          ? `
        <div class="empty-state">
          <p>No goals recorded yet</p>
        </div>
      `
          : ''
      }
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

    <!-- Season Strategy -->
    <div class="stats-section">
      <div class="stats-section-title">Season Strategy</div>
      <div id="season-strategy-container">
        <button class="btn btn-primary" onclick="fetchSeasonStrategy()" id="season-strategy-btn">
          Get Season Strategy
        </button>
      </div>
    </div>
  `;
}

// Fetch AI insights from Gemini
window.fetchAIInsights = async function (forceRefresh = false) {
  const container = document.getElementById('ai-insights-container');

  if (!state.currentTeam || !state.currentTeamData) {
    window.showToast('No team data loaded', 'error');
    return;
  }

  // Check for cached insights (unless forcing refresh)
  if (!forceRefresh && state.currentTeamData.aiInsights && state.currentTeamData.aiInsights.text) {
    const cachedDate = new Date(state.currentTeamData.aiInsights.generatedAt).toLocaleDateString('en-AU');
    const gameCountAtGen = state.currentTeamData.aiInsights.gameCount || 0;
    const currentGameCount = state.analytics?.advanced?.gameCount || 0;

    // Show cached insights with option to refresh if games have been added
    let html = formatAIContent(state.currentTeamData.aiInsights.text);

    const staleWarning =
      currentGameCount > gameCountAtGen
        ? `<div class="ai-stale-warning" style="background: var(--warning-bg); padding: 8px 12px; border-radius: 8px; margin-bottom: 12px; font-size: 13px;">New games played since last analysis. Consider refreshing.</div>`
        : '';

    container.innerHTML =
      staleWarning +
      '<div class="ai-insights-content">' +
      html +
      '</div>' +
      '<div class="ai-meta" style="margin-top: 12px; font-size: 12px; color: var(--text-tertiary);">Generated: ' +
      escapeHtml(cachedDate) +
      ' (after ' +
      gameCountAtGen +
      ' games)</div>' +
      '<div style="display: flex; gap: 8px; margin-top: 12px;"><button class="btn btn-secondary" onclick="shareAIReport(\'season\')">Share</button>' +
      '<button class="btn btn-secondary" onclick="fetchAIInsights(true)">Refresh Insights</button></div>' +
      renderAIFeedback('season');
    return;
  }

  // Show loading state
  container.innerHTML = '<div class="ai-loading"><div class="spinner"></div><p>Analyzing team data...</p></div>';

  try {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
    const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;

    // Build rich analytics payload for Gemini
    if (!state.analytics || !state.analytics.advanced) {
      throw new Error('No analytics data available. Play some games first!');
    }
    const { advanced, leaderboards, combinations } = state.analytics;
    // Exclude fill-in players from season-level AI analysis
    const fillInNames = new Set(state.currentTeamData.players.filter((p) => p.fillIn).map((p) => p.name));
    const analyticsPayload = {
      teamName: state.currentTeam.teamName,
      players: state.currentTeamData.players
        .filter((p) => !p.fillIn)
        .map((p) => ({
          name: p.name,
          favPosition: p.favPosition || null,
        })),
      // Team performance summary
      record: {
        wins: advanced.wins,
        losses: advanced.losses,
        draws: advanced.draws,
        gameCount: advanced.gameCount,
        winRate: advanced.winRate,
      },
      // Scoring summary
      scoring: {
        goalsFor: advanced.goalsFor,
        goalsAgainst: advanced.goalsAgainst,
        goalDiff: advanced.goalDiff,
        avgFor: advanced.avgFor,
        avgAgainst: advanced.avgAgainst,
      },
      // Form and momentum
      form: advanced.form, // Last 5 games: ['W', 'L', 'W', ...]
      // Quarter analysis
      quarterAnalysis: {
        bestQuarter: advanced.bestQuarter,
        bestQuarterDiff: advanced.bestQuarterDiff,
        stats: advanced.quarterStats,
      },
      // Game-by-game results (with opponent ladder rank when available)
      gameResults: advanced.gameResults.map((g) => {
        const opp = getOpponentDifficulty(g.opponent);
        return {
          round: g.round,
          opponent: g.opponent,
          score: `${g.us}-${g.them}`,
          result: g.result,
          diff: g.diff,
          opponentRank: opp ? `${opp.position}/${opp.totalTeams}` : null,
        };
      }),
      // Top performers (limit to top 5 each, excluding fill-in players)
      leaderboards: {
        topScorers: leaderboards.offensive.topScorersByTotal
          .filter((s) => !fillInNames.has(s.name))
          .slice(0, 5)
          .map((s) => ({
            name: s.name,
            goals: s.goals,
            quarters: s.quarters,
            avg: s.avg,
          })),
        topScorersByEfficiency: leaderboards.offensive.topScorersByEfficiency
          .filter((s) => !fillInNames.has(s.name))
          .slice(0, 3)
          .map((s) => ({
            name: s.name,
            avg: s.avg,
            quarters: s.quarters,
          })),
        topScoringPairs: leaderboards.offensive.topScoringPairsByTotal
          .filter((p) => !p.players.some((name) => fillInNames.has(name)))
          .slice(0, 3)
          .map((p) => ({
            players: p.players.join(' & '),
            goals: p.goals,
            quarters: p.quarters,
            avg: p.avg,
          })),
        topDefenders: leaderboards.defensive.topDefendersByEfficiency
          .filter((d) => !fillInNames.has(d.name))
          .slice(0, 3)
          .map((d) => ({
            name: d.name,
            goalsAgainst: d.goalsAgainst,
            quarters: d.quarters,
            avg: d.avg,
          })),
        topDefensivePairs: leaderboards.defensive.topDefensivePairsByEfficiency
          .filter((p) => !p.players.some((name) => fillInNames.has(name)))
          .slice(0, 3)
          .map((p) => ({
            players: p.players.join(' & '),
            goalsAgainst: p.goalsAgainst,
            quarters: p.quarters,
            avg: p.avg,
          })),
      },
      // Best lineup combinations (excluding units with fill-in players)
      combinations: {
        bestAttackingUnit: (() => {
          const unit = combinations.attackingUnits.find(
            (u) => !Object.values(u.players).some((name) => fillInNames.has(name))
          );
          return unit
            ? { players: unit.players, quarters: unit.quarters, avgFor: unit.avgFor, plusMinus: unit.plusMinus }
            : null;
        })(),
        bestDefensiveUnit: (() => {
          const unit = combinations.defensiveUnits.find(
            (u) => !Object.values(u.players).some((name) => fillInNames.has(name))
          );
          return unit
            ? { players: unit.players, quarters: unit.quarters, avgAgainst: unit.avgAgainst, plusMinus: unit.plusMinus }
            : null;
        })(),
      },
      // Strength of schedule context (if ladder data available)
      strengthOfSchedule: (() => {
        const sos = calculateStrengthOfSchedule();
        if (!sos) return null;
        return {
          rating: sos.rating,
          label: sos.label,
          avgOpponentPosition: sos.avgPosition,
          gamesMatched: sos.gamesWithData,
        };
      })(),
      // Division results context — opponent W-L records for AI to interpret
      divisionContext: (() => {
        if (!state.divisionResults || state.divisionResults.length === 0) return null;
        const teamRecords = {};
        state.divisionResults.forEach((round) => {
          (round.matches || []).forEach((m) => {
            if (m.status !== 'ended' && m.status !== 'normal') return;
            [m.team1, m.team2].forEach((t) => {
              if (t && !teamRecords[t]) teamRecords[t] = { w: 0, l: 0, d: 0 };
            });
            if (m.score1 != null && m.score2 != null) {
              if (m.score1 > m.score2) {
                teamRecords[m.team1].w++;
                teamRecords[m.team2].l++;
              } else if (m.score1 < m.score2) {
                teamRecords[m.team1].l++;
                teamRecords[m.team2].w++;
              } else {
                teamRecords[m.team1].d++;
                teamRecords[m.team2].d++;
              }
            }
          });
        });
        return Object.entries(teamRecords).map(([team, r]) => ({ team, record: `${r.w}-${r.l}-${r.d}` }));
      })(),
    };

    // Rate limit check (prevent quota abuse)
    if (!window._lastSeasonAICall) window._lastSeasonAICall = 0;
    const now = Date.now();
    if (!forceRefresh && now - window._lastSeasonAICall < 5000) {
      const waitSec = Math.ceil((5000 - (now - window._lastSeasonAICall)) / 1000);
      window.showToast(`Please wait ${waitSec}s before refreshing`, 'info');
      return;
    }
    window._lastSeasonAICall = now;

    // POST analytics to backend (text/plain avoids CORS preflight with Apps Script)
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        api: true,
        action: 'getAIInsights',
        teamID: state.currentTeam.teamID,
        sheetName: state.currentTeam.sheetName,
        analytics: analyticsPayload,
      }),
      redirect: 'follow',
    });
    const data = await response.json();

    if (data.success && data.insights) {
      // Save to team data
      const currentGameCount = state.analytics?.advanced?.gameCount || 0;
      state.currentTeamData.aiInsights = {
        text: data.insights,
        generatedAt: new Date().toISOString(),
        gameCount: currentGameCount,
      };

      // Save and sync to API
      saveToLocalStorage();
      await syncToGoogleSheets();

      // Convert markdown-style formatting to HTML
      let html = formatAIContent(data.insights);

      container.innerHTML =
        '<div class="ai-insights-content">' +
        html +
        '</div>' +
        '<div class="ai-meta" style="margin-top: 12px; font-size: 12px; color: var(--text-tertiary);">Generated: ' +
        new Date().toLocaleDateString('en-AU') +
        ' (after ' +
        currentGameCount +
        ' games)</div>' +
        '<div style="display: flex; gap: 8px; margin-top: 12px;"><button class="btn btn-secondary" onclick="shareAIReport(\'season\')">Share</button>' +
        '<button class="btn btn-secondary" onclick="fetchAIInsights(true)">Refresh Insights</button></div>' +
        renderAIFeedback('season');

      window.showToast('AI insights saved', 'success');
    } else {
      throw new Error(data.error || 'Failed to get insights');
    }
  } catch (err) {
    console.error('[AI Insights] Error:', err);
    container.innerHTML =
      '<div class="ai-error"><p>Failed to get insights: ' +
      escapeHtml(err.message) +
      '</p>' +
      '<button class="btn btn-primary" onclick="fetchAIInsights(true)">Try Again</button></div>';
  }
};

// ========================================
// SEASON STRATEGIST
// ========================================

window.fetchSeasonStrategy = async function (forceRefresh = false) {
  const container = document.getElementById('season-strategy-container');
  if (!state.currentTeam || !state.currentTeamData) {
    window.showToast('No team data loaded', 'error');
    return;
  }

  // Show cached data if available
  if (!forceRefresh && state.currentTeamData.seasonStrategy?.data) {
    _renderSeasonStrategy(
      state.currentTeamData.seasonStrategy.data,
      state.currentTeamData.seasonStrategy.generatedAt
    );
    return;
  }

  container.innerHTML = '<div class="ai-loading"><div class="spinner"></div><p>Generating season strategy (~15 sec)…</p></div>';

  try {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
    const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;
    const url = new URL(baseUrl, isLocalDev ? window.location.origin : undefined);
    url.searchParams.set('api', 'true');
    url.searchParams.set('action', 'generateSeasonStrategist');
    url.searchParams.set('teamID', state.currentTeam.teamID);
    url.searchParams.set('sheetName', state.currentTeam.sheetName);
    if (forceRefresh) url.searchParams.set('forceRefresh', 'true');

    const response = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Strategy generation failed');
    }

    // Cache in state and persist
    state.currentTeamData.seasonStrategy = {
      data: result.data,
      generatedAt: result.generatedAt || new Date().toISOString(),
      cacheUntil: result.cacheUntil,
    };
    saveToLocalStorage();

    _renderSeasonStrategy(result.data, state.currentTeamData.seasonStrategy.generatedAt);
  } catch (err) {
    console.error('[SeasonStrategy] Error:', err);
    if (container) {
      container.innerHTML =
        '<div class="ai-error"><p>Failed to get strategy: ' +
        escapeHtml(err.message) +
        '</p><button class="btn btn-primary" onclick="fetchSeasonStrategy(true)">Try Again</button></div>';
    }
  }
};

function _renderSeasonStrategy(data, generatedAt) {
  const container = document.getElementById('season-strategy-container');
  if (!container) return;

  const pos = data.competitivePosition || {};
  const trendIcon = pos.trend === 'improving' ? '↑' : pos.trend === 'declining' ? '↓' : '→';
  const trendClass = pos.trend === 'improving' ? 'trend-up' : pos.trend === 'declining' ? 'trend-down' : 'trend-stable';

  const strengthCards = (data.strengths || []).map(s => `
    <div class="strategy-item">
      <div class="strategy-item-title">${escapeHtml(s.strength || '')}</div>
      <div class="strategy-item-sub">${escapeHtml(s.tacticalUse || '')}</div>
    </div>
  `).join('');

  const vulnCards = (data.vulnerabilities || []).map(v => {
    const sev = v.severity || 'low';
    const sevClass = sev === 'high' ? 'sev-high' : sev === 'medium' ? 'sev-med' : 'sev-low';
    return `
      <div class="strategy-item">
        <div class="strategy-item-header">
          <span class="strategy-item-title">${escapeHtml(v.vulnerability || '')}</span>
          <span class="strategy-sev ${sevClass}">${escapeHtml(sev)}</span>
        </div>
        ${v.timeline ? `<div class="strategy-item-sub">${escapeHtml(v.timeline)}</div>` : ''}
        ${v.mitigation ? `<div class="strategy-item-mitigation">${escapeHtml(v.mitigation)}</div>` : ''}
      </div>
    `;
  }).join('');

  const genDate = generatedAt
    ? new Date(generatedAt).toLocaleDateString('en-AU')
    : '';

  container.innerHTML = `
    <div class="strategy-position-card">
      <div class="strategy-position-row">
        <span class="strategy-position-label">Position</span>
        <span class="strategy-position-value">${escapeHtml(pos.ladder || '—')}</span>
        <span class="strategy-trend ${trendClass}">${trendIcon} ${escapeHtml(pos.trend || '')}</span>
      </div>
      ${pos.realisticGoal ? `<div class="strategy-goal">${escapeHtml(pos.realisticGoal)}</div>` : ''}
      ${pos.path ? `<div class="strategy-path">${escapeHtml(pos.path)}</div>` : ''}
    </div>

    ${strengthCards ? `
    <div class="strategy-group">
      <div class="strategy-group-title">Strengths</div>
      ${strengthCards}
    </div>` : ''}

    ${vulnCards ? `
    <div class="strategy-group">
      <div class="strategy-group-title">Vulnerabilities</div>
      ${vulnCards}
    </div>` : ''}

    ${data.mentality ? `
    <div class="strategy-mentality">
      <div class="strategy-group-title">Mental Focus</div>
      <p>${escapeHtml(data.mentality)}</p>
    </div>` : ''}

    <div class="ai-meta" style="margin-top:12px;font-size:12px;color:var(--text-tertiary)">
      ${genDate ? `Generated: ${escapeHtml(genDate)}` : ''}
    </div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn btn-secondary" onclick="fetchSeasonStrategy(true)">Refresh Strategy</button>
    </div>
  `;
}

// Show game AI summary in modal
window.showGameAISummary = async function (forceRefresh = false) {
  const game = state.currentGame;
  if (!game) {
    window.showToast('No game selected', 'error');
    return;
  }

  // Check if game has scores
  let hasScores = false;
  if (game.lineup) {
    ['Q1', 'Q2', 'Q3', 'Q4'].forEach((q) => {
      const qData = game.lineup[q] || {};
      if (qData.ourGsGoals || qData.ourGaGoals || qData.oppGsGoals || qData.oppGaGoals) {
        hasScores = true;
      }
    });
  }
  if (!hasScores && game.scores) {
    hasScores = true;
  }

  if (!hasScores) {
    window.showToast('No game data to analyze yet', 'info');
    return;
  }

  // Show modal with loading state
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  const modalFooter = document.getElementById('modal-footer');

  modalTitle.textContent = `Round ${game.round} AI Summary`;
  modalBody.innerHTML = '<div class="ai-loading"><div class="spinner"></div><p>Analyzing game performance...</p></div>';
  modalFooter.innerHTML = '';
  document.getElementById('modal-backdrop').classList.remove('hidden');

  // Check for cached summary (unless forcing refresh)
  if (!forceRefresh && game.aiSummary && game.aiSummary.text) {
    const cachedDate = new Date(game.aiSummary.generatedAt).toLocaleDateString('en-AU');
    displayGameAISummary(game.aiSummary.text, cachedDate);
    return;
  }

  try {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
    const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;

    // Build game analysis payload
    const gamePayload = buildGameAnalysisPayload(game);

    // POST to backend (text/plain avoids CORS preflight with Apps Script)
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        api: true,
        action: 'getGameAIInsights',
        teamID: state.currentTeam.teamID,
        sheetName: state.currentTeam.sheetName,
        gameData: gamePayload,
      }),
      redirect: 'follow',
    });
    const data = await response.json();

    if (data.success && data.insights) {
      // Save to game record
      game.aiSummary = {
        text: data.insights,
        generatedAt: new Date().toISOString(),
      };

      // Save and sync immediately (not debounced) to persist across devices
      saveToLocalStorage();
      await syncToGoogleSheets();

      displayGameAISummary(data.insights, 'just now');
      window.showToast('AI summary saved', 'success');
    } else {
      throw new Error(data.error || 'Failed to get game insights');
    }
  } catch (err) {
    console.error('[Game AI Summary] Error:', err);
    modalBody.innerHTML = '<div class="ai-error"><p>Failed to get insights: ' + escapeHtml(err.message) + '</p></div>';
    modalFooter.innerHTML =
      '<button class="btn btn-primary" onclick="showGameAISummary(true)">Try Again</button>' +
      '<button class="btn btn-secondary" onclick="closeModal()">Close</button>';
  }
};

function displayGameAISummary(text, generatedDate) {
  const modalBody = document.getElementById('modal-body');
  const modalFooter = document.getElementById('modal-footer');

  // Convert markdown to HTML
  let html = formatAIContent(text);

  modalBody.innerHTML = `
    <div class="ai-insights-content">${html}</div>
    <div class="ai-meta" style="margin-top: 12px; font-size: 12px; color: var(--text-tertiary);">
      Generated: ${escapeHtml(generatedDate)}
    </div>
    ${renderAIFeedback('game')}
  `;
  modalFooter.innerHTML = `
    <button class="btn btn-secondary" onclick="showGameAISummary(true)">Regenerate</button>
    <button class="btn btn-secondary" onclick="shareAIReport('game')">Share</button>
    <button class="btn btn-primary" onclick="closeModal()">Close</button>
  `;
}

function buildGameAnalysisPayload(game) {
  const teamName = state.currentTeam?.teamName || 'Team';
  const players = state.currentTeamData?.players || [];

  // Calculate total scores
  let ourTotal = 0,
    theirTotal = 0;
  const quarterBreakdown = [];
  const playerContributions = {};

  ['Q1', 'Q2', 'Q3', 'Q4'].forEach((q) => {
    const qData = game.lineup?.[q] || {};
    const qUs = (qData.ourGsGoals || 0) + (qData.ourGaGoals || 0);
    const qThem = (qData.oppGsGoals || 0) + (qData.oppGaGoals || 0);
    ourTotal += qUs;
    theirTotal += qThem;

    quarterBreakdown.push({
      quarter: q,
      us: qUs,
      them: qThem,
      diff: qUs - qThem,
      lineup: {},
      notes: qData.notes || '',
    });

    // Track player contributions per position
    ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'].forEach((pos) => {
      const playerName = qData[pos];
      if (playerName) {
        if (!playerContributions[playerName]) {
          playerContributions[playerName] = {
            name: playerName,
            quarters: 0,
            positions: [],
            goalsScored: 0,
            quartersAtGS: 0,
            quartersAtGA: 0,
            quartersDefending: 0,
          };
        }
        playerContributions[playerName].quarters++;
        if (!playerContributions[playerName].positions.includes(pos)) {
          playerContributions[playerName].positions.push(pos);
        }

        // Track scoring positions
        if (pos === 'GS') {
          playerContributions[playerName].goalsScored += qData.ourGsGoals || 0;
          playerContributions[playerName].quartersAtGS++;
        }
        if (pos === 'GA') {
          playerContributions[playerName].goalsScored += qData.ourGaGoals || 0;
          playerContributions[playerName].quartersAtGA++;
        }
        if (pos === 'GD' || pos === 'GK') {
          playerContributions[playerName].quartersDefending++;
        }

        quarterBreakdown[quarterBreakdown.length - 1].lineup[pos] = playerName;
      }
    });
  });

  // Use saved scores as fallback
  if (ourTotal === 0 && theirTotal === 0 && game.scores) {
    ourTotal = game.scores.us || 0;
    theirTotal = game.scores.opponent || 0;
  }

  const result = ourTotal > theirTotal ? 'Win' : ourTotal < theirTotal ? 'Loss' : 'Draw';

  // Collect coach notes from all quarters
  const coachNotes = quarterBreakdown
    .filter((q) => q.notes && q.notes.trim())
    .map((q) => ({ quarter: q.quarter, notes: q.notes.trim() }));

  // Opponent ladder difficulty (if available)
  const opponentDifficulty = getOpponentDifficulty(game.opponent);

  return {
    teamName,
    round: game.round,
    opponent: game.opponent,
    date: game.date,
    location: game.location || '',
    finalScore: { us: ourTotal, them: theirTotal },
    result,
    scoreDiff: ourTotal - theirTotal,
    captain: game.captain || null,
    quarterBreakdown,
    playerContributions: Object.values(playerContributions).sort(
      (a, b) => b.goalsScored - a.goalsScored || b.quarters - a.quarters
    ),
    rosterSize: players.length,
    coachNotes: coachNotes,
    opponentDifficulty: opponentDifficulty,
  };
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
      if (sort.column === 'goals') {
        aVal = a.goals;
        bVal = b.goals;
      } else if (sort.column === 'goalsAgainst') {
        aVal = a.goalsAgainst;
        bVal = b.goalsAgainst;
      } else if (sort.column === 'avg') {
        aVal = a.avg;
        bVal = b.avg;
      } else if (sort.column === 'quarters') {
        aVal = a.quarters;
        bVal = b.quarters;
      } else {
        aVal = a[sort.column];
        bVal = b[sort.column];
      }
      return sort.ascending ? aVal - bVal : bVal - aVal;
    });
  };

  // Helper to render expand/collapse button
  const expandButton = (tableName, totalCount) => {
    const isExpanded = tableState.expanded[tableName];
    if (totalCount <= 5) return '';
    return `<button class="leaders-expand-btn" onclick="toggleLeadersTable('${tableName}')">${isExpanded ? 'Show less' : `Show all (${totalCount})`}</button>`;
  };

  const getDisplayCount = (tableName, totalCount) =>
    tableState.expanded[tableName] ? totalCount : Math.min(5, totalCount);

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
          ${
            offensive.topScorersByTotal.length > 0
              ? `
            <div class="leaderboard-player">
              <div class="leaderboard-name">${escapeHtml(offensive.topScorersByTotal[0].name)}</div>
              <div class="leaderboard-stat">${offensive.topScorersByTotal[0].goals} goals</div>
              <div class="leaderboard-detail">${offensive.topScorersByTotal[0].avg} per qtr · ${offensive.topScorersByTotal[0].quarters} qtrs</div>
            </div>
          `
              : '<div class="leaderboard-empty">No data yet</div>'
          }
        </div>
        <div class="leaderboard-card">
          <div class="leaderboard-header">Most Efficient</div>
          ${
            offensive.topScorersByEfficiency.length > 0
              ? `
            <div class="leaderboard-player">
              <div class="leaderboard-name">${escapeHtml(offensive.topScorersByEfficiency[0].name)}</div>
              <div class="leaderboard-stat">${offensive.topScorersByEfficiency[0].avg} per qtr</div>
              <div class="leaderboard-detail">${offensive.topScorersByEfficiency[0].goals} goals · ${offensive.topScorersByEfficiency[0].quarters} qtrs</div>
            </div>
          `
              : `<div class="leaderboard-empty">Min ${minQuarters} qtrs required</div>`
          }
        </div>
        <div class="leaderboard-card">
          <div class="leaderboard-header">Top Scoring Pair</div>
          ${
            offensive.topScoringPairsByTotal.length > 0
              ? `
            <div class="leaderboard-player">
              <div class="leaderboard-name">${escapeHtml(offensive.topScoringPairsByTotal[0].players[0].split(' ')[0])} & ${escapeHtml(offensive.topScoringPairsByTotal[0].players[1].split(' ')[0])}</div>
              <div class="leaderboard-stat">${offensive.topScoringPairsByTotal[0].goals} goals</div>
              <div class="leaderboard-detail">${offensive.topScoringPairsByTotal[0].avg} per qtr · ${offensive.topScoringPairsByTotal[0].quarters} qtrs</div>
            </div>
          `
              : '<div class="leaderboard-empty">No data yet</div>'
          }
        </div>
        <div class="leaderboard-card">
          <div class="leaderboard-header">Efficient Pair</div>
          ${
            offensive.topScoringPairsByEfficiency.length > 0
              ? `
            <div class="leaderboard-player">
              <div class="leaderboard-name">${escapeHtml(offensive.topScoringPairsByEfficiency[0].players[0].split(' ')[0])} & ${escapeHtml(offensive.topScoringPairsByEfficiency[0].players[1].split(' ')[0])}</div>
              <div class="leaderboard-stat">${offensive.topScoringPairsByEfficiency[0].avg} per qtr</div>
              <div class="leaderboard-detail">${offensive.topScoringPairsByEfficiency[0].goals} goals · ${offensive.topScoringPairsByEfficiency[0].quarters} qtrs</div>
            </div>
          `
              : `<div class="leaderboard-empty">Min ${minQuarters} qtrs required</div>`
          }
        </div>
      </div>
    </div>

    <!-- Defensive Leaders -->
    <div class="stats-section">
      <div class="stats-section-title">Defensive Leaders</div>
      <div class="leaderboard-grid">
        <div class="leaderboard-card defensive">
          <div class="leaderboard-header">Top Defender</div>
          ${
            defensive.topDefendersByTotal.length > 0
              ? `
            <div class="leaderboard-player">
              <div class="leaderboard-name">${escapeHtml(defensive.topDefendersByTotal[0].name)}</div>
              <div class="leaderboard-stat">${defensive.topDefendersByTotal[0].avg} GA/qtr</div>
              <div class="leaderboard-detail">${defensive.topDefendersByTotal[0].goalsAgainst} conceded · ${defensive.topDefendersByTotal[0].quarters} qtrs</div>
            </div>
          `
              : '<div class="leaderboard-empty">No data yet</div>'
          }
        </div>
        <div class="leaderboard-card defensive">
          <div class="leaderboard-header">Most Efficient</div>
          ${
            defensive.topDefendersByEfficiency.length > 0
              ? `
            <div class="leaderboard-player">
              <div class="leaderboard-name">${escapeHtml(defensive.topDefendersByEfficiency[0].name)}</div>
              <div class="leaderboard-stat">${defensive.topDefendersByEfficiency[0].avg} GA/qtr</div>
              <div class="leaderboard-detail">${defensive.topDefendersByEfficiency[0].goalsAgainst} conceded · ${defensive.topDefendersByEfficiency[0].quarters} qtrs</div>
            </div>
          `
              : `<div class="leaderboard-empty">Min ${minQuarters} qtrs required</div>`
          }
        </div>
        <div class="leaderboard-card defensive">
          <div class="leaderboard-header">Top Defensive Pair</div>
          ${
            defensive.topDefensivePairsByTotal.length > 0
              ? `
            <div class="leaderboard-player">
              <div class="leaderboard-name">${escapeHtml(defensive.topDefensivePairsByTotal[0].players[0].split(' ')[0])} & ${escapeHtml(defensive.topDefensivePairsByTotal[0].players[1].split(' ')[0])}</div>
              <div class="leaderboard-stat">${defensive.topDefensivePairsByTotal[0].avg} GA/qtr</div>
              <div class="leaderboard-detail">${defensive.topDefensivePairsByTotal[0].goalsAgainst} conceded · ${defensive.topDefensivePairsByTotal[0].quarters} qtrs</div>
            </div>
          `
              : '<div class="leaderboard-empty">No data yet</div>'
          }
        </div>
        <div class="leaderboard-card defensive">
          <div class="leaderboard-header">Efficient Pair</div>
          ${
            defensive.topDefensivePairsByEfficiency.length > 0
              ? `
            <div class="leaderboard-player">
              <div class="leaderboard-name">${escapeHtml(defensive.topDefensivePairsByEfficiency[0].players[0].split(' ')[0])} & ${escapeHtml(defensive.topDefensivePairsByEfficiency[0].players[1].split(' ')[0])}</div>
              <div class="leaderboard-stat">${defensive.topDefensivePairsByEfficiency[0].avg} GA/qtr</div>
              <div class="leaderboard-detail">${defensive.topDefensivePairsByEfficiency[0].goalsAgainst} conceded · ${defensive.topDefensivePairsByEfficiency[0].quarters} qtrs</div>
            </div>
          `
              : `<div class="leaderboard-empty">Min ${minQuarters} qtrs required</div>`
          }
        </div>
      </div>
    </div>

    <!-- All Scorers List -->
    <div class="stats-section">
      <div class="stats-section-title">All Scorers</div>
      ${
        scorersData.length > 0
          ? `
        <div class="scorers-table">
          <div class="scorers-table-header">
            <span class="col-rank">#</span>
            <span class="col-name">Player</span>
            ${sortHeader('scorers', 'goals', 'Goals')}
            ${sortHeader('scorers', 'avg', 'Avg')}
            ${sortHeader('scorers', 'quarters', 'Qtrs')}
          </div>
          ${scorersData
            .slice(0, getDisplayCount('scorers', scorersData.length))
            .map(
              (p, i) => `
            <div class="scorers-table-row ${i === 0 ? 'top' : ''}">
              <span class="col-rank">${i + 1}</span>
              <span class="col-name">${escapeHtml(p.name)}</span>
              <span class="col-goals">${p.goals}</span>
              <span class="col-avg">${p.avg}</span>
              <span class="col-quarters">${p.quarters}</span>
            </div>
          `
            )
            .join('')}
        </div>
        ${expandButton('scorers', scorersData.length)}
      `
          : '<div class="empty-state"><p>No scorers yet</p></div>'
      }
    </div>

    <!-- All Defenders List -->
    <div class="stats-section">
      <div class="stats-section-title">All Defenders</div>
      ${
        defendersData.length > 0
          ? `
        <div class="scorers-table">
          <div class="scorers-table-header">
            <span class="col-rank">#</span>
            <span class="col-name">Player</span>
            ${sortHeader('defenders', 'goalsAgainst', 'GA')}
            ${sortHeader('defenders', 'avg', 'Avg')}
            ${sortHeader('defenders', 'quarters', 'Qtrs')}
          </div>
          ${defendersData
            .slice(0, getDisplayCount('defenders', defendersData.length))
            .map(
              (p, i) => `
            <div class="scorers-table-row ${i === 0 ? 'top' : ''}">
              <span class="col-rank">${i + 1}</span>
              <span class="col-name">${escapeHtml(p.name)}</span>
              <span class="col-goalsAgainst">${p.goalsAgainst}</span>
              <span class="col-avg">${p.avg}</span>
              <span class="col-quarters">${p.quarters}</span>
            </div>
          `
            )
            .join('')}
        </div>
        ${expandButton('defenders', defendersData.length)}
      `
          : '<div class="empty-state"><p>No defenders yet</p></div>'
      }
    </div>

    <!-- Goaling Pair Averages -->
    <div class="stats-section">
      <div class="stats-section-title">Goaling Pair Averages</div>
      ${
        goalingPairsData.length > 0
          ? `
        <div class="scorers-table">
          <div class="scorers-table-header">
            <span class="col-rank">#</span>
            <span class="col-name">Pair</span>
            ${sortHeader('goalingPairs', 'avg', 'Avg/Qtr')}
            ${sortHeader('goalingPairs', 'goals', 'Goals')}
            ${sortHeader('goalingPairs', 'quarters', 'Qtrs')}
          </div>
          ${goalingPairsData
            .slice(0, getDisplayCount('goalingPairs', goalingPairsData.length))
            .map(
              (p, i) => `
            <div class="scorers-table-row ${i === 0 ? 'top' : ''}">
              <span class="col-rank">${i + 1}</span>
              <span class="col-name">${escapeHtml(p.players[0].split(' ')[0])} & ${escapeHtml(p.players[1].split(' ')[0])}</span>
              <span class="col-avg">${p.avg}</span>
              <span class="col-goals">${p.goals}</span>
              <span class="col-quarters">${p.quarters}</span>
            </div>
          `
            )
            .join('')}
        </div>
        ${expandButton('goalingPairs', goalingPairsData.length)}
      `
          : '<div class="empty-state"><p>No goaling pairs yet</p></div>'
      }
    </div>

    <!-- Defending Pair Averages -->
    <div class="stats-section">
      <div class="stats-section-title">Defending Pair Averages</div>
      ${
        defendingPairsData.length > 0
          ? `
        <div class="scorers-table">
          <div class="scorers-table-header">
            <span class="col-rank">#</span>
            <span class="col-name">Pair</span>
            ${sortHeader('defendingPairs', 'avg', 'Avg/Qtr')}
            ${sortHeader('defendingPairs', 'goalsAgainst', 'GA')}
            ${sortHeader('defendingPairs', 'quarters', 'Qtrs')}
          </div>
          ${defendingPairsData
            .slice(0, getDisplayCount('defendingPairs', defendingPairsData.length))
            .map(
              (p, i) => `
            <div class="scorers-table-row ${i === 0 ? 'top' : ''}">
              <span class="col-rank">${i + 1}</span>
              <span class="col-name">${escapeHtml(p.players[0].split(' ')[0])} & ${escapeHtml(p.players[1].split(' ')[0])}</span>
              <span class="col-avg">${p.avg}</span>
              <span class="col-goalsAgainst">${p.goalsAgainst}</span>
              <span class="col-quarters">${p.quarters}</span>
            </div>
          `
            )
            .join('')}
        </div>
        ${expandButton('defendingPairs', defendingPairsData.length)}
      `
          : '<div class="empty-state"><p>No defending pairs yet</p></div>'
      }
    </div>
  `;
}

// Sort leaders table by column
window.sortLeadersTable = function (tableName, column) {
  const sort = state.leadersTableState.sort[tableName];
  if (sort.column === column) {
    sort.ascending = !sort.ascending;
  } else {
    sort.column = column;
    // For defensive stats, ascending is better (lower = better), except quarters
    if (tableName === 'defenders' || tableName === 'defendingPairs') {
      sort.ascending = column === 'quarters' ? false : true;
    } else {
      sort.ascending = false;
    }
  }
  const container = document.getElementById('stats-tab-content');
  if (container) renderStatsLeaders(container);
};

// Toggle expand/collapse for leaders table
window.toggleLeadersTable = function (tableName) {
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
      ${
        attackingUnits.length > 0
          ? `
        <div class="units-table">
          <div class="units-table-header">
            <span class="col-players">Players</span>
            <span class="col-qtrs">Qtrs</span>
            <span class="col-gf">GF/Q</span>
            <span class="col-pm">+/-</span>
          </div>
          ${attackingUnits
            .slice(0, 8)
            .map(
              (u, i) => `
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
          `
            )
            .join('')}
        </div>
      `
          : `<div class="empty-state"><p>Min ${minQuarters} quarters together required</p></div>`
      }
    </div>

    <!-- Defensive Units -->
    <div class="stats-section">
      <div class="stats-section-title">Defensive Units (GK-GD-WD-C)</div>
      ${
        defensiveUnits.length > 0
          ? `
        <div class="units-table">
          <div class="units-table-header">
            <span class="col-players">Players</span>
            <span class="col-qtrs">Qtrs</span>
            <span class="col-ga">GA/Q</span>
            <span class="col-pm">+/-</span>
          </div>
          ${defensiveUnits
            .slice(0, 8)
            .map(
              (u, i) => `
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
          `
            )
            .join('')}
        </div>
      `
          : `<div class="empty-state"><p>Min ${minQuarters} quarters together required</p></div>`
      }
    </div>

    <!-- Position Pairings -->
    <div class="stats-section">
      <div class="stats-section-title">Position Pairings</div>

      <div class="pairings-grid">
        <!-- Offensive Pairings -->
        <div class="pairings-column">
          <div class="pairings-header">Offensive</div>
          ${
            pairings.offensive.length > 0
              ? pairings.offensive
                  .slice(0, 5)
                  .map(
                    (p) => `
            <div class="pairing-row">
              <span class="pairing-pos">${escapeHtml(p.positions)}</span>
              <span class="pairing-names">${escapeHtml(p.players[0].split(' ')[0])} & ${escapeHtml(p.players[1].split(' ')[0])}</span>
              <span class="pairing-stat text-success">${p.avgFor} GF/Q</span>
            </div>
          `
                  )
                  .join('')
              : '<div class="pairing-empty">No data</div>'
          }
        </div>

        <!-- Defensive Pairings -->
        <div class="pairings-column">
          <div class="pairings-header">Defensive</div>
          ${
            pairings.defensive.length > 0
              ? pairings.defensive
                  .slice(0, 5)
                  .map(
                    (p) => `
            <div class="pairing-row">
              <span class="pairing-pos">${escapeHtml(p.positions)}</span>
              <span class="pairing-names">${escapeHtml(p.players[0].split(' ')[0])} & ${escapeHtml(p.players[1].split(' ')[0])}</span>
              <span class="pairing-stat text-error">${p.avgAgainst} GA/Q</span>
            </div>
          `
                  )
                  .join('')
              : '<div class="pairing-empty">No data</div>'
          }
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

  const players = team.players.filter((p) => !p.fillIn);
  const games = team.games.filter((g) => g.availablePlayerIDs || g.lineup);

  if (games.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No games with attendance data yet</p></div>';
    return;
  }

  // Calculate attendance stats per player
  const attendanceStats = players
    .map((player) => {
      let available = 0;
      let played = 0;

      games.forEach((game) => {
        // Check if player was available
        const wasAvailable = game.availablePlayerIDs?.includes(player.id);
        if (wasAvailable) available++;

        // Check if player actually played (in any quarter lineup)
        if (game.lineup) {
          const playedInGame = ['Q1', 'Q2', 'Q3', 'Q4'].some((q) => {
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
        playedRate,
      };
    })
    .sort((a, b) => b.attendanceRate - a.attendanceRate);

  // Calculate team averages
  const avgAttendance =
    attendanceStats.length > 0
      ? Math.round(attendanceStats.reduce((sum, p) => sum + p.attendanceRate, 0) / attendanceStats.length)
      : 0;

  // Find most/least reliable
  const mostReliable = attendanceStats.filter((p) => p.attendanceRate >= 80);
  const needsAttention = attendanceStats.filter((p) => p.attendanceRate < 50 && p.totalGames >= 2);

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
        ${attendanceStats
          .map(
            (p) => `
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
        `
          )
          .join('')}
      </div>
    </div>

    ${
      needsAttention.length > 0
        ? `
    <!-- Needs Attention -->
    <div class="stats-section">
      <div class="stats-section-title">Needs Follow-up</div>
      <div class="attention-list">
        ${needsAttention
          .map(
            (p) => `
          <div class="attention-item">
            <span class="attention-name">${escapeHtml(p.name)}</span>
            <span class="attention-stat">${p.attendanceRate}% attendance (${p.available}/${p.totalGames} games)</span>
          </div>
        `
          )
          .join('')}
      </div>
      <p class="attention-note">These players have attended less than 50% of games</p>
    </div>
    `
        : ''
    }
  `;
}

function renderStatsPositions(container) {
  const team = state.currentTeamData;
  if (!team || !team.players || !team.games) {
    container.innerHTML = '<div class="empty-state"><p>No data available</p></div>';
    return;
  }

  const players = team.players.filter((p) => !p.fillIn);
  const games = team.games.filter((g) => g.lineup && g.status === 'normal');

  if (games.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No completed games yet</p></div>';
    return;
  }

  const positions = ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'];

  // Calculate position tracking for each player
  const positionStats = players
    .map((player) => {
      const positionCounts = {
        GS: 0,
        GA: 0,
        WA: 0,
        C: 0,
        WD: 0,
        GD: 0,
        GK: 0,
      };
      let totalQuarters = 0;
      let offQuarters = 0;
      let captainCount = 0;

      games.forEach((game) => {
        if (!game.lineup) return;

        let playedInGame = false;
        let quartersOnCourt = 0;

        ['Q1', 'Q2', 'Q3', 'Q4'].forEach((quarter) => {
          const qData = game.lineup[quarter];
          if (!qData) return;

          let playedThisQuarter = false;
          positions.forEach((pos) => {
            if (qData[pos] === player.name) {
              positionCounts[pos]++;
              totalQuarters++;
              playedThisQuarter = true;
              playedInGame = true;
              quartersOnCourt++;
            }
          });
        });

        // Count quarters off for games where the player was selected
        if (playedInGame) {
          offQuarters += 4 - quartersOnCourt;
        }

        // Count captain assignments
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
        positionsPlayed: positions.filter((p) => positionCounts[p] > 0).length,
      };
    })
    .sort((a, b) => b.totalQuarters - a.totalQuarters);

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
          ${positions
            .map(
              (pos) => `
            <div class="pos-grid-header pos-grid-pos">${escapeHtml(pos)}</div>
          `
            )
            .join('')}
          <div class="pos-grid-header pos-grid-pos pos-grid-off">Off</div>
          <div class="pos-grid-header pos-grid-pos pos-grid-capt">C</div>
          <div class="pos-grid-header pos-grid-total">Total</div>

          <!-- Player Rows -->
          ${positionStats
            .map((player) => {
              const hasGaps = player.positionsPlayed < 7;
              return `
              <div class="pos-grid-name ${hasGaps ? 'needs-exposure' : ''}">${escapeHtml(player.name.split(' ')[0])}</div>
              ${positions
                .map((pos) => {
                  const count = player.positionCounts[pos];
                  const favPositions = normalizeFavPositions(player.favPosition);
                  const isFav = favPositions.includes(pos);
                  return `
                  <div class="pos-grid-cell ${count > 0 ? 'played' : 'unplayed'} ${isFav ? 'favorite' : ''}">
                    ${count > 0 ? count : '—'}
                  </div>
                `;
                })
                .join('')}
              <div class="pos-grid-cell pos-grid-off-cell ${player.offQuarters > 0 ? 'has-off' : 'unplayed'}">${player.offQuarters > 0 ? player.offQuarters : '—'}</div>
              <div class="pos-grid-cell pos-grid-capt-cell ${player.captainCount > 0 ? 'has-captain' : 'unplayed'}">${player.captainCount > 0 ? player.captainCount : '—'}</div>
              <div class="pos-grid-total">${player.totalQuarters}</div>
            `;
            })
            .join('')}
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
      ${
        positionStats.filter((p) => p.positionsPlayed < 7).length > 0
          ? `
        <div class="insight-box warning">
          <div class="insight-title">Players Needing Position Exposure</div>
          <div class="insight-list">
            ${positionStats
              .filter((p) => p.positionsPlayed < 7)
              .map((player) => {
                const missingPositions = positions.filter((pos) => player.positionCounts[pos] === 0);
                return `
                <div class="insight-item">
                  <span class="insight-name">${escapeHtml(player.name)}</span>
                  <span class="insight-detail">Needs: ${missingPositions.join(', ')}</span>
                </div>
              `;
              })
              .join('')}
          </div>
        </div>
      `
          : `
        <div class="insight-box success">
          <div class="insight-title">✓ Great work!</div>
          <p>All players have experienced every position this season</p>
        </div>
      `
      }

      ${
        positionStats.filter((p) => p.totalQuarters < (totalPossibleQuarters / players.length) * 0.7).length > 0
          ? `
        <div class="insight-box info">
          <div class="insight-title">Playing Time Watch</div>
          <div class="insight-list">
            ${positionStats
              .filter((p) => p.totalQuarters < (totalPossibleQuarters / players.length) * 0.7)
              .map((player) => {
                const avgQuarters = Math.round(totalPossibleQuarters / players.length);
                return `
                <div class="insight-item">
                  <span class="insight-name">${escapeHtml(player.name)}</span>
                  <span class="insight-detail">${player.totalQuarters} quarters (avg: ${avgQuarters})</span>
                </div>
              `;
              })
              .join('')}
          </div>
        </div>
      `
          : ''
      }
    </div>
  `;
}

// ========================================
// STATS: PATTERNS TAB (Pattern Detector)
// ========================================

function renderStatsPatterns(container) {
  const cached = state.currentTeamData?.patternInsights;

  if (cached && cached.patterns) {
    container.innerHTML = buildPatternHTML(cached);
    return;
  }

  container.innerHTML = `
    <div class="stats-section">
      <div class="stats-section-title">AI Pattern Detector</div>
      <p style="font-size: 14px; color: var(--text-secondary); margin: 0 0 16px;">
        Analyzes recent game-by-game AI summaries to detect multi-game trends in your team's performance.
      </p>
      <div id="pattern-detector-container">
        <button class="btn btn-primary" onclick="fetchPatternDetector()">Generate Patterns</button>
      </div>
    </div>
  `;
}

function buildPatternHTML(data) {
  const cached = data;
  const generatedDate = cached.generatedAt
    ? new Date(cached.generatedAt).toLocaleDateString('en-AU')
    : '';

  const trendBadge = (trend) => {
    const map = {
      improving: 'badge-success',
      declining: 'badge-error',
      consistent: 'badge-info',
      volatile: 'badge-warning',
    };
    return `<span class="badge ${map[trend] || 'badge-info'}">${escapeHtml(trend || '—')}</span>`;
  };

  const patternCard = (label, key) => {
    const p = cached.patterns?.[key];
    if (!p) return '';
    const games = Array.isArray(p.supporting_games) ? p.supporting_games.join(', ') : '';
    return `
      <div class="pattern-card">
        <div class="pattern-card-header">
          <span class="pattern-card-label">${escapeHtml(label)}</span>
          ${trendBadge(p.trend)}
          ${p.confidence != null ? `<span class="pattern-confidence">${Math.round(p.confidence * 100)}%</span>` : ''}
        </div>
        <p class="pattern-card-desc">${escapeHtml(p.description || '')}</p>
        ${games ? `<div class="pattern-card-games">Based on: ${escapeHtml(games)}</div>` : ''}
      </div>
    `;
  };

  const trajectoryRows = (cached.playerTrajectories || [])
    .map(
      (t) => `
    <div class="pattern-trajectory-row">
      <div class="pattern-trajectory-name">${escapeHtml(t.name || '')}</div>
      ${trendBadge(t.trend)}
      <div class="pattern-trajectory-desc">${escapeHtml(t.description || '')}</div>
    </div>
  `
    )
    .join('');

  const comboRows = (cached.combinationEffectiveness || [])
    .map((c) => {
      const players = Array.isArray(c.players) ? c.players.join(' & ') : c.players || '';
      return `
    <div class="pattern-combo-row">
      <div class="pattern-combo-players">${escapeHtml(players)}</div>
      ${trendBadge(c.trend)}
      <div class="pattern-combo-desc">${escapeHtml(c.description || '')}</div>
      ${c.games_together != null ? `<div class="pattern-combo-games">${escapeHtml(c.games_together)} games together</div>` : ''}
    </div>
  `;
    })
    .join('');

  return `
    <div class="stats-section">
      <div class="stats-section-title">AI Pattern Detector</div>
      ${cached.summary ? `<div class="ai-insights-content" style="margin-bottom: 16px;">${escapeHtml(cached.summary)}</div>` : ''}
    </div>

    <div class="stats-section">
      <div class="stats-section-title">Performance Patterns</div>
      <div class="pattern-cards-grid">
        ${patternCard('Closing Games', 'closing')}
        ${patternCard('Defence', 'defense')}
        ${patternCard('Attack', 'attack')}
        ${patternCard('Momentum', 'momentum')}
      </div>
    </div>

    ${
      trajectoryRows
        ? `
    <div class="stats-section">
      <div class="stats-section-title">Player Trajectories</div>
      <div class="pattern-trajectories">
        ${trajectoryRows}
      </div>
    </div>
    `
        : ''
    }

    ${
      comboRows
        ? `
    <div class="stats-section">
      <div class="stats-section-title">Combination Effectiveness</div>
      <div class="pattern-combos">
        ${comboRows}
      </div>
    </div>
    `
        : ''
    }

    <div class="stats-section">
      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
        ${generatedDate ? `<span class="ai-meta" style="font-size: 12px; color: var(--text-tertiary);">Generated: ${escapeHtml(generatedDate)} · ${escapeHtml(String(cached.gamesAnalyzed || 0))} games</span>` : ''}
        <button class="btn btn-secondary" onclick="fetchPatternDetector(true)">Refresh Patterns</button>
      </div>
    </div>
  `;
}

window.fetchPatternDetector = async function (forceRefresh = false) {
  if (!state.currentTeam || !state.currentTeamData) {
    window.showToast('No team data loaded', 'error');
    return;
  }

  const container = document.getElementById('pattern-detector-container');
  const statsTabContent = document.getElementById('stats-tab-content');

  // On force refresh, re-render the full tab with loading inside it
  const loadingTarget = container || statsTabContent;
  if (loadingTarget) {
    loadingTarget.innerHTML = '<div class="ai-loading"><div class="spinner"></div><p>Detecting patterns...</p></div>';
  }

  try {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
    const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;

    const pdUrl = new URL(baseUrl, isLocalDev ? window.location.origin : undefined);
    pdUrl.searchParams.set('api', 'true');
    pdUrl.searchParams.set('action', 'generatePatternDetector');
    pdUrl.searchParams.set('teamID', state.currentTeam.teamID);
    pdUrl.searchParams.set('sheetName', state.currentTeam.sheetName);
    pdUrl.searchParams.set('teamName', state.currentTeam.teamName || '');
    if (forceRefresh) pdUrl.searchParams.set('forceRefresh', 'true');

    const response = await fetch(pdUrl.toString(), { method: 'GET', redirect: 'follow' });
    const data = await response.json();

    // Backend returns { success, data: { patterns, playerTrajectories, ... } }
    const pd = data.data || data;
    if (data.success && pd.patterns) {
      // Cache locally
      state.currentTeamData.patternInsights = {
        patterns: pd.patterns,
        playerTrajectories: pd.playerTrajectories || [],
        combinationEffectiveness: pd.combinationEffectiveness || [],
        summary: pd.summary || '',
        generatedAt: pd.generatedAt || new Date().toISOString(),
        gamesAnalyzed: pd.gameCount || 0,
      };
      saveToLocalStorage();

      // Re-render the full patterns tab
      const content = document.getElementById('stats-tab-content');
      if (content) content.innerHTML = buildPatternHTML(state.currentTeamData.patternInsights);

      if (data.cached) {
        window.showToast('Patterns loaded from cache', 'info');
      } else {
        window.showToast('Pattern analysis complete', 'success');
      }
    } else {
      throw new Error(data.error || 'Pattern detection failed');
    }
  } catch (err) {
    console.error('[Pattern Detector] Error:', err);
    const content = document.getElementById('stats-tab-content');
    if (content) {
      content.innerHTML = `
        <div class="stats-section">
          <div class="stats-section-title">AI Pattern Detector</div>
          <div class="ai-error">
            <p>${escapeHtml(err.message)}</p>
            <button class="btn btn-primary" onclick="fetchPatternDetector(true)">Try Again</button>
          </div>
        </div>
      `;
    }
  }
};

// showMetricDetail — referenced in onclick but not yet implemented
window.showMetricDetail = function (metric) {
  // Form detail view
  if (metric === 'form') {
    const { advanced } = state.analytics;
    if (!advanced || !advanced.gameResults || advanced.gameResults.length === 0) return;

    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalFooter = document.getElementById('modal-footer');

    modalTitle.textContent = 'Recent Form';
    modalBody.innerHTML = `
      <div class="form-detail">
        ${advanced.gameResults
          .slice(-5)
          .reverse()
          .map(
            (g) => `
          <div class="form-detail-row">
            <span class="form-badge ${g.result === 'W' ? 'win' : g.result === 'L' ? 'loss' : 'draw'}">${g.result}</span>
            <span class="form-detail-info">R${escapeHtml(g.round)} vs ${escapeHtml(g.opponent)}</span>
            <span class="form-detail-score">${g.us}-${g.them}</span>
          </div>
        `
          )
          .join('')}
      </div>
    `;
    modalFooter.innerHTML = '<button class="btn btn-primary" onclick="closeModal()">Close</button>';
    document.getElementById('modal-backdrop').classList.remove('hidden');
  }
};
