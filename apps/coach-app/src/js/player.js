// ========================================
// PLAYER MANAGEMENT
// ========================================

import { state, saveToLocalStorage } from './state.js';
import { API_CONFIG } from './config.js';
import { calculatePlayerStats, formatAIContent, renderAIFeedback, normalizeFavPositions } from './helpers.js';
import { syncToGoogleSheets } from './sync.js';
import { escapeHtml, escapeAttr, generatePlayerCode } from '../../../../common/utils.js';
import { shareData, haptic } from '../../../../common/share-utils.js';

// ========================================
// PLAYER DETAIL MODAL
// ========================================

window.openPlayerDetail = function (playerID) {
  if (!state.currentTeamData) return;
  const player = state.currentTeamData.players.find((p) => p.id === playerID);
  if (!player) return;

  // Store current player for AI summary
  state.currentPlayerForAI = player;

  // Calculate player stats
  const playerStats = calculatePlayerStats(player);

  // Check if player is already in library
  const teamID = state.currentTeamData.teamID;
  const isInLibrary = state.playerLibrary.players.some((lp) =>
    lp.linkedInstances.some((li) => li.teamID === teamID && li.playerID === playerID)
  );

  // Check for cached AI summary
  const hasCachedSummary = player.aiSummary && player.aiSummary.text;
  const cachedDate = hasCachedSummary ? new Date(player.aiSummary.generatedAt).toLocaleDateString('en-AU') : '';

  openModal(
    `${escapeHtml(player.name)}`,
    `
    <div class="player-detail-tabs">
      <button class="player-detail-tab active" onclick="switchPlayerTab('stats')">Stats</button>
      <button class="player-detail-tab" onclick="switchPlayerTab('ai')">AI Report</button>
      ${!window.isReadOnlyView ? `<button class="player-detail-tab" onclick="switchPlayerTab('edit')">Edit</button>` : ''}
    </div>

    <div id="player-tab-stats" class="player-tab-content active">
      ${player.playerCode ? `<div style="text-align: center; margin-bottom: 12px;"><span class="player-code-badge">${escapeHtml(player.playerCode)}</span></div>` : ''}
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

      ${
        playerStats.positionBreakdown.length > 0
          ? `
      <div class="player-positions-section">
        <div class="player-section-title">Positions Played</div>
        <div class="positions-breakdown">
          ${playerStats.positionBreakdown
            .map(
              (p) => `
            <div class="position-item">
              <span class="position-name">${escapeHtml(p.position)}</span>
              <div class="position-bar-container">
                <div class="position-bar" style="width: ${p.percentage}%"></div>
              </div>
              <span class="position-count">${p.count}</span>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
      `
          : ''
      }

      ${
        playerStats.recentGames.length > 0
          ? `
      <div class="player-games-section">
        <div class="player-section-title">Recent Games</div>
        <div class="player-games-list">
          ${playerStats.recentGames
            .slice(0, 5)
            .map(
              (g) => `
            <div class="player-game-row">
              <span class="game-round">R${g.round}</span>
              <span class="game-opponent">${escapeHtml(g.opponent)}</span>
              <span class="game-position">${escapeHtml(g.positions.join(', '))}</span>
              <span class="game-goals ${g.goals > 0 ? 'scored' : ''}">${g.goals > 0 ? g.goals + ' goals' : '-'}</span>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
      `
          : '<div class="empty-state"><p>No game data yet</p></div>'
      }
    </div>

    <div id="player-tab-ai" class="player-tab-content">
      ${
        playerStats.gamesPlayed > 0
          ? `
        <div id="player-ai-container">
          ${
            hasCachedSummary
              ? `
            <div class="ai-insights-content">${formatAIContent(player.aiSummary.text)}</div>
            <div class="ai-meta" style="margin-top: 12px; font-size: 12px; color: var(--text-tertiary);">
              Generated: ${escapeHtml(cachedDate)}
            </div>
            <div style="display: flex; gap: 8px; margin-top: 12px;">
              <button class="btn btn-secondary" onclick="shareAIReport('player')">Share</button>
              <button class="btn btn-secondary" onclick="fetchPlayerAISummary(true)">Regenerate Report</button>
            </div>
            ${renderAIFeedback('player')}
          `
              : `
            <div class="empty-state" style="padding: 20px 0;">
              <p style="margin-bottom: 16px;">Get AI-powered insights on ${escapeHtml(player.name)}'s performance, strengths, and development areas.</p>
              <button class="btn btn-primary" onclick="fetchPlayerAISummary(false)">Generate AI Report</button>
            </div>
          `
          }
        </div>
      `
          : `
        <div class="empty-state">
          <p>No game data yet. AI reports require at least one game played.</p>
        </div>
      `
      }
    </div>

    ${
      !window.isReadOnlyView
        ? `
    <div id="player-tab-edit" class="player-tab-content">
      ${player.playerCode ? `<div class="form-group">
        <label class="form-label">Player Code</label>
        <div style="font-family: monospace; font-size: 0.9rem; color: var(--text-secondary);">${escapeHtml(player.playerCode)}</div>
      </div>` : ''}
      <div class="form-group">
        <label class="form-label">Name</label>
        <input type="text" class="form-input" id="edit-player-name" value="${escapeAttr(player.name)}">
      </div>
      <div class="form-group">
        <label class="form-label">Favourite Positions</label>
        <div class="position-checkboxes" id="edit-player-positions">
          ${['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK']
            .map((pos) => {
              const favPositions = normalizeFavPositions(player.favPosition);
              const isChecked = favPositions.includes(pos);
              return `
              <label class="position-checkbox-label">
                <input type="checkbox" class="position-checkbox" value="${escapeAttr(pos)}" ${isChecked ? 'checked' : ''}>
                <span class="position-checkbox-text">${escapeHtml(pos)}</span>
              </label>
            `;
            })
            .join('')}
        </div>
        <p class="text-muted" style="font-size: 0.75rem; margin-top: 4px;">Select one or more preferred positions, or leave blank for flexible</p>
      </div>
      <div class="form-group">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" id="edit-player-fillin" ${player.fillIn ? 'checked' : ''}>
          Mark as fill-in player
        </label>
      </div>
      <div class="form-group">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" id="edit-player-track-career" ${isInLibrary ? 'checked' : ''}>
          Track career stats
        </label>
        <p class="text-muted" style="font-size: 0.75rem; margin-top: 4px; margin-left: 24px;">Track this player's stats across teams and seasons</p>
      </div>
      <div class="player-edit-actions">
        <button class="btn btn-ghost" onclick="deletePlayer('${escapeAttr(playerID)}')">Delete Player</button>
        <button class="btn btn-primary" onclick="savePlayer('${escapeAttr(playerID)}')">Save Changes</button>
      </div>
    </div>
    `
        : ''
    }
  `
  );
};

// ========================================
// SHARE AI REPORT
// ========================================

window.shareAIReport = async function (type) {
  const teamName = state.currentTeam?.teamName || state.currentTeamData?.teamName || 'Team';
  let title = '';
  let text = '';

  switch (type) {
    case 'season':
      text = state.currentTeamData?.aiInsights?.text;
      title = `${teamName} — Season AI Insights`;
      break;
    case 'game': {
      const game = state.currentGame;
      text = game?.aiSummary?.text;
      title = `${teamName} — Round ${game?.round || '?'} vs ${game?.opponent || 'Opponent'} AI Summary`;
      break;
    }
    case 'training': {
      const history = state.currentTeamData?.trainingFocusHistory || [];
      const idx = state.selectedTrainingHistoryIndex || 0;
      text = history[idx]?.text;
      title = `${teamName} — Training Focus`;
      break;
    }
    case 'player':
      text = state.currentPlayerForAI?.aiSummary?.text;
      title = `${teamName} — ${state.currentPlayerForAI?.name || 'Player'} AI Report`;
      break;
  }

  if (!text) {
    showToast('No report to share', 'info');
    return;
  }

  haptic(50);

  const shareText = `\u{1F3D0} ${title}\n\n${text}`;
  const success = await shareData({ title, text: shareText }, showToast);
  if (success && navigator.share) {
    showToast('Shared successfully', 'success');
  }
};

// ========================================
// PLAYER TABS
// ========================================

window.switchPlayerTab = function (tabId) {
  document.querySelectorAll('.player-detail-tab').forEach((btn) => {
    const btnText = btn.textContent.toLowerCase().replace(' ', '');
    const targetTab = tabId === 'ai' ? 'aireport' : tabId;
    btn.classList.toggle('active', btnText === targetTab);
  });
  document.querySelectorAll('.player-tab-content').forEach((content) => {
    content.classList.toggle('active', content.id === `player-tab-${tabId}`);
  });
};

// ========================================
// AI PLAYER SUMMARY
// ========================================

window.fetchPlayerAISummary = async function (forceRefresh = false) {
  const player = state.currentPlayerForAI;
  if (!player) {
    showToast('No player selected', 'error');
    return;
  }

  const container = document.getElementById('player-ai-container');
  if (!container) return;

  // Show loading state
  container.innerHTML =
    '<div class="ai-loading"><div class="spinner"></div><p>Analyzing player performance...</p></div>';

  try {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
    const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;
    const playerStats = calculatePlayerStats(player);

    // Build detailed game history with results, scores, and quarter-by-quarter detail
    const gameHistory = playerStats.recentGames.map((g) => {
      const game = state.currentTeamData.games.find((gm) => gm.round === g.round);
      let result = null;
      let score = null;
      let quartersInGame = 0;
      let quarterDetails = [];

      if (game) {
        if (game.scores) {
          score = `${game.scores.us}-${game.scores.opponent}`;
          if (game.scores.us > game.scores.opponent) result = 'W';
          else if (game.scores.us < game.scores.opponent) result = 'L';
          else result = 'D';
        }

        // Get quarter-by-quarter detail for this player
        if (game.lineup) {
          ['Q1', 'Q2', 'Q3', 'Q4'].forEach((q) => {
            const qData = game.lineup[q] || {};
            ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'].forEach((pos) => {
              if (qData[pos] === player.name) {
                quartersInGame++;
                let qGoals = 0;
                if (pos === 'GS') qGoals = qData.ourGsGoals || 0;
                if (pos === 'GA') qGoals = qData.ourGaGoals || 0;
                quarterDetails.push({
                  quarter: q,
                  position: pos,
                  goals: qGoals,
                });
              }
            });
          });
        }
      }

      return {
        ...g,
        result,
        score,
        quartersInGame,
        quarterDetails,
      };
    });

    // Build team context
    const { advanced } = state.analytics;
    const teamContext = {
      teamRecord: `${advanced.wins}W-${advanced.losses}L-${advanced.draws}D`,
      topScorers: state.analytics.leaderboards.offensive.topScorersByTotal.slice(0, 3).map((s) => s.name),
    };

    // Build player payload
    const playerPayload = {
      name: player.name,
      teamName: state.currentTeam?.teamName || 'Team',
      fillIn: player.fillIn || false,
      favPosition: player.favPosition || null,
      stats: {
        gamesPlayed: playerStats.gamesPlayed,
        quartersPlayed: playerStats.quartersPlayed,
        totalGoals: playerStats.totalGoals,
        avgGoalsPerGame: playerStats.avgGoalsPerGame,
      },
      positionBreakdown: playerStats.positionBreakdown,
      gameHistory: gameHistory,
      teamContext: teamContext,
    };

    // POST to backend
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        api: true,
        action: 'getPlayerAIInsights',
        teamID: state.currentTeam.teamID,
        sheetName: state.currentTeam.sheetName,
        playerData: playerPayload,
      }),
      redirect: 'follow',
    });
    const data = await response.json();

    if (data.success && data.insights) {
      // Save to player record
      player.aiSummary = {
        text: data.insights,
        generatedAt: new Date().toISOString(),
      };

      // Save and sync to API immediately
      saveToLocalStorage();
      await syncToGoogleSheets();

      // Display the summary
      const cachedDate = new Date().toLocaleDateString('en-AU');
      container.innerHTML = `
        <div class="ai-insights-content">${formatAIContent(data.insights)}</div>
        <div class="ai-meta" style="margin-top: 12px; font-size: 12px; color: var(--text-tertiary);">
          Generated: ${escapeHtml(cachedDate)}
        </div>
        <div style="display: flex; gap: 8px; margin-top: 12px;">
          <button class="btn btn-secondary" onclick="shareAIReport('player')">Share</button>
          <button class="btn btn-secondary" onclick="fetchPlayerAISummary(true)">Regenerate Report</button>
        </div>
        ${renderAIFeedback('player')}
      `;

      showToast('AI report saved', 'success');
    } else {
      throw new Error(data.error || 'Failed to get player insights');
    }
  } catch (err) {
    console.error('[Player AI Summary] Error:', err);
    container.innerHTML = `
      <div class="ai-error">
        <p>Failed to get insights: ${escapeHtml(err.message)}</p>
        <button class="btn btn-primary" onclick="fetchPlayerAISummary(true)" style="margin-top: 12px;">Try Again</button>
      </div>
    `;
  }
};

