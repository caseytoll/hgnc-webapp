// ========================================
// GAME DETAIL + SHARE & EXPORT + LINEUP BUILDER
// ========================================

import { state, saveToLocalStorage } from './state.js';
import {
  syncToGoogleSheets,
  debouncedSync,
  cancelDebouncedSync,
  updateSyncIndicator,
  syncInProgress,
  hasPendingChanges,
  queueGameAIFireAndForget
} from './sync.js';
import {
  escapeHtml,
  escapeAttr,
  formatDate,
  generateId
} from '../../../../common/utils.js';
import { calculateTeamStats } from '../../../../common/mock-data.js';
import { calculateAllAnalytics } from '../../../../common/stats-calculations.js';
import {
  formatGameShareText,
  formatLineupText,
  copyToClipboard,
  shareData,
  downloadJson,
  toggleFullscreen,
  haptic,
  generateLineupCardHTML,
  generateLineupCardPrintableHTML,
  shareImageBlob,
  triggerJsonImport,
  validateImportedTeamData
} from '../../../../common/share-utils.js';
import html2canvas from 'html2canvas';
import { showLoading, hideLoading } from './ui.js';

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
  window.renderAvailabilityList();
  window.renderScoringInputs();
  window.renderGameNotes();

  showView('game-detail-view');

  // Ensure the Read-only pill is visible on game detail for parents
  if (window.isReadOnlyView) {
    try { showReadOnlyPill(state.currentTeamData?.teamName || state.currentTeamData?.name); } catch (_e) { /* noop */ }
  }
};

window.closeGameDetail = async function() {
  // Cancel any pending debounced sync
  cancelDebouncedSync();

  // Capture game ref before clearing state (needed for AI queue below)
  const closingGame = state.currentGame;
  const closingTeamID = state.currentTeamData?.teamID;
  const closingSheetName = state.teamSheetMap?.[closingTeamID];

  // Sync changes before leaving game detail view (skip if sync already in progress)
  if (state.currentTeamData && hasPendingChanges && !syncInProgress) {
    try {
      updateSyncIndicator('syncing');
      await syncToGoogleSheets();
      saveToLocalStorage();
      updateSyncIndicator('synced');
      console.log('[App] Synced team data on game close');
    } catch (err) {
      console.error('[App] Failed to sync on game close:', err);
      showToast('Changes saved locally, will sync when online', 'warning');
    }
  }

  // Queue background AI generation if the game has analyzable data
  if (closingGame?.gameID && closingTeamID && closingSheetName &&
      closingGame.status !== 'bye' && closingGame.status !== 'abandoned' &&
      (closingGame.scores || closingGame.lineup)) {
    queueGameAIFireAndForget(closingGame.gameID, closingSheetName, closingTeamID);
  }

  state.currentGame = null;
  showView('main-app-view');
  // Refresh schedule in case scores changed
  window.renderSchedule();
};

// ========================================
// SHARE & EXPORT FUNCTIONS
// ========================================

window.shareCurrentGame = async function() {
  if (!state.currentGame || !state.currentGame.scores) {
    showToast('No score to share yet', 'info');
    return;
  }

  const teamName = state.currentTeam?.teamName || state.currentTeamData?.teamName || 'Team';
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
    showToast('Shared successfully', 'success');
  }
};

window.copyLineup = async function() {
  if (!state.currentGame || !state.currentGame.lineup) {
    showToast('No lineup to share', 'info');
    return;
  }

  haptic(50);

  const teamName = state.currentTeam?.teamName || state.currentTeamData?.teamName || 'Team';
  const cardHTML = generateLineupCardHTML(state.currentGame, teamName);

  if (!cardHTML) {
    showToast('Unable to generate lineup', 'error');
    return;
  }

  const cardElement = document.getElementById('lineup-card');
  const cardContainer = document.getElementById('lineup-card-container');

  if (!cardElement || !cardContainer) {
    showToast('Lineup card container not found', 'error');
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
    if (success) {
      showToast('Lineup copied as text (image failed)', 'info');
    } else {
      showToast('Failed to generate lineup image', 'error');
    }
  }
};

