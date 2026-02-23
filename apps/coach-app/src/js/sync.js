// ========================================
// SYNC TO GOOGLE SHEETS
// ========================================

import { state, saveToLocalStorage, invalidateTeamCache, invalidateTeamsListCache } from './state.js';
import { API_CONFIG } from './config.js';
import { transformTeamDataToSheet } from './api.js';

export async function syncToGoogleSheets() {
  console.log('[syncToGoogleSheets] Starting...');
  if (window.isReadOnlyView) throw new Error('Read-only view: sync/write operations are disabled');

  if (!state.currentTeamData || !state.teamSheetMap) {
    throw new Error('No team data to sync');
  }

  const teamID = state.currentTeamData.teamID;
  const sheetName = state.teamSheetMap[teamID];
  console.log('[syncToGoogleSheets] teamID:', teamID, 'sheetName:', sheetName);

  if (!sheetName) {
    throw new Error('No sheetName found for team');
  }

  // Set timestamp BEFORE sending so client and server use the same value
  const syncTimestamp = Date.now();
  state.currentTeamData._lastModified = syncTimestamp;

  // Transform data to Sheet format (now includes the new timestamp)
  const saveData = transformTeamDataToSheet(state.currentTeamData);
  console.log('[syncToGoogleSheets] saveData players:', saveData.players?.length, 'games:', saveData.games?.length);

  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
  const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;

  // Use POST for large data payloads
  // Include clientLastModified to detect stale data conflicts
  const postBody = {
    action: 'saveTeamData',
    sheetName: sheetName,
    teamData: JSON.stringify(saveData),
    clientLastModified: state.currentTeamData._lastModified || null,
  };
  const pinToken = state.teamPinTokens?.[teamID];
  if (pinToken) postBody.pinToken = pinToken;

  console.log('[syncToGoogleSheets] Using POST, body size:', JSON.stringify(postBody).length);

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' }, // Apps Script requires text/plain for CORS
    body: JSON.stringify(postBody),
    redirect: 'follow',
  });

  console.log('[syncToGoogleSheets] Response status:', response.status);
  const data = await response.json();
  console.log('[syncToGoogleSheets] Response data:', data);

  // Handle stale data conflict
  if (data.error === 'STALE_DATA') {
    console.warn('[syncToGoogleSheets] Stale data detected - server has newer version');
    showToast('Another device has updated this data. Refreshing...', 'warning');
    // Reload fresh data from server
    invalidateTeamCache(teamID);
    await window.loadTeamData(teamID);
    throw new Error('Data was updated by another device. Your view has been refreshed with the latest data.');
  }

  if (data.success === false) {
    throw new Error(data.error || 'Sync failed');
  }

  // Update cache with the synced data (timestamp was already set before sending)
  saveToLocalStorage();

  return data;
}

// ========================================
// DEBOUNCED SYNC FOR RAPID CHANGES
// ========================================

let syncDebounceTimer = null;
export let syncInProgress = false;
export let hasPendingChanges = false;

/**
 * Update the sync status indicator with current state
 * @param {'saved'|'syncing'|'synced'|'failed'} status
 */
export function updateSyncIndicator(status) {
  const indicator = document.getElementById('autosave-indicator');
  if (!indicator) return;

  // Remove all state classes
  indicator.classList.remove('flash', 'syncing', 'synced', 'failed');

  const iconSpan = indicator.querySelector('svg');
  const textSpan = indicator.querySelector('span');
  if (!textSpan) return;

  switch (status) {
    case 'saved':
      // Saved locally, pending sync
      textSpan.textContent = 'Saved locally';
      indicator.classList.add('flash');
      if (iconSpan) {
        iconSpan.outerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
        </svg>`;
      }
      break;
    case 'syncing':
      textSpan.textContent = 'Syncing...';
      indicator.classList.add('syncing');
      if (iconSpan) {
        iconSpan.outerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>`;
      }
      break;
    case 'synced':
      textSpan.textContent = 'Synced';
      indicator.classList.add('synced');
      hasPendingChanges = false;
      if (iconSpan) {
        iconSpan.outerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 6L9 17l-5-5"/>
        </svg>`;
      }
      break;
    case 'failed':
      textSpan.textContent = 'Sync failed · tap to retry';
      indicator.classList.add('failed');
      indicator.onclick = () => retrySyncNow();
      if (iconSpan) {
        iconSpan.outerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>`;
      }
      break;
  }
}

