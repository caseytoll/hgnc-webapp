// ========================================
// STATE MANAGEMENT
// ========================================

export const state = {
  teams: [],
  currentTeam: null,
  currentTeamData: null,
  currentGame: null,
  currentQuarter: 'Q1',
  selectedPlayer: null,
  stats: null,
  analytics: null,
  activeStatsTab: 'overview',
  // Leaders table state for sorting and expansion
  leadersTableState: {
    expanded: {}, // { scorers: false, defenders: false, goalingPairs: false, defendingPairs: false }
    sort: {
      scorers: { column: 'goals', ascending: false },
      defenders: { column: 'avg', ascending: true },
      goalingPairs: { column: 'avg', ascending: false },
      defendingPairs: { column: 'avg', ascending: true },
    },
  },
  // Player Library - tracks players across teams/seasons
  playerLibrary: { players: [] },
  showArchivedTeams: false,
  // PIN tokens for device authentication per team
  teamPinTokens: {},
  // API availability flag (runtime) — set to false if live API fails so we can
  // suppress metrics and avoid repeat failing requests.
  apiAvailable: true,
  // Coach section collapsed state (not persisted, resets each session)
  collapsedCoachSections: {},
  // Division results from fixture sync (opponent scouting context for AI)
  divisionResults: [],
};

// ========================================
// LOCAL STORAGE PERSISTENCE
// ========================================

export const STORAGE_KEY = 'teamManagerData';

// Cache for API team data (separate from mockTeams)
export const apiTeamCache = {};

// Cache metadata for TTL tracking
export const teamCacheMetadata = {};
export const TEAM_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — show cached data instantly, background revalidation handles freshness
export const COACH_OTHER_SENTINEL = '__other__'; // Sentinel value for "Other..." in coach dropdown

// Teams list cache (for landing page)
export let teamsListCache = null;
export let teamsListCacheTime = null;

export function setTeamsListCache(teams, time) {
  teamsListCache = teams;
  teamsListCacheTime = time;
}

/**
 * Check if cached team data is still valid (within TTL)
 */
export function isTeamCacheValid(teamID) {
  const meta = teamCacheMetadata[teamID];
  if (!meta || !apiTeamCache[teamID]) return false;
  const age = Date.now() - new Date(meta.cachedAt).getTime();
  return age < TEAM_CACHE_TTL_MS;
}

/**
 * Check if teams list cache is valid
 */
export function isTeamsListCacheValid() {
  if (!teamsListCache || !teamsListCacheTime) return false;
  const age = Date.now() - new Date(teamsListCacheTime).getTime();
  return age < TEAM_CACHE_TTL_MS;
}

/**
 * Invalidate teams list cache (called after create/update team)
 */
export function invalidateTeamsListCache() {
  teamsListCache = null;
  teamsListCacheTime = null;
  console.log('[Cache] Teams list cache invalidated');
}

/**
 * Invalidate a specific team's cache (used when stale data is detected)
 */
export function invalidateTeamCache(teamID) {
  delete apiTeamCache[teamID];
  delete teamCacheMetadata[teamID];
  console.log('[Cache] Team cache invalidated for', teamID);
}

/**
 * Update team cache with fresh data and timestamp
 */
export function updateTeamCache(teamID, teamData) {
  apiTeamCache[teamID] = teamData;
  // Store the lastModified from the data for version checking
  teamCacheMetadata[teamID] = {
    cachedAt: new Date().toISOString(),
    lastModified: teamData._lastModified || 0,
  };
}

export function saveToLocalStorage() {
  try {
    // If using API and have current team data, cache it with timestamp
    if (state.currentTeamData) {
      const teamID = state.currentTeamData.teamID;
      updateTeamCache(teamID, state.currentTeamData);
    }
    const dataToSave = {
      apiTeams: apiTeamCache,
      teamCacheMeta: teamCacheMetadata,
      teamsListCache: teamsListCache,
      teamsListCacheTime: teamsListCacheTime,
      playerLibrary: state.playerLibrary,
      teamPinTokens: state.teamPinTokens,
      divisionResults: state.divisionResults,
      lastSaved: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    console.log('[Storage] Data saved');
  } catch (e) {
    console.error('[Storage] Failed to save:', e);
  }
}
export function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      // Load player library
      if (data.playerLibrary) {
        state.playerLibrary = data.playerLibrary;
      }
      // Load API team cache, pruning entries older than 30 days
      const PRUNE_AGE_MS = 30 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      if (data.apiTeams && data.teamCacheMeta) {
        for (const [teamID, teamData] of Object.entries(data.apiTeams)) {
          const meta = data.teamCacheMeta[teamID];
          const age = meta?.cachedAt ? now - new Date(meta.cachedAt).getTime() : Infinity;
          if (age <= PRUNE_AGE_MS) {
            apiTeamCache[teamID] = teamData;
          }
        }
      } else if (data.apiTeams) {
        Object.assign(apiTeamCache, data.apiTeams);
      }
      // Load cache metadata for TTL tracking (only for entries we kept)
      if (data.teamCacheMeta) {
        for (const [teamID, meta] of Object.entries(data.teamCacheMeta)) {
          if (apiTeamCache[teamID]) teamCacheMetadata[teamID] = meta;
        }
      }
      // Load PIN tokens
      if (data.teamPinTokens) {
        state.teamPinTokens = data.teamPinTokens;
      }
      // Load teams list cache
      if (data.teamsListCache) {
        teamsListCache = data.teamsListCache;
        teamsListCacheTime = data.teamsListCacheTime;
      }
      // Load division results (opponent scouting context)
      if (data.divisionResults) {
        state.divisionResults = data.divisionResults;
      }
      console.log('[Storage] Data loaded from', data.lastSaved);
      return true;
    }
  } catch (e) {
    console.error('[Storage] Failed to load:', e);
  }
  return false;
}