// ========================================
// SAVE / DELETE PLAYER
// ========================================

window.savePlayer = async function (playerID) {
  if (!ensureNotReadOnly('savePlayer')) return;
  const player = state.currentTeamData.players.find((p) => p.id === playerID);
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
    (p) => p.id !== playerID && p.name.toLowerCase() === name.toLowerCase()
  );
  if (existingPlayer) {
    showToast('A player with this name already exists', 'error');
    nameInput.focus();
    return;
  }

  // Collect selected favourite positions
  const positionCheckboxes = document.querySelectorAll('#edit-player-positions .position-checkbox:checked');
  const selectedPositions = Array.from(positionCheckboxes).map((cb) => cb.value);
  const validPositions = ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'];
  if (selectedPositions.some((pos) => !validPositions.includes(pos))) {
    showToast('Invalid position selected', 'error');
    return;
  }

  player.name = name;
  player.favPosition = selectedPositions; // Now stores array
  player.fillIn = document.getElementById('edit-player-fillin').checked;

  // Handle career tracking checkbox
  const trackCareer = document.getElementById('edit-player-track-career').checked;
  const teamID = state.currentTeamData.teamID;
  const isCurrentlyTracked = state.playerLibrary.players.some((lp) =>
    lp.linkedInstances.some((li) => li.teamID === teamID && li.playerID === playerID)
  );

  const libraryChanged = (trackCareer && !isCurrentlyTracked) || (!trackCareer && isCurrentlyTracked);

  if (trackCareer && !isCurrentlyTracked) {
    // Add to library
    window.addToPlayerLibraryDirect(teamID, playerID);
  } else if (!trackCareer && isCurrentlyTracked) {
    // Remove from library
    window.removePlayerFromLibrary(teamID, playerID);
  }

  saveToLocalStorage();

  closeModal();
  window.renderRoster();

  // Sync to Google Sheets if using API mode and online
  if (navigator.onLine) {
    try {
      await syncToGoogleSheets();
      // Also sync player library if it changed
      if (libraryChanged) {
        await window.syncPlayerLibrary();
      }
      showToast('Player updated (synced)', 'success');
    } catch (err) {
      console.error('[Sync] Failed to sync player update:', err);
      showToast('Player updated locally. Sync failed.', 'warning');
    }
  } else {
    showToast('Player updated', 'success');
  }
};

