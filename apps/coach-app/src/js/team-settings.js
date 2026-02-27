import { state, saveToLocalStorage, invalidateTeamsListCache, COACH_OTHER_SENTINEL } from './state.js';
import { updateTeamSettings, syncToGoogleSheets } from './sync.js';
import { API_CONFIG } from './config.js';
import { escapeHtml, escapeAttr } from '../../../../common/utils.js';
import { validateTeamPIN, setTeamPIN as apiSetTeamPIN, revokeTeamAccess as apiRevokeTeamAccess } from './api.js';
import { getUniqueCoachNames, parseFixtureConfig } from './helpers.js';
import { contextHelpIcon } from './help.js';
import { haptic } from '../../../../common/share-utils.js';

// ========================================
// TEAM SETTINGS
// ========================================

window.openTeamSettings = function () {
  const team = state.currentTeam;
  console.log('[TeamSettings] openTeamSettings: team.coach =', JSON.stringify(team.coach), 'teamID =', team.teamID);
  console.log('[TeamSettings] teams list coach values:', state.teams.map(t => t.teamName + ':' + (t.coach || '(none)')).join(', '));
  const isArchived = team.archived || false;
  // Generate canonical parent portal link
  const slugify = (s) =>
    (s || '')
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  const slug =
    team.teamName && team.year && team.season
      ? [slugify(team.teamName), String(team.year), slugify(team.season)].filter(Boolean).join('-')
      : '';
  const portalUrl = slug ? `https://hgnc-gameday.pages.dev/teams/${slug}/` : '';
  openModal(
    'Team Settings',
    `
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
        ${['Season 1', 'Season 2', 'Autumn', 'Spring', 'Summer', 'Winter', 'Other', 'NFNL']
          .map(
            (s) => `<option value="${escapeAttr(s)}" ${team.season === s ? 'selected' : ''}>${escapeHtml(s)}</option>`
          )
          .join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Coach</label>
      <select class="form-select" id="edit-team-coach" onchange="if(this.value==='${COACH_OTHER_SENTINEL}'){document.getElementById('edit-team-coach-custom').style.display='';this.style.display='none';document.getElementById('edit-team-coach-custom').focus();}">
        <option value="">— None —</option>
        ${getUniqueCoachNames()
          .map(
            (c) => `<option value="${escapeAttr(c)}" ${team.coach === c ? 'selected' : ''}>${escapeHtml(c)}</option>`
          )
          .join('')}
        <option value="${COACH_OTHER_SENTINEL}">Other...</option>
      </select>
      <input type="text" class="form-input" id="edit-team-coach-custom" maxlength="50" placeholder="Enter coach name" style="display:none;margin-top:6px;">
    </div>
    <div class="form-group">
      <label class="form-label">Competition</label>
      <select class="form-select" id="edit-team-competition">
        <option value="">— None —</option>
        <option value="NFNA" ${team.competition === 'NFNA' ? 'selected' : ''}>NFNA — Nillumbik Force Netball Association</option>
        <option value="NFNL" ${team.competition === 'NFNL' ? 'selected' : ''}>NFNL — Northern Football Netball League</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Ladder URL <span class="form-label-desc">(optional, for NFNL ladder)</span></label>
      <input type="url" class="form-input" id="edit-team-ladder-url" maxlength="300" placeholder="https://websites.mygameday.app/..." value="${escapeAttr(team.ladderUrl || '')}">
    </div>
    ${(() => {
      let sc = {};
      try {
        sc = team.resultsApi ? JSON.parse(team.resultsApi) : {};
      } catch (_e) {
        // invalid JSON, use empty config
      }
      const currentSource = sc.source || '';
      return `
    <div class="form-group">
      <label class="form-label">Fixture Sync <span class="form-label-desc">(optional)</span></label>
      <p class="form-hint" style="margin-bottom:8px">Auto-populate schedule from competition fixtures.</p>
      <select class="form-select" id="edit-fixture-source" onchange="window._toggleFixtureSource(this.value)">
        <option value="">— None —</option>
        <option value="gameday" ${currentSource === 'gameday' ? 'selected' : ''}>GameDay (NFNL, etc.)</option>
        <option value="squadi" ${currentSource === 'squadi' ? 'selected' : ''} disabled>Netball Connect / Squadi (unavailable)</option>
      </select>
      <div id="fixture-gameday-fields" style="display:${currentSource === 'gameday' ? 'block' : 'none'};margin-top:8px">
        <p class="form-hint" style="margin-bottom:8px">Find these values in the GameDay fixture URL for your competition.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div>
            <label class="form-label form-label-sm">Competition ID</label>
            <input type="text" class="form-input" id="edit-gameday-comp-id" placeholder="e.g. 655969" value="${escapeAttr(sc.compID || '')}">
          </div>
          <div>
            <label class="form-label form-label-sm">Client String</label>
            <input type="text" class="form-input" id="edit-gameday-client" placeholder="e.g. 0-9074-0-655969-0" value="${escapeAttr(sc.client || '')}">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;margin-top:8px">
          <div>
            <label class="form-label form-label-sm">Team Name (as shown on GameDay)</label>
            <input type="text" class="form-input" id="edit-gameday-team-name" maxlength="100" placeholder="e.g. Hazel Glen 6" value="${escapeAttr(sc.source === 'gameday' ? sc.teamName || '' : '')}">
          </div>
          <div>
            <label class="form-label form-label-sm">Round Offset</label>
            <input type="number" class="form-input" id="edit-gameday-round-offset" placeholder="0" value="${sc.source === 'gameday' ? sc.roundOffset || '' : ''}">
            <p class="form-hint" style="margin-top:2px">e.g. 3 if you had 3 grading rounds</p>
          </div>
        </div>
      </div>
      <div id="fixture-squadi-fields" style="display:${currentSource === 'squadi' ? 'block' : 'none'};margin-top:8px">
        <div class="notice notice-warning" style="padding:10px 12px;border-radius:8px;background:var(--warning-50,#fffbeb);border:1px solid var(--warning-200,#fde68a)">
          <p style="margin:0 0 4px;font-weight:600;font-size:0.85rem">Netball Connect / Squadi sync is currently unavailable</p>
          <p style="margin:0;font-size:0.8rem;color:var(--gray-600)">Fixture sync and ladder data for this team are paused. Existing games and scores are unaffected.</p>
        </div>
        ${sc.competitionId ? `<p class="form-hint" style="margin-top:8px">Previously configured: Competition ${sc.competitionId}, Division ${sc.divisionId || '—'}, Team "${escapeHtml(sc.squadiTeamName || '')}"</p>` : ''}
      </div>
    </div>`;
    })()}
    ${team.resultsApi ? `
    <div class="form-group" style="margin-top:8px">
      <button type="button" class="btn btn-outline" id="btn-refresh-team-data" onclick="refreshTeamData()" style="width:100%">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        Refresh Fixtures &amp; Ladder
      </button>
      <div class="form-help">Forces a fresh fetch of fixture results and ladder standings, bypassing the overnight cache.</div>
    </div>
    ` : ''}
    <div class="form-group">
      <label class="form-label">Parent Portal Link <span class="form-label-desc">(read-only, for parents)</span></label>
      <div style="display:flex;gap:8px;align-items:center;">
        <input type="text" class="form-input" value="${escapeAttr(portalUrl)}" readonly style="flex:1;min-width:0;">
        <button class="btn btn-sm btn-outline" onclick="navigator.clipboard.writeText('${escapeAttr(portalUrl)}').then(()=>showToast('Copied!','success'))">Copy</button>
        <a class="btn btn-sm" href="${escapeAttr(portalUrl)}" target="_blank" rel="noopener">Open</a>
      </div>
    </div>
    <div class="settings-divider"></div>
    <div class="form-group">
      <label class="form-label">Team PIN <span class="form-label-desc">(optional)</span> ${contextHelpIcon('security')}</label>
      ${
        team.hasPin
          ? `
        <p class="form-hint">PIN is set. Only devices with the PIN can access this team.</p>
        <div class="pin-actions">
          <button type="button" class="btn btn-sm btn-outline" onclick="showChangePinModal()">Change PIN</button>
          <button type="button" class="btn btn-sm btn-outline" onclick="removeTeamPIN()">Remove PIN</button>
        </div>
        <button type="button" class="btn btn-outline" onclick="revokeAllDevices()" style="margin-top: 8px; width: 100%;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Log Out All Devices
        </button>
        <p class="form-hint" style="margin-top: 4px; font-size: 11px;">Other devices will need to re-enter the PIN.</p>
      `
          : `
        <p class="form-hint">Set a 4-digit PIN to restrict access to this team.</p>
        <div style="display: flex; gap: 8px; align-items: center;">
          <input type="tel" class="pin-input" id="settings-pin-input" maxlength="4" pattern="[0-9]*" inputmode="numeric" placeholder="••••" autocomplete="off">
          <button type="button" class="btn btn-sm btn-primary" onclick="setTeamPINFromSettings()">Set PIN</button>
        </div>
      `
      }
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
    <div class="settings-divider"></div>
    <div class="form-group">
      <label class="form-label">Archive</label>
      <p class="form-hint">${isArchived ? 'This team is archived. Unarchive to show it on the main page.' : 'Archive this team to hide it from the main page. Data is preserved.'}</p>
      <button type="button" class="btn ${isArchived ? 'btn-primary' : 'btn-outline'}" onclick="${isArchived ? 'unarchiveTeam' : 'archiveTeam'}()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
        </svg>
        ${isArchived ? 'Unarchive Team' : 'Archive Team'}
      </button>
    </div>
    <div class="settings-divider"></div>
    <div class="form-group">
      <label class="form-label">Danger Zone</label>
      <p class="form-hint" style="color: var(--error); margin-bottom: 12px;">⚠️ These actions cannot be undone.</p>
      <button type="button" class="btn btn-danger" onclick="deleteTeam('${escapeAttr(team.teamID)}', '${escapeAttr(team.teamName)}')" style="width: 100%;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
          <path d="M3 6h18"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          <path d="M10 11v6"/>
          <path d="M14 11v6"/>
        </svg>
        Delete Team
      </button>
    </div>
  `,
    `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveTeamSettings()">Save</button>
  `
  );
};

