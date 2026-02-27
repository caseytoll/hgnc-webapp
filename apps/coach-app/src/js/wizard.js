// ========================================
// CREATE TEAM WIZARD
// ========================================

import { API_CONFIG } from './config.js';
import { state, COACH_OTHER_SENTINEL } from './state.js';
import { escapeHtml, escapeAttr } from '../../../../common/utils.js';
import { getUniqueCoachNames } from './helpers.js';
import { showLoading, hideLoading } from './ui.js';

// ─── Path helpers ─────────────────────────────────────────────────────────────

function getPath(competitionType) {
  if (competitionType === 'Nillumbik Force') {
    return ['competition', 'basicInfo', 'squadi', 'coach', 'confirm'];
  }
  return ['competition', 'basicInfo', 'coach', 'confirm'];
}

function getSeasonOptions(competitionType) {
  if (competitionType === 'Nillumbik Force') return ['Autumn', 'Spring'];
  if (competitionType === 'NFNL') return ['Summer', 'Winter'];
  return ['Season 1', 'Season 2', 'Other'];
}

// ─── Wizard state ─────────────────────────────────────────────────────────────

let wizardState = {};

function resetWizardState() {
  const competitionType = 'Nillumbik Force';
  wizardState = {
    stepIndex: 0,
    path: getPath(competitionType),
    data: {
      name: '',
      year: new Date().getFullYear(),
      competitionType,
      season: getSeasonOptions(competitionType)[0],
      coach: '',
      coachCustom: '',
      resultsApi: ''
    },
    squadi: { loading: false, loaded: false, options: [], error: null }
  };
}

// ─── Open/close ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('add-team-btn');
  if (btn) btn.addEventListener('click', openAddTeamModal);
});

window.openAddTeamModal = function() {
  resetWizardState();
  renderWizardModal();
};

// ─── Step metadata ────────────────────────────────────────────────────────────

const STEP_LABELS = {
  competition: 'Competition',
  basicInfo: 'Team Info',
  squadi: 'Fixture Sync',
  coach: 'Coach',
  confirm: 'Confirm'
};

function currentStepId() {
  return wizardState.path[wizardState.stepIndex];
}

// ─── Render ───────────────────────────────────────────────────────────────────

function renderWizardModal() {
  const stepId = currentStepId();
  const title = stepId === 'competition'
    ? 'Add New Team'
    : `Add New Team — ${STEP_LABELS[stepId] || stepId}`;
  openModal(title, getStepContent(stepId), getFooterButtons(stepId));

  // Trigger Squadi fetch when entering that step for the first time
  if (stepId === 'squadi' && !wizardState.squadi.loaded && !wizardState.squadi.loading) {
    fetchSquadiTeams(false);
  }
}

function buildProgressBar() {
  const { path, stepIndex } = wizardState;
  const dots = path.map((id, i) => {
    const isCompleted = i < stepIndex;
    const isActive = i === stepIndex;
    const cls = isCompleted ? 'completed' : isActive ? 'active' : '';
    // Completed dots show checkmark via ::before pseudo-element — no text needed
    const content = isCompleted ? '' : (i + 1);
    return `<div class="progress-step ${cls}" title="${STEP_LABELS[id] || id}">${content}</div>`;
  }).join('');
  return `<div class="wizard-progress"><div class="progress-steps">${dots}</div></div>`;
}

function getStepContent(stepId) {
  switch (stepId) {
    case 'competition': return renderCompetitionStep();
    case 'basicInfo':   return renderBasicInfoStep();
    case 'squadi':      return renderSquadiStep();
    case 'coach':       return renderCoachStep();
    case 'confirm':     return renderConfirmStep();
    default: return '';
  }
}

// ─── Step renderers ───────────────────────────────────────────────────────────