window.printLineupSheet = function() {
  if (!state.currentGame || !state.currentGame.lineup) {
    showToast('No lineup available to print', 'info');
    return;
  }

  haptic(40);
  const teamName = state.currentTeam?.teamName || state.currentTeamData?.teamName || 'Team';
  const html = generateLineupCardPrintableHTML(state.currentGame, teamName);
  if (!html) {
    showToast('Unable to generate printable lineup', 'error');
    return;
  }

  const w = window.open('', '_blank');
  if (!w) {
    showToast('Unable to open print window', 'error');
    return;
  }
  w.document.write(html);
  w.document.close();
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
      const result = validateImportedTeamData(data);

      if (!result.valid) {
        showToast(`Invalid file: ${result.errors[0]}`, 'error');
        return;
      }

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

      state.pendingImport = data;
    },
    (err) => {
      showToast('Failed to read file. Please try again.', 'error');
    }
  );
};

window.confirmImport = async function() {
  if (!state.pendingImport) {
    showToast('No import data found', 'error');
    closeModal();
    return;
  }

  const data = state.pendingImport;
  state.pendingImport = null;

  if (!data.teamID) {
    data.teamID = generateId();
  }

  state.currentTeamData = data;
  state.currentTeam = data;

  state.stats = calculateTeamStats(state.currentTeamData);
  state.analytics = calculateAllAnalytics(state.currentTeamData);

  saveToLocalStorage();

  if (navigator.onLine) {
    try {
      showLoading();
      await syncToGoogleSheets();
      showToast('Team data imported and synced!', 'success');
    } catch (err) {
      console.error('[App] Failed to sync imported data:', err);
      showToast('Imported locally. Sync failed: ' + err.message, 'warning');
    } finally {
      hideLoading();
    }
  } else {
    showToast('Team data imported successfully!', 'success');
  }

  window.renderSchedule();
  window.renderRoster();

  document.getElementById('current-team-name').textContent = data.teamName;
  document.getElementById('current-team-season').textContent = `${data.year} ${data.season}`;

  closeModal();
  haptic([50, 30, 50]);
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

  let us = 0;
  let opponent = 0;
  let hasLineupScores = false;

  if (game.lineup) {
    ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
      const qData = game.lineup[q] || {};
      us += (qData.ourGsGoals || 0) + (qData.ourGaGoals || 0);
      opponent += (qData.oppGsGoals || 0) + (qData.oppGaGoals || 0);
      if (qData.ourGsGoals || qData.ourGaGoals || qData.oppGsGoals || qData.oppGaGoals) {
        hasLineupScores = true;
      }
    });
  }

  if (!hasLineupScores && game.scores) {
    us = game.scores.us;
    opponent = game.scores.opponent;
    hasLineupScores = true;
  }

  if (!hasLineupScores) {
    container.innerHTML = `
      <div class="game-result-badge upcoming">Upcoming</div>
      <div style="margin-top: 16px; color: var(--primary-200);">
        ${escapeHtml(formatDate(game.date))} at ${escapeHtml(game.time)}<br>
        ${escapeHtml(game.location)}
      </div>
    `;
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

  const ourLogo = game.ourLogo || state.currentTeamData?.ourLogo;
  const oppLogo = game.opponentDetails && game.opponentDetails.logoUrl;
  const ourName = state.currentTeam?.teamName || 'Us';

  container.innerHTML = `
    <div class="game-score-display">
      <div class="score-team">
        ${ ourLogo ? `<img src="${escapeAttr(ourLogo)}" alt="${escapeAttr(ourName)}" class="team-logo-game">` : '' }
        <div class="score-value">${escapeHtml(us)}</div>
        <div class="score-label">${escapeHtml(ourName)}</div>
      </div>
      <div class="score-divider">&ndash;</div>
      <div class="score-team">
        ${ oppLogo ? `<img src="${escapeAttr(oppLogo)}" alt="${escapeAttr(game.opponent)}" class="team-logo-game">` : '' }
        <div class="score-value">${escapeHtml(opponent)}</div>
        <div class="score-label">${escapeHtml(game.opponent)}</div>
      </div>
    </div>
    <div class="game-result-badge ${escapeAttr(resultClass)}">${escapeHtml(resultText)}</div>
    ${game.fixtureScore ? `
      <div class="fixture-score-note ${game.scores && game.scores.us === game.fixtureScore.us && game.scores.opponent === game.fixtureScore.opponent ? 'verified' : 'mismatch'}">
        Official: ${game.fixtureScore.us} - ${game.fixtureScore.opponent}
        ${game.scores && game.scores.us === game.fixtureScore.us && game.scores.opponent === game.fixtureScore.opponent
          ? ' ✓ Verified' : ' ⚠ Differs'}
      </div>
    ` : ''}
  `;

  const shareActions = document.getElementById('share-actions');
  if (shareActions) {
    shareActions.style.display = hasLineupScores ? 'flex' : 'none';
  }
}
// Expose for cross-module access
window.renderGameScoreCard = renderGameScoreCard;

