// API Layer - Switches between mock data and real Apps Script backend
import { API_CONFIG } from './config.js';
import { mockTeams, calculateTeamStats } from '../../../../common/mock-data.js';
import { clubSlugFor } from '../../../../common/utils.js';

// Current data source: use API for production, mock for development
let dataSource = 'api';

// Cache for team sheetNames (needed to map teamID to sheetName for API calls)
const teamSheetMap = new Map();

// Track last known modification timestamp per team (for stale data detection)
const teamLastModified = new Map();

export function setDataSource(source) {
  dataSource = source;
  console.log(`[API] Data source set to: ${source}`);
  updateStatus(`Data source: ${source}`);
}

export function getDataSource() {
  return dataSource;
}

function updateStatus(message) {
  const el = document.getElementById('api-status');
  if (el) el.textContent = `Status: ${message}`;
}

// Generic API call to Apps Script
async function callAppsScript(action, params = {}) {
  updateStatus(`Calling ${action}...`);

  // Protect write operations when running in a read-only view
  try {
    const writeActions = new Set(['saveTeamData', 'savePlayerLibrary', 'updateTeam', 'deletePlayer', 'addPlayer']);
    if (typeof window !== 'undefined' && window.isReadOnlyView && writeActions.has(action)) {
      throw new Error('Read-only view: write operations are disabled');
    }
  } catch (e) {
    // If window isn't available or some error occurs we fall through to attempt the call
    if (e.message && e.message.startsWith('Read-only view')) throw e;
  }

  try {
    // Use proxy for local dev, direct URL for production
    // Apps Script handles CORS for GET requests when deployed as "Anyone"

    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
  const baseUrl = isLocalDev ? 'https://script.google.com/macros/s/AKfycbx5g7fIW28ncXoI9SeHDKix7umBtqaTdOm1aM-JdgO2l7esQHxu8jViMRRSN7YGtMnd/exec' : 'https://script.google.com/macros/s/AKfycbx5g7fIW28ncXoI9SeHDKix7umBtqaTdOm1aM-JdgO2l7esQHxu8jViMRRSN7YGtMnd/exec';

    // Add api=true flag for Apps Script to know this is an API request
    url.searchParams.set('api', 'true');
    url.searchParams.set('action', action);

    Object.keys(params).forEach(key => {
      const value = typeof params[key] === 'object'
        ? JSON.stringify(params[key])
        : params[key];
      url.searchParams.set(key, value);
    });

    // Add cache-busting param
    url.searchParams.set('t', Date.now());

    if (API_CONFIG.debug) {
      console.log(`[API] GET ${url.toString()}`);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store'
    });

    // Apps Script returns JSONP-style or JSON
    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      // Try to extract JSON from potential JSONP wrapper
      const match = text.match(/\{.*\}/s);
      if (match) {
        data = JSON.parse(match[0]);
      } else {
        throw new Error('Invalid response format');
      }
    }

    if (API_CONFIG.debug) {
      console.log(`[API] Response:`, data);
    }

    // Check for API-level errors
    if (data && data.success === false) {
      throw new Error(data.error || 'API request failed');
    }

    updateStatus('Ready');
    return data;

  } catch (error) {
    console.error(`[API] Error calling ${action}:`, error);
    updateStatus(`Error: ${error.message}`);
    throw error;
  }
}

// ============================================
// POST-based save with stale data protection
// ============================================

/**
 * Save team data via POST with stale data detection.
 * Uses POST to avoid URL length limits and includes clientLastModified for conflict detection.
 *
 * @param {string} teamID - Team identifier
 * @param {string} sheetName - Google Sheet name for this team
 * @param {object} saveData - Data to save (players, games)
 * @param {number|null} freshlyFetchedLastModified - If data was just fetched, use that timestamp instead of cached
 */
