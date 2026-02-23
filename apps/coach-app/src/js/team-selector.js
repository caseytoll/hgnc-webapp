// ========================================
// TEAM SELECTOR RENDERING & PIN ENTRY
// ========================================

import { state, saveToLocalStorage } from './state.js';
import { escapeHtml, escapeAttr } from '../../../../common/utils.js';
import { validateTeamPIN } from './api.js';

// ========================================
// TEAM SELECTOR RENDERING
// ========================================

function renderTeamCard(team, cssClass) {
  const hasPin = team.hasPin;
  const hasToken = !!state.teamPinTokens[team.teamID];
  const lockIndicator = hasPin
    ? (hasToken ? '<div class="team-card-lock unlocked">🔓</div>' : '<div class="team-card-lock">🔒</div>')
    : '<div class="team-card-arrow">→</div>';
  return `
    <div class="team-card ${cssClass}" onclick="selectTeam('${escapeAttr(team.teamID)}')">
      <div class="team-card-icon">🏐</div>
      <div class="team-card-info">
        <div class="team-card-name">${escapeHtml(team.teamName)}</div>
        <div class="team-card-meta">${escapeHtml(team.year)} ${escapeHtml(team.season)} • ${escapeHtml(team.playerCount)} players</div>
      </div>
      ${lockIndicator}
    </div>`;
}

function sortTeams(teams) {
  return teams.sort((a, b) => (b.year || 0) - (a.year || 0) || (a.teamName || '').localeCompare(b.teamName || ''));
}

function renderTeamList() {
  const container = document.getElementById('team-list');
  if (!container) return;

  const archivedTeams = state.teams.filter(team => team.archived);
  const activeTeams = state.teams.filter(team => !team.archived);
  const showArchived = state.showArchivedTeams ?? false;

  if (activeTeams.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No active teams available</p></div>';
  } else {
    // Separate into "my teams" (have pinToken) and others
    const myTeams = activeTeams.filter(t => state.teamPinTokens[t.teamID]);
    const otherTeams = activeTeams.filter(t => !state.teamPinTokens[t.teamID]);

    // Group others by coach
    const byCoach = {};
    const unassigned = [];
    otherTeams.forEach(team => {
      if (team.coach) {
        if (!byCoach[team.coach]) byCoach[team.coach] = [];
        byCoach[team.coach].push(team);
      } else {
        unassigned.push(team);
      }
    });
    const coachNames = Object.keys(byCoach).sort((a, b) => a.localeCompare(b));

    let html = '';

    // My Teams section (always expanded)
    if (myTeams.length > 0) {
      html += `
        <div class="coach-section">
          <div class="coach-section-header my-teams-header">
            <span>My Teams</span>
            <span class="coach-section-count">${myTeams.length}</span>
          </div>
          <div class="coach-section-content">
            ${sortTeams(myTeams).map(t => renderTeamCard(t, 'active')).join('')}
          </div>
        </div>`;
    }

    // Per-coach sections (collapsible)
    coachNames.forEach(coach => {
      const teams = byCoach[coach];
      const isCollapsed = state.collapsedCoachSections[coach] !== false; // default collapsed
      html += `
        <div class="coach-section">
          <button class="coach-section-header" onclick="toggleCoachSection('${escapeAttr(coach)}')">
            <div class="coach-section-title">
              <svg class="coach-section-icon ${isCollapsed ? '' : 'expanded'}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
              <span>${escapeHtml(coach)}</span>
              <span class="coach-section-count">${teams.length}</span>
            </div>
          </button>
          ${!isCollapsed ? `
            <div class="coach-section-content">
              ${sortTeams(teams).map(t => renderTeamCard(t, 'active')).join('')}
            </div>
          ` : ''}
        </div>`;
    });

    // Unassigned teams section
    if (unassigned.length > 0) {
      const isCollapsed = state.collapsedCoachSections['_unassigned'] !== false;
      html += `
        <div class="coach-section">
          <button class="coach-section-header" onclick="toggleCoachSection('_unassigned')">
            <div class="coach-section-title">
              <svg class="coach-section-icon ${isCollapsed ? '' : 'expanded'}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
              <span>Other Teams</span>
              <span class="coach-section-count">${unassigned.length}</span>
            </div>
          </button>
          ${!isCollapsed ? `
            <div class="coach-section-content">
              ${sortTeams(unassigned).map(t => renderTeamCard(t, 'active')).join('')}
            </div>
          ` : ''}
        </div>`;
    }

    container.innerHTML = html;
  }

  // Archived teams section
  if (archivedTeams.length > 0) {
    let archivedHtml = `
      <div class="archived-section">
        <button class="archived-section-header" onclick="toggleArchivedTeams()">
          <div class="archived-section-title">
            <svg class="archived-section-icon ${showArchived ? 'expanded' : ''}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
            <span>Archived Teams</span>
            <span class="archived-count">${archivedTeams.length}</span>
          </div>
        </button>
        ${showArchived ? `
          <div class="archived-section-content">
            ${archivedTeams.map(t => renderTeamCard(t, 'archived')).join('')}
          </div>
        ` : ''}
      </div>
    `;
    container.innerHTML += archivedHtml;
  }

  updateLibraryCount();
}
window.renderTeamList = renderTeamList;

