// ========================================
// SCORING, NOTES & AVAILABILITY
// ========================================

import { state, saveToLocalStorage } from './state.js';
import { syncToGoogleSheets, debouncedSync } from './sync.js';
import { escapeHtml, escapeAttr } from '../../../../common/utils.js';
import { resolvePlayerName, getPlayerChipsHtml } from './helpers.js';
import { setActiveNotesModalQuarter } from './ui.js';
import { contextHelpIcon } from './help.js';
import { calculateTeamStats } from '../../../../common/mock-data.js';
import { calculateAllAnalytics } from '../../../../common/stats-calculations.js';

// ========================================
// AVAILABILITY
// ========================================

window.renderAvailabilityList = renderAvailabilityList;
export function renderAvailabilityList() {
  const game = state.currentGame;
  const container = document.getElementById('availability-list');

  if (!game) return;

  const players = state.currentTeamData.players;
  const availableIDs = game.availablePlayerIDs || players.map((p) => p.id);

  container.innerHTML = `
    <div class="availability-list">
      ${players
        .map((p) => {
          const isAvailable = availableIDs.includes(p.id);
          const disabled = window.isReadOnlyView ? 'disabled' : '';
          return `
          <div class="availability-item">
            <input type="checkbox" class="availability-checkbox"
                   data-player-id="${escapeAttr(p.id)}"
                   ${isAvailable ? 'checked' : ''} ${disabled} aria-disabled="${window.isReadOnlyView ? 'true' : 'false'}"
                   onchange="toggleAvailability('${escapeAttr(p.id)}', this.checked)">
            <div class="availability-name">${escapeHtml(p.name)}</div>
            <div class="availability-status">${isAvailable ? 'Available' : 'Unavailable'}</div>
          </div>
        `;
        })
        .join('')}
    </div>
  `;
}

window.toggleAvailability = function (playerID, available) {
  if (!ensureNotReadOnly('toggleAvailability')) {
    // If blocked, re-render to reset any transient UI changes (checkbox flip from click)
    try {
      renderAvailabilityList();
    } catch (e) {
      /* noop */
    }
    return;
  }
  const game = state.currentGame;
  if (!game) return;

  if (!game.availablePlayerIDs) {
    game.availablePlayerIDs = state.currentTeamData.players.map((p) => p.id);
  }

  if (available) {
    if (!game.availablePlayerIDs.includes(playerID)) {
      game.availablePlayerIDs.push(playerID);
    }
  } else {
    game.availablePlayerIDs = game.availablePlayerIDs.filter((id) => id !== playerID);
  }

  renderAvailabilityList();
  window.renderLineupBuilder();
  saveToLocalStorage();
  debouncedSync();
};

// ========================================
// SCORING
// ========================================