async function saveTeamDataWithProtection(teamID, sheetName, saveData, freshlyFetchedLastModified = null) {
  updateStatus('Saving...');

  // Protect write operations when running in a read-only view
  try {
    if (typeof window !== 'undefined' && window.isReadOnlyView) {
      throw new Error('Read-only view: write operations are disabled');
    }
  } catch (e) {
    if (e.message && e.message.startsWith('Read-only view')) throw e;
  }

  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
  const baseUrl = isLocalDev ? 'https://script.google.com/macros/s/AKfycbx5g7fIW28ncXoI9SeHDKix7umBtqaTdOm1aM-JdgO2l7esQHxu8jViMRRSN7YGtMnd/exec' : 'https://script.google.com/macros/s/AKfycbx5g7fIW28ncXoI9SeHDKix7umBtqaTdOm1aM-JdgO2l7esQHxu8jViMRRSN7YGtMnd/exec';

  // Use freshly fetched timestamp if provided, otherwise fall back to cached
  const clientLastModified = freshlyFetchedLastModified || teamLastModified.get(teamID) || null;

  try {
    // Include PIN auth token if available
    const pinToken = (typeof window !== 'undefined' && window.getTeamPinToken) ? window.getTeamPinToken(teamID) : null;

    const postBody = {
      api: true,
      action: 'saveTeamData',
      sheetName,
      teamData: saveData,
      clientLastModified
    };
    if (pinToken) postBody.pinToken = pinToken;

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postBody)
    });

    const result = await response.json();

    if (API_CONFIG.debug) {
      console.log('[API] POST saveTeamData response:', result);
    }

    // Check for auth error (PIN-protected team)
    if (result.error === 'AUTH_REQUIRED') {
      console.warn('[API] Auth required - PIN token invalid or expired');
      if (typeof window.showToast === 'function') {
        window.showToast('Access expired. Please re-enter the team PIN.', 'warning');
      }
      throw new Error('AUTH_REQUIRED');
    }

    // Check for stale data error
    if (result.error === 'STALE_DATA') {
      console.warn('[API] Stale data detected! Server has newer data.');
      updateStatus('Data conflict - refreshing...');

      // Show user-friendly message
      if (typeof window.showToast === 'function') {
        window.showToast('Another device updated this data. Refreshing...', 'warning');
      }

      // Trigger a data refresh
      throw new StaleDataError('Server has newer data. Please try again after refresh.', result.serverLastModified);
    }

    if (result.success === false) {
      throw new Error(result.error || 'Save failed');
    }

    // Update our local timestamp since we just saved successfully
    // The server sets _lastModified to Date.now() on save
    teamLastModified.set(teamID, Date.now());

    updateStatus('Ready');
    return result;

  } catch (error) {
    console.error('[API] Error saving team data:', error);
    updateStatus(`Error: ${error.message}`);
    throw error;
  }
}

/**
 * Custom error class for stale data conflicts
 */
class StaleDataError extends Error {
  constructor(message, serverLastModified) {
    super(message);
    this.name = 'StaleDataError';
    this.serverLastModified = serverLastModified;
  }
}

// Export for use in app.js
export { StaleDataError };

// ============================================
// API Methods
// ============================================

export async function loadTeams() {
  if (dataSource === 'mock') {
    console.log('[API] Loading mock teams');
    // Simulate network delay
    await new Promise(r => setTimeout(r, 300));
    return mockTeams.map(t => ({
      teamID: t.teamID,
      year: t.year,
      season: t.season,
      teamName: t.teamName,
      playerCount: t.players.length,
      gameCount: t.games.length,
      ladderUrl: t.ladderUrl || ''
    }));
  }

  // Real API call
  const result = await callAppsScript('getTeams');
  const teams = result.teams || [];

  // Cache the sheetName mapping for later use
  teams.forEach(t => {
    teamSheetMap.set(t.teamID, t.sheetName);
  });

  return teams;
}

