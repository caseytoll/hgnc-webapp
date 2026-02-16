// Helper to generate the canonical team slug (matches deploy script)
function teamSlug(team) {
  // Slugify: teamName, year, season (all required)
  const slugify = (s) => (s || '').toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  if (!team.teamName || !team.year || !team.season) return null;
  return [slugify(team.teamName), String(team.year), slugify(team.season)].filter(Boolean).join('-');
}
// --- Early redirect for gameday subdomain ---
try {
  const subdomainMatch = window.location.hostname.match(/^hgnc-gameday-([a-z0-9\-]+)\.pages\.dev$/i);
  if (subdomainMatch && subdomainMatch[1]) {
    const foundSlug = subdomainMatch[1].toLowerCase();
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
      window.location.replace(`/teams/${foundSlug}/`);
      // Prevent further script execution
      throw new Error('Redirecting to team page');
    }
  }
} catch (e) {
  if (e.message !== 'Redirecting to team page') console.warn('[App] Early redirect error:', e.message || e);
}
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
import {
  escapeHtml,
  escapeAttr,
  delay,
  formatDate,
  formatDateTime,
  validatePlayerName,
  validateRound,
  validateYear,
  validatePosition,
  validateLocation,
  validateSeason,
  isDuplicateName,
  generateId,
  getInitials
} from '../../../../common/utils.js';
import { calculateAllAnalytics } from '../../../../common/stats-calculations.js';
import { calculateTeamStats, mockTeams } from '../../../../common/mock-data.js';
import { clubSlugFor } from '../../../../common/utils.js';
import clubLogos from '../../../../data/club-logos.json';
import { transformTeamDataFromSheet, validateTeamPIN, setDataSource, updateStatus } from './api.js';
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
} from '../../../../common/share-utils.js';
import html2canvas from 'html2canvas';
import { openHelpView, showWalkthrough, showContextHelp, helpButtonHtml, contextHelpIcon } from './help.js';

// Module imports (split from monolithic app.js)
import { state, STORAGE_KEY, apiTeamCache, teamCacheMetadata, TEAM_CACHE_TTL_MS, COACH_OTHER_SENTINEL, teamsListCache, teamsListCacheTime, setTeamsListCache, isTeamCacheValid, isTeamsListCacheValid, invalidateTeamsListCache, invalidateTeamCache, updateTeamCache, saveToLocalStorage, loadFromLocalStorage } from './state.js';
import { showLoading, hideLoading, renderScheduleSkeleton, renderRosterSkeleton, renderStatsSkeleton } from './ui.js';
import { syncToGoogleSheets, syncInProgress, hasPendingChanges, updateSyncIndicator, performSync, debouncedSync, cancelDebouncedSync, updateTeamSettings } from './sync.js';
import { normalizeFavPositions, parseFixtureConfig, parseSquadiConfig, getUniqueCoachNames, getOpponentDifficulty, calculateStrengthOfSchedule, fuzzyOpponentMatch } from './helpers.js';

// Feature module side-effect imports (register window.* handlers)
import './stats.js';
import './training.js';
import './lineup-planner.js';
import './player-library.js';
import './scoring.js';
import './team-settings.js';
import './player.js';

// Performance mark: earliest practical marker for app start
try { performance.mark && performance.mark('app-start'); } catch (e) { /* noop */ }

// Runtime API health check and query-toggle handling
async function checkApiHealth(timeoutMs = 3000) {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(`${API_CONFIG.baseUrl}?api=true&action=ping`, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(id);
    if (!resp.ok) throw new Error('Non-OK');
    const data = await resp.json().catch(() => ({}));
    state.apiAvailable = true;
    updateStatus('API OK');
    return true;
  } catch (err) {
    state.apiAvailable = false;
    updateStatus('API unavailable');
    return false;
  }
}

// Inspect URL query for a runtime data override: ?data=mock|live
function applyRuntimeDataOverride() {
  try {
    const params = new URLSearchParams(window.location.search || '');
    const val = params.get('data');
    if (val === 'mock') {
      setDataSource('mock');
      console.log('[App] Runtime override: using mock data (URL param)');
      return true;
    }
    if (val === 'live') {
      setDataSource('api');
      console.log('[App] Runtime override: using live API (URL param)');
      return true;
    }
  } catch (e) {
    /* noop */
  }
  return false;
}
// ========================================
// THEME MANAGEMENT
// ========================================

const THEME_KEY = 'team-manager-theme';