window.renderScoringInputs = renderScoringInputs;
export function renderScoringInputs() {
  const game = state.currentGame;
  const container = document.getElementById('scoring-inputs');

  if (!game) return;

  const lineup = game.lineup || {};

  const createPlayerScoreRow = (quarter, field, value, position, playerVal) => {
    const playerName = resolvePlayerName(playerVal);
    const disabled = window.isReadOnlyView ? 'disabled' : '';
    return `
      <div class="player-score-row">
        <div class="player-score-info">
          <span class="player-score-name">${escapeHtml(playerName || 'Not assigned')}</span>
          <span class="player-score-position">${escapeHtml(position)}</span>
        </div>
        <div class="score-stepper">
          <button class="stepper-btn stepper-minus" ${window.isReadOnlyView ? 'disabled' : `onclick="adjustScore('${escapeAttr(quarter)}', '${escapeAttr(field)}', -1)"`} aria-label="Decrease">−</button>
          <input type="number" class="scoring-input" id="score-${escapeAttr(quarter)}-${escapeAttr(field)}" min="0" value="${escapeAttr(value)}" ${disabled}
                 onchange="updateScore('${escapeAttr(quarter)}', '${escapeAttr(field)}', this.value)" inputmode="numeric">
          <button class="stepper-btn stepper-plus" ${window.isReadOnlyView ? 'disabled' : `onclick="adjustScore('${escapeAttr(quarter)}', '${escapeAttr(field)}', 1)"`} aria-label="Increase">+</button>
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
    let us = 0,
      opp = 0;
    ['Q1', 'Q2', 'Q3', 'Q4'].forEach((q) => {
      const qData = lineup[q] || {};
      us += (qData.ourGsGoals || 0) + (qData.ourGaGoals || 0);
      opp += (qData.oppGsGoals || 0) + (qData.oppGaGoals || 0);
    });
    return { us, opp };
  };

  const gameTotal = calcGameTotal();

  // Default to Q1 expanded
  const expandedQuarter = state.expandedScoringQuarter || 'Q1';

  container.innerHTML = `
    <div class="scoring-panel-header">
      <span class="scoring-panel-title">Score by Quarter</span>
      ${contextHelpIcon('scoring')}
    </div>
    ${['Q1', 'Q2', 'Q3', 'Q4']
      .map((q, index) => {
        const qData = lineup[q] || {};
        const qTotal = calcQuarterTotal(qData);
        const isExpanded = q === expandedQuarter;
        return `
        <div class="scoring-quarter-header${isExpanded ? ' expanded' : ''}" data-quarter="${escapeAttr(q)}" onclick="toggleScoringQuarter('${escapeAttr(q)}')">
          <div class="quarter-header-left">
            <span class="quarter-name">${escapeHtml(q)}</span>
            <span class="quarter-score" id="qscore-${escapeAttr(q)}">${escapeHtml(qTotal.us)} : ${escapeHtml(qTotal.opp)}</span>
          </div>
          <svg class="accordion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
        <div class="scoring-quarter-content${isExpanded ? ' expanded' : ''}" data-quarter="${escapeAttr(q)}">
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
          <div class="notes-preview${(qData.notes || '').trim() ? ' has-notes' : ''}" id="notes-preview-${escapeAttr(q)}" onclick="openNotesModal('${escapeAttr(q)}')">
            <svg class="notes-preview-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <span class="notes-preview-text" id="notes-preview-text-${escapeAttr(q)}">${(qData.notes || '').trim() ? escapeHtml((qData.notes || '').trim().substring(0, 80) + ((qData.notes || '').trim().length > 80 ? '...' : '')) : window.isReadOnlyView ? 'No notes' : 'Tap to add notes...'}</span>
            <svg class="notes-preview-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
        </div>
      `;
      })
      .join('')}

    <div class="scoring-autosave-indicator" id="autosave-indicator">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
      <span>Auto-saved</span>
    </div>

    <button class="btn btn-primary btn-block" onclick="finalizeGame()">
      Finalize Game
    </button>
  `;
}

window.toggleScoringQuarter = function (quarter) {
  // Toggle accordion - only one quarter open at a time
  const headers = document.querySelectorAll('.scoring-quarter-header');
  const contents = document.querySelectorAll('.scoring-quarter-content');

  headers.forEach((header) => {
    const isTarget = header.dataset.quarter === quarter;
    const wasExpanded = header.classList.contains('expanded');

    if (isTarget && !wasExpanded) {
      // Expand this one
      header.classList.add('expanded');
      state.expandedScoringQuarter = quarter;
    } else {
      // Collapse
      header.classList.remove('expanded');
    }
  });

  contents.forEach((content) => {
    const isTarget = content.dataset.quarter === quarter;
    const headerExpanded = document
      .querySelector(`.scoring-quarter-header[data-quarter="${content.dataset.quarter}"]`)
      ?.classList.contains('expanded');

    if (isTarget && headerExpanded) {
      content.classList.add('expanded');
    } else {
      content.classList.remove('expanded');
    }
  });
};

window.updateScore = function (quarter, field, value) {
  if (!ensureNotReadOnly('updateScore')) return;
  const game = state.currentGame;
  if (!game) return;

  if (!game.lineup) game.lineup = {};
  if (!game.lineup[quarter]) game.lineup[quarter] = {};

  game.lineup[quarter][field] = parseInt(value) || 0;

  // Update quarter and total displays
  updateScoringDisplays();

  // Update the score card at the top
  window.renderGameScoreCard();

  // Persist to localStorage immediately, sync to API after debounce
  saveToLocalStorage();
  debouncedSync();

  // Flash auto-save indicator
  flashAutosaveIndicator();
};

window.adjustScore = function (quarter, field, delta) {
  if (!ensureNotReadOnly('adjustScore')) return;
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
  window.renderGameScoreCard();

  // Persist to localStorage immediately, sync to API after debounce
  saveToLocalStorage();
  debouncedSync();

  // Flash auto-save indicator
  flashAutosaveIndicator();
};

function updateScoringDisplays() {
  const game = state.currentGame;
  if (!game || !game.lineup) return;

  ['Q1', 'Q2', 'Q3', 'Q4'].forEach((q) => {
    const qData = game.lineup[q] || {};
    const qUs = (qData.ourGsGoals || 0) + (qData.ourGaGoals || 0);
    const qOpp = (qData.oppGsGoals || 0) + (qData.oppGaGoals || 0);

    // Update quarter score
    const qScoreEl = document.getElementById(`qscore-${q}`);
    if (qScoreEl) {
      qScoreEl.textContent = `${qUs} : ${qOpp}`;
    }
  });
}

function flashAutosaveIndicator() {
  // Now handled by updateSyncIndicator via debouncedSync
  // This function kept for backwards compatibility
}

// ========================================
// QUARTER NOTES
// ========================================

window.insertTimestamp = function (textareaId) {
  const textarea = document.getElementById(textareaId);
  if (!textarea) return;

  // Format time as h:mmam/pm in Melbourne timezone
  const now = new Date();
  const timeStr = now
    .toLocaleTimeString('en-AU', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Australia/Melbourne',
    })
    .toLowerCase()
    .replace(' ', '');

  const timestamp = `[${timeStr}] `;

  // Get cursor position
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;

  // Insert timestamp at cursor, adding newline if not at start of line
  let insertText = timestamp;
  if (start > 0 && value[start - 1] !== '\n') {
    insertText = '\n' + timestamp;
  }

  // Insert the timestamp
  textarea.value = value.substring(0, start) + insertText + value.substring(end);

  // Move cursor to end of inserted timestamp
  const newPos = start + insertText.length;
  textarea.selectionStart = newPos;
  textarea.selectionEnd = newPos;
  textarea.focus();

  // Trigger the onchange to save
  textarea.dispatchEvent(new Event('change', { bubbles: true }));
};

window.insertPlayerName = function (textareaId, name) {
  const textarea = document.getElementById(textareaId);
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;

  // Insert name with appropriate spacing
  let insertText = name;
  if (start > 0 && value[start - 1] !== ' ' && value[start - 1] !== '\n') {
    insertText = ' ' + insertText;
  }
  if (end < value.length && value[end] !== ' ' && value[end] !== '\n') {
    insertText = insertText + ' ';
  }

  textarea.value = value.substring(0, start) + insertText + value.substring(end);

  // Move cursor to end of inserted text
  const newPos = start + insertText.length;
  textarea.selectionStart = newPos;
  textarea.selectionEnd = newPos;
  textarea.focus();

  // Trigger the onchange to save
  textarea.dispatchEvent(new Event('change', { bubbles: true }));
};

window.updateQuarterNotes = function (quarter, value) {
  if (!ensureNotReadOnly('updateQuarterNotes')) return;
  const game = state.currentGame;
  if (!game) return;

  if (!game.lineup) game.lineup = {};
  if (!game.lineup[quarter]) game.lineup[quarter] = {};

  game.lineup[quarter].notes = value;

  // Persist to localStorage immediately, sync to API after debounce
  saveToLocalStorage();
  debouncedSync();

  // Flash auto-save indicator
  flashAutosaveIndicator();

  // Update notes panel if it's currently visible
  renderGameNotes();

  // Update scoring preview row
  updateNotesPreview(quarter);
};

window.openNotesModal = function (quarter) {
  setActiveNotesModalQuarter(quarter);
  const game = state.currentGame;
  if (!game) return;

  const qData = (game.lineup || {})[quarter] || {};
  const textareaId = `notes-modal-textarea-${quarter}`;
  const isReadOnly = window.isReadOnlyView;

  const chipsHtml = !isReadOnly
    ? `
    <div class="notes-modal-chips">
      <div class="notes-quick-buttons">
        <button type="button" class="timestamp-btn" onclick="insertTimestamp('${escapeAttr(textareaId)}')" title="Insert timestamp">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        </button>
        <div class="player-chips">${getPlayerChipsHtml(quarter, textareaId)}</div>
      </div>
    </div>
  `
    : '';

  const bodyHtml = `
    ${chipsHtml}
    <textarea class="notes-modal-textarea" id="${escapeAttr(textareaId)}" placeholder="Quarter notes..." ${isReadOnly ? 'disabled' : ''} onchange="updateQuarterNotes('${escapeAttr(quarter)}', this.value)">${escapeHtml(qData.notes || '')}</textarea>
  `;

  const footerHtml = `
    <button class="btn btn-primary btn-block" onclick="saveAndCloseNotesModal('${escapeAttr(quarter)}')">${isReadOnly ? 'Close' : 'Done'}</button>
  `;

  openModal(`${quarter} Notes`, bodyHtml, footerHtml);

  // Auto-focus textarea after modal animation
  if (!isReadOnly) {
    setTimeout(() => {
      const textarea = document.getElementById(textareaId);
      if (textarea) {
        textarea.focus();
        textarea.selectionStart = textarea.value.length;
        textarea.selectionEnd = textarea.value.length;
      }
    }, 100);
  }
};

window.saveAndCloseNotesModal = function (quarter) {
  // Save notes before closing - use the quarter arg directly since we know which modal is open
  setActiveNotesModalQuarter(null); // Clear first to prevent double-save in closeModal

  if (quarter && !window.isReadOnlyView) {
    const textarea = document.getElementById(`notes-modal-textarea-${quarter}`);
    if (textarea) {
      updateQuarterNotes(quarter, textarea.value);
    }
  }

  closeModal();
};

function updateNotesPreview(quarter) {
  const game = state.currentGame;
  if (!game) return;

  const qData = (game.lineup || {})[quarter] || {};
  const notes = (qData.notes || '').trim();
  const previewEl = document.getElementById(`notes-preview-${quarter}`);
  const textEl = document.getElementById(`notes-preview-text-${quarter}`);

  if (previewEl) {
    if (notes) {
      previewEl.classList.add('has-notes');
    } else {
      previewEl.classList.remove('has-notes');
    }
  }

  if (textEl) {
    if (notes) {
      textEl.textContent = notes.substring(0, 80) + (notes.length > 80 ? '...' : '');
    } else {
      textEl.textContent = window.isReadOnlyView ? 'No notes' : 'Tap to add notes...';
    }
  }
}

window.renderGameNotes = renderGameNotes;
export function renderGameNotes() {
  const game = state.currentGame;
  const container = document.getElementById('notes-content');
  if (!container || !game) return;

  const lineup = game.lineup || {};

  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const hasAnyNotes = quarters.some((q) => lineup[q]?.notes);

  if (!hasAnyNotes) {
    container.innerHTML = `
      <div class="notes-empty-state">
        <p>No notes yet. Add notes in the Scoring tab.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="notes-panel">
      ${quarters
        .map((q) => {
          const qData = lineup[q] || {};
          const notes = qData.notes || '';
          return `
          <div class="quarter-notes-card">
            <div class="quarter-notes-header">${escapeHtml(q)}</div>
            <div class="quarter-notes-content ${notes ? '' : 'quarter-notes-empty'}">
              ${notes ? escapeHtml(notes) : 'No notes'}
            </div>
          </div>
        `;
        })
        .join('')}
    </div>
  `;
}

window.finalizeGame = async function () {
  if (!ensureNotReadOnly('finalizeGame')) return;
  const game = state.currentGame;
  if (!game || !game.lineup) return;

  let ourTotal = 0;
  let theirTotal = 0;

  ['Q1', 'Q2', 'Q3', 'Q4'].forEach((q) => {
    const qData = game.lineup[q] || {};
    ourTotal += (qData.ourGsGoals || 0) + (qData.ourGaGoals || 0);
    theirTotal += (qData.oppGsGoals || 0) + (qData.oppGaGoals || 0);
  });

  game.scores = { us: ourTotal, opponent: theirTotal };

  // Always set status to 'normal' when finalizing - the user is explicitly marking the game as complete
  game.status = 'normal';

  window.renderGameScoreCard();

  // Recalculate stats and analytics
  state.stats = calculateTeamStats(state.currentTeamData);
  state.analytics = calculateAllAnalytics(state.currentTeamData);

  // Persist to localStorage
  saveToLocalStorage();

  // Sync to Google Sheets if using API mode and online
  if (navigator.onLine) {
    try {
      showToast('Syncing to cloud...', 'info');
      await syncToGoogleSheets();
      showToast(`Game finalized: ${ourTotal} - ${theirTotal} (synced)`, 'success');
    } catch (err) {
      console.error('[Sync] Failed to sync:', err);
      showToast(`Saved locally. Sync failed: ${err.message}`, 'warning');
    }
  } else {
    showToast(`Game finalized: ${ourTotal} - ${theirTotal}`, 'success');
  }

  // Also re-render stats if stats tab is active
  if (document.getElementById('stats-container')) {
    window.renderStats();
  }
};

// Backward compatibility alias
window.calculateGameTotal = window.finalizeGame;