window._toggleFixtureSource = function (source) {
  const gamedayFields = document.getElementById('fixture-gameday-fields');
  const squadiFields = document.getElementById('fixture-squadi-fields');
  if (gamedayFields) gamedayFields.style.display = source === 'gameday' ? 'block' : 'none';
  if (squadiFields) squadiFields.style.display = source === 'squadi' ? 'block' : 'none';
};

window.setTeamPINFromSettings = async function () {
  const input = document.getElementById('settings-pin-input');
  if (!input) return;
  const pin = input.value.trim();
  if (!/^\d{4}$/.test(pin)) {
    showToast('PIN must be exactly 4 digits', 'error');
    input.focus();
    return;
  }
  const team = state.currentTeam;
  if (!team) return;
  const currentToken = state.teamPinTokens[team.teamID] || '';
  try {
    const result = await apiSetTeamPIN(team.teamID, pin, currentToken);
    if (result.success && result.pinToken) {
      state.teamPinTokens[team.teamID] = result.pinToken;
      team.hasPin = true;
      const teamInList = state.teams.find((t) => t.teamID === team.teamID);
      if (teamInList) teamInList.hasPin = true;
      saveToLocalStorage();
      showToast('Team PIN set', 'success');
      closeModal();
      openTeamSettings();
    } else {
      showToast(result.error || 'Failed to set PIN', 'error');
    }
  } catch (error) {
    showToast('Failed to set PIN: ' + error.message, 'error');
  }
};