function loadTheme() {
  try {
    const savedTheme = (typeof localStorage !== 'undefined') ? localStorage.getItem(THEME_KEY) : null;
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
      return;
    }
  } catch (e) {
    console.warn('[App] loadTheme: localStorage unavailable', e && e.message ? e.message : e);
  }

  // Check system preference
  const prefersDark = (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) || false;
  document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
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

  // Detect read-only mode and team slug from gameday subdomain or /teams/<slug>/ path
  try {
    let foundSlug = null;
    // 1. Check for gameday subdomain: hgnc-gameday-<slug>.pages.dev
    const subdomainMatch = window.location.hostname.match(/^hgnc-gameday-([a-z0-9\-]+)\.pages\.dev$/i);
    if (subdomainMatch && subdomainMatch[1]) {
      foundSlug = subdomainMatch[1].toLowerCase();
      state.readOnly = true;
      state.requestedTeamSlug = foundSlug;
      state.forceApiForReadOnly = true;
      window.isReadOnlyView = true;
      console.log('[App] Read-only mode (gameday subdomain):', foundSlug);
      // If on the root or team selection page, redirect to the team page
      if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        window.location.replace(`/teams/${foundSlug}/`);
        return;
      }
    } else {
      // 2. Fallback: /teams/<slug>/ path (for local dev)
      const m = window.location.pathname.match(/^\/teams\/(?<slug>[a-z0-9\-]+)\/?$/i);
      if (m && m.groups && m.groups.slug) {
        foundSlug = m.groups.slug.toLowerCase();
        state.readOnly = true;
        state.requestedTeamSlug = foundSlug;
        state.forceApiForReadOnly = true;
        window.isReadOnlyView = true;
        console.log('[App] Read-only team slug requested (local dev):', foundSlug);
      } else {
        state.readOnly = false;
      }
    }
  } catch (e) {
    console.warn('[App] Slug/subdomain parsing failed:', e.message || e);
  }

  // Apply runtime override (URL: ?data=mock|live). If none, perform health-check and use live by default.
  if (!applyRuntimeDataOverride()) {
    checkApiHealth().then(ok => {
      if (!ok) {
        // If API is down, switch data source to mock for safety
        setDataSource('mock');
        console.warn('[App] API health-check failed — switched to mock data');
      }
    });
    // Periodic health-check to recover if API comes back
    setInterval(checkApiHealth, 60 * 1000);
  }

  loadTeams(); // Use cache if valid, fetch fresh otherwise

  // Show first-time walkthrough (after a brief delay so the UI is ready)
  if (!state.readOnly) {
    setTimeout(() => showWalkthrough(), 800);
  }
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

  // Multi-step wizard state
  let wizardState = {
    currentStep: 1,
    totalSteps: 6,
    data: {
      name: '',
      year: new Date().getFullYear(),
      competitionType: 'NFNL',
      season: 'Season 1',
      coach: '',
      coachCustom: '',
      ladderUrl: '',
      resultsApi: ''
    }
  };

  window.openAddTeamModal = function() {
    // Reset wizard state
    wizardState = {
      currentStep: 1,
      totalSteps: 6,
      data: {
        name: '',
        year: new Date().getFullYear(),
        competitionType: 'NFNL',
        season: 'Season 1',
        coach: '',
        coachCustom: '',
        ladderUrl: '',
        resultsApi: ''
      }
    };

    renderWizardModal();
  };

  function renderWizardModal() {
    const stepTitles = {
      1: 'Basic Information',
      2: 'Coach Selection',
      3: 'Integration Setup',
      4: 'Summary & Confirmation'
    };

    const stepContent = getWizardStepContent(wizardState.currentStep);
    const footerButtons = getWizardFooterButtons(wizardState.currentStep);

    openModal(`Add New Team - ${stepTitles[wizardState.currentStep]}`, stepContent, footerButtons);
  }

  function getWizardStepContent(step) {
    const progressBar = `
      <div class="wizard-progress" style="margin-bottom: 20px;">
        <div class="progress-steps">
          ${Array.from({length: wizardState.totalSteps}, (_, i) => {
            const stepNum = i + 1;
            const isActive = stepNum === step;
            const isCompleted = stepNum < step;
            return `<div class="progress-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}">${stepNum}</div>`;
          }).join('')}
        </div>
      </div>
    `;

    switch(step) {
      case 1:
        return progressBar + `
          <div class="form-group">
            <label class="form-label">Team Name</label>
            <input type="text" class="form-input" id="wizard-team-name" maxlength="100" placeholder="e.g. U11 Thunder" value="${wizardState.data.name}">
            <div class="form-help">Enter a unique name for your team (2-100 characters)</div>
          </div>
          <div class="form-group">
            <label class="form-label">Year</label>
            <input type="number" class="form-input" id="wizard-team-year" min="2000" max="2100" value="${wizardState.data.year}">
            <div class="form-help">The competition year for this team</div>
          </div>
        `;

      case 2:
        return progressBar + `
          <div class="form-group">
            <label class="form-label">Competition Type</label>
            <select class="form-select" id="wizard-competition-type" onchange="handleCompetitionTypeChange()">
              <option value="NFNL" ${wizardState.data.competitionType === 'NFNL' ? 'selected' : ''}>NFNL (Northern Football Netball League)</option>
              <option value="Nillumbik Force" ${wizardState.data.competitionType === 'Nillumbik Force' ? 'selected' : ''}>Nillumbik Force</option>
              <option value="Other" ${wizardState.data.competitionType === 'Other' ? 'selected' : ''}>Other</option>
            </select>
            <div class="form-help">Select the competition your team participates in</div>
          </div>
        `;

      case 3:
        if (wizardState.data.competitionType === 'Nillumbik Force') {
          return progressBar + `
            <div class="form-group">
              <label class="form-label">Season</label>
              <select class="form-select" id="wizard-team-season" onchange="handleSeasonChange()">
                <option value="Autumn" ${wizardState.data.season === 'Autumn' ? 'selected' : ''}>Autumn (Feb–Jun)</option>
                <option value="Spring" ${wizardState.data.season === 'Spring' ? 'selected' : ''}>Spring (Jul–Dec)</option>
              </select>
              <div class="form-help">Nillumbik Force runs two seasons per year</div>
            </div>
          `;
        }
        return progressBar + `
          <div class="form-group">
            <label class="form-label">Season</label>
            <select class="form-select" id="wizard-team-season" onchange="handleSeasonChange()">
              <option value="Season 1" ${wizardState.data.season === 'Season 1' ? 'selected' : ''}>Season 1</option>
              <option value="Season 2" ${wizardState.data.season === 'Season 2' ? 'selected' : ''}>Season 2</option>
              ${wizardState.data.competitionType === 'Other' ? '<option value="Other"' + (wizardState.data.season === 'Other' ? ' selected' : '') + '>Other</option>' : ''}
            </select>
            <div class="form-help">Select the competition season</div>
          </div>
        `;

      case 4:
        return progressBar + `
          <div class="form-group">
            <label class="form-label">Coach</label>
            <select class="form-select" id="wizard-team-coach" onchange="handleCoachSelectionChange()">
              <option value="">— None —</option>
              ${getUniqueCoachNames().map(c =>
                `<option value="${escapeAttr(c)}" ${wizardState.data.coach === c ? 'selected' : ''}>${escapeHtml(c)}</option>`
              ).join('')}
              <option value="${COACH_OTHER_SENTINEL}">Other...</option>
            </select>
            <input type="text" class="form-input" id="wizard-team-coach-custom" maxlength="50" placeholder="Enter coach name" style="display:${wizardState.data.coach === COACH_OTHER_SENTINEL ? 'block' : 'none'};margin-top:6px;" value="${wizardState.data.coachCustom}">
            <div class="form-help">Select the coach for this team, or choose "Other..." to enter a custom name</div>
          </div>
        `;

      case 5:
        const isNFNL = wizardState.data.competitionType === 'NFNL';
        const isForce = wizardState.data.competitionType === 'Nillumbik Force';
        return progressBar + `
          ${isNFNL ? `
          <div class="form-group">
            <label class="form-label">Ladder URL <span class="form-label-desc">(optional)</span></label>
            <input type="url" class="form-input" id="wizard-team-ladder-url" maxlength="300" placeholder="https://websites.mygameday.app/..." value="${wizardState.data.ladderUrl}">
            <div class="form-help">For NFNL teams, enter the ladder URL from MyGameDay to automatically sync results</div>
          </div>
          ` : isForce ? `
          <div class="form-group">
            <label class="form-label">Fixture Sync Setup <span class="form-label-desc">(optional)</span></label>
            <select class="form-select" id="wizard-fixture-source" onchange="handleFixtureSourceChange()">
              <option value="">— No fixture sync —</option>
              <option value="squadi">Squadi (Competition fixtures)</option>
              <option value="gameday">GameDay (MyGameDay integration)</option>
            </select>
            <div id="fixture-config-section" style="display:none;margin-top:10px;">
              <!-- Dynamic content will be inserted here -->
            </div>
            <div class="form-help">For Nillumbik Force teams, configure automatic fixture syncing from Squadi or GameDay</div>
          </div>
          ` : `
          <div class="info-section">
            <div class="info-icon">ℹ️</div>
            <div class="info-content">
              <h4>Integration Setup</h4>
              <p>Integration setup is available for NFNL (ladder sync) and Nillumbik Force (fixture sync) competitions.</p>
            </div>
          </div>
          `}
        `;

      case 6:
        const coachDisplay = wizardState.data.coach === COACH_OTHER_SENTINEL ? wizardState.data.coachCustom : wizardState.data.coach;
        const integrationType = wizardState.data.competitionType === 'NFNL' ? 'Ladder' : wizardState.data.competitionType === 'Nillumbik Force' ? 'Fixture Sync' : 'None';
        const hasIntegration = (wizardState.data.competitionType === 'NFNL' && wizardState.data.ladderUrl) || (wizardState.data.competitionType === 'Nillumbik Force' && wizardState.data.resultsApi);
        return progressBar + `
          <div class="summary-section">
            <h4 style="margin-bottom: 15px; color: var(--text-primary);">Review Your Team Details</h4>
            <div class="summary-item">
              <strong>Team Name:</strong> ${wizardState.data.name || 'Not specified'}
            </div>
            <div class="summary-item">
              <strong>Year:</strong> ${wizardState.data.year}
            </div>
            <div class="summary-item">
              <strong>Competition:</strong> ${wizardState.data.competitionType}
            </div>
            <div class="summary-item"><strong>Season:</strong> ${wizardState.data.season}</div>
            <div class="summary-item">
              <strong>Coach:</strong> ${coachDisplay || 'Not specified'}
            </div>
            <div class="summary-item">
              <strong>${integrationType} Integration:</strong> ${hasIntegration ? 'Yes' : 'No'}
            </div>
            ${wizardState.data.ladderUrl ? `<div class="summary-item"><strong>Ladder URL:</strong> ${wizardState.data.ladderUrl}</div>` : ''}
            ${wizardState.data.resultsApi ? `<div class="summary-item"><strong>Fixture Source:</strong> ${JSON.parse(wizardState.data.resultsApi).source || 'Configured'}</div>` : ''}
          </div>
        `;

      default:
        return '';
    }
  }

  function getWizardFooterButtons(step) {
    const prevBtn = step > 1 ? `<button class="btn btn-ghost" onclick="wizardNavigate(${step - 1})">← Back</button>` : '';
    const nextBtn = step < wizardState.totalSteps ? `<button class="btn btn-primary" onclick="wizardNavigate(${step + 1})">Next →</button>` : '';
    const createBtn = step === wizardState.totalSteps ? `<button class="btn btn-primary" onclick="addNewTeam()">Create Team</button>` : '';
    const cancelBtn = `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>`;

    return `${prevBtn}${cancelBtn}${nextBtn}${createBtn}`;
  }

  window.wizardNavigate = function(targetStep) {
    // Validate current step before proceeding
    if (!validateWizardStep(wizardState.currentStep)) {
      return;
    }

    // Save current step data
    saveWizardStepData(wizardState.currentStep);

    // Navigate to target step
    wizardState.currentStep = targetStep;
    renderWizardModal();
  };

  function validateWizardStep(step) {
    switch(step) {
      case 1:
        const name = document.getElementById('wizard-team-name').value.trim();
        const year = parseInt(document.getElementById('wizard-team-year').value);

        if (!name) {
          showToast('Please enter a team name', 'error');
          document.getElementById('wizard-team-name').focus();
          return false;
        }
        if (name.length < 2 || name.length > 100) {
          showToast('Team name must be 2-100 characters', 'error');
          document.getElementById('wizard-team-name').focus();
          return false;
        }
        if (isNaN(year) || year < 2000 || year > 2100) {
          showToast('Year must be between 2000 and 2100', 'error');
          document.getElementById('wizard-team-year').focus();
          return false;
        }
        return true;

      case 2:
        // Competition type is always valid (has defaults)
        return true;

      case 3:
        // Season validation only for NFNL and Other competitions
        if (wizardState.data.competitionType === 'NFNL' || wizardState.data.competitionType === 'Other') {
          const seasonSelect = document.getElementById('wizard-team-season');
          if (seasonSelect) {
            const season = seasonSelect.value;
            const validSeasons = wizardState.data.competitionType === 'NFNL' ? ['Season 1', 'Season 2'] : ['Season 1', 'Season 2', 'Other'];
            if (!validSeasons.includes(season)) {
              showToast('Invalid season selected', 'error');
              return false;
            }
            
            // Check for duplicate name/year/season
            const name = wizardState.data.name;
            const year = wizardState.data.year;
            if (state.teams.some(t => t.teamName.toLowerCase() === name.toLowerCase() && t.year === year && t.season === season)) {
              showToast('A team with this name, year, and season already exists', 'error');
              return false;
            }
          }
        }
        return true;

      case 4:
        // Coach selection is optional, no validation needed
        return true;

      case 5:
        // Integration setup validation
        if (wizardState.data.competitionType === 'NFNL') {
          const ladderUrl = document.getElementById('wizard-team-ladder-url');
          if (ladderUrl && ladderUrl.value.trim()) {
            try {
              new URL(ladderUrl.value.trim());
            } catch (e) {
              showToast('Please enter a valid ladder URL', 'error');
              ladderUrl.focus();
              return false;
            }
          }
        } else if (wizardState.data.competitionType === 'Nillumbik Force') {
          const sourceSelect = document.getElementById('wizard-fixture-source');
          if (sourceSelect && sourceSelect.value) {
            const source = sourceSelect.value;
            if (source === 'squadi') {
              const compId = document.getElementById('wizard-squadi-competition-id');
              const divId = document.getElementById('wizard-squadi-division-id');
              const teamName = document.getElementById('wizard-squadi-team-name');
              
              if (!compId.value || !divId.value || !teamName.value.trim()) {
                showToast('Please fill in all Squadi configuration fields', 'error');
                return false;
              }
            } else if (source === 'gameday') {
              const compId = document.getElementById('wizard-gameday-comp-id');
              const client = document.getElementById('wizard-gameday-client');
              const teamName = document.getElementById('wizard-gameday-team-name');
              
              if (!compId.value.trim() || !client.value.trim() || !teamName.value.trim()) {
                showToast('Please fill in all GameDay configuration fields', 'error');
                return false;
              }
            }
          }
        }
        return true;

      default:
        return true;
    }
  }

  function saveWizardStepData(step) {
    switch(step) {
      case 1:
        wizardState.data.name = document.getElementById('wizard-team-name').value.trim();
        wizardState.data.year = parseInt(document.getElementById('wizard-team-year').value);
        break;
      case 2:
        wizardState.data.competitionType = document.getElementById('wizard-competition-type').value;
        break;
      case 3:
        // Only save season for NFNL and Other competitions
        if (wizardState.data.competitionType === 'NFNL' || wizardState.data.competitionType === 'Other') {
          const seasonSelect = document.getElementById('wizard-team-season');
          wizardState.data.season = seasonSelect ? seasonSelect.value : 'Season 1';
        }
        break;
      case 4:
        const coachSelect = document.getElementById('wizard-team-coach');
        const coachCustom = document.getElementById('wizard-team-coach-custom');
        wizardState.data.coach = coachSelect.value;
        wizardState.data.coachCustom = coachCustom.value.trim();
        break;
      case 5:
        // Save integration data based on competition type
        if (wizardState.data.competitionType === 'NFNL') {
          const ladderUrlInput = document.getElementById('wizard-team-ladder-url');
          wizardState.data.ladderUrl = ladderUrlInput ? ladderUrlInput.value.trim() : '';
          wizardState.data.resultsApi = '';
        } else if (wizardState.data.competitionType === 'Nillumbik Force') {
          const sourceSelect = document.getElementById('wizard-fixture-source');
          const source = sourceSelect ? sourceSelect.value : '';
          
          if (source === 'squadi') {
            const compId = document.getElementById('wizard-squadi-competition-id').value;
            const divId = document.getElementById('wizard-squadi-division-id').value;
            const teamName = document.getElementById('wizard-squadi-team-name').value.trim();
            
            if (compId && divId && teamName) {
              wizardState.data.resultsApi = JSON.stringify({
                source: 'squadi',
                competitionId: parseInt(compId),
                divisionId: parseInt(divId),
                squadiTeamName: teamName
              });
            }
          } else if (source === 'gameday') {
            const compId = document.getElementById('wizard-gameday-comp-id').value.trim();
            const client = document.getElementById('wizard-gameday-client').value.trim();
            const teamName = document.getElementById('wizard-gameday-team-name').value.trim();
            
            if (compId && client && teamName) {
              wizardState.data.resultsApi = JSON.stringify({
                source: 'gameday',
                compID: compId,
                client: client,
                teamName: teamName
              });
            }
          }
          wizardState.data.ladderUrl = '';
        } else {
          wizardState.data.ladderUrl = '';
          wizardState.data.resultsApi = '';
        }
        break;
    }
  }

  window.handleSeasonChange = function() {
    const seasonSelect = document.getElementById('wizard-team-season');
    wizardState.data.season = seasonSelect.value;
    // If changing away from NFNL, clear ladder URL
    if (wizardState.data.season !== 'NFNL') {
      wizardState.data.ladderUrl = '';
    }
    // Re-render current step to show/hide ladder URL field
    renderWizardModal();
  };

  window.handleCoachSelectionChange = function() {
    const coachSelect = document.getElementById('wizard-team-coach');
    const coachCustom = document.getElementById('wizard-team-coach-custom');

    if (coachSelect.value === COACH_OTHER_SENTINEL) {
      coachCustom.style.display = 'block';
      coachCustom.focus();
    } else {
      coachCustom.style.display = 'none';
    }
  };

  window.addNewTeam = async function() {
    // Use wizard state data
    const { name, year, competitionType, season, coach, coachCustom, ladderUrl, resultsApi } = wizardState.data;
    const coachRaw = coach === COACH_OTHER_SENTINEL ? coachCustom : coach;

    // Validation (should already be done in wizard, but double-check)
    if (!name) {
      showToast('Please enter a team name', 'error');
      return;
    }
    if (name.length < 2 || name.length > 100) {
      showToast('Team name must be 2-100 characters', 'error');
      return;
    }
    if (isNaN(year) || year < 2000 || year > 2100) {
      showToast('Year must be between 2000 and 2100', 'error');
      return;
    }

    // Season validation depends on competition type
    let seasonToUse = season;
    const validSeasonsMap = {
      'NFNL': ['Season 1', 'Season 2'],
      'Nillumbik Force': ['Autumn', 'Spring'],
      'Other': ['Season 1', 'Season 2', 'Other']
    };
    const validSeasons = validSeasonsMap[competitionType] || validSeasonsMap['Other'];
    if (!validSeasons.includes(season)) {
      showToast('Invalid season selected', 'error');
      return;
    }

    // Check for duplicate name/year/season
    if (state.teams.some(t => t.teamName.toLowerCase() === name.toLowerCase() && t.year === year && t.season === seasonToUse)) {
      showToast('A team with this name, year, and season already exists', 'error');
      return;
    }

    closeModal();
    showLoading();

    try {
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
      const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;
      const url = new URL(baseUrl, isLocalDev ? window.location.origin : undefined);
      url.searchParams.set('api', 'true');
      url.searchParams.set('action', 'createTeam');
      url.searchParams.set('year', year);
      url.searchParams.set('season', seasonToUse);
      url.searchParams.set('name', name);
      if (coachRaw) url.searchParams.set('coach', coachRaw);
      if (ladderUrl) url.searchParams.set('ladderUrl', ladderUrl);
      if (resultsApi) url.searchParams.set('resultsApi', resultsApi);

      const response = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
      const data = await response.json();

      if (data.success === false) {
        throw new Error(data.error || 'Failed to create team');
      }

      // Reload teams from API to get the new team with proper sheetName
      await loadTeams(true); // Force refresh to bypass cache
      showToast('Team added', 'success');
    } catch (error) {
      console.error('[App] Failed to add team:', error);
      showToast('Failed to add team: ' + error.message, 'error');
    } finally {
      hideLoading();
    }
  };