window.deletePlayer = async function (playerID) {
  if (!ensureNotReadOnly('deletePlayer')) return;
  if (!confirm('Delete this player?')) return;

  state.currentTeamData.players = state.currentTeamData.players.filter((p) => p.id !== playerID);
  saveToLocalStorage();

  closeModal();
  window.renderRoster();

  // Sync to Google Sheets if using API mode and online
  if (navigator.onLine) {
    try {
      await syncToGoogleSheets();
      showToast('Player deleted (synced)', 'info');
    } catch (err) {
      console.error('[Sync] Failed to sync player delete:', err);
      showToast('Player deleted locally. Sync failed.', 'warning');
    }
  } else {
    showToast('Player deleted', 'info');
  }
};

// ========================================
// ADD PLAYER MODAL
// ========================================

window.openAddPlayerModal = function () {
  if (!ensureNotReadOnly('openAddPlayerModal')) return;
  openModal(
    'Add Player',
    `
    <div class="form-group">
      <label class="form-label">Name</label>
      <input type="text" class="form-input" id="new-player-name" placeholder="Player name" maxlength="100">
    </div>
    <div class="form-group">
      <label class="form-label">Favourite Positions</label>
      <div class="position-checkboxes" id="new-player-positions">
        ${['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK']
          .map(
            (pos) => `
          <label class="position-checkbox-label">
            <input type="checkbox" class="position-checkbox" value="${escapeAttr(pos)}">
            <span class="position-checkbox-text">${escapeHtml(pos)}</span>
          </label>
        `
          )
          .join('')}
      </div>
      <p class="text-muted" style="font-size: 0.75rem; margin-top: 4px;">Select one or more preferred positions, or leave blank for flexible</p>
    </div>
    <div class="form-group">
      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
        <input type="checkbox" id="new-player-fillin">
        Mark as fill-in player
      </label>
    </div>
  `,
    `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="addPlayer()">Add Player</button>
  `
  );
};