/**
 * Manual retry sync triggered by tapping failed indicator
 */
async function retrySyncNow() {
  if (syncInProgress || !state.currentTeamData) return;
  await performSync(3); // 3 retries
}

/**
 * Perform sync with retry logic
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} attempt - Current attempt number (internal)
 */
export async function performSync(maxRetries = 3, attempt = 1) {
  if (syncInProgress || !state.currentTeamData) return;

  syncInProgress = true;
  updateSyncIndicator('syncing');

  try {
    console.log(`[Sync] Attempt ${attempt}/${maxRetries}...`);
    await syncToGoogleSheets();
    saveToLocalStorage();
    updateSyncIndicator('synced');
    console.log('[Sync] Complete');
  } catch (e) {
    console.error(`[Sync] Attempt ${attempt} failed:`, e);

    // Don't retry auth failures — clear token and redirect
    if (e.message === 'AUTH_REQUIRED') {
      const teamID = state.currentTeamData?.teamID;
      if (teamID) {
        delete state.teamPinTokens[teamID];
        saveToLocalStorage();
      }
      showToast('Access expired. Please re-enter the team PIN.', 'warning');
      showView('team-selector-view');
      window.renderTeamList();
      syncInProgress = false;
      return;
    }

    if (attempt < maxRetries) {
      // Exponential backoff: 3s, 9s, 27s
      const delay = Math.pow(3, attempt) * 1000;
      console.log(`[Sync] Retrying in ${delay / 1000}s...`);
      syncInProgress = false;
      setTimeout(() => performSync(maxRetries, attempt + 1), delay);
    } else {
      console.error('[Sync] All retries failed');
      updateSyncIndicator('failed');
      syncInProgress = false;
    }
    return;
  }

  syncInProgress = false;
}

/**
 * Debounced sync for rapid changes (scores, lineup, availability, captain)
 * Waits 1.5s after last change before syncing to avoid hammering the API
 */
export function debouncedSync() {
  clearTimeout(syncDebounceTimer);
  hasPendingChanges = true;
  updateSyncIndicator('saved');

  syncDebounceTimer = setTimeout(async () => {
    if (!state.currentTeamData || syncInProgress) return;
    await performSync(3);
  }, 1500); // Sync 1.5s after last change
}

/**
 * Cancel any pending debounced sync (used when closing game detail)
 */
export function cancelDebouncedSync() {
  clearTimeout(syncDebounceTimer);
}

/**
 * Update team settings (name, year, season, archived) in the backend
 */
export async function updateTeamSettings(teamID, settings) {
  if (window.isReadOnlyView) throw new Error('Read-only view: updateTeamSettings is disabled');

  const sheetName = state.teamSheetMap?.[teamID];
  if (!sheetName) {
    throw new Error('No sheetName found for team');
  }

  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
  const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;

  const url = new URL(baseUrl, isLocalDev ? window.location.origin : undefined);
  url.searchParams.set('api', 'true');
  url.searchParams.set('action', 'updateTeam');
  url.searchParams.set('teamID', teamID);
  url.searchParams.set('settings', JSON.stringify(settings));

  // Include PIN auth token if available
  const pinToken = state.teamPinTokens?.[teamID];
  if (pinToken) url.searchParams.set('pinToken', pinToken);

  const response = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
  const data = await response.json();

  if (data.error === 'AUTH_REQUIRED') {
    // Clear invalid token and notify
    delete state.teamPinTokens[teamID];
    saveToLocalStorage();
    showToast('Access expired. Please re-enter the team PIN.', 'warning');
    showView('team-selector-view');
    window.renderTeamList();
    throw new Error('AUTH_REQUIRED');
  }

  if (data.success === false) {
    throw new Error(data.error || 'Failed to update team settings');
  }

  // Invalidate teams list cache since team settings changed
  invalidateTeamsListCache();

  return data;
}
