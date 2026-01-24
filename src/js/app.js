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
import { mockTeams, calculateMockStats } from './mock-data.js';
import {
  escapeHtml,
  escapeAttr,
  delay,
  formatDate,
  validatePlayerName,
  validateRound,
  validateYear,
  validatePosition,
  validateLocation,
  validateSeason,
  isDuplicateName,
  generateId,
  getInitials
} from './utils.js';
import { calculateAllAnalytics } from './stats-calculations.js';
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
} from './share-utils.js';
import html2canvas from 'html2canvas';

// ========================================
// STATE MANAGEMENT
// ========================================

const state = {
  dataSource: (window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168')) ? 'mock' : 'api',
  teams: [],
  currentTeam: null,
  currentTeamData: null,
  currentGame: null,
  currentQuarter: 'Q1',
  selectedPlayer: null,
  stats: null,
  analytics: null,
  activeStatsTab: 'overview'
};

// ========================================
// LOCAL STORAGE PERSISTENCE
// ========================================

const STORAGE_KEY = 'teamManagerData';

function saveToLocalStorage() {
  try {
    const dataToSave = {
      teams: mockTeams,
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
      // Merge saved data into mockTeams, and add any new teams from localStorage
      if (data.teams) {
        data.teams.forEach(savedTeam => {
          let team = mockTeams.find(t => t.teamID === savedTeam.teamID);
          if (team) {
            // Update games with saved data
            savedTeam.games.forEach(savedGame => {
              const game = team.games.find(g => g.gameID === savedGame.gameID);
              if (game) {
                // Restore all game fields
                game.lineup = savedGame.lineup || game.lineup;
                game.scores = savedGame.scores || game.scores;
                game.availablePlayerIDs = savedGame.availablePlayerIDs || game.availablePlayerIDs;
                game.status = savedGame.status || game.status;
                game.opponent = savedGame.opponent || game.opponent;
                game.round = savedGame.round || game.round;
                game.date = savedGame.date || game.date;
                game.time = savedGame.time || game.time;
                game.location = savedGame.location || game.location;
              } else {
                // Game doesn't exist in mockTeams, add it
                team.games.push(savedGame);
              }
            });
            // Update other team fields (e.g., players)
            team.players = savedTeam.players || team.players;
          } else {
            // Team does not exist in mockTeams, so add it
            mockTeams.push(savedTeam);
          }
        });
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
  loadTeams();
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
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="addNewTeam()">Add Team</button>
    `);
  };

  window.addNewTeam = function() {
    const nameInput = document.getElementById('new-team-name');
    const yearInput = document.getElementById('new-team-year');
    const seasonInput = document.getElementById('new-team-season');
    const name = nameInput.value.trim();
    const year = parseInt(yearInput.value);
    const season = seasonInput.value;

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

    // Create new team object
    const newTeam = {
      teamID: 'team_' + Date.now(),
      year,
      season,
      teamName: name,
      players: [],
      games: []
    };

    // Add to mock/local data for now
    if (state.dataSource === 'mock' || state.dataSource === 'api') {
      // Add to mockTeams (for localStorage persistence)
      if (Array.isArray(window.mockTeams)) {
        window.mockTeams.push(newTeam);
      } else if (Array.isArray(mockTeams)) {
        mockTeams.push(newTeam);
      }
      // Add to state.teams for UI
      state.teams.push({
        teamID: newTeam.teamID,
        year: newTeam.year,
        season: newTeam.season,
        teamName: newTeam.teamName,
        playerCount: 0,
        gameCount: 0
      });
      saveToLocalStorage();
      closeModal();
      renderTeamList();
      showToast('Team added', 'success');
    } else {
      // TODO: Implement live API integration for adding a team
      showToast('Live API add not yet implemented', 'warning');
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

async function loadTeams() {
  showLoading();

  try {
    if (state.dataSource === 'mock') {
      await delay(300);
      state.teams = mockTeams.map(t => ({
        teamID: t.teamID,
        year: t.year,
        season: t.season,
        teamName: t.teamName,
        playerCount: t.players.length,
        gameCount: t.games.length
      }));
    } else {
      // Use proxy for local dev to bypass CORS
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
      const baseUrl = isLocalDev ? '/gas-proxy' : API_CONFIG.baseUrl;
      const response = await fetch(`${baseUrl}?api=true&action=getTeams`);
      const data = await response.json();
      if (data.success === false) {
        throw new Error(data.error || 'API request failed');
      }
      // Cache sheetName mapping for later use
      state.teams = (data.teams || []).map(t => {
        state.teamSheetMap = state.teamSheetMap || {};
        state.teamSheetMap[t.teamID] = t.sheetName;
        return t;
      });
    }

    renderTeamList();
  } catch (error) {
    console.error('[App] Failed to load teams:', error);
    showToast('Failed to load teams', 'error');
  } finally {
    hideLoading();
  }
}

async function loadTeamData(teamID) {
  // Show skeletons immediately for better perceived performance
  showView('main-app-view');
  renderScheduleSkeleton();
  renderRosterSkeleton();
  renderStatsSkeleton();

  try {
    if (state.dataSource === 'mock') {
      await delay(300); // Slightly longer to see skeleton effect
      state.currentTeamData = mockTeams.find(t => t.teamID === teamID);
    } else {
      showLoading();
      // Use proxy for local dev to bypass CORS
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
      const baseUrl = isLocalDev ? '/gas-proxy' : API_CONFIG.baseUrl;
      const sheetName = state.teamSheetMap?.[teamID] || '';
      const response = await fetch(`${baseUrl}?api=true&action=getTeamData&teamID=${teamID}&sheetName=${encodeURIComponent(sheetName)}`);
      const data = await response.json();
      if (data.success === false) {
        throw new Error(data.error || 'API request failed');
      }
      // Transform data from Sheet format to PWA format
      state.currentTeamData = transformTeamDataFromSheet(data.teamData, teamID);
      hideLoading();
    }

    state.currentTeam = state.teams.find(t => t.teamID === teamID);

    if (!state.currentTeamData) {
      throw new Error('Team data not found');
    }

    state.stats = calculateMockStats(state.currentTeamData);
    state.analytics = calculateAllAnalytics(state.currentTeamData);

    renderMainApp();
  } catch (error) {
    console.error('[App] Failed to load team data:', error);
    showToast('Failed to load team data', 'error');
    showView('team-selector-view');
  }
}

/**
 * Transform team data from Google Sheet format to PWA format
 */
function transformTeamDataFromSheet(data, teamID) {
  // Transform players
  const players = (data.players || []).map(p => ({
    id: p.id,
    name: p.name,
    fillIn: p.isFillIn || false,
    favPosition: p.favoritePosition || p.favPosition || ''
  }));

  // Transform games
  const games = (data.games || []).map(g => {
    // Convert quarters array to lineup object
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
            opponentScore: (q.opponentGsGoals || 0) + (q.opponentGaGoals || 0)
          };
        }
      });
    }

    // Calculate scores from quarters if not cached
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
      availablePlayerIDs: g.availablePlayerIDs || [],
      lineup
    };
  });

  return {
    teamID,
    teamName: data.teamName || data.name || '',
    year: data.year,
    season: data.season,
    players,
    games
  };
}

// ========================================
// TEAM SELECTOR RENDERING
// ========================================

function renderTeamList() {
  const container = document.getElementById('team-list');

  if (state.teams.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🏐</div>
        <p>No teams yet. Add your first team to get started!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.teams.map(team => `
    <div class="team-card" onclick="selectTeam('${escapeAttr(team.teamID)}')">
      <div class="team-card-icon">🏐</div>
      <div class="team-card-info">
        <div class="team-card-name">${escapeHtml(team.teamName)}</div>
        <div class="team-card-meta">${escapeHtml(team.year)} ${escapeHtml(team.season)} • ${escapeHtml(team.playerCount)} players</div>
      </div>
      <div class="team-card-arrow">→</div>
    </div>
  `).join('');
}

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

  // Update quick stats
  document.getElementById('qs-record').textContent = `${stats.wins}-${stats.losses}-${stats.draws}`;

  const gdSign = stats.goalDiff >= 0 ? '+' : '';
  document.getElementById('qs-gd').textContent = `${gdSign}${stats.goalDiff}`;
  document.getElementById('qs-gd').className = `quick-stat-value ${stats.goalDiff >= 0 ? 'text-success' : 'text-error'}`;

  // Next game
  const nextGame = data.games.find(g => !g.scores);
  document.getElementById('qs-next').textContent = nextGame ? `R${nextGame.round}` : 'Done';

  // Render content
  renderSchedule();
  renderRoster();
}

// ========================================
// SCHEDULE RENDERING
// ========================================

function renderSchedule() {
  const container = document.getElementById('schedule-list');

  try {
    const games = state.currentTeamData?.games || [];

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

    if (game.scores) {
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
  return `
    <div class="player-card ${isFillIn ? 'fill-in' : ''}" onclick="openPlayerDetail('${escapeAttr(player.id)}')">
      <div class="player-avatar">${escapeHtml(initials)}</div>
      <div class="player-name">${escapeHtml(player.name)}</div>
      <div class="player-position">${escapeHtml(player.favPosition || 'Flexible')}</div>
    </div>
  `;
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
  `;
}

function renderStatsLeaders(container) {
  const { leaderboards } = state.analytics;
  const { offensive, defensive, minQuarters } = leaderboards;

  container.innerHTML = `
    <!-- Offensive Leaders -->
    <div class="stats-section">
      <div class="stats-section-title">Offensive Leaders</div>

      <div class="leaderboard-grid">
        <!-- Top Scorer -->
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

        <!-- Most Efficient -->
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

        <!-- Top Scoring Pair -->
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

        <!-- Most Efficient Pair -->
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
        <!-- Top Defender -->
        <div class="leaderboard-card defensive">
          <div class="leaderboard-header">Top Defender</div>
          ${defensive.topDefenders.length > 0 ? `
            <div class="leaderboard-player">
              <div class="leaderboard-name">${escapeHtml(defensive.topDefenders[0].name)}</div>
              <div class="leaderboard-stat">${defensive.topDefenders[0].avg} GA/qtr</div>
              <div class="leaderboard-detail">${defensive.topDefenders[0].goalsAgainst} conceded · ${defensive.topDefenders[0].quarters} qtrs</div>
            </div>
          ` : `<div class="leaderboard-empty">Min ${minQuarters} qtrs required</div>`}
        </div>

        <!-- Top Defensive Pair -->
        <div class="leaderboard-card defensive">
          <div class="leaderboard-header">Top Defensive Pair</div>
          ${defensive.topDefensivePairs.length > 0 ? `
            <div class="leaderboard-player">
              <div class="leaderboard-name">${escapeHtml(defensive.topDefensivePairs[0].players[0].split(' ')[0])} & ${escapeHtml(defensive.topDefensivePairs[0].players[1].split(' ')[0])}</div>
              <div class="leaderboard-stat">${defensive.topDefensivePairs[0].avg} GA/qtr</div>
              <div class="leaderboard-detail">${defensive.topDefensivePairs[0].goalsAgainst} conceded · ${defensive.topDefensivePairs[0].quarters} qtrs</div>
            </div>
          ` : `<div class="leaderboard-empty">Min ${minQuarters} qtrs required</div>`}
        </div>
      </div>
    </div>

    <!-- All Scorers List -->
    <div class="stats-section">
      <div class="stats-section-title">All Scorers</div>
      ${offensive.topScorersByTotal.length > 0 ? `
        <div class="scorers-table">
          <div class="scorers-table-header">
            <span class="col-rank">#</span>
            <span class="col-name">Player</span>
            <span class="col-goals">Goals</span>
            <span class="col-avg">Avg</span>
            <span class="col-qtrs">Qtrs</span>
          </div>
          ${offensive.topScorersByTotal.slice(0, 10).map((p, i) => `
            <div class="scorers-table-row ${i === 0 ? 'top' : ''}">
              <span class="col-rank">${i + 1}</span>
              <span class="col-name">${escapeHtml(p.name)}</span>
              <span class="col-goals">${p.goals}</span>
              <span class="col-avg">${p.avg}</span>
              <span class="col-qtrs">${p.quarters}</span>
            </div>
          `).join('')}
        </div>
      ` : '<div class="empty-state"><p>No scorers yet</p></div>'}
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
                const isFav = player.favPosition === pos;
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

  showView('game-detail-view');
};

window.closeGameDetail = function() {
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

  const teamName = state.currentTeamData?.teamName || 'Team';
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
  const teamName = state.currentTeamData?.teamName || 'Team';
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

window.confirmImport = function() {
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

  // Save to localStorage
  saveToStorage();

  // Refresh the UI
  renderSchedule();
  renderRoster();
  updateQuickStats();

  // Update header
  document.getElementById('current-team-name').textContent = data.teamName;
  document.getElementById('current-team-season').textContent = `${data.year} ${data.season}`;

  closeModal();
  haptic([50, 30, 50]);
  showToast('Team data imported successfully!', 'success');
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
      // Support legacy opponentScore field
      if (qData.opponentScore) opponent += qData.opponentScore;
      if (qData.ourGsGoals || qData.ourGaGoals || qData.oppGsGoals || qData.oppGaGoals || qData.opponentScore) {
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
  const availablePlayers = state.currentTeamData.players.filter(p =>
    !game.availablePlayerIDs || game.availablePlayerIDs.includes(p.id)
  );

  // Find players on bench (not in current quarter)
  const assignedNames = Object.values(quarterData).filter(v => typeof v === 'string');
  const benchPlayers = availablePlayers.filter(p => !assignedNames.includes(p.name));

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
  return `
    <div class="position-slot ${filled ? 'filled' : ''}" onclick="assignPosition('${escapeAttr(position)}')">
      <div class="position-label">${escapeHtml(position)}</div>
      ${filled
        ? `<div class="position-player">${escapeHtml(playerName)}</div>`
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

window.assignPosition = function(position) {
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
        return `
          <div class="availability-item">
            <input type="checkbox" class="availability-checkbox"
                   ${isAvailable ? 'checked' : ''}
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
    return `
      <div class="player-score-row">
        <div class="player-score-info">
          <span class="player-score-name">${escapeHtml(playerName || 'Not assigned')}</span>
          <span class="player-score-position">${escapeHtml(position)}</span>
        </div>
        <div class="score-stepper">
          <button class="stepper-btn stepper-minus" onclick="adjustScore('${escapeAttr(quarter)}', '${escapeAttr(field)}', -1)" aria-label="Decrease">−</button>
          <input type="number" class="scoring-input" id="score-${escapeAttr(quarter)}-${escapeAttr(field)}" min="0" value="${escapeAttr(value)}"
                 onchange="updateScore('${escapeAttr(quarter)}', '${escapeAttr(field)}', this.value)" inputmode="numeric">
          <button class="stepper-btn stepper-plus" onclick="adjustScore('${escapeAttr(quarter)}', '${escapeAttr(field)}', 1)" aria-label="Increase">+</button>
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

  container.innerHTML = `
    <div class="scoring-sticky-total" id="scoring-sticky-total">
      <div class="sticky-score">
        <span class="sticky-score-label">Total</span>
        <span class="sticky-score-value" id="sticky-us">${escapeHtml(gameTotal.us)}</span>
        <span class="sticky-score-divider">:</span>
        <span class="sticky-score-value" id="sticky-opp">${escapeHtml(gameTotal.opp)}</span>
      </div>
      <button class="icon-btn fullscreen-btn" onclick="toggleGameFullscreen()" aria-label="Toggle fullscreen" id="fullscreen-toggle-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="fullscreen-icon">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
        </svg>
      </button>
    </div>

    ${['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
      const qData = lineup[q] || {};
      const qTotal = calcQuarterTotal(qData);
      return `
        <div class="scoring-quarter">
          <div class="scoring-quarter-header">
            <span class="quarter-name">${escapeHtml(q)}</span>
            <span class="quarter-score" id="qscore-${escapeAttr(q)}">${escapeHtml(qTotal.us)} : ${escapeHtml(qTotal.opp)}</span>
          </div>
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
        </div>
      `;
    }).join('')}

    <button class="btn btn-primary btn-block" onclick="calculateGameTotal()">
      Save Scores
    </button>
  `;
}

window.updateScore = function(quarter, field, value) {
  const game = state.currentGame;
  if (!game) return;

  if (!game.lineup) game.lineup = {};
  if (!game.lineup[quarter]) game.lineup[quarter] = {};

  game.lineup[quarter][field] = parseInt(value) || 0;

  // Update quarter and total displays
  updateScoringDisplays();

  // Update the score card at the top
  renderGameScoreCard();

  // Persist to localStorage
  saveToLocalStorage();
};

window.adjustScore = function(quarter, field, delta) {
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

  // Persist to localStorage
  saveToLocalStorage();
};

function updateScoringDisplays() {
  const game = state.currentGame;
  if (!game || !game.lineup) return;

  let totalUs = 0, totalOpp = 0;

  ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
    const qData = game.lineup[q] || {};
    const qUs = (qData.ourGsGoals || 0) + (qData.ourGaGoals || 0);
    const qOpp = (qData.oppGsGoals || 0) + (qData.oppGaGoals || 0);

    totalUs += qUs;
    totalOpp += qOpp;

    // Update quarter score
    const qScoreEl = document.getElementById(`qscore-${q}`);
    if (qScoreEl) {
      qScoreEl.textContent = `${qUs} : ${qOpp}`;
    }
  });

  // Update sticky total
  const stickyUs = document.getElementById('sticky-us');
  const stickyOpp = document.getElementById('sticky-opp');
  if (stickyUs) stickyUs.textContent = totalUs;
  if (stickyOpp) stickyOpp.textContent = totalOpp;
}

window.calculateGameTotal = function() {
  const game = state.currentGame;
  if (!game || !game.lineup) return;

  let ourTotal = 0;
  let theirTotal = 0;

  ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
    const qData = game.lineup[q] || {};
    ourTotal += (qData.ourGsGoals || 0) + (qData.ourGaGoals || 0);
    theirTotal += (qData.oppGsGoals || 0) + (qData.oppGaGoals || 0);
    // Support legacy opponentScore field
    if (qData.opponentScore) theirTotal += qData.opponentScore;
  });

  game.scores = { us: ourTotal, opponent: theirTotal };

  // Auto-set status to 'normal' if game is in the past and has scores
  const today = new Date();
  const gameDate = game.date ? new Date(game.date) : null;
  if (gameDate && gameDate < today && (!game.status || game.status !== 'normal')) {
    game.status = 'normal';
  }

  renderGameScoreCard();
  showToast(`Scores saved: ${ourTotal} - ${theirTotal}`, 'success');

  // Recalculate stats and analytics
  state.stats = calculateMockStats(state.currentTeamData);
  state.analytics = calculateAllAnalytics(state.currentTeamData);

  // Persist to localStorage
  saveToLocalStorage();

  // Also re-render stats if stats tab is active
  if (document.getElementById('stats-container')) {
    renderStats();
  }
};

// ========================================
// PLAYER MANAGEMENT
// ========================================

window.openPlayerDetail = function(playerID) {
  const player = state.currentTeamData.players.find(p => p.id === playerID);
  if (!player) return;

  // Calculate player stats
  const playerStats = calculatePlayerStats(player);

  openModal(`${escapeHtml(player.name)}`, `
    <div class="player-detail-tabs">
      <button class="player-detail-tab active" onclick="switchPlayerTab('stats')">Stats</button>
      <button class="player-detail-tab" onclick="switchPlayerTab('edit')">Edit</button>
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

    <div id="player-tab-edit" class="player-tab-content">
      <div class="form-group">
        <label class="form-label">Name</label>
        <input type="text" class="form-input" id="edit-player-name" value="${escapeAttr(player.name)}">
      </div>
      <div class="form-group">
        <label class="form-label">Favorite Position</label>
        <select class="form-select" id="edit-player-position">
          <option value="">Flexible</option>
          ${['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'].map(pos =>
            `<option value="${escapeAttr(pos)}" ${player.favPosition === pos ? 'selected' : ''}>${escapeHtml(pos)}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" id="edit-player-fillin" ${player.fillIn ? 'checked' : ''}>
          Mark as fill-in player
        </label>
      </div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="deletePlayer('${escapeAttr(playerID)}')">Delete</button>
    <button class="btn btn-primary" onclick="savePlayer('${escapeAttr(playerID)}')">Save</button>
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

window.savePlayer = function(playerID) {
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

  const position = document.getElementById('edit-player-position').value;
  const validPositions = ['', 'GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'];
  if (!validPositions.includes(position)) {
    showToast('Invalid position selected', 'error');
    return;
  }

  player.name = name;
  player.favPosition = position;
  player.fillIn = document.getElementById('edit-player-fillin').checked;

  saveToLocalStorage();

  closeModal();
  renderRoster();
  showToast('Player updated', 'success');
};

window.deletePlayer = function(playerID) {
  if (!confirm('Delete this player?')) return;

  state.currentTeamData.players = state.currentTeamData.players.filter(p => p.id !== playerID);

  closeModal();
  renderRoster();
  showToast('Player deleted', 'info');
};

window.openAddPlayerModal = function() {
  openModal('Add Player', `
    <div class="form-group">
      <label class="form-label">Name</label>
      <input type="text" class="form-input" id="new-player-name" placeholder="Player name" maxlength="100">
    </div>
    <div class="form-group">
      <label class="form-label">Favorite Position</label>
      <select class="form-select" id="new-player-position">
        <option value="">Flexible</option>
        ${['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'].map(pos =>
          `<option value="${escapeAttr(pos)}">${escapeHtml(pos)}</option>`
        ).join('')}
      </select>
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

window.addPlayer = function() {
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

  const position = document.getElementById('new-player-position').value;
  const validPositions = ['', 'GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'];
  if (!validPositions.includes(position)) {
    showToast('Invalid position selected', 'error');
    return;
  }

  const newPlayer = {
    id: `p${Date.now()}`,
    name: name,
    favPosition: position,
    fillIn: document.getElementById('new-player-fillin').checked
  };

  state.currentTeamData.players.push(newPlayer);
  saveToLocalStorage();

  closeModal();
  renderRoster();
  showToast('Player added', 'success');
};

// ========================================
// GAME MANAGEMENT
// ========================================

window.openAddGameModal = function() {
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
      <label class="form-label">Location</label>
      <select class="form-select" id="new-game-location">
        <option value="Home">Home</option>
        <option value="Away">Away</option>
      </select>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="addGame()">Add Game</button>
  `);
};

window.addGame = function() {
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

  const location = locationInput.value;
  if (!['Home', 'Away'].includes(location)) {
    showToast('Invalid location selected', 'error');
    return;
  }

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
  showToast('Game added', 'success');
};

// ========================================
// TEAM SETTINGS
// ========================================

window.openTeamSettings = function() {
  const team = state.currentTeam;
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
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveTeamSettings()">Save</button>
  `);
};

window.saveTeamSettings = function() {
  const nameInput = document.getElementById('edit-team-name');
  const name = nameInput.value.trim();
  const yearInput = document.getElementById('edit-team-year');
  const year = parseInt(yearInput.value);
  const season = document.getElementById('edit-team-season').value;

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

  state.currentTeam.teamName = name;
  state.currentTeam.year = year;
  state.currentTeam.season = season;

  // Also update in currentTeamData
  state.currentTeamData.teamName = name;
  state.currentTeamData.year = year;
  state.currentTeamData.season = season;

  saveToLocalStorage();

  closeModal();
  renderMainApp();
  showToast('Team updated', 'success');
};

window.openGameSettings = function() {
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
      <label class="form-label">Location</label>
      <select class="form-select" id="edit-game-location">
        <option value="Home" ${game.location === 'Home' ? 'selected' : ''}>Home</option>
        <option value="Away" ${game.location === 'Away' ? 'selected' : ''}>Away</option>
      </select>
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

  const location = document.getElementById('edit-game-location').value;
  if (!['Home', 'Away'].includes(location)) {
    showToast('Invalid location selected', 'error');
    return;
  }

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

  closeModal();
  closeGameDetail();
  showToast('Game deleted', 'info');
};

// ========================================
// DEV TOOLS
// ========================================

// Hide dev tools in production (non-localhost environments)
const isDevEnvironment = window.location.hostname === 'localhost' ||
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname.includes('192.168.');

document.addEventListener('DOMContentLoaded', () => {
  if (!isDevEnvironment) {
    const devIndicator = document.getElementById('dev-indicator');
    const devPanel = document.getElementById('dev-panel');
    if (devIndicator) devIndicator.style.display = 'none';
    if (devPanel) devPanel.style.display = 'none';
  }
});

window.toggleDevPanel = function() {
  if (!isDevEnvironment) return;
  document.getElementById('dev-panel').classList.toggle('hidden');
};

window.setDataSource = function(source) {
  state.dataSource = source;
  document.getElementById('dev-status').textContent = `Source: ${source}`;
  console.log(`[Dev] Data source: ${source}`);
};

window.reloadData = function() {
  if (state.currentTeam) {
    loadTeamData(state.currentTeam.teamID);
  } else {
    loadTeams();
  }
};

window.clearCache = function() {
  state.teams = [];
  state.currentTeam = null;
  state.currentTeamData = null;
  state.stats = null;
  showView('team-selector-view');
  loadTeams();
};

// Utility functions are imported from utils.js

// Export for hot module replacement
if (import.meta.hot) {
  import.meta.hot.accept();
}