export async function loadTeamData(teamID) {
  if (dataSource === 'mock') {
    console.log(`[API] Loading mock team data for ${teamID}`);
    await new Promise(r => setTimeout(r, 200));
    const team = mockTeams.find(t => t.teamID === teamID);
    if (!team) throw new Error('Team not found');
    return team;
  }

  // Get sheetName from cache (populated by loadTeams)
  const sheetName = teamSheetMap.get(teamID);
  if (!sheetName) {
    throw new Error(`No sheetName found for team ${teamID}. Call loadTeams first.`);
  }

  // Try to fetch consolidated team info (logo, nextFixture, ladder) first
  let teamInfo = null;
  try {
    const infoRes = await callAppsScript('getTeamInfo', { teamID });
    if (infoRes && infoRes.success && infoRes.info) teamInfo = infoRes.info;
  } catch (e) {
    // Non-fatal: fall back to sheet-only data
    console.warn('[API] getTeamInfo failed, falling back to getTeamData:', e.message || e);
  }

  // Real API call for sheet data
  const result = await callAppsScript('getTeamData', { teamID, sheetName });
  const rawData = result.teamData;

  // Transform from Google Sheet format to PWA format
  const transformed = transformTeamDataFromSheet(rawData, teamID);

  // Store the server's last modified timestamp for stale data detection
  if (transformed._lastModified) {
    teamLastModified.set(teamID, transformed._lastModified);
    console.log(`[API] Stored _lastModified for ${teamID}:`, transformed._lastModified);
  }

  // Merge server-provided teamInfo (logos/fixtures) when available
  if (teamInfo) {
    try {
      if (teamInfo.ourLogo && !transformed.ourLogo) {
        transformed.ourLogo = teamInfo.ourLogo;
        transformed.games.forEach(g => { if (!g.ourLogo) g.ourLogo = transformed.ourLogo; });
      }
      if (teamInfo.nextFixture) {
        // attach top-level nextFixture for convenience
        transformed.nextFixture = teamInfo.nextFixture;
        // try to merge into matching game by matchId
        const mid = teamInfo.nextFixture.matchId || teamInfo.nextFixture.matchID || teamInfo.nextFixture.id || null;
        if (mid) {
          const matchGame = transformed.games.find(g => String(g.matchId || g.gameID || g.gameId || g.gameID) === String(mid) || String(g.fixtureMatchId) === String(mid));
          if (matchGame) {
            // Merge opponentDetails and flags
            if (teamInfo.nextFixture.opponentDetails) {
              matchGame.opponentDetails = matchGame.opponentDetails || {};
              matchGame.opponentDetails.logoUrl = matchGame.opponentDetails.logoUrl || teamInfo.nextFixture.opponentDetails.logoUrl || teamInfo.nextFixture.opponentDetails.logo || matchGame.opponentDetails.logoUrl;
              matchGame.opponentDetails.id = matchGame.opponentDetails.id || teamInfo.nextFixture.opponentDetails.id;
            }
            if (teamInfo.nextFixture.lineupConfirmed !== undefined) matchGame.lineupConfirmed = teamInfo.nextFixture.lineupConfirmed;
            if (teamInfo.nextFixture.opponentLineupConfirmed !== undefined) matchGame.opponentLineupConfirmed = teamInfo.nextFixture.opponentLineupConfirmed;
            if (teamInfo.nextFixture.livestreamUrl) matchGame.livestreamUrl = matchGame.livestreamUrl || teamInfo.nextFixture.livestreamUrl;
            if (teamInfo.nextFixture.venueDetails) matchGame.venueDetails = matchGame.venueDetails || teamInfo.nextFixture.venueDetails;
          }
        }
      }
    } catch (e) {
      console.warn('[API] Failed to merge teamInfo:', e.message || e);
    }
  }

  return transformed;
}

// ============================================
// PIN Authentication API Methods
// ============================================

export async function validateTeamPIN(teamID, pin) {
  const result = await callAppsScript('validateTeamPIN', { teamID, pin });
  return result;
}

export async function setTeamPIN(teamID, pin, pinToken) {
  const params = { teamID, pin };
  if (pinToken) params.pinToken = pinToken;
  const result = await callAppsScript('setTeamPIN', params);
  return result;
}

export async function revokeTeamAccess(teamID, pinToken) {
  const result = await callAppsScript('revokeTeamAccess', { teamID, pinToken });
  return result;
}

/**
 * Transform team data from Google Sheet format to PWA format
 */
