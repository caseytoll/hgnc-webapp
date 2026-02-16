// ========================================
// SHARED HELPER FUNCTIONS
// ========================================

import { state } from './state.js';
import { API_CONFIG } from './config.js';
import { escapeHtml, escapeAttr } from '../../../../common/utils.js';

// ========================================
// AI CONTENT HELPERS
// ========================================

export function formatAIContent(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n- /g, '\n• ')
    .replace(/\n/g, '<br>');
}

export function renderAIFeedback(type) {
  return `<div class="ai-feedback" id="ai-feedback-${type}">
    <span>Was this helpful?</span>
    <button onclick="rateAIInsights('${type}', 'up', this)">&#128077;</button>
    <button onclick="rateAIInsights('${type}', 'down', this)">&#128078;</button>
  </div>`;
}

window.rateAIInsights = function(type, rating, btn) {
  const container = document.getElementById('ai-feedback-' + type);
  if (!container) return;

  // Log via existing logClientMetric
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
  const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;
  const teamName = state.currentTeam?.teamName || 'unknown';
  const url = baseUrl + '?action=logClientMetric&name=ai_feedback&value=' + encodeURIComponent(rating === 'up' ? 1 : 0) + '&teams=1&extra=' + encodeURIComponent(type + ':' + teamName);
  fetch(url).catch(() => {});

  container.innerHTML = '<span class="ai-feedback-thanks">Thanks for your feedback!</span>';
};

// ========================================
// POSITION HELPERS
// ========================================

export function normalizeFavPositions(favPosition) {
  if (!favPosition) return [];
  if (Array.isArray(favPosition)) return favPosition.filter(p => p);
  if (typeof favPosition === 'string' && favPosition.trim()) return [favPosition.trim()];
  return [];
}

// ========================================
// FIXTURE CONFIG HELPERS
// ========================================

export function parseFixtureConfig(resultsApi) {
  if (!resultsApi) return null;
  try {
    const config = JSON.parse(resultsApi);
    if (config.source === 'squadi') {
      if (!config.competitionId || !config.divisionId || !config.squadiTeamName) return null;
      return config;
    }
    if (config.source === 'gameday') {
      if (!config.compID || !config.client || !config.teamName) return null;
      return config;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// Backwards-compatible alias
export function parseSquadiConfig(resultsApi) {
  return parseFixtureConfig(resultsApi);
}

// ========================================
// OPPONENT DIFFICULTY & STRENGTH OF SCHEDULE
// ========================================

export function fuzzyOpponentMatch(existing, fixture) {
  if (!existing || !fixture) return false;
  const norm = s => s.toLowerCase().trim().replace(/\s+/g, ' ');
  const a = norm(existing);
  const b = norm(fixture);
  if (a === b) return true;
  // Check if one contains the other
  if (a.includes(b) || b.includes(a)) return true;
  // Check with all spaces removed (handles "Kilmore 10" vs "Kilmore10")
  const noSpaceA = a.replace(/\s/g, '');
  const noSpaceB = b.replace(/\s/g, '');
  if (noSpaceA === noSpaceB) return true;
  // Check if the last word(s) match (e.g. "Fire" matches "HG 11 Fire")
  const wordsA = a.split(' ');
  const wordsB = b.split(' ');
  if (wordsA.length > 1 && wordsB.length > 1) {
    const lastA = wordsA.slice(-1)[0];
    const lastB = wordsB.slice(-1)[0];
    if (lastA === lastB && lastA.length > 2) return true;
  }
  return false;
}

export function ordinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export function getOpponentDifficulty(opponentName) {
  if (!opponentName || !state.currentTeam) return null;
  const cacheKey = `ladder.cache.${state.currentTeam.teamID}`;
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey));
    if (!cached || !cached.data || !cached.data.ladder || !cached.data.ladder.rows) return null;
    const rows = cached.data.ladder.rows;
    const totalTeams = rows.length;
    if (totalTeams === 0) return null;
    const match = rows.find(row => {
      const ladderTeam = String(row['TEAM'] || row['Team'] || '');
      return fuzzyOpponentMatch(opponentName, ladderTeam);
    });
    if (!match) return null;
    const position = parseInt(match['POS'] || match['Pos'] || '0', 10);
    if (!position || position < 1) return null;
    const percentile = position / totalTeams;
    let tier;
    if (percentile <= 0.25) tier = 'top';
    else if (percentile <= 0.75) tier = 'mid';
    else tier = 'bottom';
    return { position, totalTeams, tier, label: `${position}${ordinalSuffix(position)}` };
  } catch (e) {
    return null;
  }
}