window.showChangePinModal = function () {
  const team = state.currentTeam;
  if (!team) return;
  closeModal();
  openModal(
    'Change Team PIN',
    `
    <div style="text-align: center;">
      <p style="margin-bottom: 16px; color: var(--text-secondary);">Enter a new 4-digit PIN</p>
      <input type="tel" class="pin-input" id="change-pin-input" maxlength="4" pattern="[0-9]*" inputmode="numeric" placeholder="••••" autocomplete="off">
    </div>
  `,
    `
    <button class="btn btn-ghost" onclick="closeModal(); openTeamSettings();">Cancel</button>
    <button class="btn btn-primary" onclick="confirmChangePIN()">Change PIN</button>
  `
  );
  setTimeout(() => {
    const input = document.getElementById('change-pin-input');
    if (input) input.focus();
  }, 100);
};

window.confirmChangePIN = async function () {
  const input = document.getElementById('change-pin-input');
  if (!input) return;
  const pin = input.value.trim();
  if (!/^\d{4}$/.test(pin)) {
    showToast('PIN must be exactly 4 digits', 'error');
    input.value = '';
    input.focus();
    return;
  }
  const team = state.currentTeam;
  if (!team) return;
  const currentToken = state.teamPinTokens[team.teamID] || '';
  try {
    const result = await apiSetTeamPIN(team.teamID, pin, currentToken);
    if (result.success && result.pinToken) {
      state.teamPinTokens[team.teamID] = result.pinToken;
      saveToLocalStorage();
      showToast('PIN changed', 'success');
      closeModal();
      openTeamSettings();
    } else {
      showToast(result.error || 'Failed to change PIN', 'error');
    }
  } catch (error) {
    showToast('Failed to change PIN: ' + error.message, 'error');
  }
};