export function transformTeamDataFromSheet(data, teamID) {
  // Transform players
  const players = (data.players || []).map(p => {
    const player = {
      id: p.id,
      name: p.name,
      fillIn: p.isFillIn || p.fillIn || false,
      // Handle both string (legacy) and array formats
      favPosition: normalizeFavPositions(p.favoritePosition || p.favPosition)
    };
    // Preserve AI summary if present
    if (p.aiSummary) {
      player.aiSummary = p.aiSummary;
    }
    return player;
  });

  // Helper to normalize favPosition to array format
  function normalizeFavPositions(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(p => p);
    if (typeof val === 'string' && val.trim()) return [val.trim()];
    return [];
  }

  // Helper to create a simple slug from a team name for local asset fallback
  function slugifyTeamName(name) {
    if (!name) return '';
    return String(name).toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .replace(/-+/g, '-')
      .replace(/-/g, '')
      .trim();
  }

  // Debug: Log the incoming data object and its keys to inspect property names
  console.log('[DEBUG] [transformTeamDataFromSheet] incoming data:', data);
  if (data && typeof data === 'object') {
    console.log('[DEBUG] [transformTeamDataFromSheet] data keys:', Object.keys(data));
  }

  // Transform games
  const games = (data.games || []).map(g => {
    // Convert quarters array to lineup object
    let lineup = null;
    if (g.quarters && g.quarters.length > 0) {
      lineup = {};
      const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];
      g.quarters.forEach((q, i) => {
        if (i < 4) {
          const positions = q.positions || {};
          lineup[quarterNames[i]] = {
            GS: positions.GS || '',
            GA: positions.GA || '',
            WA: positions.WA || '',
            C: positions.C || '',
            WD: positions.WD || '',
            GD: positions.GD || '',
            GK: positions.GK || '',
            ourGsGoals: q.ourGsGoals || 0,
            ourGaGoals: q.ourGaGoals || 0,
            oppGsGoals: q.opponentGsGoals || 0,
            oppGaGoals: q.opponentGaGoals || 0,
            notes: q.notes || ''
          };
        }
      });
    }

    // Calculate scores from quarters if not cached
    let scores = null;
    if (g._cachedScores) {
      scores = { us: g._cachedScores.ourScore, opponent: g._cachedScores.opponentScore };
    } else if (g.quarters) {
      let us = 0, opponent = 0;
      g.quarters.forEach(q => {
        us += (q.ourGsGoals || 0) + (q.ourGaGoals || 0);
        opponent += (q.opponentGsGoals || 0) + (q.opponentGaGoals || 0);
      });
      scores = { us, opponent };
    }

    const game = {
      gameID: g.id || g.gameID,
      round: g.round,
      opponent: g.opponent,
      date: g.date,
      time: g.time || '',
      location: g.court ? `Court ${g.court}` : (g.location || g.venue || ''),
      status: g.status || 'upcoming',
      captain: g.captain || null,
      scores,
      availablePlayerIDs: g.availablePlayerIDs || [],
      lineup,
      // Map opponent details (may be provided by Squadi backend)
      opponentDetails: g.opponentDetails || (g.opponentInfo ? g.opponentInfo : {}),
      // Lineup confirmation flags (Squadi fields)
      lineupConfirmed: g.team1LineupConfirmed !== undefined ? g.team1LineupConfirmed : (g.lineupConfirmed !== undefined ? g.lineupConfirmed : undefined),
      opponentLineupConfirmed: g.team2LineupConfirmed !== undefined ? g.team2LineupConfirmed : (g.opponentLineupConfirmed !== undefined ? g.opponentLineupConfirmed : undefined),
      // Venue and livestream hints
      venueDetails: g.venueCourt || g.venueDetails || null,
      livestreamUrl: g.livestreamURL || g.livestreamUrl || null
    };
    // Preserve AI summary if present
    if (g.aiSummary) {
      game.aiSummary = g.aiSummary;
    }
    // Preserve fixture linking fields
    if (g.fixtureMatchId) {
      game.fixtureMatchId = g.fixtureMatchId;
    }
    if (g.fixtureScore) {
      game.fixtureScore = g.fixtureScore;
    }
    // Ensure opponentDetails has a normalized logoUrl if available from different field names
    if (game.opponentDetails) {
      game.opponentDetails.logoUrl = game.opponentDetails.logoUrl || game.opponentDetails.logo || g.opponentLogo || g.opponentLogoUrl || g.opponentLogoURL || null;
    } else if (g.opponentLogo || g.opponentLogoUrl) {
      game.opponentDetails = { logoUrl: g.opponentLogo || g.opponentLogoUrl };
    }
    // Other helpful mappings
    if (!game.lineupConfirmed && g.lineupConfirmed !== undefined) game.lineupConfirmed = g.lineupConfirmed;
    if (!game.opponentLineupConfirmed && g.opponentLineupConfirmed !== undefined) game.opponentLineupConfirmed = g.opponentLineupConfirmed;
    return game;
  });

  // Apply local asset fallbacks for logos when external URLs are not provided
  games.forEach(g => {
    try {
      // Opponent logo fallback from opponent name
      if ((!g.opponentDetails || !g.opponentDetails.logoUrl) && g.opponent) {
        const slug = slugifyTeamName(g.opponent);
        if (slug) {
          g.opponentDetails = g.opponentDetails || {};
          g.opponentDetails.logoUrl = `/assets/team-logos/${slug}.png`;
        }
      }
    } catch (e) {
      // ignore
    }
  });

  const result = {
    teamID: teamID,
    teamName: data.teamName || data.TeamName || data.name || data['Team Name'] || '',
    year: data.year || data.Year || data['Year'] || '',
    season: data.season || data.Season || data['Season'] || '',
    players: players,
    games: games,
    // Preserve server timestamp for stale data detection
    _lastModified: data._lastModified || null
  };
  // Map team-level logo into PWA model (usable as `ourLogo`)
  result.ourLogo = data.logoUrl || data.teamLogo || data.teamLogoUrl || data.logo || (data.team && data.team.logoUrl) || null;
  // Also propagate ourLogo onto each game if not already present (helps header rendering)
  if (result.ourLogo) {
    result.games.forEach(g => {
      if (!g.ourLogo) g.ourLogo = result.ourLogo;
    });
  }
  // If no remote team logo, prefer a club-level logo (derived from team name),
  // then fall back to a team-named local asset.
  if (!result.ourLogo && (result.teamName || data.team?.name)) {
    const tname = result.teamName || (data.team && data.team.name) || '';

    // 1) Club-level asset (prefer .svg)
    const club = clubSlugFor(tname);
    result.ourLogo = `/assets/team-logos/${club}.svg`;

    // 2) Secondary: team-level png (legacy naming)
    const tslug = slugifyTeamName(tname);
    if (!result.ourLogo && tslug) {
      result.ourLogo = `/assets/team-logos/${tslug}.png`;
    }

    // Apply to games
    result.games.forEach(g => { if (!g.ourLogo) g.ourLogo = result.ourLogo; });
  }

  // Final fallback: dedicated Hazel Glen SVG (guaranteed)
  if (!result.ourLogo) {
    result.ourLogo = '/assets/team-logos/hazel-glen.svg';
    result.games.forEach(g => { if (!g.ourLogo) g.ourLogo = result.ourLogo; });
  }

  // Backstop (shouldn't be reached) — last-resort PNG
  if (!result.ourLogo) {
    result.ourLogo = '/assets/team-logos/hg13fury.png';
    result.games.forEach(g => { if (!g.ourLogo) g.ourLogo = result.ourLogo; });
  }

  // Preserve team AI insights if present
  if (data.aiInsights) {
    result.aiInsights = data.aiInsights;
  }
  // Preserve training focus history if present
  if (data.trainingFocusHistory) {
    result.trainingFocusHistory = data.trainingFocusHistory;
  }
  // Preserve training sessions if present
  if (data.trainingSessions) {
    result.trainingSessions = data.trainingSessions;
  }
  return result;
}