// ========================================
// SEASON CHANGE HANDLER
// ========================================

function handleSeasonChange() {
  const seasonSelect = document.getElementById('wizard-team-season');
  if (seasonSelect) {
    wizardState.data.season = seasonSelect.value;
    // Re-render the current step to show/hide ladder URL field
    renderWizardModal();
  }
};

// ========================================
// COMPETITION TYPE CHANGE HANDLER
// ========================================

function handleCompetitionTypeChange() {
  const competitionSelect = document.getElementById('wizard-competition-type');
  if (competitionSelect) {
    wizardState.data.competitionType = competitionSelect.value;
    // Set appropriate default season for the competition type
    if (competitionSelect.value === 'Nillumbik Force') {
      // Auto-detect: Autumn (Feb-Jun) or Spring (Jul-Dec)
      const month = new Date().getMonth(); // 0-indexed
      wizardState.data.season = month >= 6 ? 'Spring' : 'Autumn';
    } else if (!wizardState.data.season || wizardState.data.season === '' || wizardState.data.season === 'Autumn' || wizardState.data.season === 'Spring') {
      wizardState.data.season = 'Season 1';
    }
    // Re-render the current step
    renderWizardModal();
  }
};

// ========================================
// FIXTURE SOURCE CHANGE HANDLER
// ========================================

function handleFixtureSourceChange() {
  const sourceSelect = document.getElementById('wizard-fixture-source');
  const configSection = document.getElementById('fixture-config-section');
  
  if (!sourceSelect || !configSection) return;
  
  const source = sourceSelect.value;
  
  if (!source) {
    configSection.style.display = 'none';
    wizardState.data.resultsApi = '';
    return;
  }
  
  configSection.style.display = 'block';
  
  if (source === 'squadi') {
    configSection.innerHTML = `
      <div class="form-group">
        <label class="form-label">Competition ID</label>
        <input type="number" class="form-input" id="wizard-squadi-competition-id" placeholder="e.g. 4640" min="1">
        <div class="form-help">Squadi competition ID (found in URL or settings)</div>
      </div>
      <div class="form-group">
        <label class="form-label">Division ID</label>
        <input type="number" class="form-input" id="wizard-squadi-division-id" placeholder="e.g. 12345" min="1">
        <div class="form-help">Squadi division ID for your team's division</div>
      </div>
      <div class="form-group">
        <label class="form-label">Team Name in Squadi</label>
        <input type="text" class="form-input" id="wizard-squadi-team-name" placeholder="e.g. Hazel Glen 6" maxlength="100">
        <div class="form-help">Exact team name as it appears in Squadi</div>
      </div>
    `;
  } else if (source === 'gameday') {
    configSection.innerHTML = `
      <div class="form-group">
        <label class="form-label">Competition ID</label>
        <input type="text" class="form-input" id="wizard-gameday-comp-id" placeholder="e.g. 655969" maxlength="20">
        <div class="form-help">MyGameDay competition ID (from ladder URL)</div>
      </div>
      <div class="form-group">
        <label class="form-label">Client Code</label>
        <input type="text" class="form-input" id="wizard-gameday-client" placeholder="e.g. 0-9074-0-602490-0" maxlength="50">
        <div class="form-help">MyGameDay client code (from ladder URL)</div>
      </div>
      <div class="form-group">
        <label class="form-label">Team Name in GameDay</label>
        <input type="text" class="form-input" id="wizard-gameday-team-name" placeholder="e.g. Hazel Glen 6" maxlength="100">
        <div class="form-help">Exact team name as it appears in MyGameDay</div>
      </div>
    `;
  }
};

// Expose handlers to window
window.handleCompetitionTypeChange = handleCompetitionTypeChange;
window.handleFixtureSourceChange = handleFixtureSourceChange;

// ========================================
// DATA LOADING
// ========================================