window.removeTeamPIN = async function () {
  if (!confirm('Remove the PIN? Anyone will be able to access this team.')) return;
  const team = state.currentTeam;
  if (!team) return;
  const currentToken = state.teamPinTokens[team.teamID] || '';
  try {
    const result = await apiSetTeamPIN(team.teamID, '', currentToken);
    if (result.success) {
      delete state.teamPinTokens[team.teamID];
      team.hasPin = false;
      const teamInList = state.teams.find((t) => t.teamID === team.teamID);
      if (teamInList) teamInList.hasPin = false;
      saveToLocalStorage();
      showToast('PIN removed', 'success');
      closeModal();
      openTeamSettings();
    } else {
      showToast(result.error || 'Failed to remove PIN', 'error');
    }
  } catch (error) {
    showToast('Failed to remove PIN: ' + error.message, 'error');
  }
};

window.revokeAllDevices = async function () {
  if (!confirm('This will log out all other devices. They will need to re-enter the PIN to access this team.')) return;
  const team = state.currentTeam;
  if (!team) return;
  const currentToken = state.teamPinTokens[team.teamID] || '';
  try {
    const result = await apiRevokeTeamAccess(team.teamID, currentToken);
    if (result.success && result.pinToken) {
      // Store the new token so this device stays logged in
      state.teamPinTokens[team.teamID] = result.pinToken;
      saveToLocalStorage();
      showToast('All other devices logged out', 'success');
    } else {
      showToast(result.error || 'Failed to revoke access', 'error');
    }
  } catch (error) {
    showToast('Failed to revoke access: ' + error.message, 'error');
  }
};

window.archiveTeam = async function () {
  const team = state.currentTeam;
  if (!team) return;

  const teamName = team.teamName;
  closeModal();
  showLoading();

  try {
    // Update local state
    team.archived = true;
    if (state.currentTeamData) state.currentTeamData.archived = true;

    // Update in teams list too
    const teamInList = state.teams.find((t) => t.teamID === team.teamID);
    if (teamInList) teamInList.archived = true;

    // Save to backend
    await updateTeamSettings(team.teamID, { archived: true });

    saveToLocalStorage();
    showToast(`${teamName} archived`, 'success');

    // Go back to team selector
    showView('team-selector-view');
    renderTeamList();
  } catch (error) {
    console.error('[App] Failed to archive team:', error);
    // Revert local changes
    team.archived = false;
    if (state.currentTeamData) state.currentTeamData.archived = false;
    const teamInList = state.teams.find((t) => t.teamID === team.teamID);
    if (teamInList) teamInList.archived = false;
    showToast('Failed to archive team: ' + error.message, 'error');
  } finally {
    hideLoading();
  }
};

window.unarchiveTeam = async function () {
  const team = state.currentTeam;
  if (!team) return;

  const teamName = team.teamName;
  closeModal();
  showLoading();

  try {
    // Update local state
    team.archived = false;
    if (state.currentTeamData) state.currentTeamData.archived = false;

    // Update in teams list too
    const teamInList = state.teams.find((t) => t.teamID === team.teamID);
    if (teamInList) teamInList.archived = false;

    // Save to backend
    await updateTeamSettings(team.teamID, { archived: false });

    saveToLocalStorage();
    showToast(`${teamName} restored`, 'success');

    // Refresh the settings modal
    openTeamSettings();
  } catch (error) {
    console.error('[App] Failed to unarchive team:', error);
    // Revert local changes
    team.archived = true;
    if (state.currentTeamData) state.currentTeamData.archived = true;
    const teamInList = state.teams.find((t) => t.teamID === team.teamID);
    if (teamInList) teamInList.archived = true;
    showToast('Failed to restore team: ' + error.message, 'error');
  } finally {
    hideLoading();
  }
};

