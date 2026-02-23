// Simplified API for parent portal (read-only)
// Matches coach app's data transformation for consistent data structures

export function transformTeamDataFromSheet(data, teamID) {
  // Normalize favPosition to array (consistent with coach app)
  function normalizeFavPositions(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter((p) => p);
    if (typeof val === 'string' && val.trim()) return [val.trim()];
    return [];
  }

  // Transform players
  const players = (data.players || []).map((p) => ({
    id: p.id,
    name: p.name,
    fillIn: p.isFillIn || p.fillIn || false,
    favPosition: normalizeFavPositions(p.favoritePosition || p.favPosition),
  }));

  // Transform games - match coach app format
  const games = (data.games || []).map((g) => {
    // Convert quarters array to lineup object (same as coach app)
    let lineup = null;
    if (g.quarters && g.quarters.length > 0) {
      lineup = {};
      const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];
      g.quarters.forEach((q, i) => {
        if (i < 4 && q) {
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
            // notes intentionally excluded from parent portal
          };
        }
      });
    }

    // Calculate scores from quarters if not cached
    let scores = null;
    if (g._cachedScores) {
      scores = { us: g._cachedScores.ourScore, opponent: g._cachedScores.opponentScore };
    } else if (g.quarters) {
      let us = 0,
        opponent = 0;
      g.quarters.forEach((q) => {
        us += (q.ourGsGoals || 0) + (q.ourGaGoals || 0);
        opponent += (q.opponentGsGoals || 0) + (q.opponentGaGoals || 0);
      });
      scores = { us, opponent };
    } else if (g.scores) {
      scores = g.scores;
    }

    const game = {
      gameID: g.id || g.gameID,
      round: g.round,
      opponent: g.opponent,
      date: g.date,
      time: g.time || '',
      location: g.court ? `Court ${g.court}` : g.location || g.venue || '',
      status: g.status || (g.completed ? 'normal' : 'upcoming'),
      captain: g.captain || null,
      scores,
      availablePlayerIDs: g.availablePlayerIDs || [],
      lineup,
    };
    // Preserve fixture linking fields
    if (g.fixtureMatchId) {
      game.fixtureMatchId = g.fixtureMatchId;
    }
    if (g.fixtureScore) {
      game.fixtureScore = g.fixtureScore;
    }
    return game;
  });

  return {
    teamID: teamID,
    teamName: data.teamName || data.TeamName || data.name || data['Team Name'] || '',
    year: data.year || data.Year || new Date().getFullYear(),
    season: data.season || data.Season || 'Season 1',
    players: players,
    games: games,
  };
}

export function transformTeamDataToSheet(data) {
  // Not needed for read-only
  throw new Error('Read-only view: write operations are disabled');
}
