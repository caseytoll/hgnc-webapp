import '../css/styles.css';

// ========================================
// CONFIG
// ========================================
const API_URL = 'https://script.google.com/macros/s/AKfycbyBxhOJDfNBZuZ65St-Qt3UmmeAD57M0Jr1Q0MsoKGbHFxzu8rIvarJOOnB4sLeJZ-V/exec';

// ========================================
// STATE
// ========================================
const state = {
  teams: [],
  currentTeam: null,
  currentGame: null
};

// ========================================
// UTILITY FUNCTIONS
// ========================================
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

// Simple encode/decode for team codes
function encodeTeamCode(teamName) {
  // Create a simple code from team name: first letters + hash
  const clean = teamName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean.substring(0, 8);
}

function findTeamByCode(code) {
  const lowerCode = code.toLowerCase().trim();
  return state.teams.find(t => {
    const teamCode = encodeTeamCode(t.teamName);
    const teamNameLower = t.teamName.toLowerCase();
    return teamCode === lowerCode ||
           teamNameLower.includes(lowerCode) ||
           teamNameLower.replace(/[^a-z0-9]/g, '').includes(lowerCode);
  });
}

// ========================================
// API FUNCTIONS
// ========================================
async function loadTeams() {
  try {
    const response = await fetch(`${API_URL}?api=true&action=getTeams`);
    const data = await response.json();
    if (data.success && data.teams) {
      state.teams = data.teams.filter(t => !t.archived);
    }
  } catch (error) {
    console.error('Failed to load teams:', error);
  }
}

async function loadTeamData(teamID, sheetName) {
  try {
    const response = await fetch(`${API_URL}?api=true&action=getTeamData&teamID=${teamID}&sheetName=${encodeURIComponent(sheetName)}`);
    const data = await response.json();
    if (data.success && data.teamData) {
      return transformTeamData(data.teamData, teamID);
    }
  } catch (error) {
    console.error('Failed to load team data:', error);
  }
  return null;
}

function transformTeamData(data, teamID) {
  const players = (data.players || []).map(p => ({
    id: p.id,
    name: p.name,
    fillIn: p.isFillIn || false,
    favPosition: p.favoritePosition || p.favPosition || ''
  }));

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
      scores,
      lineup
    };
  });

  return { teamID, players, games, teamName: data.teamName || '' };
}

// ========================================
// VIEW MANAGEMENT
// ========================================
function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
}

// ========================================
// RENDER FUNCTIONS
// ========================================
function renderGamesList() {
  const container = document.getElementById('games-list');
  const games = state.currentTeam?.games || [];

  if (games.length === 0) {
    container.innerHTML = '<div class="empty-state">No games scheduled</div>';
    return;
  }

  // Sort by round (or date)
  const sorted = [...games].sort((a, b) => (a.round || 0) - (b.round || 0));

  container.innerHTML = sorted.map(game => {
    const hasScore = game.scores && (game.scores.us > 0 || game.scores.opponent > 0);
    const isWin = hasScore && game.scores.us > game.scores.opponent;
    const isLoss = hasScore && game.scores.us < game.scores.opponent;
    const statusClass = hasScore ? 'final' : 'upcoming';
    const statusText = hasScore ? 'Final' : (game.status === 'bye' ? 'Bye' : 'Upcoming');

    return `
      <div class="game-card" data-game-id="${escapeHtml(game.gameID)}">
        <div class="game-card-header">
          <span class="game-round">Round ${escapeHtml(String(game.round || '?'))}</span>
          <span class="game-status ${statusClass}">${statusText}</span>
        </div>
        <div class="game-opponent">${escapeHtml(game.opponent || 'TBD')}</div>
        <div class="game-meta">${formatDate(game.date)}${game.time ? ' · ' + escapeHtml(game.time) : ''}${game.location ? ' · ' + escapeHtml(game.location) : ''}</div>
        ${hasScore ? `
          <div class="game-score">
            <div class="score-team">
              <div class="score-label">Us</div>
              <div class="score-value ${isWin ? 'win' : isLoss ? 'loss' : ''}">${game.scores.us}</div>
            </div>
            <div class="score-divider">-</div>
            <div class="score-team">
              <div class="score-label">Them</div>
              <div class="score-value">${game.scores.opponent}</div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  // Add click handlers
  container.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('click', () => {
      const gameID = card.dataset.gameId;
      const game = games.find(g => g.gameID === gameID);
      if (game) {
        state.currentGame = game;
        renderGameDetail();
        showView('game-view');
      }
    });
  });
}