window.autoDetectSquadi = async function () {
  const btn = document.getElementById('btn-auto-detect-squadi');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Scanning...';
  }

  try {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
    const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;
    const resp = await fetch(`${baseUrl}?api=true&action=autoDetectSquadi&_t=${Date.now()}`);
    const data = await resp.json();

    if (!data.success) {
      showToast(data.error || 'Auto-detect failed', 'error');
      return;
    }

    const comps = data.competitions || [];
    if (comps.length === 0) {
      showToast('No HG teams found. Try again later or enter values manually.', 'error');
      return;
    }

    // Build flat list of pickable options
    const options = [];
    comps.forEach((comp) => {
      (comp.divisions || []).forEach((div) => {
        (div.teams || []).forEach((teamName) => {
          options.push({
            competitionId: comp.id,
            competitionName: comp.name,
            competitionKey: comp.competitionKey,
            divisionId: div.id,
            divisionName: div.name,
            teamName,
          });
        });
      });
    });

    if (options.length === 1) {
      // Single match — auto-fill directly
      fillSquadiFields(options[0]);
      showToast('Squadi config detected and filled!', 'success');
      return;
    }

    // Multiple matches — show picker modal
    const rows = options
      .map(
        (opt, idx) =>
          `<div class="sos-opponent-row" style="cursor:pointer;padding:10px 8px" onclick="pickSquadiOption(${idx})">
        <div>
          <strong>${escapeHtml(opt.teamName)}</strong>
          <div style="font-size:12px;color:var(--text-secondary)">${escapeHtml(opt.divisionName)} (Div ${escapeHtml(opt.divisionId)}) — ${escapeHtml(opt.competitionName)}</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </div>`
      )
      .join('');

    window._squadiAutoDetectOptions = options;
    openModal(
      'Select Your Team',
      `
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">Found ${options.length} HG teams across ${comps.length} competition${comps.length > 1 ? 's' : ''}. Select yours:</p>
      <div style="display:flex;flex-direction:column;gap:2px">${rows}</div>
    `,
      `<button class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button class="btn btn-outline" onclick="autoDetectSquadiRescan()" style="margin-left:8px">Force Rescan</button>`
    );
  } catch (err) {
    showToast('Auto-detect error: ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Auto-Detect from Squadi';
    }
  }
};

window.pickSquadiOption = function (idx) {
  if (API_CONFIG.debug) console.log('[DEBUG] pickSquadiOption called with idx:', idx);
  const options = window._squadiAutoDetectOptions;
  if (!options || !options[idx]) {
    if (API_CONFIG.debug) console.log('[DEBUG] pickSquadiOption: no options or invalid idx');
    return;
  }
  const selectedOption = options[idx];
  if (API_CONFIG.debug) console.log('[DEBUG] pickSquadiOption: selected option:', selectedOption);

  // Close the auto-detect modal
  if (API_CONFIG.debug) console.log('[DEBUG] pickSquadiOption: closing auto-detect modal');
  closeModal();

  // Build Squadi resultsApi configuration
  const config = {
    source: 'squadi',
    competitionId: selectedOption.competitionId,
    divisionId: selectedOption.divisionId,
    squadiTeamName: selectedOption.teamName,
  };
  if (selectedOption.competitionKey) {
    config.competitionKey = selectedOption.competitionKey;
  }
  const resultsApi = JSON.stringify(config);
  if (API_CONFIG.debug) console.log('[DEBUG] pickSquadiOption: built resultsApi config:', resultsApi);

  // Show loading and save directly
  if (API_CONFIG.debug) console.log('[DEBUG] pickSquadiOption: showing loading and calling updateTeamSettings');
  showLoading();
  showToast('Saving Squadi configuration...', 'info');

  updateTeamSettings(state.currentTeam.teamID, {
    teamName: state.currentTeam.teamName, // Keep existing values
    year: state.currentTeam.year,
    season: state.currentTeam.season,
    ladderUrl: state.currentTeam.ladderUrl,
    resultsApi: resultsApi,
    coach: state.currentTeam.coach,
  })
    .then(() => {
      if (API_CONFIG.debug) console.log('[DEBUG] pickSquadiOption: updateTeamSettings successful');

      // Update local state
      state.currentTeam.resultsApi = resultsApi;
      if (state.currentTeamData) {
        state.currentTeamData.resultsApi = resultsApi;
      }

      // Update in teams list
      const teamInList = state.teams.find((t) => t.teamID === state.currentTeam.teamID);
      if (teamInList) {
        teamInList.resultsApi = resultsApi;
      }

      saveToLocalStorage();
      renderMainApp();
      showToast('Squadi configuration saved!', 'success');
      if (API_CONFIG.debug) console.log('[DEBUG] pickSquadiOption: completed successfully');
    })
    .catch((error) => {
      if (API_CONFIG.debug) console.error('[DEBUG] pickSquadiOption: updateTeamSettings failed:', error);
      showToast('Failed to save Squadi config: ' + error.message, 'error');
    })
    .finally(() => {
      hideLoading();
    });
};

window.autoDetectSquadiRescan = async function () {
  closeModal();
  const btn = document.getElementById('btn-auto-detect-squadi');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Rescanning...';
  }

  try {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
    const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;
    const resp = await fetch(`${baseUrl}?api=true&action=autoDetectSquadi&forceRescan=true&_t=${Date.now()}`);
    const data = await resp.json();

    if (!data.success) {
      showToast(data.error || 'Rescan failed', 'error');
      return;
    }

    const comps = data.competitions || [];
    if (comps.length === 0) {
      showToast('No HG teams found after rescan.', 'error');
      return;
    }

    showToast(
      `Found ${comps.reduce((sum, c) => sum + c.divisions.reduce((s, d) => s + d.teams.length, 0), 0)} HG teams. Opening picker...`,
      'success'
    );
    // Re-trigger to show picker
    window.autoDetectSquadi();
  } catch (err) {
    showToast('Rescan error: ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Auto-Detect from Squadi';
    }
  }
};

