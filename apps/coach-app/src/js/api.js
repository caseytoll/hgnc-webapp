// API Layer - Switches between mock data and real Apps Script backend
import { API_CONFIG } from './config.js';
import { mockTeams, calculateMockStats } from '../../../../common/mock-data.js';

// Current data source: 'mock' or 'api'
let dataSource = 'mock';

// Cache for team sheetNames (needed to map teamID to sheetName for API calls)
const teamSheetMap = new Map();

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
    const baseUrl = isLocalDev ? '/gas-proxy' : API_CONFIG.baseUrl;
    const url = new URL(baseUrl, isLocalDev ? window.location.origin : undefined);

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

  // Real API call
  const result = await callAppsScript('getTeamData', { teamID, sheetName });
  const rawData = result.teamData;

  // Transform from Google Sheet format to PWA format
  return transformTeamDataFromSheet(rawData, teamID);
}

/**
 * Transform team data from Google Sheet format to PWA format
 */
export function transformTeamDataFromSheet(data, teamID) {
  // Transform players
  const players = (data.players || []).map(p => ({
    id: p.id,
    name: p.name,
    fillIn: p.isFillIn || p.fillIn || false,
    favPosition: p.favoritePosition || p.favPosition || ''
  }));

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
            oppGaGoals: q.opponentGaGoals || 0
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

    return {
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
      lineup
    };
  });

  return {
    teamID: teamID,
    teamName: data.teamName || data.TeamName || data.name || data['Team Name'] || '',
    year: data.year || data.Year || data['Year'] || '',
    season: data.season || data.Season || data['Season'] || '',
    players: players,
    games: games
  };
}

/**
 * Transform team data from PWA format back to Google Sheet format for saving
 */
export function transformTeamDataToSheet(pwaData) {
  // Transform players back to Sheet format
  const players = (pwaData.players || []).map(p => ({
    id: p.id,
    name: p.name,
    isFillIn: p.fillIn || false,
    favoritePosition: p.favPosition || null,
    isFavorite: false
  }));

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
            opponentGaGoals: q.oppGaGoals || 0
          };
        }
      });
    }

    return {
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
  });

  return { players, games };
}

export async function calculateStats(teamID) {
  if (dataSource === 'mock') {
    console.log(`[API] Calculating mock stats for ${teamID}`);
    await new Promise(r => setTimeout(r, 100));
    const team = mockTeams.find(t => t.teamID === teamID);
    if (!team) throw new Error('Team not found');
    return calculateMockStats(team);
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
        opponentGaGoals: q.oppGaGoals || 0
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

  // Save the updated raw data
  const saveData = { players: rawData.players, games: rawData.games };
  return await callAppsScript('saveTeamData', { sheetName, teamData: JSON.stringify(saveData) });
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
    favoritePosition: playerData.favPosition || null,
    isFavorite: false
  };
  rawData.players = rawData.players || [];
  rawData.players.push(newPlayer);

  const saveData = { players: rawData.players, games: rawData.games || [] };
  await callAppsScript('saveTeamData', { sheetName, teamData: JSON.stringify(saveData) });

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
    if (playerData.favPosition !== undefined) player.favoritePosition = playerData.favPosition || null;
  } else {
    throw new Error('Player not found');
  }

  const saveData = { players: rawData.players, games: rawData.games || [] };
  await callAppsScript('saveTeamData', { sheetName, teamData: JSON.stringify(saveData) });
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

  const saveData = { players: rawData.players, games: rawData.games || [] };
  await callAppsScript('saveTeamData', { sheetName, teamData: JSON.stringify(saveData) });
  return { success: true };
}