window.toggleCoachSection = function(coachName) {
  const current = state.collapsedCoachSections[coachName];
  state.collapsedCoachSections[coachName] = current === false ? true : false;
  renderTeamList();
};

window.toggleArchivedTeams = function() {
  state.showArchivedTeams = !state.showArchivedTeams;
  renderTeamList();
};

window.selectTeam = function(teamID) {
  // Check if team requires PIN and we don't have a token
  const team = state.teams.find(t => t.teamID === teamID);
  if (team && team.hasPin && !state.teamPinTokens[teamID]) {
    showPinEntryModal(teamID);
    return;
  }
  window.loadTeamData(teamID);
};

// ========================================
// PIN ENTRY
// ========================================

function showPinEntryModal(teamID) {
  const team = state.teams.find(t => t.teamID === teamID);
  const teamName = team ? escapeHtml(team.teamName) : 'Team';
  openModal('Enter Team PIN', `
    <div style="text-align: center;">
      <p style="margin-bottom: 16px; color: var(--text-secondary);">${teamName}</p>
      <input type="tel" class="pin-input" id="pin-entry-input" maxlength="4" pattern="[0-9]*" inputmode="numeric" placeholder="••••" autocomplete="off">
      <div class="pin-error" id="pin-error"></div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="submitTeamPIN('${escapeAttr(teamID)}')">Unlock</button>
  `);
  // Auto-focus the input after modal opens
  setTimeout(() => {
    const input = document.getElementById('pin-entry-input');
    if (input) {
      input.focus();
      // Submit on Enter key
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          window.submitTeamPIN(teamID);
        }
      });
    }
  }, 100);
}

const pinAttempts = {}; // { teamID: { count, lockedUntil } }

window.submitTeamPIN = async function(teamID) {
  const input = document.getElementById('pin-entry-input');
  const errorEl = document.getElementById('pin-error');
  if (!input) return;

  // Rate limiting: lock out after 5 failed attempts for 30 seconds
  const attempts = pinAttempts[teamID] || { count: 0, lockedUntil: 0 };
  if (attempts.lockedUntil > Date.now()) {
    const secs = Math.ceil((attempts.lockedUntil - Date.now()) / 1000);
    errorEl.textContent = `Too many attempts. Try again in ${secs}s`;
    input.value = '';
    return;
  }

  const pin = input.value.trim();
  if (!/^\d{4}$/.test(pin)) {
    errorEl.textContent = 'Enter a 4-digit PIN';
    input.classList.add('pin-shake');
    setTimeout(() => input.classList.remove('pin-shake'), 500);
    input.value = '';
    input.focus();
    return;
  }

  try {
    const result = await validateTeamPIN(teamID, pin);
    if (result.success && result.pinToken) {
      delete pinAttempts[teamID];
      state.teamPinTokens[teamID] = result.pinToken;
      saveToLocalStorage();
      closeModal();
      renderTeamList();
      window.loadTeamData(teamID);
    } else {
      attempts.count++;
      if (attempts.count >= 5) {
        attempts.lockedUntil = Date.now() + 30000;
        attempts.count = 0;
        errorEl.textContent = 'Too many attempts. Try again in 30s';
      } else {
        errorEl.textContent = 'Invalid PIN';
      }
      pinAttempts[teamID] = attempts;
      input.classList.add('pin-shake');
      setTimeout(() => input.classList.remove('pin-shake'), 500);
      input.value = '';
      input.focus();
    }
  } catch (error) {
    errorEl.textContent = error.message || 'Failed to verify PIN';
    input.value = '';
    input.focus();
  }
};