function fillSquadiFields(opt) {
  if (API_CONFIG.debug) console.log('[DEBUG] fillSquadiFields: called with option:', opt);
  const compIdEl = document.getElementById('edit-squadi-competition-id');
  const divIdEl = document.getElementById('edit-squadi-division-id');
  const teamNameEl = document.getElementById('edit-squadi-team-name');
  const compKeyEl = document.getElementById('edit-squadi-competition-key');

  if (API_CONFIG.debug) console.log('[DEBUG] fillSquadiFields: setting compIdEl to:', opt.competitionId);
  if (compIdEl) compIdEl.value = opt.competitionId || '';
  if (API_CONFIG.debug) console.log('[DEBUG] fillSquadiFields: setting divIdEl to:', opt.divisionId);
  if (divIdEl) divIdEl.value = opt.divisionId || '';
  if (API_CONFIG.debug) console.log('[DEBUG] fillSquadiFields: setting teamNameEl to:', opt.teamName);
  if (teamNameEl) teamNameEl.value = opt.teamName || '';
  if (API_CONFIG.debug) console.log('[DEBUG] fillSquadiFields: setting compKeyEl to:', opt.competitionKey);
  if (compKeyEl && opt.competitionKey) compKeyEl.value = opt.competitionKey;

  // Make sure Squadi source is selected
  const sourceSelect = document.getElementById('edit-fixture-source');
  if (API_CONFIG.debug) console.log('[DEBUG] fillSquadiFields: current sourceSelect value:', sourceSelect?.value);
  if (sourceSelect && sourceSelect.value !== 'squadi') {
    if (API_CONFIG.debug) console.log('[DEBUG] fillSquadiFields: changing sourceSelect to squadi');
    sourceSelect.value = 'squadi';
    sourceSelect.dispatchEvent(new Event('change'));
  } else {
    if (API_CONFIG.debug) console.log('[DEBUG] fillSquadiFields: sourceSelect already set to squadi');
  }
}