// ========================================
// LINEUP BUILDER
// ========================================

function renderLineupBuilder() {
  const game = state.currentGame;
  const container = document.getElementById('lineup-builder');

  if (!game) return;

  const lineup = game.lineup || {};
  const quarterData = lineup[state.currentQuarter] || {};

  const availableSet = game.availablePlayerIDs ? new Set(game.availablePlayerIDs) : null;
  const availablePlayers = state.currentTeamData.players.filter(p =>
    !availableSet || availableSet.has(p.id)
  );

  const assignedNames = new Set(Object.values(quarterData).filter(v => typeof v === 'string'));
  const benchPlayers = availablePlayers.filter(p => !assignedNames.has(p.name));

  container.innerHTML = `
    <!-- Quarter Tabs -->
    <div class="lineup-quarter-tabs">
      ${['Q1', 'Q2', 'Q3', 'Q4'].map(q => `
        <button class="quarter-tab ${q === state.currentQuarter ? 'active' : ''}"
                onclick="selectQuarter('${escapeAttr(q)}')">${escapeHtml(q)}</button>
      `).join('')}
    </div>

    <!-- Planner View Button -->
    <button class="planner-open-btn" onclick="openPlannerView()">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
        <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
      </svg>
      Planner View
    </button>

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
// Expose for cross-module access
window.renderLineupBuilder = renderLineupBuilder;

function renderPositionSlot(position, playerName) {
  const filled = playerName && playerName.length > 0;
  const isCaptain = filled && state.currentGame?.captain === playerName;
  const captainBadge = isCaptain ? '<span class="captain-badge">C</span>' : '';

  return `
    <div class="position-slot ${filled ? 'filled' : ''}" onclick="handlePositionClick('${escapeAttr(position)}', '${filled ? escapeAttr(playerName) : ''}')">
      <div class="position-label">${escapeHtml(position)}</div>
      ${filled
        ? `<div class="position-player">${escapeHtml(playerName)}${captainBadge}</div>`
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

window.handlePositionClick = function(position, playerName) {
  if (state.selectedPlayer) {
    assignPosition(position);
  } else if (playerName) {
    toggleCaptain(playerName);
  }
};

window.toggleCaptain = function(playerName) {
  if (!ensureNotReadOnly('toggleCaptain')) return;
  const game = state.currentGame;
  if (!game) return;

  if (game.captain === playerName) {
    game.captain = null;
    showToast('Captain removed', 'info');
  } else {
    game.captain = playerName;
    showToast(`${playerName} is now captain`, 'success');
  }

  renderLineupBuilder();
  saveToLocalStorage();
  debouncedSync();
};

window.assignPosition = function(position) {
  if (!ensureNotReadOnly('assignPosition')) return;
  const game = state.currentGame;
  if (!game) return;

  if (!game.lineup) game.lineup = {};
  if (!game.lineup[state.currentQuarter]) {
    game.lineup[state.currentQuarter] = {};
  }

  const currentAssigned = game.lineup[state.currentQuarter][position];

  if (state.selectedPlayer) {
    Object.keys(game.lineup[state.currentQuarter]).forEach(pos => {
      if (game.lineup[state.currentQuarter][pos] === state.selectedPlayer) {
        game.lineup[state.currentQuarter][pos] = null;
      }
    });

    game.lineup[state.currentQuarter][position] = state.selectedPlayer;
    state.selectedPlayer = null;
    showToast(`Assigned to ${position}`, 'success');
  } else if (currentAssigned) {
    game.lineup[state.currentQuarter][position] = null;
    showToast(`Cleared ${position}`, 'info');
  }

  renderLineupBuilder();
  saveToLocalStorage();
  debouncedSync();
};