/**
 * Transform team data from PWA format back to Google Sheet format for saving
 */
export function transformTeamDataToSheet(pwaData) {
  // Transform players back to Sheet format
  const players = (pwaData.players || []).map(p => {
    // Convert favPosition array to storage format
    let favPos = p.favPosition;
    if (Array.isArray(favPos)) {
      favPos = favPos.length > 0 ? favPos : null;
    }
    const player = {
      id: p.id,
      name: p.name,
      isFillIn: p.fillIn || false,
      favoritePosition: favPos,
      isFavorite: false
    };
    // Preserve AI summary if present
    if (p.aiSummary) {
      player.aiSummary = p.aiSummary;
    }
    return player;
  });

  // Transform games back to Sheet format
  const games = (pwaData.games || []).map(g => {
    // Convert lineup object back to quarters array
    let quarters = [{}, {}, {}, {}].map(() => ({
      positions: {},
      ourGsGoals: 0,
      ourGaGoals: 0,
      opponentGsGoals: 0,
      opponentGaGoals: 0
    }));

    if (g.lineup) {
      const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];
      quarterNames.forEach((qName, i) => {
        const q = g.lineup[qName];
        if (q) {
          // Build positions object
          const positions = {};
          ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'].forEach(pos => {
            if (q[pos]) {
              positions[pos] = q[pos];
            }
          });
          quarters[i] = {
            positions,
            ourGsGoals: q.ourGsGoals || 0,
            ourGaGoals: q.ourGaGoals || 0,
            opponentGsGoals: q.oppGsGoals || 0,
            opponentGaGoals: q.oppGaGoals || 0,
            notes: q.notes || ''
          };
        }
      });
    }

    const game = {
      id: g.gameID,
      round: g.round,
      opponent: g.opponent,
      date: g.date,
      time: g.time || '',
      court: g.location?.replace('Court ', '') || '',
      status: g.status || 'upcoming',
      captain: g.captain || null,
      availablePlayerIDs: g.availablePlayerIDs || [],
      quarters
    };
    // Preserve AI summary if present
    if (g.aiSummary) {
      game.aiSummary = g.aiSummary;
    }
    // Preserve fixture linking fields
    if (g.fixtureMatchId) {
      game.fixtureMatchId = g.fixtureMatchId;
    }
    if (g.fixtureScore) {
      game.fixtureScore = g.fixtureScore;
    }
    return game;
  });

  const result = {
    players,
    games,
    // Pass through timestamp for version tracking
    _lastModified: pwaData._lastModified || null
  };
  // Preserve team AI insights if present
  if (pwaData.aiInsights) {
    result.aiInsights = pwaData.aiInsights;
  }
  // Preserve training focus history if present
  if (pwaData.trainingFocusHistory) {
    result.trainingFocusHistory = pwaData.trainingFocusHistory;
  }
  // Preserve training sessions if present
  if (pwaData.trainingSessions) {
    result.trainingSessions = pwaData.trainingSessions;
  }
  return result;
}