export function calculateStrengthOfSchedule() {
  if (!state.analytics || !state.analytics.advanced) return null;
  const gameResults = state.analytics.advanced.gameResults;
  if (!gameResults || gameResults.length === 0) return null;
  const opponents = [];
  let positionSum = 0;
  let totalTeams = 0;
  gameResults.forEach(g => {
    const diff = getOpponentDifficulty(g.opponent);
    if (diff) {
      opponents.push({ opponent: g.opponent, position: diff.position, tier: diff.tier, result: g.result });
      positionSum += diff.position;
      totalTeams = diff.totalTeams;
    }
  });
  if (opponents.length === 0 || totalTeams === 0) return null;
  const avgPosition = positionSum / opponents.length;
  const rating = Math.round(((totalTeams - avgPosition) / (totalTeams - 1)) * 100);
  let label;
  if (rating >= 70) label = 'Tough';
  else if (rating >= 40) label = 'Average';
  else label = 'Easy';
  return {
    rating: Math.max(1, Math.min(100, rating)),
    avgPosition: Math.round(avgPosition * 10) / 10,
    gamesWithData: opponents.length,
    totalGames: gameResults.length,
    label,
    opponents
  };
}

// ========================================
// COACH HELPERS
// ========================================

export function getUniqueCoachNames() {
  const names = new Set();
  state.teams.forEach(t => { if (t.coach) names.add(t.coach); });
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

// ========================================
// PLAYER HELPERS
// ========================================

export function calculatePlayerStats(player) {
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

export function resolvePlayerName(val) {
  if (!val) return '';
  // Try to find by ID in current team
  const players = state.currentTeamData?.players || [];
  const found = players.find(p => p.id === val);
  if (found) return found.name;
  // If not found by ID, assume it's already a name
  return val;
}

export function getPlayerChipsHtml(quarter, textareaId) {
  const lineup = state.currentGame?.lineup || {};
  const qData = lineup[quarter] || {};
  const positions = ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'];

  // Get players assigned to positions in this quarter
  let players = positions
    .map(pos => resolvePlayerName(qData[pos]))
    .filter(name => name && name.trim());

  // If no lineup set, show all team players (non fill-ins)
  if (players.length === 0) {
    players = (state.currentTeamData?.players || [])
      .filter(p => !p.fillIn)
      .map(p => p.name);
  }

  // Get unique first names
  const uniqueNames = [...new Set(players)];

  // Generate player chips
  const playerChips = uniqueNames.map(name => {
    const firstName = name.split(' ')[0];
    return `<button type="button" class="player-chip" onclick="insertPlayerName('${escapeAttr(textareaId)}', '${escapeAttr(firstName)}')" title="${escapeAttr(name)}">${escapeHtml(firstName)}</button>`;
  }).join('');

  // Add group buttons (Team, Opp, Goalers, Midcourt, Defence)
  const groupChips = `
    <button type="button" class="player-chip player-chip-group" onclick="insertPlayerName('${escapeAttr(textareaId)}', 'Team')" title="Insert 'Team'">Team</button>
    <button type="button" class="player-chip player-chip-group" onclick="insertPlayerName('${escapeAttr(textareaId)}', 'Opp')" title="Insert 'Opp'">Opp</button>
    <button type="button" class="player-chip player-chip-group" onclick="insertPlayerName('${escapeAttr(textareaId)}', 'Goalers')" title="Insert 'Goalers'">Goalers</button>
    <button type="button" class="player-chip player-chip-group" onclick="insertPlayerName('${escapeAttr(textareaId)}', 'Midcourt')" title="Insert 'Midcourt'">Midcourt</button>
    <button type="button" class="player-chip player-chip-group" onclick="insertPlayerName('${escapeAttr(textareaId)}', 'Defence')" title="Insert 'Defence'">Defence</button>
  `;

  // Position chips
  const positionChips = positions.map(pos =>
    `<button type="button" class="player-chip player-chip-position" onclick="insertPlayerName('${escapeAttr(textareaId)}', '${escapeAttr(pos)}')" title="Insert '${escapeAttr(pos)}'">${escapeHtml(pos)}</button>`
  ).join('');

  // Common infraction chips
  const infractionChips = ['Stepping', 'Contact', 'Offside'].map(word =>
    `<button type="button" class="player-chip player-chip-infraction" onclick="insertPlayerName('${escapeAttr(textareaId)}', '${escapeAttr(word)}')" title="Insert '${escapeAttr(word)}'">${escapeHtml(word)}</button>`
  ).join('');

  // Positive play chips
  const positiveChips = ['Great shot', 'Good defence', 'Intercept'].map(word =>
    `<button type="button" class="player-chip player-chip-positive" onclick="insertPlayerName('${escapeAttr(textareaId)}', '${escapeAttr(word)}')" title="Insert '${escapeAttr(word)}'">${escapeHtml(word)}</button>`
  ).join('');

  // Game flow chips
  const flowChips = ['Turnover', 'Loose ball', 'Sub'].map(word =>
    `<button type="button" class="player-chip player-chip-flow" onclick="insertPlayerName('${escapeAttr(textareaId)}', '${escapeAttr(word)}')" title="Insert '${escapeAttr(word)}'">${escapeHtml(word)}</button>`
  ).join('');

  return playerChips + groupChips + positionChips + infractionChips + positiveChips + flowChips;
}