async function loadTeams(forceRefresh = false) {
  showLoading();
  console.log('[App] loadTeams() called, forceRefresh:', forceRefresh);

  // Helper: create slugs from team names to match /teams/<slug>/ URLs
  function slugify(s) {
    return (s || '').toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  try {
    // Stale-while-revalidate: serve cached data immediately (any age), refresh in background
    const hasCachedTeams = !forceRefresh && teamsListCache && Array.isArray(teamsListCache.teams) && teamsListCache.teams.length > 0;

    if (hasCachedTeams) {
      const cacheAge = teamsListCacheTime ? Date.now() - new Date(teamsListCacheTime).getTime() : Infinity;
      console.log('[Cache] Using cached teams list (age:', Math.round(cacheAge / 1000), 's)');
      state.teams = teamsListCache.teams;
      state.teamSheetMap = teamsListCache.teamSheetMap;

      // Background revalidation: always refresh unless cache was just fetched (within TTL)
      if (cacheAge > TEAM_CACHE_TTL_MS) {
        (async () => {
          try {
            console.log('[Cache] Background teams revalidation started');
            try { sendClientMetric('background-revalidate', (teamsListCache.teams || []).length); } catch (e) { /* noop */ }

            const baseUrl = API_CONFIG.baseUrl;
            const resp = await fetch(`${baseUrl}?api=true&action=getTeams&_t=${Date.now()}`);
            if (!resp.ok) {
              console.warn('[Cache] Background revalidation fetch failed, status:', resp.status);
              try { sendClientMetric('background-revalidate-failed', resp.status, (teamsListCache.teams || []).length); } catch (e) { /* noop */ }
              return;
            }
            const data = await resp.json();
            if (data && data.success === false) {
              console.warn('[Cache] Background revalidation server returned error:', data.error);
              try { sendClientMetric('background-revalidate-failed', 1, (teamsListCache.teams || []).length); } catch (e) { /* noop */ }
              return;
            }
            const freshTeams = (data.teams || []).map(t => ({
              teamID: t.teamID, teamName: t.teamName, playerCount: t.playerCount, sheetName: t.sheetName,
              year: t.year, season: t.season, archived: t.archived, ladderUrl: t.ladderUrl,
              resultsApi: t.resultsApi || '',
              lastModified: t.lastModified, hasPin: t.hasPin || false, coach: t.coach || ''
            }));

            // Lightweight comparison by teamID + playerCount + name + coach + hasPin
            const oldSig = JSON.stringify((teamsListCache.teams || []).map(t => ({ teamID: t.teamID, teamName: t.teamName, playerCount: t.playerCount, coach: t.coach, hasPin: t.hasPin, resultsApi: t.resultsApi })));
            const newSig = JSON.stringify(freshTeams.map(t => ({ teamID: t.teamID, teamName: t.teamName, playerCount: t.playerCount, coach: t.coach, hasPin: t.hasPin, resultsApi: t.resultsApi })));

            if (oldSig !== newSig) {
              console.log('[Cache] Teams list updated on server; refreshing UI');
              // Update state and caches
              state.teams = freshTeams.map(t => ({ ...t }));
              state.teamSheetMap = {};
              state.teams.forEach(t => { state.teamSheetMap[t.teamID] = t.sheetName; });
              setTeamsListCache({ teams: state.teams, teamSheetMap: state.teamSheetMap }, new Date().toISOString());
              saveToLocalStorage();

              try { renderTeamList(); } catch (e) { console.warn('[Cache] Failed to re-render team list after update', e); }
              try { if (typeof showToast === 'function') showToast('Teams updated', 'success'); } catch (e) { /* noop */ }

              try { sendClientMetric('background-revalidate-update', (state.teams || []).length); } catch (e) { /* noop */ }
            } else {
              // Refresh cache timestamp to avoid immediate revalidation
              setTeamsListCache(teamsListCache, new Date().toISOString());
              try { saveToLocalStorage(); } catch (e) { /* noop */ }
              try { sendClientMetric('background-revalidate-hit', (teamsListCache.teams || []).length); } catch (e) { /* noop */ }
            }
          } catch (err) {
            console.warn('[Cache] Background teams revalidation failed:', err.message || err);
            try { sendClientMetric('background-revalidate-failed', 1, (teamsListCache.teams || []).length); } catch (e) { /* noop */ }
          }
        })();
      } else {
        console.log('[Cache] Skipping revalidation (cache is fresh)');
      }

    } else {
      // Check if using mock data
      if (API_CONFIG.useMockData) {
        console.log('[App] Using mock data for teams');
        state.teamSheetMap = state.teamSheetMap || {};
        state.teams = mockTeams.map(t => {
          const teamID = t.teamID;
          const sheetName = `Mock-${teamID}`;
          state.teamSheetMap[teamID] = sheetName;
          return {
            teamID,
            teamName: t.teamName,
            playerCount: t.players ? t.players.length : 0,
            sheetName,
            year: t.year,
            season: t.season,
            archived: false,
            ladderUrl: '',
            resultsApi: '',
            lastModified: new Date().toISOString(),
            hasPin: false,
            coach: ''
          };
        });
        // Cache the teams list
        setTeamsListCache({ teams: state.teams, teamSheetMap: state.teamSheetMap }, new Date().toISOString());
        saveToLocalStorage();
        console.log('[Cache] Loaded mock teams list');
        // Send teams fetch metric
        try {
          sendClientMetric('teams-fetch', 0, (state.teams || []).length);
        } catch (e) { /* noop */ }
        try {
          sendClientMetric('app-load', Math.round((performance && performance.now) ? performance.now() : Date.now()), (state.teams || []).length);
        } catch (e) { /* noop */ }
        hideLoading();
        renderTeamList();
        return;
      }

      // Use direct API for both dev and production (browsers handle redirects automatically)
      const baseUrl = API_CONFIG.baseUrl;
      // Measure teams fetch time
      const teamsFetchStart = (performance && performance.now) ? performance.now() : Date.now();
      const response = await fetch(`${baseUrl}?api=true&action=getTeams&_t=${Date.now()}`);
      const teamsFetchMs = Math.round(((performance && performance.now) ? performance.now() : Date.now()) - teamsFetchStart);
      console.log('[App] Response status:', response.status, 'teamsFetchMs:', teamsFetchMs + 'ms');
      const data = await response.json();
      console.log('[App] API response:', data);
      // Quick visible metric for teams fetch
      try { console.log('[Metric] teamsFetchMs:', teamsFetchMs + 'ms'); } catch(e) {}
      if (data.success === false) {
        throw new Error(data.error || 'API request failed');
      }
      // Cache sheetName mapping for later use
      state.teamSheetMap = state.teamSheetMap || {};
      state.teams = (data.teams || []).map(t => {
        state.teamSheetMap[t.teamID] = t.sheetName;
        // Ensure defaults for fields that may be missing from older API responses
        if (t.hasPin === undefined) t.hasPin = false;
        if (!t.coach) t.coach = '';
        if (!t.resultsApi) t.resultsApi = '';
        return t;
      });

      // Cache the teams list
      setTeamsListCache({ teams: state.teams, teamSheetMap: state.teamSheetMap }, new Date().toISOString());
      saveToLocalStorage();
      console.log('[Cache] Fetched and cached teams list');

      // Send teams fetch metric to server-side diagnostics
      try {
        sendClientMetric('teams-fetch', teamsFetchMs, (state.teams || []).length);
      } catch (e) {
        console.warn('[Metric] Failed to send teams-fetch metric:', e);
      }
    }

    // If a team is already selected, update the currentTeam reference so we pick up new fields like ladderUrl
    if (state.currentTeam) {
      const updated = state.teams.find(t => t.teamID === state.currentTeam.teamID);
      if (updated) {
        state.currentTeam = updated;
        try {
          renderMainApp();
        } catch (e) {
          console.warn('[App] Failed to re-render after teams update', e);
        }
      }
    }
    console.log('[App] Loaded', state.teams.length, 'teams');

    // Load player library in background (not needed for team list rendering)
    loadPlayerLibraryFromAPI().catch(err => console.warn('[App] Background player library load failed:', err.message));

    renderTeamList();

    // If a read-only slug was requested on startup, attempt to auto-select the matching team

    try {
      if (state.readOnly && state.requestedTeamSlug) {
        const slug = state.requestedTeamSlug;
        let matched = null;
        for (const t of state.teams) {
          const canonical = teamSlug(t);
          console.log(`[ReadOnly Debug] Team: ${t.teamName} | Canonical Slug:`, canonical, '| Requested:', slug);
          if (canonical === slug) {
            matched = t;
            break;
          }
        }
        if (matched) {
          console.log('[App] Auto-selecting team for read-only view:', matched.teamID, matched.teamName);
          window.isReadOnlyView = true;
          document.body.classList.add('read-only');
          try { showReadOnlyPill(matched.teamName); } catch (e) { /* noop */ }
          selectTeam(matched.teamID);
        } else {
          console.warn('[App] No team matched canonical slug:', slug);
        }
      }
    } catch (e) {
      console.warn('[App] Error handling read-only selection:', e.message || e);
    }

  } catch (error) {
    console.error('[App] Failed to load teams:', error);
    // Persist a short diagnostic for debugging on devices
    try { window.lastTeamsFetchError = (error && error.message) ? error.message : String(error); } catch (e) { /* noop */ }

    // If we intended to use live API but it failed, gracefully fall back to
    // mock data so the UI remains usable and the console isn't spammed.
    if (!API_CONFIG.useMockData) {
      console.warn('[App] Live API unavailable — falling back to mock data');
      try { state.apiAvailable = false; } catch (e) { /* noop */ }

      // Populate teams from mock data
      state.teamSheetMap = state.teamSheetMap || {};
      state.teams = mockTeams.map(t => {
        const teamID = t.teamID;
        const sheetName = `Mock-${teamID}`;
        state.teamSheetMap[teamID] = sheetName;
        return {
          teamID,
          teamName: t.teamName,
          playerCount: t.players ? t.players.length : 0,
          sheetName,
          year: t.year,
          season: t.season,
          archived: false,
          ladderUrl: '',
          resultsApi: '',
          lastModified: new Date().toISOString(),
          hasPin: false,
          coach: ''
        };
      });

      // Cache and render
      setTeamsListCache({ teams: state.teams, teamSheetMap: state.teamSheetMap }, new Date().toISOString());
      saveToLocalStorage();

      try { sendClientMetric('teams-fallback-to-mock', 1, (state.teams || []).length); } catch (e) { /* noop */ }
      showToast('Live API unavailable — using mock data', 'warning');
      try { renderTeamList(); } catch (e) { console.warn('[App] renderTeamList after fallback failed', e); }

    } else {
      try { sendClientMetric('teams-load-failed', window.lastTeamsFetchError || 'unknown'); } catch (e) { /* noop */ }
      showToast('Failed to load teams', 'error');
    }
  } finally {
    hideLoading();

    // Mark app ready and measure load time (from app-start)
    try {
      if (performance && performance.mark && performance.measure) {
        performance.mark('app-ready');
        performance.measure('app-load', 'app-start', 'app-ready');
        const entries = performance.getEntriesByName('app-load');
        if (entries && entries.length) {
          const duration = Math.round(entries[0].duration);
          console.log(`[Metric] app-load-time: ${duration}ms (teams:${state.teams.length})`);

          // Persist a short history in localStorage for quick inspection
          try {
            const key = 'hgnc.appMetrics';
            const history = JSON.parse(localStorage.getItem(key) || '[]');
            history.push({ t: new Date().toISOString(), metric: 'app-load', value: duration, teams: state.teams.length });
            // keep last 20
            localStorage.setItem(key, JSON.stringify(history.slice(-20)));
          } catch (e) {
            console.warn('[Metric] Failed to persist metric:', e);
          }

          // Send metric to server-side diagnostics (best-effort)
          try {
            const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
            const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;
            // Fire-and-forget with success logging and keepalive for page unloads
            try {
              const metricUrl = `${baseUrl}?api=true&action=logClientMetric&name=app-load&value=${duration}&teams=${state.teams.length}`;

              // Prefer fetch with keepalive (supported in modern browsers) and log server response when available
              const sendMetricWithRetry = async (attempt = 1) => {
                try {
                  const resp = await fetch(metricUrl, { method: 'GET', keepalive: true });
                  try {
                    const data = await resp.json();
                    console.log('[Metric] Sent app-load metric, server response:', data);
                    if (data && data.success === false && attempt <= 1) {
                      console.log('[Metric] Server responded with failure; retrying metric POST (attempt', attempt + 1, ')');
                      await new Promise(r => setTimeout(r, 500));
                      return sendMetricWithRetry(attempt + 1);
                    }
                    return data;
                  } catch (parseErr) {
                    console.log('[Metric] Sent app-load metric, non-JSON response status:', resp.status);
                    if (attempt <= 1) {
                      console.log('[Metric] Retrying metric POST (non-JSON response) - attempt', attempt + 1);
                      await new Promise(r => setTimeout(r, 500));
                      return sendMetricWithRetry(attempt + 1);
                    }
                    return null;
                  }
                } catch (err) {
                  if (attempt <= 1) {
                    console.log('[Metric] Metric send failed, retrying (attempt', attempt + 1, ')', err.message);
                    await new Promise(r => setTimeout(r, 500));
                    return sendMetricWithRetry(attempt + 1);
                  }
                  console.warn('[Metric] Failed to send metric after retry:', err.message);
                  return null;
                }
              };

              sendMetricWithRetry().catch(err => console.warn('[Metric] sendMetricWithRetry error:', err.message));
            } catch (e) {
              console.warn('[Metric] Error while sending metric:', e.message);
            }
          } catch (e) {
            console.warn('[Metric] Error sending metric:', e);
          }
        }
      }
    } catch (e) {
      console.warn('[Metric] Measurement failed:', e);
    }
  }
}

// Helper to send a client metric (used for teams-fetch and other small metrics)
function sendClientMetric(name, value, teams) {
  try {
    // Skip metric sending when using mock data or when the API is known to be unavailable
    if (API_CONFIG.useMockData || (typeof state !== 'undefined' && state.apiAvailable === false)) {
      console.log('[Metric] Skipping metric send (mock/offline mode):', name, value, teams);
      return;
    }

    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
    const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;
    const metricUrl = `${baseUrl}?api=true&action=logClientMetric&name=${encodeURIComponent(name)}&value=${encodeURIComponent(value)}&teams=${encodeURIComponent(teams || '')}`;

    const sendMetricWithRetry = async (attempt = 1) => {
      try {
        const resp = await fetch(metricUrl, { method: 'GET', keepalive: true });
        try {
          const data = await resp.json();
          if (data && data.success === false && attempt <= 1) {
            await new Promise(r => setTimeout(r, 500));
            return sendMetricWithRetry(attempt + 1);
          }
          console.log('[Metric] Sent', name, 'metric, server response:', data);
          return data;
        } catch (parseErr) {
          if (attempt <= 1) {
            await new Promise(r => setTimeout(r, 500));
            return sendMetricWithRetry(attempt + 1);
          }
          console.log('[Metric] Sent', name, 'metric, non-JSON response status:', resp.status);
          return null;
        }
      } catch (err) {
        if (attempt <= 1) {
          await new Promise(r => setTimeout(r, 500));
          return sendMetricWithRetry(attempt + 1);
        }
        console.warn('[Metric] Failed to send metric after retry:', err.message);
        return null;
      }
    };

    sendMetricWithRetry().catch(err => console.warn('[Metric] sendClientMetric error:', err.message));
  } catch (e) {
    console.warn('[Metric] sendClientMetric init error:', e);
  }
}

// Dev helper: show persisted app timing metrics
window.showAppMetrics = function() {
  try {
    const history = JSON.parse(localStorage.getItem('hgnc.appMetrics') || '[]');
    console.table(history);
    return history;
  } catch (e) {
    console.warn('Failed to read app metrics:', e);
    return [];
  }
};

// ========================================
// FIXTURE SYNC (Squadi / GameDay)
// ========================================

/**
 * Non-blocking fixture sync. Fetches fixture data from backend and merges into team data.
 */
async function syncFixtureData(team, teamData) {
  if (!team || !navigator.onLine) return;
  const config = parseFixtureConfig(team.resultsApi);
  if (!config) return;

  try {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
    const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;
    const url = `${baseUrl}?api=true&action=getFixtureData&teamID=${encodeURIComponent(team.teamID)}&_t=${Date.now()}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.success || !data.teamFixtures?.length) {
      if (data.error === 'AUTH_TOKEN_EXPIRED') {
        showToast('Squadi auth token expired. Contact admin.', 'warning');
      }
      return;
    }

    // Store division results for opponent scouting (memory only)
    state.divisionResults = data.divisionResults || [];

    const report = mergeFixtureData(teamData, data.teamFixtures);
    if (report.created > 0 || report.updated > 0) {
      // Recalculate stats with new games
      state.stats = calculateTeamStats(teamData);
      state.analytics = calculateAllAnalytics(teamData);
      saveToLocalStorage();
      renderMainApp();

      // Sync merged data to backend (non-blocking)
      syncToGoogleSheets().catch(err => {
        console.warn('[Fixture] Backend sync failed:', err.message);
      });

      const parts = [];
      if (report.created > 0) parts.push(`${report.created} new`);
      if (report.updated > 0) parts.push(`${report.updated} updated`);
      showToast(`Fixtures synced: ${parts.join(', ')}`, 'success');
    }
  } catch (err) {
    console.warn('[Fixture] Auto-sync failed:', err.message);
  }
}

/**
 * Merge fixture data into existing games array.
 * Rules:
 * - Link games to fixtures via fixtureMatchId
 * - Fill empty fields only (never overwrite non-empty)
 * - Status only upgrades from "upcoming" (manual status always wins)
 * - fixtureScore always updated for validation
 * - Never touch: scores, lineup, notes, captain, availablePlayerIDs
 */
function mergeFixtureData(teamData, teamFixtures) {
  const report = { created: 0, updated: 0, skipped: 0 };
  if (!teamData.games) teamData.games = [];

  for (const fixture of teamFixtures) {
    // 1. Find by fixtureMatchId
    let existing = teamData.games.find(g => g.fixtureMatchId === fixture.matchId);

    // 2. Fuzzy match: same round number + no fixtureMatchId set yet
    if (!existing) {
      existing = teamData.games.find(g =>
        !g.fixtureMatchId &&
        g.round == fixture.roundNum &&
        fuzzyOpponentMatch(g.opponent, fixture.opponent)
      );
    }

    if (existing) {
      let changed = false;

      // Link if not already linked
      if (!existing.fixtureMatchId) {
        existing.fixtureMatchId = fixture.matchId;
        changed = true;
      }

      // Fill empty fields only
      if (!existing.opponent || existing.opponent === 'TBD') {
        existing.opponent = fixture.opponent;
        changed = true;
      }
      if (!existing.date && fixture.date) {
        existing.date = fixture.date;
        changed = true;
      }
      if (!existing.time && fixture.time) {
        existing.time = fixture.time;
        changed = true;
      }
      if (!existing.location && fixture.venue) {
        existing.location = fixture.venue;
        changed = true;
      }

      // Status only upgrades from "upcoming"
      if (existing.status === 'upcoming' && fixture.status !== 'upcoming') {
        existing.status = fixture.status;
        changed = true;
      }

      // Always update fixture score for validation
      if (fixture.ourScore !== null && fixture.theirScore !== null) {
        const newScore = { us: fixture.ourScore, opponent: fixture.theirScore };
        if (!existing.fixtureScore ||
            existing.fixtureScore.us !== newScore.us ||
            existing.fixtureScore.opponent !== newScore.opponent) {
          existing.fixtureScore = newScore;
          changed = true;
        }
      }

      if (changed) report.updated++;
      else report.skipped++;
    } else {
      // Create new game from fixture
      teamData.games.push({
        gameID: `g${Date.now()}_${fixture.matchId}`,
        fixtureMatchId: fixture.matchId,
        round: fixture.roundNum,
        opponent: fixture.opponent,
        date: fixture.date || '',
        time: fixture.time || '',
        location: fixture.venue || '',
        status: fixture.status,
        captain: null,
        scores: null,
        fixtureScore: (fixture.ourScore !== null && fixture.theirScore !== null)
          ? { us: fixture.ourScore, opponent: fixture.theirScore }
          : null,
        availablePlayerIDs: (teamData.players || []).filter(p => !p.fillIn).map(p => p.id),
        lineup: null
      });
      report.created++;
    }
  }

  // Sort games by round number
  teamData.games.sort((a, b) => (a.round || 0) - (b.round || 0));
  return report;
}

async function loadTeamData(teamID) {
  // Show skeletons immediately for better perceived performance
  showView('main-app-view');
  renderScheduleSkeleton();
  renderRosterSkeleton();
  renderStatsSkeleton();

  try {
    // Stale-while-revalidate: show cached data instantly, refresh in background if needed
    const hasCachedData = !!apiTeamCache[teamID];

    if (hasCachedData) {
      // Serve cached data immediately (any age) for instant render
      console.log('[Cache] Serving cached team data instantly');
      state.currentTeamData = apiTeamCache[teamID];
      state.currentTeam = state.teams.find(t => t.teamID === teamID);
      state.stats = calculateTeamStats(state.currentTeamData);
      state.analytics = calculateAllAnalytics(state.currentTeamData);
      renderMainApp();

      // Auto-populate from fixtures (non-blocking)
      syncFixtureData(state.currentTeam, state.currentTeamData);

      // Background revalidation: always fetch fresh data to ensure we have the latest
      if (navigator.onLine) {
        (async () => {
          try {
            const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
            const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;
            const sheetName = state.teamSheetMap?.[teamID] || '';
            console.log('[Cache] Background team data revalidation');
            const response = await fetch(`${baseUrl}?api=true&action=getTeamData&teamID=${teamID}&sheetName=${encodeURIComponent(sheetName)}&_t=${Date.now()}`);
            const data = await response.json();
            if (data.success === false) return;

            const teamDataObj = typeof data.teamData === 'string' ? JSON.parse(data.teamData) : data.teamData;
            const freshData = transformTeamDataFromSheet(teamDataObj, teamID);

            // Compare: only update UI if data actually changed
            const oldMod = state.currentTeamData?._lastModified || 0;
            const newMod = freshData._lastModified || 0;
            if (newMod && newMod !== oldMod) {
              console.log('[Cache] Team data updated on server; refreshing UI');
              state.currentTeamData = freshData;
              updateTeamCache(teamID, freshData);
              saveToLocalStorage();
              state.stats = calculateTeamStats(state.currentTeamData);
              state.analytics = calculateAllAnalytics(state.currentTeamData);
              renderMainApp();
              syncFixtureData(state.currentTeam, state.currentTeamData);
            } else {
              // Data unchanged but refresh cache timestamp
              updateTeamCache(teamID, freshData);
              saveToLocalStorage();
              console.log('[Cache] Team data unchanged, refreshed cache timestamp');
            }
          } catch (err) {
            console.warn('[Cache] Background team data revalidation failed:', err.message || err);
          }
        })();
      }
      return; // Already rendered from cache above
    }

    // No cached data: blocking fetch required
    if (navigator.onLine) {
      showLoading();
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
      const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;
      const sheetName = state.teamSheetMap?.[teamID] || '';
      console.log('[App] No cache - fetching team data');
      const response = await fetch(`${baseUrl}?api=true&action=getTeamData&teamID=${teamID}&sheetName=${encodeURIComponent(sheetName)}&_t=${Date.now()}`);
      const data = await response.json();
      if (data.success === false) {
        throw new Error(data.error || 'API request failed');
      }
      const teamDataObj = typeof data.teamData === 'string' ? JSON.parse(data.teamData) : data.teamData;
      state.currentTeamData = transformTeamDataFromSheet(teamDataObj, teamID);

      updateTeamCache(teamID, state.currentTeamData);
      saveToLocalStorage();
      console.log('[App] Fetched and cached team data');
      hideLoading();
    } else {
      throw new Error('No cached data available for offline use');
    }

    state.currentTeam = state.teams.find(t => t.teamID === teamID);

    if (!state.currentTeamData) {
      throw new Error('Team data not found');
    }

    // Auto-populate from fixtures (non-blocking)
    syncFixtureData(state.currentTeam, state.currentTeamData);

    state.stats = calculateTeamStats(state.currentTeamData);
    state.analytics = calculateAllAnalytics(state.currentTeamData);

    renderMainApp();
  } catch (error) {
    console.error('[App] Failed to load team data:', error);
    showToast('Failed to load team data', 'error');
    showView('team-selector-view');
  }
}

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
  loadTeamData(teamID);
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
      loadTeamData(teamID);
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

  // REMOVE any dynamically rendered back/switch team button in the top bar if present
  // (Legacy: some builds injected a back arrow for switching teams)
  const topBar = document.querySelector('#main-app-view .top-bar');
  if (topBar) {
    const legacyBackBtn = topBar.querySelector('.icon-btn.switch-team');
    if (legacyBackBtn) legacyBackBtn.remove();
  }

  // Update quick stats
  document.getElementById('qs-record').textContent = `${stats.wins}-${stats.losses}-${stats.draws}`;

  const gdSign = stats.goalDiff >= 0 ? '+' : '';
  document.getElementById('qs-gd').textContent = `${gdSign}${stats.goalDiff}`;
  document.getElementById('qs-gd').className = `quick-stat-value ${stats.goalDiff >= 0 ? 'text-success' : 'text-error'}`;

  // Next game (find earliest round without scores)
  const nextGame = data.games
    .filter(g => !g.scores)
    .sort((a, b) => a.round - b.round)[0];
  document.getElementById('qs-next').textContent = nextGame ? `R${nextGame.round}` : 'Done';

  // Render content
  renderSchedule();
  renderRoster();

  // Render Ladder Tab if ladderUrl is set
  renderLadderTab(team);
// ========================================
// LADDER TAB RENDERING
// ========================================

function renderLadderTab(team) {
  const navContainer = document.querySelector('.bottom-nav');
  const tabPanelContainer = document.querySelector('.tab-content-area');
  if (!navContainer || !tabPanelContainer) return;

  // Remove existing ladder tab if present
  const existingNav = navContainer.querySelector('.nav-item[data-tab="ladder"]');
  if (existingNav) existingNav.remove();
  const existingPanel = tabPanelContainer.querySelector('#tab-ladder');
  if (existingPanel) existingPanel.remove();

  // Determine ladder source: NFNL (ladderUrl), Squadi (resultsApi), or GameDay (resultsApi)
  const fixtureConfig = parseFixtureConfig(team.resultsApi);
  const squadiConfig = fixtureConfig && fixtureConfig.source === 'squadi' ? fixtureConfig : null;
  const gamedayConfig = fixtureConfig && fixtureConfig.source === 'gameday' ? fixtureConfig : null;
  const hasLadder = team.ladderUrl || squadiConfig || gamedayConfig;
  if (!hasLadder) return;

  // Add Ladder tab to nav (insert before the Stats button to keep order)
  const ladderNav = document.createElement('button');
  ladderNav.className = 'nav-item';
  ladderNav.dataset.tab = 'ladder';
  ladderNav.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <line x1="6" y1="2" x2="6" y2="22" />
      <line x1="18" y1="2" x2="18" y2="22" />
      <line x1="6" y1="6" x2="18" y2="6" />
      <line x1="6" y1="12" x2="18" y2="12" />
      <line x1="6" y1="18" x2="18" y2="18" />
    </svg>
    <span>Ladder</span>
  `;
  ladderNav.setAttribute('aria-label', 'Ladder');
  ladderNav.title = 'Ladder';
  ladderNav.onclick = () => window.switchTab('ladder');
  const statsBtn = navContainer.querySelector('.nav-item[data-tab="stats"]');
  if (statsBtn) {
    navContainer.insertBefore(ladderNav, statsBtn);
  } else {
    navContainer.appendChild(ladderNav);
  }

  // Add Ladder tab panel
  const ladderPanel = document.createElement('div');
  ladderPanel.className = 'tab-panel';
  ladderPanel.id = 'tab-ladder';
  ladderPanel.innerHTML = `<div id="ladder-content"><div class="ladder-loading">Loading ladder...</div></div>`;
  tabPanelContainer.appendChild(ladderPanel);

  // Fetch ladder data from appropriate source (with daily localStorage cache)
  // Squadi and GameDay both use the backend API; NFNL uses the static JSON from the scraper
  const ladderPromise = (squadiConfig || gamedayConfig)
    ? getCachedLadder(team.teamID, () => fetchSquadiLadder(team.teamID))
    : getCachedLadder(team.teamID, () => fetch(`/ladder-${team.teamID}.json`).then(res => res.json()));

  // Use the configured team name for highlighting
  const highlightName = squadiConfig ? (squadiConfig.squadiTeamName || team.teamName || '')
    : gamedayConfig ? (gamedayConfig.teamName || team.teamName || '')
    : (team.teamName || '');

  ladderPromise
    .then(data => {
      const ladderDiv = ladderPanel.querySelector('#ladder-content');
      if (!data.ladder || !data.ladder.rows || !data.ladder.headers) {
        ladderDiv.innerHTML = `<div class="ladder-error">No ladder data available yet.</div>`;
        return;
      }
      renderLadderTable(ladderDiv, data, team, highlightName);
    })
    .catch(() => {
      const ladderDiv = ladderPanel.querySelector('#ladder-content');
      ladderDiv.innerHTML = `<div class="ladder-error">Failed to load ladder. Please try again later.</div>`;
    });
}

function getCachedLadder(teamID, fetchFn) {
  const cacheKey = `ladder.cache.${teamID}`;
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey));
    if (cached && cached.date === today && cached.data) {
      return Promise.resolve(cached.data);
    }
  } catch (e) { /* corrupt cache, refetch */ }
  return fetchFn().then(data => {
    try { localStorage.setItem(cacheKey, JSON.stringify({ date: today, data })); } catch (e) { /* quota */ }
    return data;
  });
}

