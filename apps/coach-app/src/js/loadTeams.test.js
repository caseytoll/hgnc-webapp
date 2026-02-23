import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
// Provide a minimal localStorage mock before importing app module (app.js reads localStorage on import)
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
  };
})();
vi.stubGlobal('localStorage', mockLocalStorage);

// Provide minimal DOM and no-op UI helpers used by loadTeams()
beforeEach(() => {
  // loading overlay element
  const overlay = document.createElement('div');
  overlay.id = 'loading-overlay';
  overlay.className = 'hidden';
  document.body.appendChild(overlay);

  // stub UI functions that loadTeams may call
  global.showToast = () => {};
  global.renderTeamList = () => {};
  global.updateStatus = () => {};
});
afterEach(() => {
  const el = document.getElementById('loading-overlay');
  if (el && el.parentNode) el.parentNode.removeChild(el);
});

import { loadTeams, state } from './app.js';
import { mockTeams } from '../../../../common/mock-data.js';
import { API_CONFIG } from './config.js';

describe('loadTeams fallback behavior', () => {
  let originalUseMock;
  beforeEach(() => {
    originalUseMock = API_CONFIG.useMockData;
    // start with live mode by default for tests
    API_CONFIG.useMockData = false;
    state.teams = [];
  });
  afterEach(() => {
    API_CONFIG.useMockData = originalUseMock;
    vi.restoreAllMocks();
  });

  it('falls back to mockTeams when network fetch throws', async () => {
    // Simulate fetch throwing for the getTeams call
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('network error');
      })
    );

    await loadTeams();

    // After fallback, state.teams should be populated from mockTeams
    expect(state.teams.length).toBeGreaterThan(0);
    expect(state.teams[0].teamName).toEqual(mockTeams[0].teamName);
  });

  it('uses live API when fetch succeeds', async () => {
    const fakeApiResp = {
      success: true,
      teams: [{ teamID: 't1', teamName: 'Live Team', sheetName: 's1', playerCount: 5, year: 2026, season: 'S1' }],
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(fakeApiResp) }))
    );

    await loadTeams(true);

    expect(state.teams.length).toBe(1);
    expect(state.teams[0].teamName).toBe('Live Team');
  });
});