export async function calculateStats(teamID) {
  if (dataSource === 'mock') {
    console.log(`[API] Calculating mock stats for ${teamID}`);
    await new Promise(r => setTimeout(r, 100));
    const team = mockTeams.find(t => t.teamID === teamID);
    if (!team) throw new Error('Team not found');
    return calculateTeamStats(team);
  }

  // For real API, stats are calculated client-side from team data
  // This matches how the current app works
  const teamData = await loadTeamData(teamID);
  // You would call your existing calculateSeasonStats function here
  return { message: 'Use client-side calculation with real data' };
}

export async function saveLineup(teamID, gameID, lineup) {
  if (dataSource === 'mock') {
    console.log(`[API] Saving mock lineup for game ${gameID}`);
    await new Promise(r => setTimeout(r, 500));
    // Update mock data in memory
    const team = mockTeams.find(t => t.teamID === teamID);
    if (team) {
      const game = team.games.find(g => g.gameID === gameID);
      if (game) {
        game.lineup = lineup;
      }
    }
    return { success: true };
  }

  // For real API, load raw data, modify, and save
  const sheetName = teamSheetMap.get(teamID);
  if (!sheetName) {
    throw new Error(`No sheetName found for team ${teamID}`);
  }

  const result = await callAppsScript('getTeamData', { teamID, sheetName });
  const rawData = result.teamData;

  // Find the game by id (Sheet format uses 'id' not 'gameID')
  const game = rawData.games?.find(g => g.id === gameID || g.gameID === gameID);
  if (game) {
    // Convert PWA lineup format to Sheet quarters format
    const quarters = [];
    ['Q1', 'Q2', 'Q3', 'Q4'].forEach(qName => {
      const q = lineup[qName] || {};
      const positions = {};
      ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'].forEach(pos => {
        if (q[pos]) positions[pos] = q[pos];
      });
      quarters.push({
        positions,
        ourGsGoals: q.ourGsGoals || 0,
        ourGaGoals: q.ourGaGoals || 0,
        opponentGsGoals: q.oppGsGoals || 0,
        opponentGaGoals: q.oppGaGoals || 0,
        notes: q.notes || ''
      });
    });
    game.quarters = quarters;

    // Update cached scores
    let ourScore = 0, opponentScore = 0;
    quarters.forEach(q => {
      ourScore += (q.ourGsGoals || 0) + (q.ourGaGoals || 0);
      opponentScore += (q.opponentGsGoals || 0) + (q.opponentGaGoals || 0);
    });
    game._cachedScores = { ourScore, opponentScore };
  }

  // Save the updated raw data with stale data protection
  // Use the freshly fetched _lastModified to detect conflicts
  const saveData = { players: rawData.players, games: rawData.games };
  return await saveTeamDataWithProtection(teamID, sheetName, saveData, rawData._lastModified);
}