// ========================================
// FORM VALIDATION HELPERS
// ========================================

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

window.addPlayer = async function () {
  if (!ensureNotReadOnly('addPlayer')) return;
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
  const existingPlayer = state.currentTeamData.players.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (existingPlayer) {
    setFieldError(nameInput, 'A player with this name already exists');
    return;
  }

  // Collect selected favourite positions
  const positionCheckboxes = document.querySelectorAll('#new-player-positions .position-checkbox:checked');
  const selectedPositions = Array.from(positionCheckboxes).map((cb) => cb.value);
  const validPositions = ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'];
  if (selectedPositions.some((pos) => !validPositions.includes(pos))) {
    showToast('Invalid position selected', 'error');
    return;
  }

  const existingCodes = state.currentTeamData.players.map(p => p.playerCode).filter(Boolean);
  const newPlayer = {
    id: `p${Date.now()}`,
    name: name,
    playerCode: generatePlayerCode(existingCodes),
    favPosition: selectedPositions, // Now stores array
    fillIn: document.getElementById('new-player-fillin').checked,
  };

  state.currentTeamData.players.push(newPlayer);
  saveToLocalStorage();

  closeModal();
  window.renderRoster();

  // Sync to Google Sheets if using API mode and online
  console.log('[Sync] addPlayer - online:', navigator.onLine);
  if (navigator.onLine) {
    try {
      console.log('[Sync] Calling syncToGoogleSheets...');
      await syncToGoogleSheets();
      console.log('[Sync] syncToGoogleSheets succeeded');
      showToast('Player added (synced)', 'success');
    } catch (err) {
      console.error('[Sync] Failed to sync player add:', err);
      showToast('Player added locally. Sync failed.', 'warning');
    }
  } else {
    console.log('[Sync] Skipping sync - not in API mode or offline');
    showToast('Player added', 'success');
  }
};

