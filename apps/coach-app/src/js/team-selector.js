// ========================================
// TEAM SELECTOR RENDERING & PIN ENTRY
// ========================================

import { state, saveToLocalStorage } from './state.js';
import { escapeHtml, escapeAttr } from '../../../../common/utils.js';
import { validateTeamPIN } from './api.js';

// ========================================
// TEAM SELECTOR RENDERING
// ========================================

function renderTeamCard(team, cssClass, competition = '') {
  const hasPin = team.hasPin;
  const hasToken = !!state.teamPinTokens[team.teamID];
  const lockIndicator = hasPin
    ? (hasToken ? '<div class="team-card-lock unlocked">🔓</div>' : '<div class="team-card-lock">🔒</div>')
    : '<div class="team-card-arrow">→</div>';
  const searchText = `${team.teamName} ${team.year} ${team.season} ${team.coach || ''} ${competition}`.toLowerCase();
  return `
    <div class="team-card ${cssClass}" 
         onclick="selectTeam('${escapeAttr(team.teamID)}')" 
         data-competition="${escapeAttr(competition)}"
         data-search="${escapeAttr(searchText)}">
      <div class="team-card-icon">🏐</div>
      <div class="team-card-info">
        <div class="team-card-name">${escapeHtml(team.teamName)}</div>
        <div class="team-card-meta">${escapeHtml(team.year)} ${escapeHtml(team.season)} • ${escapeHtml(team.playerCount)} players${team.coach ? ` • ${escapeHtml(team.coach)}` : ''}</div>
      </div>
      ${lockIndicator}
    </div>`;
}

// Competition display config: logo paths and full names
const COMPETITIONS = {
  NFNA: { name: 'Nillumbik Force Netball Association', logo: '/assets/comp-logos/nfna.jpg' },
  NFNL: { name: 'Northern Football Netball League', logo: '/assets/comp-logos/nfnl.png' }
};

function sortTeams(teams) {
  // Sort by coach name (no coach last), then year descending, then team name
  return teams.sort((a, b) => {
    const aCoach = a.coach || '';
    const bCoach = b.coach || '';
    if (aCoach && !bCoach) return -1;
    if (!aCoach && bCoach) return 1;
    if (aCoach !== bCoach) return aCoach.localeCompare(bCoach);
    return (b.year || 0) - (a.year || 0) || (a.teamName || '').localeCompare(b.teamName || '');
  });
}

function renderTeamList() {
  const container = document.getElementById('team-list');
  if (!container) return;

  const archivedTeams = state.teams.filter(team => team.archived);
  const activeTeams = state.teams.filter(team => !team.archived);
  const showArchived = state.showArchivedTeams ?? false;

  // Quick search and filter bar (for 20+ teams)
  const competitions = [...new Set(activeTeams.map(t => t.competition || (t.season === 'NFNL' ? 'NFNL' : 'NFNA')))].sort();
  const filterHtml = competitions.length > 1 ? `
    <div class="team-list-filters">
      <input type="text" 
             id="team-quick-search" 
             class="form-input" 
             placeholder="Search teams..."
             oninput="quickSearchTeams(this.value)"
             autocomplete="off">
      <select id="competition-filter" 
              class="form-select" 
              onchange="filterTeamsByCompetition(this.value)">
        <option value="">All Competitions (${activeTeams.length})</option>
        ${competitions.map(comp => {
          const info = COMPETITIONS[comp] || { name: comp };
          const count = activeTeams.filter(t => (t.competition || (t.season === 'NFNL' ? 'NFNL' : 'NFNA')) === comp).length;
          return `<option value="${escapeAttr(comp)}">${escapeHtml(info.name)} (${count})</option>`;
        }).join('')}
      </select>
    </div>
  ` : '';

  if (filterHtml) {
    container.innerHTML = filterHtml;
  } else {
    container.innerHTML = '';
  }

  if (activeTeams.length === 0) {
    container.innerHTML += '<div class="empty-state"><p>No active teams available</p></div>';
  } else {
    // Group by competition, then sort within each group by coach
    const byComp = {};
    const unassigned = [];
    activeTeams.forEach(team => {
      // Use explicit competition field, or infer from season for legacy teams
      const comp = team.competition || (team.season === 'NFNL' ? 'NFNL' : 'NFNA');
      if (comp) {
        if (!byComp[comp]) byComp[comp] = [];
        byComp[comp].push(team);
      } else {
        unassigned.push(team);
      }
    });

    // Render competition sections in alphabetical order
    const compKeys = Object.keys(byComp).sort((a, b) => a.localeCompare(b));
    let html = '<div id="team-list-items">';

    compKeys.forEach(comp => {
      const info = COMPETITIONS[comp] || { name: comp, logo: '' };
      const teams = sortTeams(byComp[comp]);
      html += `
        <div class="comp-section" data-competition="${escapeAttr(comp)}">
          <div class="comp-section-header">
            ${info.logo ? `<img class="comp-logo" src="${escapeAttr(info.logo)}" alt="${escapeAttr(info.name)}">` : ''}
            <span class="comp-name">${escapeHtml(info.name)}</span>
          </div>
          <div class="comp-section-content">
            ${teams.map(t => renderTeamCard(t, 'active', comp)).join('')}
          </div>
        </div>`;
    });

    // Teams with no competition assigned
    if (unassigned.length > 0) {
      html += sortTeams(unassigned).map(t => renderTeamCard(t, 'active', '')).join('');
    }

    html += '</div>';
    container.innerHTML += html;
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


window.toggleArchivedTeams = function() {
  state.showArchivedTeams = !state.showArchivedTeams;
  renderTeamList();
};

// Quick search for teams (20+ team optimization)
window.quickSearchTeams = function(query) {
  const compSections = document.querySelectorAll('.comp-section');
  const teamCards = document.querySelectorAll('.team-card');
  
  if (!query || query.length < 2) {
    // Show all
    compSections.forEach(s => s.style.display = '');
    teamCards.forEach(c => c.style.display = '');
    return;
  }
  
  const lowerQuery = query.toLowerCase();
  let visibleCount = 0;
  
  teamCards.forEach(card => {
    const searchText = card.dataset.search || '';
    if (searchText.indexOf(lowerQuery) !== -1) {
      card.style.display = '';
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });
  
  // Hide empty competition sections
  compSections.forEach(section => {
    const visibleCards = section.querySelectorAll('.team-card:not([style*="display: none"])');
    section.style.display = visibleCards.length > 0 ? '' : 'none';
  });
};

// Filter teams by competition (20+ team optimization)
window.filterTeamsByCompetition = function(comp) {
  const compSections = document.querySelectorAll('.comp-section');
  
  if (!comp) {
    // Show all competitions
    compSections.forEach(s => s.style.display = '');
    return;
  }
  
  compSections.forEach(section => {
    if (section.dataset.competition === comp) {
      section.style.display = '';
    } else {
      section.style.display = 'none';
    }
  });
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