function renderCompetitionStep() {
  const options = [
    { value: 'Nillumbik Force', label: 'Nillumbik Force', desc: 'Saturday junior competition' },
    { value: 'NFNL', label: 'NFNL', desc: 'Northern Football Netball League' },
    { value: 'Other', label: 'Other', desc: 'Club-run or other competition' }
  ];
  const selected = wizardState.data.competitionType;
  return `
    <p class="wizard-step-hint">Which competition does this team play in?</p>
    <div class="wizard-competition-list">
      ${options.map(o => `
        <button class="competition-btn${o.value === selected ? ' selected' : ''}"
                onclick="wizardSelectCompetition('${escapeAttr(o.value)}')">
          <span class="competition-btn-name">${escapeHtml(o.label)}</span>
          <span class="competition-btn-desc">${escapeHtml(o.desc)}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function renderBasicInfoStep() {
  const { competitionType, season, name, year } = wizardState.data;
  const seasonOpts = getSeasonOptions(competitionType);
  return buildProgressBar() + `
    <div class="form-group">
      <label class="form-label">Team Name</label>
      <input type="text" class="form-input" id="wizard-team-name" maxlength="100"
             placeholder="e.g. U11 Flames" value="${escapeAttr(name)}">
      <div class="form-help">2–100 characters</div>
    </div>
    <div class="form-group">
      <label class="form-label">Year</label>
      <input type="number" class="form-input" id="wizard-team-year" min="2000" max="2100"
             value="${year}">
    </div>
    <div class="form-group">
      <label class="form-label">Season</label>
      <select class="form-select" id="wizard-team-season">
        ${seasonOpts.map(s =>
          `<option value="${escapeAttr(s)}"${s === season ? ' selected' : ''}>${escapeHtml(s)}</option>`
        ).join('')}
      </select>
    </div>
  `;
}

function renderSquadiStep() {
  return buildProgressBar() + `
    <p class="wizard-step-hint">Fixture Sync</p>
    <div class="notice notice-warning" style="padding:10px 12px;border-radius:8px;background:var(--warning-50,#fffbeb);border:1px solid var(--warning-200,#fde68a);margin-bottom:12px">
      <p style="margin:0 0 4px;font-weight:600;font-size:0.85rem">Netball Connect / Squadi sync is currently unavailable</p>
      <p style="margin:0;font-size:0.8rem;color:var(--gray-600)">You can configure GameDay fixture sync in Team Settings after creating the team.</p>
    </div>
  `;
}

function renderCoachStep() {
  const coaches = getUniqueCoachNames();
  const { coach, coachCustom } = wizardState.data;
  return buildProgressBar() + `
    <div class="form-group">
      <label class="form-label">Coach <span class="form-label-optional">(optional)</span></label>
      <select class="form-select" id="wizard-team-coach" onchange="wizardHandleCoachChange()">
        <option value="">— None —</option>
        ${coaches.map(c =>
          `<option value="${escapeAttr(c)}"${coach === c ? ' selected' : ''}>${escapeHtml(c)}</option>`
        ).join('')}
        <option value="${COACH_OTHER_SENTINEL}"${coach === COACH_OTHER_SENTINEL ? ' selected' : ''}>Other…</option>
      </select>
      <input type="text" class="form-input" id="wizard-team-coach-custom" maxlength="50"
             placeholder="Enter coach name"
             style="display:${coach === COACH_OTHER_SENTINEL ? 'block' : 'none'};margin-top:6px;"
             value="${escapeAttr(coachCustom)}">
      <div class="form-help">Used to group teams in the team list.</div>
    </div>
  `;
}

function renderConfirmStep() {
  const { name, year, competitionType, season, coach, coachCustom, resultsApi } = wizardState.data;
  const coachDisplay = coach === COACH_OTHER_SENTINEL ? coachCustom : coach;
  const fixtureConfig = resultsApi ? JSON.parse(resultsApi) : null;
  return buildProgressBar() + `
    <div class="summary-section">
      <h4 style="margin-bottom: 15px; color: var(--text-primary);">Review Your Team Details</h4>
      <div class="summary-item"><strong>Team Name:</strong> ${escapeHtml(name || '—')}</div>
      <div class="summary-item"><strong>Year:</strong> ${year}</div>
      <div class="summary-item"><strong>Competition:</strong> ${escapeHtml(competitionType)}</div>
      <div class="summary-item"><strong>Season:</strong> ${escapeHtml(season)}</div>
      ${coachDisplay ? `<div class="summary-item"><strong>Coach:</strong> ${escapeHtml(coachDisplay)}</div>` : ''}
      ${competitionType === 'Nillumbik Force' ? `
        <div class="summary-item"><strong>Fixture Sync:</strong> ${fixtureConfig
          ? `✓ ${escapeHtml(fixtureConfig.squadiTeamName)}`
          : 'Not configured'}</div>
      ` : ''}
    </div>
    <p class="form-help" style="margin-top:12px;">
      💡 Additional integrations (fixture sync, ladder) can be configured in Team Settings after creation.
    </p>
  `;
}

// ─── Footer buttons ───────────────────────────────────────────────────────────

function getFooterButtons(stepId) {
  const isFirst = stepId === 'competition';
  const isLast = stepId === 'confirm';
  const prevBtn = !isFirst
    ? `<button class="btn btn-ghost" onclick="wizardBack()">← Back</button>`
    : '';
  const cancelBtn = `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>`;

  let actionBtn = '';
  if (isLast) {
    actionBtn = `<button class="btn btn-primary" onclick="addNewTeam()">Create Team</button>`;
  } else if (stepId === 'squadi') {
    const hasSelection = !!wizardState.data.resultsApi;
    actionBtn = `
      <button class="btn btn-ghost" onclick="wizardSkipSquadi()">Skip</button>
      ${hasSelection ? `<button class="btn btn-primary" onclick="wizardNext()">Next →</button>` : ''}
    `;
  } else if (stepId !== 'competition') {
    // Competition step has no Next button — tapping a button advances automatically
    actionBtn = `<button class="btn btn-primary" onclick="wizardNext()">Next →</button>`;
  }

  return `${prevBtn}${cancelBtn}${actionBtn}`;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

window.wizardSelectCompetition = function(competitionType) {
  wizardState.data.competitionType = competitionType;
  wizardState.data.season = getSeasonOptions(competitionType)[0];
  wizardState.data.resultsApi = '';
  wizardState.squadi = { loading: false, loaded: false, options: [], error: null };
  wizardState.path = getPath(competitionType);
  wizardState.stepIndex = 1; // advance to basicInfo
  renderWizardModal();
};

window.wizardNext = function() {
  if (!saveAndValidateCurrentStep()) return;
  wizardState.stepIndex++;
  renderWizardModal();
};

window.wizardBack = function() {
  saveCurrentStepData(currentStepId());
  wizardState.stepIndex--;
  renderWizardModal();
};

window.wizardSkipSquadi = function() {
  wizardState.data.resultsApi = '';
  wizardState.stepIndex++;
  renderWizardModal();
};

// ─── Squadi fetch ─────────────────────────────────────────────────────────────

async function fetchSquadiTeams(forceRescan) {
  wizardState.squadi.loading = true;
  wizardState.squadi.error = null;
  if (currentStepId() === 'squadi') renderWizardModal();

  try {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
    const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;
    const url = new URL(baseUrl, isLocalDev ? window.location.origin : undefined);
    url.searchParams.set('api', 'true');
    url.searchParams.set('action', 'autoDetectSquadi');
    if (forceRescan) url.searchParams.set('forceRescan', 'true');

    const response = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Auto-detect failed');

    // Flatten competitions → divisions → teams into a flat options list
    const options = [];
    for (const comp of (data.competitions || [])) {
      for (const div of (comp.divisions || [])) {
        for (const teamName of (div.teams || [])) {
          options.push({
            competitionId: comp.id,
            competitionName: comp.name,
            competitionKey: comp.orgKey || '',
            divisionId: div.id,
            divisionName: div.name,
            teamName
          });
        }
      }
    }

    wizardState.squadi.options = options;
    wizardState.squadi.loaded = true;
  } catch (err) {
    wizardState.squadi.error = err.message;
    wizardState.squadi.loaded = true; // prevent auto-retry on re-enter
  } finally {
    wizardState.squadi.loading = false;
    if (currentStepId() === 'squadi') renderWizardModal();
  }
}

window.wizardRefreshSquadi = function() {
  wizardState.squadi.loaded = false;
  wizardState.squadi.error = null;
  fetchSquadiTeams(true);
};

window.wizardPickSquadiTeam = function(idx) {
  const opt = wizardState.squadi.options[idx];
  if (!opt) return;
  wizardState.data.resultsApi = JSON.stringify({
    source: 'squadi',
    competitionId: opt.competitionId,
    divisionId: opt.divisionId,
    squadiTeamName: opt.teamName,
    competitionKey: opt.competitionKey
  });
  // Auto-advance to coach step
  wizardState.stepIndex++;
  renderWizardModal();
};

// ─── Validation & data saving ─────────────────────────────────────────────────

function saveAndValidateCurrentStep() {
  const stepId = currentStepId();
  saveCurrentStepData(stepId);
  return validateCurrentStep(stepId);
}

function saveCurrentStepData(stepId) {
  switch (stepId) {
    case 'basicInfo': {
      wizardState.data.name = (document.getElementById('wizard-team-name')?.value || '').trim();
      wizardState.data.year = parseInt(document.getElementById('wizard-team-year')?.value) || wizardState.data.year;
      wizardState.data.season = document.getElementById('wizard-team-season')?.value || wizardState.data.season;
      break;
    }
    case 'coach': {
      wizardState.data.coach = document.getElementById('wizard-team-coach')?.value || '';
      wizardState.data.coachCustom = (document.getElementById('wizard-team-coach-custom')?.value || '').trim();
      break;
    }
  }
}

function validateCurrentStep(stepId) {
  switch (stepId) {
    case 'basicInfo': {
      const { name, year, season } = wizardState.data;
      if (!name || name.length < 2 || name.length > 100) {
        showToast('Team name must be 2–100 characters', 'error');
        document.getElementById('wizard-team-name')?.focus();
        return false;
      }
      if (!/[a-zA-Z]/.test(name)) {
        showToast('Team name must contain at least one letter', 'error');
        document.getElementById('wizard-team-name')?.focus();
        return false;
      }
      if (isNaN(year) || year < 2000 || year > 2100) {
        showToast('Year must be between 2000 and 2100', 'error');
        document.getElementById('wizard-team-year')?.focus();
        return false;
      }
      if (state.teams.some(t =>
        t.teamName.toLowerCase() === name.toLowerCase() &&
        String(t.year) === String(year) &&
        t.season === season
      )) {
        showToast('A team with this name, year, and season already exists', 'error');
        return false;
      }
      return true;
    }
    case 'coach': {
      if (wizardState.data.coach === COACH_OTHER_SENTINEL && !wizardState.data.coachCustom) {
        showToast('Please enter a coach name', 'error');
        document.getElementById('wizard-team-coach-custom')?.focus();
        return false;
      }
      return true;
    }
    default:
      return true;
  }
}

// ─── Coach dropdown handler ───────────────────────────────────────────────────

window.wizardHandleCoachChange = function() {
  const coachSelect = document.getElementById('wizard-team-coach');
  const coachCustom = document.getElementById('wizard-team-coach-custom');
  if (!coachSelect || !coachCustom) return;
  if (coachSelect.value === COACH_OTHER_SENTINEL) {
    coachCustom.style.display = 'block';
    coachCustom.focus();
  } else {
    coachCustom.style.display = 'none';
  }
};

// ─── Create team ──────────────────────────────────────────────────────────────

window.addNewTeam = async function() {
  const { name, year, season, coach, coachCustom, resultsApi, competitionType } = wizardState.data;
  const coachRaw = coach === COACH_OTHER_SENTINEL ? coachCustom : coach;
  const competition = competitionType === 'Nillumbik Force' ? 'NFNA' : competitionType === 'NFNL' ? 'NFNL' : '';

  // Final guard — these are also validated per-step
  if (!name || name.length < 2 || name.length > 100) {
    showToast('Please enter a valid team name', 'error');
    return;
  }
  if (isNaN(year) || year < 2000 || year > 2100) {
    showToast('Please enter a valid year', 'error');
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
    url.searchParams.set('season', season);
    url.searchParams.set('name', name);
    if (coachRaw) url.searchParams.set('coach', coachRaw);
    if (resultsApi) url.searchParams.set('resultsApi', resultsApi);
    if (competition) url.searchParams.set('competition', competition);

    const response = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
    const data = await response.json();

    if (data.success === false) throw new Error(data.error || 'Failed to create team');

    await window.loadTeams(true); // force refresh to include new team
    showToast('Team created', 'success');
  } catch (error) {
    console.error('[Wizard] Failed to create team:', error);
    showToast('Failed to create team: ' + error.message, 'error');
  } finally {
    hideLoading();
  }
};