export async function addPlayer(teamID, playerData) {
  if (dataSource === 'mock') {
    console.log(`[API] Adding mock player to ${teamID}`);
    await new Promise(r => setTimeout(r, 300));
    const team = mockTeams.find(t => t.teamID === teamID);
    if (team) {
      const newPlayer = {
        id: `p${Date.now()}`,
        name: playerData.name,
        fillIn: playerData.fillIn || false,
        favPosition: playerData.favPosition || ''
      };
      team.players.push(newPlayer);
      return { success: true, player: newPlayer };
    }
    throw new Error('Team not found');
  }

  // Load raw data, modify, save
  const sheetName = teamSheetMap.get(teamID);
  if (!sheetName) throw new Error(`No sheetName found for team ${teamID}`);

  const result = await callAppsScript('getTeamData', { teamID, sheetName });
  const rawData = result.teamData;

  // Create player in Sheet format
  const newPlayer = {
    id: `p${Date.now()}`,
    name: playerData.name,
    isFillIn: playerData.fillIn || false,
    // Handle array format for favourite positions
    favoritePosition: Array.isArray(playerData.favPosition)
      ? (playerData.favPosition.length > 0 ? playerData.favPosition : null)
      : (playerData.favPosition || null),
    isFavorite: false
  };
  rawData.players = rawData.players || [];
  rawData.players.push(newPlayer);

  // Save with stale data protection, using freshly fetched _lastModified
  const saveData = { players: rawData.players, games: rawData.games || [] };
  await saveTeamDataWithProtection(teamID, sheetName, saveData, rawData._lastModified);

  // Return in PWA format
  return {
    success: true,
    player: {
      id: newPlayer.id,
      name: newPlayer.name,
      fillIn: newPlayer.isFillIn,
      favPosition: newPlayer.favoritePosition || ''
    }
  };
}

export async function updatePlayer(teamID, playerID, playerData) {
  if (dataSource === 'mock') {
    console.log(`[API] Updating mock player ${playerID}`);
    await new Promise(r => setTimeout(r, 300));
    const team = mockTeams.find(t => t.teamID === teamID);
    if (team) {
      const player = team.players.find(p => p.id === playerID);
      if (player) {
        Object.assign(player, playerData);
        return { success: true };
      }
    }
    throw new Error('Player not found');
  }

  // Load raw data, modify, save
  const sheetName = teamSheetMap.get(teamID);
  if (!sheetName) throw new Error(`No sheetName found for team ${teamID}`);

  const result = await callAppsScript('getTeamData', { teamID, sheetName });
  const rawData = result.teamData;

  const player = rawData.players?.find(p => p.id === playerID);
  if (player) {
    // Update in Sheet format
    if (playerData.name !== undefined) player.name = playerData.name;
    if (playerData.fillIn !== undefined) player.isFillIn = playerData.fillIn;
    if (playerData.favPosition !== undefined) {
      // Handle array format for favourite positions
      player.favoritePosition = Array.isArray(playerData.favPosition)
        ? (playerData.favPosition.length > 0 ? playerData.favPosition : null)
        : (playerData.favPosition || null);
    }
  } else {
    throw new Error('Player not found');
  }

  // Save with stale data protection, using freshly fetched _lastModified
  const saveData = { players: rawData.players, games: rawData.games || [] };
  await saveTeamDataWithProtection(teamID, sheetName, saveData, rawData._lastModified);
  return { success: true };
}

export async function deletePlayer(teamID, playerID) {
  if (dataSource === 'mock') {
    console.log(`[API] Deleting mock player ${playerID}`);
    await new Promise(r => setTimeout(r, 300));
    const team = mockTeams.find(t => t.teamID === teamID);
    if (team) {
      team.players = team.players.filter(p => p.id !== playerID);
      return { success: true };
    }
    throw new Error('Team not found');
  }

  // Load raw data, modify, save
  const sheetName = teamSheetMap.get(teamID);
  if (!sheetName) throw new Error(`No sheetName found for team ${teamID}`);

  const result = await callAppsScript('getTeamData', { teamID, sheetName });
  const rawData = result.teamData;

  rawData.players = (rawData.players || []).filter(p => p.id !== playerID);

  // Save with stale data protection, using freshly fetched _lastModified
  const saveData = { players: rawData.players, games: rawData.games || [] };
  await saveTeamDataWithProtection(teamID, sheetName, saveData, rawData._lastModified);
  return { success: true };
}
