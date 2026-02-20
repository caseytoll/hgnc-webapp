// ========================================
// UI HELPERS (view, toast, modal, loading)
// ========================================

import { state } from './state.js';
import { escapeHtml, escapeAttr } from '../../../../common/utils.js';

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

// PIN token helper (used by api.js for write operations)
window.getTeamPinToken = function(teamID) {
  return state.teamPinTokens[teamID] || null;
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
    window.renderStats();
  } else if (tabId === 'training') {
    window.renderTraining();
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

export function showLoading() {
  document.getElementById('loading-overlay').classList.remove('hidden');
}

export function hideLoading() {
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

// Read-only guard helper (use before performing UI/write actions)
window.ensureNotReadOnly = function(action = '') {
  try {
    if (typeof window !== 'undefined' && window.isReadOnlyView) {
      // Friendly notification for parents
      try { showToast('Read-only view: action disabled', 'info'); } catch (e) { /* noop */ }
      console.warn('[Read-only] blocked action:', action);
      return false;
    }
  } catch (e) {
    // If anything goes wrong, don't block by default
    console.warn('[Read-only] guard error:', e.message || e);
  }
  return true;
};

// Show an always-visible small "Read-only" pill in the top bar for parents
window.showReadOnlyPill = function(teamName) {
  try {
    // If already shown, update tooltip/team text
    const existing = document.getElementById('read-only-pill');
    if (existing) {
      existing.title = teamName ? `Read-only — ${escapeAttr(teamName)}` : 'Read-only';
      return;
    }

    const pill = document.createElement('div');
    pill.id = 'read-only-pill';
    pill.className = 'read-only-pill';
    pill.textContent = 'Read\u2011only';
    if (teamName) pill.title = `Read-only — ${escapeAttr(teamName)}`;

    // Place pill in the top-bar title area if available, otherwise append to body
    const topTitle = document.querySelector('.top-bar .top-bar-title');
    if (topTitle) {
      topTitle.appendChild(pill);
    } else {
      document.body.insertBefore(pill, document.body.firstChild);
    }
  } catch (e) {
    console.warn('[Pill] Failed to show read-only pill:', e.message || e);
  }
};

// ========================================
// MODAL MANAGEMENT
// ========================================

// activeNotesModalQuarter is set by scoring.js when the notes modal is open
export let activeNotesModalQuarter = null;
export function setActiveNotesModalQuarter(val) {
  activeNotesModalQuarter = val;
}

window.openModal = function(title, bodyHtml, footerHtml = '') {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-footer').innerHTML = footerHtml;
  document.getElementById('modal-backdrop').classList.remove('hidden');
};

window.closeModal = function() {
  // If notes modal is open, save before closing
  if (activeNotesModalQuarter && !window.isReadOnlyView) {
    const quarter = activeNotesModalQuarter;
    activeNotesModalQuarter = null;
    const textarea = document.getElementById(`notes-modal-textarea-${quarter}`);
    if (textarea) {
      window.updateQuarterNotes(quarter, textarea.value);
    }
  }
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
// SKELETON LOADERS
// ========================================

export function renderScheduleSkeleton() {
  const container = document.getElementById('schedule-list');
  container.innerHTML = `
    <div class="skeleton-schedule">
      ${[1,2,3].map(() => '<div class="skeleton skeleton-card"></div>').join('')}
    </div>
  `;
}

export function renderRosterSkeleton() {
  const container = document.getElementById('roster-grid');
  container.innerHTML = `
    <div class="skeleton-roster">
      ${[1,2,3,4,5,6].map(() => '<div class="skeleton skeleton-player"></div>').join('')}
    </div>
  `;
}

export function renderStatsSkeleton() {
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