window.saveTeamSettings = async function () {
  console.log('[TeamSettings] saveTeamSettings called');
  const nameInput = document.getElementById('edit-team-name');
  const name = nameInput.value.trim();
  const yearInput = document.getElementById('edit-team-year');
  const year = parseInt(yearInput.value);
  const season = document.getElementById('edit-team-season').value;
  const ladderUrlInput = document.getElementById('edit-team-ladder-url');
  const ladderUrl = ladderUrlInput.value.trim();
  const coachSelect = document.getElementById('edit-team-coach');
  const coachCustom = document.getElementById('edit-team-coach-custom');
  console.log('[TeamSettings] coach select value:', coachSelect?.value, 'custom display:', coachCustom?.style.display, 'custom value:', coachCustom?.value);
  const coachRaw =
    coachCustom && coachCustom.style.display !== 'none'
      ? coachCustom.value.trim()
      : coachSelect
        ? coachSelect.value
        : '';
  const coach = coachRaw === COACH_OTHER_SENTINEL ? '' : coachRaw;
  console.log('[TeamSettings] coachRaw:', coachRaw, '→ coach:', coach);
  const competition = document.getElementById('edit-team-competition')?.value || '';

  // Build fixture config from form fields
  const fixtureSource = document.getElementById('edit-fixture-source')?.value || '';
  let resultsApi = '';
  if (fixtureSource === 'gameday') {
    const gdCompID = document.getElementById('edit-gameday-comp-id')?.value.trim() || '';
    const gdClient = document.getElementById('edit-gameday-client')?.value.trim() || '';
    const gdTeamName = document.getElementById('edit-gameday-team-name')?.value.trim() || '';
    const gdRoundOffset = parseInt(document.getElementById('edit-gameday-round-offset')?.value) || 0;
    if (gdCompID && gdClient && gdTeamName) {
      const gdConfig = { source: 'gameday', compID: gdCompID, client: gdClient, teamName: gdTeamName };
      if (gdRoundOffset) gdConfig.roundOffset = gdRoundOffset;
      resultsApi = JSON.stringify(gdConfig);
    }
  } else if (fixtureSource === 'squadi') {
    const squadiCompId = parseInt(document.getElementById('edit-squadi-competition-id')?.value) || 0;
    const squadiDivId = parseInt(document.getElementById('edit-squadi-division-id')?.value) || 0;
    const squadiTeamName = document.getElementById('edit-squadi-team-name')?.value.trim() || '';
    const squadiCompKey = document.getElementById('edit-squadi-competition-key')?.value.trim() || '';
    if (API_CONFIG.debug)
      console.log(
        '[DEBUG] saveTeamSettings: Squadi config - compId:',
        squadiCompId,
        'divId:',
        squadiDivId,
        'teamName:',
        squadiTeamName,
        'compKey:',
        squadiCompKey
      );
    if (squadiCompId && squadiDivId && squadiTeamName) {
      const config = {
        source: 'squadi',
        competitionId: squadiCompId,
        divisionId: squadiDivId,
        squadiTeamName: squadiTeamName,
      };
      if (squadiCompKey) config.competitionKey = squadiCompKey;
      resultsApi = JSON.stringify(config);
      if (API_CONFIG.debug) console.log('[DEBUG] saveTeamSettings: Built Squadi resultsApi:', resultsApi);
    } else {
      if (API_CONFIG.debug)
        console.log('[DEBUG] saveTeamSettings: Missing required Squadi fields, resultsApi will be empty');
    }
  }

  // Validation
  if (!name) {
    if (API_CONFIG.debug) console.log('[DEBUG] saveTeamSettings: validation failed - no name');
    showToast('Please enter a team name', 'error');
    nameInput.focus();
    return;
  }

  if (name.length < 2 || name.length > 100) {
    if (API_CONFIG.debug) console.log('[DEBUG] saveTeamSettings: validation failed - invalid name length');
    showToast('Team name must be 2-100 characters', 'error');
    nameInput.focus();
    return;
  }

  if (isNaN(year) || year < 2000 || year > 2100) {
    if (API_CONFIG.debug) console.log('[DEBUG] saveTeamSettings: validation failed - invalid year');
    showToast('Year must be between 2000 and 2100', 'error');
    yearInput.focus();
    return;
  }

  const validSeasons = ['Season 1', 'Season 2', 'Autumn', 'Spring', 'Summer', 'Winter', 'Other', 'NFNL'];
  if (!validSeasons.includes(season)) {
    if (API_CONFIG.debug) console.log('[DEBUG] saveTeamSettings: validation failed - invalid season');
    showToast('Invalid season selected', 'error');
    return;
  }

  if (API_CONFIG.debug) console.log('[DEBUG] saveTeamSettings: validation passed, proceeding with save');
  if (API_CONFIG.debug)
    console.log(
      '[DEBUG] saveTeamSettings: name:',
      name,
      'year:',
      year,
      'season:',
      season,
      'fixtureSource:',
      fixtureSource,
      'resultsApi:',
      resultsApi
    );

  // Store old values for rollback
  const oldName = state.currentTeam.teamName;
  const oldYear = state.currentTeam.year;
  const oldSeason = state.currentTeam.season;
  const oldCoach = state.currentTeam.coach;
  const oldCompetition = state.currentTeam.competition;
  const oldLadderUrl = state.currentTeam.ladderUrl;
  const oldResultsApi = state.currentTeam.resultsApi;

  if (API_CONFIG.debug) console.log('[DEBUG] saveTeamSettings: calling closeModal()');
  closeModal();
  if (API_CONFIG.debug) console.log('[DEBUG] saveTeamSettings: calling showLoading()');
  showLoading();

  try {
    // Update local state
    state.currentTeam.teamName = name;
    state.currentTeam.year = year;
    state.currentTeam.season = season;
    state.currentTeam.ladderUrl = ladderUrl;
    state.currentTeam.resultsApi = resultsApi;
    state.currentTeam.coach = coach;
    state.currentTeam.competition = competition;

    // Also update in currentTeamData
    if (state.currentTeamData) {
      state.currentTeamData.teamName = name;
      state.currentTeamData.year = year;
      state.currentTeamData.season = season;
      state.currentTeamData.ladderUrl = ladderUrl;
    }

    // Update in teams list
    const teamInList = state.teams.find((t) => t.teamID === state.currentTeam.teamID);
    if (teamInList) {
      teamInList.teamName = name;
      teamInList.year = year;
      teamInList.season = season;
      teamInList.ladderUrl = ladderUrl;
      teamInList.resultsApi = resultsApi;
      teamInList.coach = coach;
      teamInList.competition = competition;
    }

    // Save to backend
    const payload = { teamName: name, year, season, ladderUrl, resultsApi, coach, competition };
    console.log('[TeamSettings] calling updateTeamSettings API with:', JSON.stringify(payload));
    await updateTeamSettings(state.currentTeam.teamID, payload);

    console.log('[TeamSettings] API call successful, saving to localStorage');
    saveToLocalStorage();
    renderMainApp();
    try { window.renderTeamList(); } catch (_e) { /* team list may not be visible */ }
    showToast('Team updated', 'success');
    console.log('[TeamSettings] completed successfully');
  } catch (error) {
    console.error('[TeamSettings] ERROR:', error.message, error);
    // Rollback
    state.currentTeam.teamName = oldName;
    state.currentTeam.year = oldYear;
    state.currentTeam.season = oldSeason;
    state.currentTeam.coach = oldCoach;
    state.currentTeam.competition = oldCompetition;
    state.currentTeam.ladderUrl = oldLadderUrl;
    state.currentTeam.resultsApi = oldResultsApi;
    if (state.currentTeamData) {
      state.currentTeamData.teamName = oldName;
      state.currentTeamData.year = oldYear;
      state.currentTeamData.season = oldSeason;
      state.currentTeamData.ladderUrl = oldLadderUrl;
    }
    const rollbackTeam = state.teams.find((t) => t.teamID === state.currentTeam.teamID);
    if (rollbackTeam) {
      rollbackTeam.teamName = oldName;
      rollbackTeam.year = oldYear;
      rollbackTeam.season = oldSeason;
      rollbackTeam.coach = oldCoach;
      rollbackTeam.competition = oldCompetition;
      rollbackTeam.ladderUrl = oldLadderUrl;
      rollbackTeam.resultsApi = oldResultsApi;
    }
    if (API_CONFIG.debug) console.log('[DEBUG] saveTeamSettings: showing error toast');
    showToast('Failed to save: ' + error.message, 'error');
  } finally {
    if (API_CONFIG.debug) console.log('[DEBUG] saveTeamSettings: calling hideLoading');
    hideLoading();
  }
};

