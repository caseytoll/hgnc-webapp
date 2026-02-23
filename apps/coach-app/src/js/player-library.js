import { state, saveToLocalStorage, apiTeamCache } from './state.js';
import { API_CONFIG } from './config.js';
import { escapeHtml, escapeAttr, generateId } from '../../../../common/utils.js';
import { mockTeams } from '../../../../common/mock-data.js';

// ========================================
// PLAYERS (Career Stats Tracking)
// ========================================

window.updateLibraryCount = function () {
  // No longer needed with segmented control, but keep for compatibility
};

// Current sort preference for players list
let playersSortOrder = 'recent';
const sortOptions = ['recent', 'games', 'name'];
const sortLabels = { recent: 'Recent', games: 'Games', name: 'A-Z' };

window.cyclePlayerSort = function () {
  const currentIndex = sortOptions.indexOf(playersSortOrder);
  playersSortOrder = sortOptions[(currentIndex + 1) % sortOptions.length];

  // Update button label
  const label = document.getElementById('sort-label');
  if (label) label.textContent = sortLabels[playersSortOrder];

  renderPlayerLibrary();
};

function renderPlayerLibrary() {
  const container = document.getElementById('library-player-list');
  if (!container) return;

  const players = state.playerLibrary.players;

  if (players.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">👤</div>
        <p>No players yet.</p>
        <p class="text-muted">Add players from your team rosters to track their stats across seasons.</p>
      </div>
    `;
    return;
  }

  // Calculate stats for each player
  const playersWithStats = players.map((p) => ({
    ...p,
    stats: calculateLibraryPlayerStats(p),
  }));

  // Sort based on current preference
  playersWithStats.sort((a, b) => {
    switch (playersSortOrder) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'games':
        return b.stats.allTime.gamesPlayed - a.stats.allTime.gamesPlayed;
      case 'recent':
      default:
        // Sort by most recent activity date (null dates go to end)
        const dateA = a.stats.allTime.lastActivityDate;
        const dateB = b.stats.allTime.lastActivityDate;
        if (!dateA && !dateB) return a.name.localeCompare(b.name);
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB - dateA;
    }
  });

  container.innerHTML = playersWithStats
    .map((player) => {
      const stats = player.stats;
      const primaryPosition = getPrimaryPosition(stats.allTime.positionsPlayed);
      const hasAttacking = stats.allTime.attackingQuarters > 0;
      const hasDefensive = stats.allTime.defensiveQuarters > 0;

      // Build stat line showing both if applicable
      const statParts = [];
      if (hasAttacking) {
        const avg = (stats.allTime.goalsScored / stats.allTime.attackingQuarters).toFixed(1);
        statParts.push(`${stats.allTime.goalsScored} goals (${avg}/q)`);
      }
      if (hasDefensive) {
        const avg = (stats.allTime.goalsAgainst / stats.allTime.defensiveQuarters).toFixed(1);
        statParts.push(`${stats.allTime.goalsAgainst} GA (${avg}/q)`);
      }
      if (statParts.length === 0) {
        statParts.push(`${stats.allTime.quartersPlayed} quarters played`);
      }
      const statLine = statParts.join(' · ');

      return `
      <div class="library-player-card" onclick="openLibraryPlayerDetail('${escapeAttr(player.globalId)}')">
        <div class="library-player-avatar">${escapeHtml(getInitials(player.name))}</div>
        <div class="library-player-info">
          <div class="library-player-name">${escapeHtml(player.name)}</div>
          <div class="library-player-meta">
            ${player.linkedInstances.length} season${player.linkedInstances.length !== 1 ? 's' : ''} • ${stats.allTime.gamesPlayed} games
          </div>
          <div class="library-player-stats">${statLine}</div>
          ${primaryPosition ? `<div class="library-player-position">${escapeHtml(primaryPosition)} specialist</div>` : ''}
        </div>
        <div class="library-player-arrow">→</div>
      </div>
    `;
    })
    .join('');
}

function calculateLibraryPlayerStats(libraryPlayer) {
  const stats = {
    allTime: {
      gamesPlayed: 0,
      quartersPlayed: 0,
      goalsScored: 0,
      goalsAgainst: 0,
      attackingQuarters: 0,
      defensiveQuarters: 0,
      positionsPlayed: {},
      lastActivityDate: null,
    },
    seasons: [],
  };

  const gamesSet = new Set();

  libraryPlayer.linkedInstances.forEach((instance) => {
    // Check mockTeams, apiTeamCache, and current loaded team for the team data
    let team = mockTeams.find((t) => t.teamID === instance.teamID);
    if (!team && apiTeamCache[instance.teamID]) {
      team = apiTeamCache[instance.teamID];
    }
    if (!team && state.currentTeamData?.teamID === instance.teamID) {
      team = state.currentTeamData;
    }
    if (!team) return;

    const player = team.players.find((p) => p.id === instance.playerID);
    if (!player) return;

    const seasonStats = {
      year: instance.year || team.year,
      season: instance.season || team.season,
      teamName: instance.teamName || team.teamName,
      gamesPlayed: 0,
      quartersPlayed: 0,
      goalsScored: 0,
      goalsAgainst: 0,
      attackingQuarters: 0,
      defensiveQuarters: 0,
      positionsPlayed: {},
    };

    // Iterate through all games for this team
    team.games.forEach((game) => {
      if (!game.lineup || game.status === 'bye' || game.status === 'abandoned') return;

      let playedInGame = false;

      ['Q1', 'Q2', 'Q3', 'Q4'].forEach((q) => {
        const quarter = game.lineup[q];
        if (!quarter) return;

        // Check all positions for this player
        ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'].forEach((pos) => {
          const assignedPlayer = quarter[pos];
          if (assignedPlayer === player.name || assignedPlayer === player.id) {
            playedInGame = true;
            seasonStats.quartersPlayed++;
            seasonStats.positionsPlayed[pos] = (seasonStats.positionsPlayed[pos] || 0) + 1;

            // Track goals scored for attackers (GS/GA)
            if (pos === 'GS') {
              seasonStats.goalsScored += parseInt(quarter.ourGsGoals) || 0;
              seasonStats.attackingQuarters++;
            } else if (pos === 'GA') {
              seasonStats.goalsScored += parseInt(quarter.ourGaGoals) || 0;
              seasonStats.attackingQuarters++;
            }

            // Track goals against for defenders (GK/GD)
            if (pos === 'GK' || pos === 'GD') {
              const oppGoals = (parseInt(quarter.oppGsGoals) || 0) + (parseInt(quarter.oppGaGoals) || 0);
              seasonStats.goalsAgainst += oppGoals;
              seasonStats.defensiveQuarters++;
            }
          }
        });
      });

      if (playedInGame) {
        const gameKey = `${instance.teamID}-${game.gameID}`;
        if (!gamesSet.has(gameKey)) {
          gamesSet.add(gameKey);
          seasonStats.gamesPlayed++;

          // Track most recent activity date
          if (game.date) {
            const gameDate = new Date(game.date);
            if (!stats.allTime.lastActivityDate || gameDate > stats.allTime.lastActivityDate) {
              stats.allTime.lastActivityDate = gameDate;
            }
          }
        }
      }
    });

    // Add season stats to all-time
    stats.allTime.gamesPlayed += seasonStats.gamesPlayed;
    stats.allTime.quartersPlayed += seasonStats.quartersPlayed;
    stats.allTime.goalsScored += seasonStats.goalsScored;
    stats.allTime.goalsAgainst += seasonStats.goalsAgainst;
    stats.allTime.attackingQuarters += seasonStats.attackingQuarters;
    stats.allTime.defensiveQuarters += seasonStats.defensiveQuarters;

    Object.keys(seasonStats.positionsPlayed).forEach((pos) => {
      stats.allTime.positionsPlayed[pos] = (stats.allTime.positionsPlayed[pos] || 0) + seasonStats.positionsPlayed[pos];
    });

    if (seasonStats.quartersPlayed > 0) {
      stats.seasons.push(seasonStats);
    }
  });

  // Sort seasons by year/season (most recent first)
  stats.seasons.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return b.season.localeCompare(a.season);
  });

  return stats;
}

function getPrimaryPosition(positionsPlayed) {
  const entries = Object.entries(positionsPlayed);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

window.openLibraryPlayerDetail = function (globalId) {
  const player = state.playerLibrary.players.find((p) => p.globalId === globalId);
  if (!player) return;

  const stats = calculateLibraryPlayerStats(player);
  const primaryPos = getPrimaryPosition(stats.allTime.positionsPlayed);
  const isAttacker = ['GS', 'GA'].includes(primaryPos);
  const isDefender = ['GK', 'GD'].includes(primaryPos);

  // Build position breakdown
  const totalQuarters = stats.allTime.quartersPlayed || 1;
  const positionBreakdown = Object.entries(stats.allTime.positionsPlayed)
    .sort((a, b) => b[1] - a[1])
    .map(([pos, count]) => ({
      pos,
      count,
      pct: Math.round((count / totalQuarters) * 100),
    }));

  // Build seasons HTML - show both offensive and defensive stats if they played those positions
  const seasonsHtml =
    stats.seasons.length > 0
      ? stats.seasons
          .map((s, i) => {
            const seasonPositions = Object.keys(s.positionsPlayed).join('/');
            const seasonHasAttacking = s.attackingQuarters > 0;
            const seasonHasDefensive = s.defensiveQuarters > 0;

            // Build stat items based on what positions they played this season
            const statItems = [`${s.gamesPlayed} games`, `${s.quartersPlayed} qtrs`];

            if (seasonHasAttacking) {
              const avg = (s.goalsScored / s.attackingQuarters).toFixed(1);
              statItems.push(`${s.goalsScored} goals (${avg}/q)`);
            }
            if (seasonHasDefensive) {
              const avg = (s.goalsAgainst / s.defensiveQuarters).toFixed(1);
              statItems.push(`${s.goalsAgainst} GA (${avg}/q)`);
            }

            return `
      <div class="season-row">
        <div class="season-header">
          <span class="season-name">${escapeHtml(s.year)} ${escapeHtml(s.season)}</span>
          <span class="season-team">${escapeHtml(s.teamName)}</span>
        </div>
        <div class="season-stats">
          ${statItems.map((item) => `<span>${item}</span>`).join('')}
          <span>${seasonPositions}</span>
        </div>
      </div>
    `;
          })
          .join('')
      : '<p class="text-muted">No game data yet.</p>';

  // Show offensive stats if they've played GS/GA
  const hasAttackingStats = stats.allTime.attackingQuarters > 0;
  // Show defensive stats if they've played GK/GD
  const hasDefensiveStats = stats.allTime.defensiveQuarters > 0;

  openModal(
    escapeHtml(player.name),
    `
    <div class="library-detail">
      <div class="library-detail-section">
        <div class="library-detail-title">All-Time Stats</div>
        <div class="library-stats-grid">
          <div class="library-stat">
            <span class="library-stat-value">${stats.allTime.gamesPlayed}</span>
            <span class="library-stat-label">Games</span>
          </div>
          <div class="library-stat">
            <span class="library-stat-value">${stats.allTime.quartersPlayed}</span>
            <span class="library-stat-label">Quarters</span>
          </div>
          ${
            hasAttackingStats
              ? `
          <div class="library-stat">
            <span class="library-stat-value">${stats.allTime.goalsScored}</span>
            <span class="library-stat-label">Goals Scored</span>
            <span class="library-stat-avg">${(stats.allTime.goalsScored / stats.allTime.attackingQuarters).toFixed(1)}/qtr (${stats.allTime.attackingQuarters} qtrs)</span>
          </div>
          `
              : ''
          }
          ${
            hasDefensiveStats
              ? `
          <div class="library-stat">
            <span class="library-stat-value">${stats.allTime.goalsAgainst}</span>
            <span class="library-stat-label">Goals Against</span>
            <span class="library-stat-avg">${(stats.allTime.goalsAgainst / stats.allTime.defensiveQuarters).toFixed(1)}/qtr (${stats.allTime.defensiveQuarters} qtrs)</span>
          </div>
          `
              : ''
          }
        </div>
        ${
          positionBreakdown.length > 0
            ? `
        <div class="library-positions">
          ${positionBreakdown
            .map(
              (p) => `
            <span class="position-chip">${escapeHtml(p.pos)} <small>${p.pct}%</small></span>
          `
            )
            .join('')}
        </div>
        `
            : ''
        }
      </div>

      <div class="library-detail-section">
        <div class="library-detail-title">Season Breakdown</div>
        <div class="season-list">
          ${seasonsHtml}
        </div>
      </div>
    </div>
  `,
    `
    <button class="btn btn-ghost" onclick="closeModal()">Close</button>
    <button class="btn btn-outline btn-danger" onclick="removeFromLibrary('${escapeAttr(globalId)}')">Remove from Library</button>
  `
  );
};

window.filterLibraryPlayers = function (query) {
  const cards = document.querySelectorAll('.library-player-card');
  const lowerQuery = query.toLowerCase();

  cards.forEach((card) => {
    const name = card.querySelector('.library-player-name')?.textContent.toLowerCase() || '';
    card.style.display = name.includes(lowerQuery) ? '' : 'none';
  });
};

window.removeFromLibrary = async function (globalId) {
  if (
    !confirm(
      'Remove from career tracking? This only removes them from the Players library - their stats and history in each team will not be affected.'
    )
  )
    return;

  state.playerLibrary.players = state.playerLibrary.players.filter((p) => p.globalId !== globalId);
  saveToLocalStorage();
  closeModal();
  renderPlayerLibrary();
  updateLibraryCount();

  // Sync to API
  if (navigator.onLine) {
    try {
      await syncPlayerLibrary();
      showToast('Player removed (synced)', 'info');
    } catch (err) {
      console.error('[Sync] Failed to sync player library:', err);
      showToast('Player removed locally. Sync failed.', 'warning');
    }
  } else {
    showToast('Player removed', 'info');
  }
};

// Add player to library (called from player detail modal)
window.addToPlayerLibrary = function (teamID, playerID) {
  let team = mockTeams.find((t) => t.teamID === teamID);
  if (!team && apiTeamCache[teamID]) team = apiTeamCache[teamID];
  if (!team && state.currentTeamData?.teamID === teamID) team = state.currentTeamData;
  if (!team) return;

  const player = team.players.find((p) => p.id === playerID);
  if (!player) return;

  // Check if already linked
  const existingLink = state.playerLibrary.players.find((lp) =>
    lp.linkedInstances.some((li) => li.teamID === teamID && li.playerID === playerID)
  );
  if (existingLink) {
    showToast('Player already tracked', 'info');
    return;
  }

  // Check for name matches
  const nameMatches = state.playerLibrary.players.filter((lp) => lp.name.toLowerCase() === player.name.toLowerCase());

  if (nameMatches.length > 0) {
    // Ask to link to existing
    openLinkPlayerModal(player, team, nameMatches);
  } else {
    // Create new library entry
    createLibraryEntry(player, team);
  }
};

function openLinkPlayerModal(player, team, matches) {
  const matchesHtml = matches
    .map(
      (m) => `
    <div class="link-option" onclick="linkToExistingPlayer('${escapeAttr(m.globalId)}', '${escapeAttr(team.teamID)}', '${escapeAttr(player.id)}')">
      <div class="link-option-name">${escapeHtml(m.name)}</div>
      <div class="link-option-meta">${m.linkedInstances.length} season${m.linkedInstances.length !== 1 ? 's' : ''}</div>
    </div>
  `
    )
    .join('');

  openModal(
    'Link Player',
    `
    <p>A player named "${escapeHtml(player.name)}" already exists. Link to existing or create new?</p>
    <div class="link-options">
      ${matchesHtml}
    </div>
    <div class="link-divider">or</div>
    <button class="btn btn-outline btn-block" onclick="createLibraryEntry(null, null, '${escapeAttr(team.teamID)}', '${escapeAttr(player.id)}')">
      Create New Entry
    </button>
  `,
    `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
  `
  );
}

window.linkToExistingPlayer = async function (globalId, teamID, playerID) {
  let team = mockTeams.find((t) => t.teamID === teamID);
  if (!team && apiTeamCache[teamID]) team = apiTeamCache[teamID];
  if (!team && state.currentTeamData?.teamID === teamID) team = state.currentTeamData;
  const player = team?.players.find((p) => p.id === playerID);
  const libraryPlayer = state.playerLibrary.players.find((p) => p.globalId === globalId);

  if (!libraryPlayer || !team || !player) return;

  libraryPlayer.linkedInstances.push({
    teamID,
    playerID,
    teamName: team.teamName,
    year: team.year,
    season: team.season,
  });

  saveToLocalStorage();
  closeModal();
  updateLibraryCount();

  // Sync to API
  if (navigator.onLine) {
    try {
      await syncPlayerLibrary();
      showToast(`${player.name} linked (synced)`, 'success');
    } catch (err) {
      console.error('[Sync] Failed to sync player library:', err);
      showToast(`${player.name} linked locally. Sync failed.`, 'warning');
    }
  } else {
    showToast(`${player.name} linked`, 'success');
  }
};

window.createLibraryEntry = async function (player, team, teamID, playerID) {
  // Handle being called from modal with string params
  if (!player && teamID && playerID) {
    team = mockTeams.find((t) => t.teamID === teamID);
    if (!team && apiTeamCache[teamID]) team = apiTeamCache[teamID];
    if (!team && state.currentTeamData?.teamID === teamID) team = state.currentTeamData;
    player = team?.players.find((p) => p.id === playerID);
  }

  if (!player || !team) return;

  const newEntry = {
    globalId: `gp_${Date.now()}`,
    name: player.name,
    linkedInstances: [
      {
        teamID: team.teamID,
        playerID: player.id,
        teamName: team.teamName,
        year: team.year,
        season: team.season,
      },
    ],
    createdAt: new Date().toISOString(),
  };

  state.playerLibrary.players.push(newEntry);
  saveToLocalStorage();
  closeModal();
  updateLibraryCount();

  // Sync to API
  if (navigator.onLine) {
    try {
      await syncPlayerLibrary();
      showToast(`${player.name} added to Players (synced)`, 'success');
    } catch (err) {
      console.error('[Sync] Failed to sync player library:', err);
      showToast(`${player.name} added locally. Sync failed.`, 'warning');
    }
  } else {
    showToast(`${player.name} added to Players`, 'success');
  }
};

// Direct add to library (from checkbox, no modal prompts)
function addToPlayerLibraryDirect(teamID, playerID) {
  let team = mockTeams.find((t) => t.teamID === teamID);
  if (!team && apiTeamCache[teamID]) team = apiTeamCache[teamID];
  if (!team && state.currentTeamData?.teamID === teamID) team = state.currentTeamData;
  if (!team) return;

  const player = team.players.find((p) => p.id === playerID);
  if (!player) return;

  // Check for existing player with same name to link to
  const existingPlayer = state.playerLibrary.players.find((lp) => lp.name.toLowerCase() === player.name.toLowerCase());

  if (existingPlayer) {
    // Link to existing
    existingPlayer.linkedInstances.push({
      teamID,
      playerID,
      teamName: team.teamName,
      year: team.year,
      season: team.season,
    });
  } else {
    // Create new entry
    state.playerLibrary.players.push({
      globalId: `gp_${Date.now()}`,
      name: player.name,
      linkedInstances: [
        {
          teamID,
          playerID,
          teamName: team.teamName,
          year: team.year,
          season: team.season,
        },
      ],
      createdAt: new Date().toISOString(),
    });
  }
}

// Remove player from library (from checkbox)
function removePlayerFromLibrary(teamID, playerID) {
  state.playerLibrary.players.forEach((lp) => {
    lp.linkedInstances = lp.linkedInstances.filter((li) => !(li.teamID === teamID && li.playerID === playerID));
  });

  // Clean up any library entries with no linked instances
  state.playerLibrary.players = state.playerLibrary.players.filter((lp) => lp.linkedInstances.length > 0);
}

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
      const apiPlayerMap = new Map(apiPlayers.map((p) => [p.globalId, p]));

      // Merge: API players + any local players not in API
      const mergedPlayers = [...apiPlayers];
      localPlayers.forEach((lp) => {
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
async function syncPlayerLibrary() {
  if (!navigator.onLine) return;

  try {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
    const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;

    // Use POST for potentially large data
    const postBody = {
      action: 'savePlayerLibrary',
      playerLibrary: JSON.stringify(state.playerLibrary),
    };

    console.log('[syncPlayerLibrary] Using POST, body size:', JSON.stringify(postBody).length);

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(postBody),
      redirect: 'follow',
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

// ========================================
// EXPORTS
// ========================================

// Expose to window for cross-module calls
window.loadPlayerLibraryFromAPI = loadPlayerLibraryFromAPI;
window.syncPlayerLibrary = syncPlayerLibrary;
window.addToPlayerLibraryDirect = addToPlayerLibraryDirect;
window.removePlayerFromLibrary = removePlayerFromLibrary;
window.renderPlayerLibrary = renderPlayerLibrary;