// ========================================
// GAME MANAGEMENT
// ========================================

window.openAddGameModal = function () {
  if (!ensureNotReadOnly('openAddGameModal')) return;
  const nextRound = (state.currentTeamData?.games?.length || 0) + 1;

  openModal(
    'Add Game',
    `
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
      <label class="form-label">Court</label>
      <input type="text" class="form-input" id="new-game-location" placeholder="e.g. 1 or Banyule Court 1" maxlength="50">
    </div>
  `,
    `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="addGame()">Add Game</button>
  `
  );
};

window.addGame = async function () {
  if (!ensureNotReadOnly('addGame')) return;
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

  const location = locationInput.value.trim();

  const newGame = {
    gameID: `g${Date.now()}`,
    round: round,
    opponent: opponent,
    date: dateInput.value,
    time: timeInput.value,
    location: location,
    status: 'upcoming',
    scores: null,
    availablePlayerIDs: state.currentTeamData.players.filter((p) => !p.fillIn).map((p) => p.id),
    lineup: null,
  };

  state.currentTeamData.games.push(newGame);

  // Sort by round
  state.currentTeamData.games.sort((a, b) => a.round - b.round);

  saveToLocalStorage();

  closeModal();
  window.renderSchedule();
  window.renderMainApp();

  // Sync to Google Sheets if using API mode and online
  if (navigator.onLine) {
    try {
      await syncToGoogleSheets();
      showToast('Game added (synced)', 'success');
    } catch (err) {
      console.error('[Sync] Failed to sync game add:', err);
      showToast('Game added locally. Sync failed.', 'warning');
    }
  } else {
    showToast('Game added', 'success');
  }
};