function renderGameDetail() {
  const game = state.currentGame;
  if (!game) return;

  document.getElementById('game-title').textContent = `Round ${game.round || '?'}`;
  const container = document.getElementById('game-detail');

  const hasScore = game.scores && (game.scores.us > 0 || game.scores.opponent > 0);

  let html = `
    <div class="game-detail-score">
      <div class="game-detail-meta">
        vs ${escapeHtml(game.opponent || 'TBD')}<br>
        ${formatDate(game.date)}${game.time ? ' · ' + escapeHtml(game.time) : ''}
      </div>
      ${hasScore ? `
        <div class="game-detail-scoreline">
          <div class="detail-score-team">
            <div class="detail-score-label">Us</div>
            <div class="detail-score-value">${game.scores.us}</div>
          </div>
          <div class="detail-score-divider">-</div>
          <div class="detail-score-team">
            <div class="detail-score-label">Them</div>
            <div class="detail-score-value">${game.scores.opponent}</div>
          </div>
        </div>
      ` : '<div class="empty-state">No score yet</div>'}
    </div>
  `;

  // Lineup section
  if (game.lineup) {
    html += '<div class="section-title">Lineup</div>';

    ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
      const quarter = game.lineup[q];
      if (!quarter) return;

      const ourScore = (quarter.ourGsGoals || 0) + (quarter.ourGaGoals || 0);
      const theirScore = (quarter.oppGsGoals || 0) + (quarter.oppGaGoals || 0);

      html += `
        <div class="quarter-lineup">
          <div class="quarter-header">
            <span class="quarter-name">${q}</span>
            <span class="quarter-score">${ourScore} - ${theirScore}</span>
          </div>
          <div class="quarter-positions">
            ${['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'].map(pos => `
              <div class="position-slot">
                <span class="position-label">${pos}</span>
                <span class="position-player ${quarter[pos] ? '' : 'empty'}">${escapeHtml(quarter[pos]) || '-'}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    });
  } else {
    html += '<div class="empty-state">No lineup set</div>';
  }

  container.innerHTML = html;
}

function renderStats() {
  const container = document.getElementById('stats-content');
  const team = state.currentTeam;

  if (!team || !team.games) {
    container.innerHTML = '<div class="empty-state">No stats available</div>';
    return;
  }

  const completedGames = team.games.filter(g => g.scores && (g.scores.us > 0 || g.scores.opponent > 0));

  if (completedGames.length === 0) {
    container.innerHTML = '<div class="empty-state">No completed games yet</div>';
    return;
  }

  // Calculate basic stats
  let wins = 0, losses = 0, draws = 0;
  let goalsFor = 0, goalsAgainst = 0;

  completedGames.forEach(g => {
    goalsFor += g.scores.us;
    goalsAgainst += g.scores.opponent;
    if (g.scores.us > g.scores.opponent) wins++;
    else if (g.scores.us < g.scores.opponent) losses++;
    else draws++;
  });

  // Calculate top scorers
  const scorers = {};
  completedGames.forEach(game => {
    if (!game.lineup) return;
    ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
      const quarter = game.lineup[q];
      if (!quarter) return;
      if (quarter.GS && quarter.ourGsGoals) {
        scorers[quarter.GS] = (scorers[quarter.GS] || 0) + quarter.ourGsGoals;
      }
      if (quarter.GA && quarter.ourGaGoals) {
        scorers[quarter.GA] = (scorers[quarter.GA] || 0) + quarter.ourGaGoals;
      }
    });
  });

  const topScorers = Object.entries(scorers)
    .map(([name, goals]) => ({ name, goals }))
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 5);

  let html = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${wins}-${losses}${draws > 0 ? `-${draws}` : ''}</div>
        <div class="stat-label">Record</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${goalsFor}</div>
        <div class="stat-label">Goals For</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${goalsAgainst}</div>
        <div class="stat-label">Goals Against</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${goalsFor - goalsAgainst >= 0 ? '+' : ''}${goalsFor - goalsAgainst}</div>
        <div class="stat-label">Goal Diff</div>
      </div>
    </div>
  `;

  if (topScorers.length > 0) {
    html += `
      <div class="stats-section">
        <div class="section-title">Top Scorers</div>
        ${topScorers.map(s => `
          <div class="player-stat-row">
            <span class="player-stat-name">${escapeHtml(s.name)}</span>
            <span class="player-stat-value">${s.goals} goals</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  container.innerHTML = html;
}

// ========================================
// EVENT HANDLERS
// ========================================
async function handleViewTeam() {
  const input = document.getElementById('team-code');
  const code = input.value.trim();

  if (!code) {
    input.focus();
    return;
  }

  // Show loading
  const btn = document.getElementById('view-team-btn');
  btn.textContent = 'Loading...';
  btn.disabled = true;

  try {
    // Load teams if not already loaded
    if (state.teams.length === 0) {
      await loadTeams();
    }

    // Find team by code
    const teamInfo = findTeamByCode(code);

    if (!teamInfo) {
      alert('Team not found. Please check the code and try again.');
      btn.textContent = 'View Team';
      btn.disabled = false;
      return;
    }

    // Load team data
    const teamData = await loadTeamData(teamInfo.teamID, teamInfo.sheetName);

    if (!teamData) {
      alert('Failed to load team data. Please try again.');
      btn.textContent = 'View Team';
      btn.disabled = false;
      return;
    }

    state.currentTeam = { ...teamInfo, ...teamData };

    // Update UI
    document.getElementById('team-name').textContent = teamInfo.teamName;
    renderGamesList();
    renderStats();
    showView('team-view');

    // Save to URL for sharing
    history.pushState({}, '', `/${encodeURIComponent(code)}`);

  } catch (error) {
    console.error('Error:', error);
    alert('Something went wrong. Please try again.');
  }

  btn.textContent = 'View Team';
  btn.disabled = false;
}

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
  // Check for team code in URL
  const path = window.location.pathname.slice(1);
  if (path && path !== 'index.html') {
    document.getElementById('team-code').value = decodeURIComponent(path);
    await loadTeams();
    handleViewTeam();
  }

  // Event listeners
  document.getElementById('view-team-btn').addEventListener('click', handleViewTeam);
  document.getElementById('team-code').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleViewTeam();
  });

  document.getElementById('back-btn').addEventListener('click', () => {
    showView('landing-view');
    history.pushState({}, '', '/');
  });

  document.getElementById('game-back-btn').addEventListener('click', () => {
    showView('team-view');
  });

  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });
});