function fetchSquadiLadder(teamID) {
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;
  return fetch(`${baseUrl}?api=true&action=getSquadiLadder&teamID=${encodeURIComponent(teamID)}`)
    .then(res => res.json());
}

function renderLadderTable(ladderDiv, data, team, highlightName) {
  const allHeaders = data.ladder.headers;
  // Filter out Logo columns
  const headers = allHeaders.filter(h => h !== 'Logo' && h.toLowerCase() !== 'logo');
  const numericHeaders = headers.map(h => /^(POS|P|W|L|D|B|FF|FG|For|Agst|GD|PPG|%|% Won|PTS)$/i.test(h));

  let formatted = formatDateTime(data.lastUpdated || '');

  const showKey = `ladder.showExtra.${team.teamID}`;
  const showExtra = (localStorage.getItem(showKey) === 'true');

  let html = `<div class="ladder-updated">Last updated: ${escapeHtml(formatted || data.lastUpdated || '')}`;
  html += ` <button class="btn btn-ghost btn-xs show-columns-toggle" aria-pressed="${showExtra ? 'true' : 'false'}">${showExtra ? 'Hide extra columns' : 'Show extra columns'}</button>`;
  html += ` <button class="btn btn-ghost btn-xs ladder-refresh-btn" aria-label="Refresh ladder"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg> Refresh</button>`;
  html += `</div>`;

  // Render headers in the desired order: POS, logo, TEAM, then remaining headers
  // Keep `TEAM` in the orderedHeaders so its header cell lines up above the team-name column
  const orderedHeaders = headers.filter(h => h !== 'POS'); // we'll render POS separately
  html += `<div class="ladder-container ${showExtra ? 'expanded-columns' : ''}" role="region" aria-label="Ladder" data-teamid="${escapeAttr(team.teamID)}"><table class="ladder-table"><thead><tr>`;
  // POS first
  html += `<th data-key="POS" class="numeric">POS</th>`;
  // logo column next — keep header empty (icon-only column) so 'TEAM' header lines up above the team name cell
  html += `<th class="logo-col" aria-hidden="true"></th>`;
  // render the TEAM header in its normal column (preserve order in `headers`)
  html += orderedHeaders.map((h, idx) => {
    if (h === 'Logo' || h.toLowerCase() === 'logo') return '';
    return `<th data-key="${escapeAttr(h)}" class="${numericHeaders[headers.indexOf(h)] ? 'numeric' : ''}">${escapeHtml(h)}</th>`;
  }).join('') + `</tr></thead><tbody>`;

  html += data.ladder.rows.map(row => {
    const rowTeamName = String(row['TEAM'] || row['Team'] || '').toLowerCase();
    const isCurrent = highlightName && rowTeamName.includes(highlightName.toLowerCase());

    // Generate logo HTML - use external logo if available, otherwise check for club logo
    let logoSrc = row['Logo'];
    if (!logoSrc) {
      const clubSlug = clubSlugFor(row['TEAM'] || '');
      logoSrc = clubLogos[clubSlug] || null;
    }
    const logoHtml = logoSrc ? `<img src="${escapeAttr(logoSrc)}" class="team-logo-ladder" alt="${escapeAttr(row['TEAM'] || '')} logo" onerror="this.style.display='none'">` : '';

    // Build row: logo cell first, then the rest of the (filtered) headers
    let rowHtml = `<tr class="${isCurrent ? 'highlight' : ''}">`;

    // POS cell first (numeric)
    rowHtml += `<td data-key="POS" class="numeric">${escapeHtml(row['POS'] || row['Pos'] || '')}</td>`;

    // Logo column (separate cell) — keeps team name wrapping clear of the icon
    rowHtml += `<td class="logo-col">${logoHtml}</td>`;

    headers.forEach((h, idx) => {
        // Skip POS (rendered earlier) and any Logo column from the data source
      if (h === 'POS' || h === 'Logo' || h.toLowerCase() === 'logo') return;

      let cellValue = row[h] || '';
      if (h === 'TEAM') {
        // Clean TEAM value (avoid showing URLs)
        if (cellValue && (cellValue.match(/^https?:\/\//) || /\.png|\.jpe?g|\.svg/i.test(cellValue))) {
          cellValue = '';
        }
        // TEAM cell should contain only the name (logo is in its own column)
        rowHtml += `<td data-key="${escapeAttr(h)}" class="team-cell">${escapeHtml(cellValue)}</td>`;
      } else {
        rowHtml += `<td data-key="${escapeAttr(h)}" class="${numericHeaders[idx] ? 'numeric' : ''}">${escapeHtml(cellValue)}</td>`;
      }
    });

    rowHtml += `</tr>`;
    return rowHtml;
  }).join('');

  html += `</tbody></table></div>`;
  ladderDiv.innerHTML = html;

  // Runtime DOM sanity check: ensure thead <th> count matches first tbody row <td> count
  try {
    const theadCount = ladderDiv.querySelectorAll('.ladder-table thead th').length;
    const firstRow = ladderDiv.querySelector('.ladder-table tbody tr');
    const rowTdCount = firstRow ? firstRow.querySelectorAll('td').length : 0;
    if (theadCount !== rowTdCount) {
      console.warn('LADDER DOM MISMATCH: thead th count=%d != first row td count=%d', theadCount, rowTdCount, { theadCount, rowTdCount });
    } else {
      console.debug('LADDER DOM OK: header cells match row cells', theadCount);
    }
  } catch (e) { console.error(e); }

  // Animate in (respect prefers-reduced-motion)
  const container = ladderDiv.querySelector('.ladder-container');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (container) {
    if (!prefersReduced) {
      container.classList.add('ladder-enter');
      requestAnimationFrame(() => requestAnimationFrame(() => container.classList.add('visible')));
      container.addEventListener('transitionend', () => container.classList.remove('ladder-enter'), { once: true });
    } else {
      container.classList.add('visible');
    }
  }

  // Toggle handler
  const toggle = ladderDiv.querySelector('.show-columns-toggle');
  if (toggle && container) {
    toggle.addEventListener('click', () => {
      const expanded = container.classList.toggle('expanded-columns');
      toggle.textContent = expanded ? 'Hide extra columns' : 'Show extra columns';
      toggle.setAttribute('aria-pressed', expanded ? 'true' : 'false');
      try { localStorage.setItem(showKey, expanded ? 'true' : 'false'); } catch (e) { /* ignore */ }
    });
  }

  // Refresh button handler
  const refreshBtn = ladderDiv.querySelector('.ladder-refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      // Clear cache and re-fetch
      try { localStorage.removeItem(`ladder.cache.${team.teamID}`); } catch (e) { /* ignore */ }
      ladderDiv.innerHTML = `<div class="ladder-loading">Refreshing ladder...</div>`;
      const fixCfg = parseFixtureConfig(team.resultsApi);
      const squadiCfg = fixCfg && fixCfg.source === 'squadi' ? fixCfg : null;
      const gamedayCfg = fixCfg && fixCfg.source === 'gameday' ? fixCfg : null;
      const fetchFn = (squadiCfg || gamedayCfg)
        ? () => fetchSquadiLadder(team.teamID)
        : () => fetch(`/ladder-${team.teamID}.json`).then(res => res.json());
      getCachedLadder(team.teamID, fetchFn)
        .then(freshData => {
          if (!freshData.ladder || !freshData.ladder.rows || !freshData.ladder.headers) {
            ladderDiv.innerHTML = `<div class="ladder-error">No ladder data available yet.</div>`;
            return;
          }
          renderLadderTable(ladderDiv, freshData, team, highlightName);
          showToast('Ladder updated');
        })
        .catch(() => {
          ladderDiv.innerHTML = `<div class="ladder-error">Failed to refresh ladder.</div>`;
        });
    });
  }
}
}