// ============================================================
// FIXTURE IMPORT
// ============================================================

window.openImportFixturesModal = function () {
  if (!ensureNotReadOnly('openImportFixturesModal')) return;

  openModal(
    'Import Fixtures',
    `
    <p style="color:var(--gray-500);font-size:0.875rem;margin:0 0 12px">
      Paste JSON from the Nillumbik Fixture Extractor. Existing games are matched by Match ID or round + opponent — manual scores and lineups are never overwritten.
    </p>
    <div class="form-group">
      <label class="form-label">Fixture JSON</label>
      <textarea class="form-input" id="import-fixtures-json" rows="7"
        placeholder='[{"round":1,"date":"2026-02-07","opponent":"DC Servals",...}]'
        style="font-family:monospace;font-size:11px;resize:vertical"></textarea>
    </div>
    <div id="import-preview"></div>
    `,
    `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-secondary" onclick="previewFixtureImport()">Preview</button>
    <button class="btn btn-primary" id="btn-confirm-import" style="display:none" onclick="confirmFixtureImport()">Import</button>
    `
  );
};

window.previewFixtureImport = function () {
  const raw = document.getElementById('import-fixtures-json').value.trim();
  const preview = document.getElementById('import-preview');

  let imported;
  try {
    imported = JSON.parse(raw);
    if (!Array.isArray(imported)) throw new Error('Expected a JSON array');
  } catch (e) {
    preview.innerHTML = `<p style="color:var(--error);font-size:0.875rem;margin-top:8px">⚠ Invalid JSON: ${escapeHtml(e.message)}</p>`;
    return;
  }

  const { summary, rows } = _buildImportPlan(imported);

  preview.innerHTML = `
    <div style="margin-top:12px;border-top:1px solid var(--gray-200);padding-top:12px">
      <p style="font-size:0.875rem;font-weight:600;margin:0 0 8px">
        Preview: <span style="color:var(--success)">${summary.added} to add</span>,
        <span style="color:var(--primary)">${summary.updated} to update</span>,
        <span style="color:var(--gray-400)">${summary.skipped} unchanged</span>
      </p>
      <div style="font-size:0.8rem;max-height:160px;overflow-y:auto;border:1px solid var(--gray-200);border-radius:6px">
        ${rows.map(r => `<div style="padding:5px 10px;border-bottom:1px solid var(--gray-100);display:flex;gap:8px;align-items:center">
          <span style="color:${r.type === 'add' ? 'var(--success)' : r.type === 'update' ? 'var(--primary)' : 'var(--gray-400)'}">
            ${r.type === 'add' ? '+ Add' : r.type === 'update' ? '↻ Update' : '— Skip'}
          </span>
          <span>R${r.round} — ${escapeHtml(r.opponent)}</span>
          ${r.note ? `<span style="color:var(--gray-400)">${escapeHtml(r.note)}</span>` : ''}
        </div>`).join('')}
      </div>
    </div>
  `;

  if (summary.added + summary.updated > 0) {
    document.getElementById('btn-confirm-import').style.display = '';
    // stash parsed data for confirm step
    window._pendingImport = imported;
  }
};