window.openGameSettings = function () {
  if (!ensureNotReadOnly('openGameSettings')) return;
  const game = state.currentGame;
  if (!game) return;

  openModal(
    'Game Settings',
    `
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
      <label class="form-label">Court</label>
      <input type="text" class="form-input" id="edit-game-location" value="${escapeAttr(game.location || '')}" placeholder="e.g. 1 or Banyule Court 1" maxlength="50">
    </div>
    <div class="form-group">
      <label class="form-label">Status</label>
      <select class="form-select" id="edit-game-status">
        <option value="upcoming" ${game.status === 'upcoming' ? 'selected' : ''}>Upcoming</option>
        <option value="normal" ${game.status === 'normal' ? 'selected' : ''}>Normal</option>
        <option value="abandoned" ${game.status === 'abandoned' ? 'selected' : ''}>Abandoned</option>
        <option value="forfeit" ${game.status === 'forfeit' ? 'selected' : ''}>Forfeit</option>
        <option value="bye" ${game.status === 'bye' ? 'selected' : ''}>Bye</option>
      </select>
    </div>
  `,
    `
    <button class="btn btn-ghost text-error" onclick="deleteGame()">Delete</button>
    <button class="btn btn-primary" onclick="saveGameSettings()">Save</button>
  `
  );
};

window.saveGameSettings = function () {
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
    const unplayed = quarters.filter(
      (q) => !game.lineup || !game.lineup[q] || (!game.lineup[q].GS && !game.lineup[q].GA && !game.lineup[q].C)
    );
    if (unplayed.length > 0) {
      if (confirm(`Game marked as Abandoned. Clear all data for unplayed quarters (${unplayed.join(', ')})?`)) {
        unplayed.forEach((q) => {
          if (game.lineup) game.lineup[q] = {};
        });
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

  const location = document.getElementById('edit-game-location').value.trim();

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

window.deleteGame = function () {
  if (!confirm('Delete this game?')) return;

  state.currentTeamData.games = state.currentTeamData.games.filter((g) => g.gameID !== state.currentGame.gameID);

  saveToLocalStorage();

  closeModal();
  closeGameDetail(); // This triggers sync to API
  showToast('Game deleted', 'info');
};

// ========================================
// HOME SEGMENT CONTROL (Teams/Players)
// ========================================

window.switchHomeSegment = function (segment) {
  // Update button states
  document.querySelectorAll('.segment-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.textContent.toLowerCase() === segment);
  });

  // Update indicator position
  const control = document.querySelector('.segment-control');
  if (control) {
    control.dataset.active = segment;
  }

  // Show/hide content
  document.getElementById('teams-segment')?.classList.toggle('active', segment === 'teams');
  document.getElementById('players-segment')?.classList.toggle('active', segment === 'players');

  // Render players content when switching to players tab
  if (segment === 'players') {
    renderPlayerLibrary();
  }
};