// ========================================
// SCHEDULE RENDERING
// ========================================

function renderSchedule() {
  const container = document.getElementById('schedule-list');

  try {
    // Sort games by round number for display
    const games = (state.currentTeamData?.games || []).slice().sort((a, b) => a.round - b.round);

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

    if (game.status === 'abandoned') {
      scoreDisplay = `<div class="game-score-label">Abandoned</div>`;
      resultClass = 'abandoned';
    } else if (game.status === 'bye') {
      scoreDisplay = '';
      resultClass = 'bye';
    } else if (game.scores) {
      const { us, opponent } = game.scores;
      if (us > opponent) resultClass = 'win';
      else if (us < opponent) resultClass = 'loss';
      else resultClass = 'draw';
      scoreDisplay = `<div class="game-score-value">${escapeHtml(us)} - ${escapeHtml(opponent)}</div>`;
    } else {
      scoreDisplay = `<div class="game-score-label">Upcoming</div>`;
    }

    // Score validation badge
    let validationBadge = '';
    if (game.fixtureScore && game.scores && game.status === 'normal') {
      if (game.scores.us === game.fixtureScore.us && game.scores.opponent === game.fixtureScore.opponent) {
        validationBadge = '<span class="score-validated" title="Matches official result">✓</span>';
      } else {
        validationBadge = `<span class="score-mismatch" title="Official: ${game.fixtureScore.us}-${game.fixtureScore.opponent}">⚠</span>`;
      }
    }

    // Opponent difficulty badge (from ladder data)
    let difficultyBadge = '';
    if (game.status !== 'bye' && game.opponent) {
      const diff = getOpponentDifficulty(game.opponent);
      if (diff) {
        difficultyBadge = `<span class="opp-rank opp-rank-${diff.tier}" title="${diff.label} of ${diff.totalTeams}">${diff.label}</span>`;
      }
    }

    return `
      <div class="game-item ${resultClass}" onclick="openGameDetail('${escapeAttr(game.gameID)}')">
        <div class="game-round">R${escapeHtml(game.round)}</div>
        <div class="game-info">
          <div class="game-opponent">
            ${game.status === 'bye' ? 'Bye' : `vs ${escapeHtml(game.opponent)}`}
            ${difficultyBadge}
            ${game.lineupConfirmed !== undefined ? `<span class="lineup-status ${game.lineupConfirmed ? 'confirmed' : 'pending'}" title="Your lineup ${game.lineupConfirmed ? 'confirmed' : 'pending'}">📋</span>` : ''}
            ${game.opponentLineupConfirmed !== undefined ? `<span class="lineup-status ${game.opponentLineupConfirmed ? 'confirmed' : 'pending'}" title="Opponent lineup ${game.opponentLineupConfirmed ? 'confirmed' : 'pending'}">👥</span>` : ''}
          </div>
          <div class="game-meta">
            ${escapeHtml(formatDate(game.date))} • ${escapeHtml(game.time)} • ${escapeHtml(game.location)}
            ${game.venueDetails && game.venueDetails.lat ? `<a href="https://maps.google.com/?q=${game.venueDetails.lat},${game.venueDetails.lng}" target="_blank" class="venue-link" title="View on map">📍</a>` : ''}
            ${game.livestreamUrl ? `<a href="${escapeAttr(game.livestreamUrl)}" target="_blank" class="livestream-link" title="Watch live">📺</a>` : ''}
          </div>
        </div>
        <div class="game-score">
          ${scoreDisplay}${validationBadge}
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
  // Handle both string and array formats for favPosition
  const positions = normalizeFavPositions(player.favPosition);
  const positionDisplay = positions.length > 0 ? positions.join(', ') : 'Flexible';
  return `
    <div class="player-card ${isFillIn ? 'fill-in' : ''}" onclick="openPlayerDetail('${escapeAttr(player.id)}')">
      <div class="player-avatar">${escapeHtml(initials)}</div>
      <div class="player-name">${escapeHtml(player.name)}</div>
      <div class="player-position">${escapeHtml(positionDisplay)}</div>
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
  renderGameNotes();

  showView('game-detail-view');

  // Ensure the Read-only pill is visible on game detail for parents
  if (window.isReadOnlyView) {
    try { showReadOnlyPill(state.currentTeamData?.teamName || state.currentTeamData?.name); } catch (e) { /* noop */ }
  }
};

window.closeGameDetail = async function() {
  // Cancel any pending debounced sync
  cancelDebouncedSync();

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
  const teamName = state.currentTeam?.teamName || state.currentTeamData?.teamName || 'Team';
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

window.confirmImport = async function() {
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

  // Recalculate stats for imported data
  state.stats = calculateTeamStats(state.currentTeamData);
  state.analytics = calculateAllAnalytics(state.currentTeamData);

  // Save to localStorage
  saveToLocalStorage();

  // Sync to Google Sheets if in API mode and online
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

  // Refresh the UI
  renderSchedule();
  renderRoster();

  // Update header
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

  // Calculate totals from lineup data (real-time scoring)
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

  // Use Sets for O(1) lookups instead of O(n) array.includes()
  const availableSet = game.availablePlayerIDs ? new Set(game.availablePlayerIDs) : null;
  const availablePlayers = state.currentTeamData.players.filter(p =>
    !availableSet || availableSet.has(p.id)
  );

  // Find players on bench (not in current quarter)
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
    // Assigning a bench player to position
    assignPosition(position);
  } else if (playerName) {
    // Toggle captain on filled position
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
  debouncedSync();
};

// ========================================
// ========================================
// SYSTEM SETTINGS
// ========================================

/**
 * Show system settings view
 */
window.showSystemSettings = function() {
  showView('system-settings-view');
  renderSystemSettings();
};

/**
 * Render system settings content
 */
function renderSystemSettings() {
  const content = document.getElementById('system-settings-content');
  if (!content) return;

  // Calculate cache stats
  const teamsCached = Object.keys(apiTeamCache).length;
  const teamsListCached = teamsListCache ? 'Yes' : 'No';
  const teamsListAge = teamsListCacheTime ? formatCacheAge(teamsListCacheTime) : 'N/A';

  // Get individual team cache ages
  const teamCacheDetails = Object.keys(teamCacheMetadata).map(teamID => {
    const meta = teamCacheMetadata[teamID];
    const team = state.teams?.find(t => t.teamID === teamID);
    const name = team?.teamName || teamID;
    const year = team?.year || '';
    const season = team?.season || '';
    const subtitle = year && season ? `${year} - ${season}` : '';
    const age = meta?.cachedAt ? formatCacheAge(meta.cachedAt) : 'Unknown';
    return `<div class="settings-row">
      <span>
        <div>${escapeHtml(name)}</div>
        ${subtitle ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${escapeHtml(subtitle)}</div>` : ''}
      </span>
      <span>${age}</span>
    </div>`;
  }).join('');

  // Calculate localStorage usage
  let storageUsed = 0;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    storageUsed = data ? (data.length / 1024).toFixed(1) : 0;
  } catch (e) {}

  // Calculate last sync time from teams list cache
  const lastSyncTime = teamsListCacheTime ? formatCacheAge(teamsListCacheTime) + ' ago' : 'Never';

  content.innerHTML = `
    <div class="settings-section">
      <h3>App Info</h3>
      <div class="settings-row"><span>Version</span><span>v${__APP_VERSION__}</span></div>
      <div class="settings-row"><span>API Endpoint</span><span>${API_CONFIG.baseUrl}</span></div>
      <div class="settings-row"><span>API Status</span><span class="api-status-live">Live</span></div>
      <div class="settings-row"><span>Online</span><span>${navigator.onLine ? 'Yes' : 'No'}</span></div>
      <div class="settings-row"><span>Teams Loaded</span><span>${state.teams?.length || 0}</span></div>
      <div class="settings-row"><span>Last Sync</span><span>${lastSyncTime}</span></div>
      <div class="settings-row"><span>Last teams fetch error</span><span id="last-teams-error">${(window.lastTeamsFetchError) ? window.lastTeamsFetchError : 'None'}</span></div>
    </div>

    <div class="settings-section">
      <h3>Cache Status</h3>
      <div class="settings-row"><span>Teams List Cached</span><span>${teamsListCached}</span></div>
      <div class="settings-row"><span>Teams List Age</span><span>${teamsListAge}</span></div>
      <div class="settings-row"><span>Team Data Cached</span><span>${teamsCached} team(s)</span></div>
      <div class="settings-row"><span>Cache TTL</span><span>7 days</span></div>
    </div>

    ${teamsCached > 0 ? `
    <div class="settings-section">
      <h3>Cached Teams</h3>
      ${teamCacheDetails}
    </div>
    ` : ''}

    <div class="settings-section">
      <h3>Storage</h3>
      <div class="settings-row"><span>localStorage Used</span><span>${storageUsed} KB</span></div>
    </div>

    <div class="settings-section">
      <h3>Performance</h3>
      <div class="settings-row"><span>Page Load Time</span><span>${performance.now ? Math.round(performance.now()) + 'ms' : 'N/A'}</span></div>
      <div class="settings-row"><span>Memory Usage</span><span>${performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB' : 'N/A'}</span></div>
    </div>

    <div class="settings-section">
      <h3>Parent Portal Links</h3>
      <div class="settings-row" style="grid-template-columns: 1fr auto; font-weight: 700;">
        <span>Team</span><span>Parent Portal</span>
      </div>
      ${ (state.teams || []).filter(t => !t.archived).map(t => {
        const slugify = (s) => (s || '').toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const slug = t.teamName && t.year && t.season
          ? [slugify(t.teamName), String(t.year), slugify(t.season)].filter(Boolean).join('-')
          : '';
        const portalUrl = slug ? `https://hgnc-gameday.pages.dev/teams/${slug}/` : '';
        return `<div class="settings-row"><span>${escapeHtml(t.teamName || t.teamID)}<br><small style="color:var(--text-secondary)">${escapeHtml(t.season||'')}</small></span><span style="display:flex;gap:8px;align-items:center;">
              <input type="text" class="form-input" value="${portalUrl}" readonly style="flex:1;min-width:0;max-width:260px;">
              <button class="btn btn-sm btn-outline" onclick="navigator.clipboard.writeText('${portalUrl}').then(()=>showToast('Copied!','success'))">Copy</button>
              <a class="btn btn-sm" href="${portalUrl}" target="_blank" rel="noopener">Open</a>
            </span></div>`;
      }).join('') }
    </div>

    <div class="settings-section">
      <h3>Actions</h3>
      <button class="btn btn-secondary" onclick="clearAllCaches()" style="width: 100%; margin-bottom: 8px;">
        Clear Cache & Reload
      </button>
      <button class="btn btn-outline" onclick="forceFetchTeams()" style="width: 100%; margin-bottom: 8px;">
        Force fetch teams (bypass cache)
      </button>
      <p style="font-size: 12px; color: var(--text-secondary); text-align: center;">
        Clears cached data and forces a fresh teams fetch from the server
      </p>
    </div>
  `;
}

/**
 * Format cache age for display
 */
function formatCacheAge(isoTime) {
  const age = Date.now() - new Date(isoTime).getTime();
  const mins = Math.floor(age / (1000 * 60));
  const hours = Math.floor(age / (1000 * 60 * 60));
  const days = Math.floor(age / (1000 * 60 * 60 * 24));

  if (days > 0) return days + ' day(s) ago';
  if (hours > 0) return hours + 'h ' + (mins % 60) + 'm ago';
  return mins + ' min(s) ago';
}

/**
 * Clear all caches and reload the app
 */
window.clearAllCaches = function() {
  // Clear in-memory caches
  Object.keys(apiTeamCache).forEach(k => delete apiTeamCache[k]);
  Object.keys(teamCacheMetadata).forEach(k => delete teamCacheMetadata[k]);
  setTeamsListCache(null, null);

  // Save cleared state to localStorage
  saveToLocalStorage();

  showToast('Cache cleared', 'success');

  // Reload after short delay to show toast
  setTimeout(() => location.reload(), 500);
};

window.forceFetchTeams = async function() {
  showLoading();
  try {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
    const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;
    const resp = await fetch(`${baseUrl}?api=true&action=getTeams`);
    if (!resp.ok) {
      const errMsg = `Server responded ${resp.status}`;
      window.lastTeamsFetchError = errMsg;
      showToast('Failed to fetch teams', 'error');
      console.warn('[ForceFetch] Failed:', errMsg);
      return;
    }
    const data = await resp.json();
    if (data && data.success === false) {
      window.lastTeamsFetchError = data.error || 'API returned failure';
      showToast('Failed to fetch teams', 'error');
      console.warn('[ForceFetch] API error:', window.lastTeamsFetchError);
      return;
    }

    const teams = (data.teams || []).map(t => ({ ...t }));
    state.teams = teams;
    state.teamSheetMap = state.teamSheetMap || {};
    state.teams.forEach(t => { state.teamSheetMap[t.teamID] = t.sheetName; });

    setTeamsListCache({ teams: state.teams, teamSheetMap: state.teamSheetMap }, new Date().toISOString());
    saveToLocalStorage();

    try { renderTeamList(); } catch (e) { console.warn('[ForceFetch] Failed to render', e); }
    showToast('Teams fetched', 'success');
    window.lastTeamsFetchError = null;
  } catch (err) {
    window.lastTeamsFetchError = (err && err.message) ? err.message : String(err);
    console.warn('[ForceFetch] Error:', window.lastTeamsFetchError);
    showToast('Failed to fetch teams', 'error');
  } finally {
    hideLoading();
    renderSystemSettings();
  }
};

window.deleteTeam = async function(teamID, teamName) {
  if (!confirm(`Are you sure you want to delete "${teamName}"?\n\nThis action cannot be undone and will permanently remove the team and all its data.`)) {
    return;
  }

  showLoading();
  try {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
    const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;

    const response = await fetch(`${baseUrl}?api=true&action=deleteTeam&teamID=${encodeURIComponent(teamID)}`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error(`Server responded ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Delete failed');
    }

    // Remove from local state
    state.teams = state.teams.filter(t => t.teamID !== teamID);

    // Clear any cached data for this team
    delete apiTeamCache[teamID];
    delete teamCacheMetadata[teamID];
    delete state.teamPinTokens[teamID];

    // If this was the current team, go back to team selector
    if (state.currentTeam && state.currentTeam.teamID === teamID) {
      state.currentTeam = null;
      state.currentTeamData = null;
      showView('team-selector-view');
    }

    // Update teams list cache
    setTeamsListCache({ teams: state.teams, teamSheetMap: state.teamSheetMap }, new Date().toISOString());
    saveToLocalStorage();

    renderTeamList();
    showToast(`Team "${teamName}" deleted`, 'success');

  } catch (error) {
    console.error('[DeleteTeam] Error:', error);
    showToast(`Failed to delete team: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
};

// Utility functions are imported from utils.js

// Expose functions that feature modules call via window.*
window.loadTeamData = loadTeamData;
window.renderTeamList = renderTeamList;
window.renderMainApp = renderMainApp;
window.renderSchedule = renderSchedule;
window.renderRoster = renderRoster;
window.renderGameScoreCard = renderGameScoreCard;

// Export state and functions for testing and runtime control
export { state, loadTeams };

// Export for hot module replacement
if (import.meta.hot) {
  import.meta.hot.accept();
}