window.confirmFixtureImport = async function () {
  if (!window._pendingImport) return;
  const imported = window._pendingImport;
  window._pendingImport = null;

  const { changes } = _buildImportPlan(imported);
  const existing = state.currentTeamData.games;

  for (const change of changes) {
    if (change.type === 'add') {
      const g = change.imported;
      existing.push({
        gameID: `g${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        round: g.round,
        opponent: g.opponent || '',
        date: g.date || '',
        time: g.time || '',
        location: '',
        status: g.status || 'upcoming',
        captain: null,
        scores: null,
        lineup: null,
        fixtureMatchId: g.fixtureMatchId || null,
        fixtureScore: g.fixtureScore || null,
        availablePlayerIDs: state.currentTeamData.players.filter((p) => !p.fillIn).map((p) => p.id),
      });
    } else if (change.type === 'update') {
      Object.assign(change.game, change.updates);
    }
  }

  existing.sort((a, b) => a.round - b.round);
  saveToLocalStorage();
  closeModal();
  window.renderSchedule();
  window.renderMainApp();

  const { summary } = _buildImportPlan(imported); // recalc for toast (will now show 0 changes)
  const added = changes.filter((c) => c.type === 'add').length;
  const updated = changes.filter((c) => c.type === 'update').length;

  if (navigator.onLine) {
    try {
      await syncToGoogleSheets();
      showToast(`Imported: ${added} added, ${updated} updated (synced)`, 'success');
    } catch (err) {
      showToast(`Imported: ${added} added, ${updated} updated (sync failed)`, 'warning');
    }
  } else {
    showToast(`Imported: ${added} added, ${updated} updated`, 'success');
  }
};

function _buildImportPlan(imported) {
  const existing = state.currentTeamData.games || [];
  const changes = [];
  let added = 0, updated = 0, skipped = 0;

  for (const g of imported) {
    // Match by fixtureMatchId first, then round + opponent
    let found = g.fixtureMatchId
      ? existing.find((e) => e.fixtureMatchId === g.fixtureMatchId)
      : null;

    if (!found && g.round && g.opponent) {
      found = existing.find(
        (e) => e.round === g.round && e.opponent?.toLowerCase() === g.opponent.toLowerCase()
      );
    }

    if (found) {
      const updates = {};
      if (!found.date && g.date) updates.date = g.date;
      if (!found.time && g.time) updates.time = g.time;
      if (!found.opponent && g.opponent) updates.opponent = g.opponent;
      if (!found.fixtureMatchId && g.fixtureMatchId) updates.fixtureMatchId = g.fixtureMatchId;
      // Always refresh fixtureScore when new data is available
      if (g.fixtureScore && JSON.stringify(found.fixtureScore) !== JSON.stringify(g.fixtureScore)) {
        updates.fixtureScore = g.fixtureScore;
      }
      // Only upgrade status (upcoming → normal/bye), never downgrade
      if (found.status === 'upcoming' && g.status && g.status !== 'upcoming') {
        updates.status = g.status;
      }

      if (Object.keys(updates).length > 0) {
        changes.push({ type: 'update', game: found, updates, round: g.round, opponent: g.opponent, note: Object.keys(updates).join(', ') });
        updated++;
      } else {
        changes.push({ type: 'skip', round: g.round, opponent: g.opponent });
        skipped++;
      }
    } else {
      changes.push({ type: 'add', imported: g, round: g.round, opponent: g.opponent || 'Bye' });
      added++;
    }
  }

  return { changes, summary: { added, updated, skipped }, rows: changes };
}
