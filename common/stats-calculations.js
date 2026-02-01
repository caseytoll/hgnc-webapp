// ========================================
// ADVANCED STATS CALCULATIONS
// Pure functions for analytics dashboard
// ========================================

/**
 * Check if a game date/time is in the past (i.e., the game has been played).
 * @param {Object} game - Game object with date and optional time fields
 * @returns {boolean} True if the game is in the past or date is missing
 */
function isGameInPast(game) {
  if (!game.date) return true; // No date means assume it's a past game

  try {
    // Parse date (expected format: YYYY-MM-DD or similar)
    let gameDateTime = new Date(game.date);

    // If time is provided, add it to the date
    if (game.time) {
      const timeParts = game.time.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
      if (timeParts) {
        let hours = parseInt(timeParts[1], 10);
        const minutes = parseInt(timeParts[2], 10);
        const meridiem = timeParts[3];

        if (meridiem) {
          if (meridiem.toLowerCase() === 'pm' && hours !== 12) hours += 12;
          if (meridiem.toLowerCase() === 'am' && hours === 12) hours = 0;
        }

        gameDateTime.setHours(hours, minutes, 0, 0);
      }
    } else {
      // No time provided, set to end of day so we don't count it until the day is over
      gameDateTime.setHours(23, 59, 59, 999);
    }

    return gameDateTime < new Date();
  } catch (e) {
    // If date parsing fails, assume it's a past game
    return true;
  }
}

/**
 * Calculate advanced team statistics including form, quarter analysis, and averages.
 * @param {Object} team - Team data with games array
 * @returns {Object} Advanced stats object
 */
export function calculateAdvancedStats(team) {
  if (!team || !team.games) {
    return {
      gameCount: 0, wins: 0, losses: 0, draws: 0,
      goalsFor: 0, goalsAgainst: 0, goalDiff: 0, winRate: 0,
      avgFor: 0, avgAgainst: 0, form: [], bestQuarter: null,
      bestQuarterDiff: 0,
      quarterStats: { Q1: { for: 0, against: 0 }, Q2: { for: 0, against: 0 }, Q3: { for: 0, against: 0 }, Q4: { for: 0, against: 0 } },
      gameResults: []
    };
  }

  const games = team.games
    .filter(g => g.status === 'normal' && g.scores && isGameInPast(g))
    .sort((a, b) => a.round - b.round);

  if (games.length === 0) {
    return {
      gameCount: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      winRate: 0,
      avgFor: 0,
      avgAgainst: 0,
      form: [],
      bestQuarter: null,
      quarterStats: { Q1: { for: 0, against: 0 }, Q2: { for: 0, against: 0 }, Q3: { for: 0, against: 0 }, Q4: { for: 0, against: 0 } },
      gameResults: []
    };
  }

  let wins = 0, losses = 0, draws = 0;
  let goalsFor = 0, goalsAgainst = 0;
  const quarterStats = {
    Q1: { for: 0, against: 0, diff: 0, games: 0 },
    Q2: { for: 0, against: 0, diff: 0, games: 0 },
    Q3: { for: 0, against: 0, diff: 0, games: 0 },
    Q4: { for: 0, against: 0, diff: 0, games: 0 }
  };
  const gameResults = [];

  games.forEach(game => {
    const us = game.scores.us;
    const them = game.scores.opponent;
    goalsFor += us;
    goalsAgainst += them;

    let result;
    if (us > them) { wins++; result = 'W'; }
    else if (us < them) { losses++; result = 'L'; }
    else { draws++; result = 'D'; }

    gameResults.push({
      round: game.round,
      opponent: game.opponent,
      us,
      them,
      result,
      diff: us - them
    });

    // Quarter-by-quarter analysis
    if (game.lineup) {
      ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
        const quarter = game.lineup[q];
        if (quarter) {
          const qFor = (quarter.ourGsGoals || 0) + (quarter.ourGaGoals || 0);
          const qAgainst = (quarter.oppGsGoals || 0) + (quarter.oppGaGoals || 0);
          quarterStats[q].for += qFor;
          quarterStats[q].against += qAgainst;
          quarterStats[q].diff += (qFor - qAgainst);
          quarterStats[q].games++;
        }
      });
    }
  });

  // Calculate best quarter (highest average differential)
  let bestQuarter = null;
  let bestDiff = -Infinity;
  ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
    if (quarterStats[q].games > 0) {
      const avgDiff = quarterStats[q].diff / quarterStats[q].games;
      if (avgDiff > bestDiff) {
        bestDiff = avgDiff;
        bestQuarter = q;
      }
    }
  });

  // Form - last 5 games (most recent first)
  const form = gameResults.slice(-5).reverse().map(g => g.result);

  return {
    gameCount: games.length,
    wins,
    losses,
    draws,
    goalsFor,
    goalsAgainst,
    goalDiff: goalsFor - goalsAgainst,
    winRate: Math.round((wins / games.length) * 100),
    avgFor: Math.round((goalsFor / games.length) * 10) / 10,
    avgAgainst: Math.round((goalsAgainst / games.length) * 10) / 10,
    form,
    bestQuarter,
    bestQuarterDiff: bestDiff !== -Infinity ? Math.round(bestDiff * 10) / 10 : 0,
    quarterStats,
    gameResults
  };
}

/**
 * Calculate offensive and defensive leaderboards.
 * @param {Object} team - Team data with games and players
 * @returns {Object} Leaderboard data
 */
export function calculateLeaderboards(team) {
  if (!team || !team.games) {
    return {
      offensive: { topScorersByTotal: [], topScorersByEfficiency: [], topScoringPairsByTotal: [], topScoringPairsByEfficiency: [] },
      defensive: { topDefendersByTotal: [], topDefendersByEfficiency: [], topDefensivePairsByTotal: [], topDefensivePairsByEfficiency: [] },
      minQuarters: 3
    };
  }

  const games = team.games.filter(g => g.status === 'normal' && g.scores && g.lineup && isGameInPast(g));

  // Individual scorers
  const scorers = {};
  // GS-GA pairs
  const scoringPairs = {};
  // Individual defenders (GD/GK)
  const defenders = {};
  // GD-GK pairs
  const defensivePairs = {};

  games.forEach(game => {
    ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
      const quarter = game.lineup[q];
      if (!quarter) return;

      const gs = quarter.GS;
      const ga = quarter.GA;
      const gd = quarter.GD;
      const gk = quarter.GK;
      const gsGoals = quarter.ourGsGoals || 0;
      const gaGoals = quarter.ourGaGoals || 0;
      const opponentScore = (quarter.oppGsGoals || 0) + (quarter.oppGaGoals || 0);

      // Track individual scorers
      if (gs) {
        if (!scorers[gs]) scorers[gs] = { goals: 0, quarters: 0 };
        scorers[gs].goals += gsGoals;
        scorers[gs].quarters++;
      }
      if (ga) {
        if (!scorers[ga]) scorers[ga] = { goals: 0, quarters: 0 };
        scorers[ga].goals += gaGoals;
        scorers[ga].quarters++;
      }

      // Track scoring pairs (GS-GA)
      if (gs && ga) {
        const pairKey = [gs, ga].sort().join(' & ');
        if (!scoringPairs[pairKey]) {
          scoringPairs[pairKey] = { players: [gs, ga], goals: 0, quarters: 0 };
        }
        scoringPairs[pairKey].goals += (gsGoals + gaGoals);
        scoringPairs[pairKey].quarters++;
      }

      // Track individual defenders
      if (gd) {
        if (!defenders[gd]) defenders[gd] = { goalsAgainst: 0, quarters: 0 };
        defenders[gd].goalsAgainst += opponentScore;
        defenders[gd].quarters++;
      }
      if (gk) {
        if (!defenders[gk]) defenders[gk] = { goalsAgainst: 0, quarters: 0 };
        defenders[gk].goalsAgainst += opponentScore;
        defenders[gk].quarters++;
      }

      // Track defensive pairs (GD-GK)
      if (gd && gk) {
        const pairKey = [gd, gk].sort().join(' & ');
        if (!defensivePairs[pairKey]) {
          defensivePairs[pairKey] = { players: [gd, gk], goalsAgainst: 0, quarters: 0 };
        }
        defensivePairs[pairKey].goalsAgainst += opponentScore;
        defensivePairs[pairKey].quarters++;
      }
    });
  });

  // Convert to sorted arrays
  const MIN_QUARTERS = 3;

  // Top scorers by total goals
  const topScorersByTotal = Object.entries(scorers)
    .map(([name, data]) => ({
      name,
      goals: data.goals,
      quarters: data.quarters,
      avg: data.quarters > 0 ? Math.round((data.goals / data.quarters) * 10) / 10 : 0
    }))
    .sort((a, b) => b.goals - a.goals);

  // Top scorers by efficiency (min quarters)
  const topScorersByEfficiency = Object.entries(scorers)
    .filter(([_, data]) => data.quarters >= MIN_QUARTERS)
    .map(([name, data]) => ({
      name,
      goals: data.goals,
      quarters: data.quarters,
      avg: Math.round((data.goals / data.quarters) * 10) / 10
    }))
    .sort((a, b) => b.avg - a.avg);

  // Top scoring pairs by total
  const topScoringPairsByTotal = Object.values(scoringPairs)
    .map(data => ({
      players: data.players,
      goals: data.goals,
      quarters: data.quarters,
      avg: data.quarters > 0 ? Math.round((data.goals / data.quarters) * 10) / 10 : 0
    }))
    .sort((a, b) => b.goals - a.goals);

  // Top scoring pairs by efficiency (min quarters)
  const topScoringPairsByEfficiency = Object.values(scoringPairs)
    .filter(data => data.quarters >= MIN_QUARTERS)
    .map(data => ({
      players: data.players,
      goals: data.goals,
      quarters: data.quarters,
      avg: Math.round((data.goals / data.quarters) * 10) / 10
    }))
    .sort((a, b) => b.avg - a.avg);

  // Top defenders by total quarters played (no minimum)
  const topDefendersByTotal = Object.entries(defenders)
    .map(([name, data]) => ({
      name,
      goalsAgainst: data.goalsAgainst,
      quarters: data.quarters,
      avg: data.quarters > 0 ? Math.round((data.goalsAgainst / data.quarters) * 10) / 10 : 0
    }))
    .sort((a, b) => b.quarters - a.quarters); // Most quarters played first

  // Top defenders by efficiency (lowest GA/quarter, min quarters)
  const topDefendersByEfficiency = Object.entries(defenders)
    .filter(([_, data]) => data.quarters >= MIN_QUARTERS)
    .map(([name, data]) => ({
      name,
      goalsAgainst: data.goalsAgainst,
      quarters: data.quarters,
      avg: Math.round((data.goalsAgainst / data.quarters) * 10) / 10
    }))
    .sort((a, b) => a.avg - b.avg); // Lower is better

  // Top defensive pairs by total (no minimum)
  const topDefensivePairsByTotal = Object.values(defensivePairs)
    .map(data => ({
      players: data.players,
      goalsAgainst: data.goalsAgainst,
      quarters: data.quarters,
      avg: data.quarters > 0 ? Math.round((data.goalsAgainst / data.quarters) * 10) / 10 : 0
    }))
    .sort((a, b) => b.quarters - a.quarters); // Most quarters together first

  // Top defensive pairs by efficiency (min quarters)
  const topDefensivePairsByEfficiency = Object.values(defensivePairs)
    .filter(data => data.quarters >= MIN_QUARTERS)
    .map(data => ({
      players: data.players,
      goalsAgainst: data.goalsAgainst,
      quarters: data.quarters,
      avg: Math.round((data.goalsAgainst / data.quarters) * 10) / 10
    }))
    .sort((a, b) => a.avg - b.avg); // Lower is better

  return {
    offensive: {
      topScorersByTotal,
      topScorersByEfficiency,
      topScoringPairsByTotal,
      topScoringPairsByEfficiency
    },
    defensive: {
      topDefendersByTotal,
      topDefendersByEfficiency,
      topDefenders: topDefendersByEfficiency, // Alias for backward compatibility
      topDefensivePairsByTotal,
      topDefensivePairsByEfficiency,
      topDefensivePairs: topDefensivePairsByEfficiency // Alias for backward compatibility
    },
    minQuarters: MIN_QUARTERS
  };
}

/**
 * Calculate lineup unit combinations and position pairings.
 * @param {Object} team - Team data with games
 * @returns {Object} Combination analysis data
 */
export function calculateCombinations(team) {
  if (!team || !team.games) {
    return {
      attackingUnits: [],
      defensiveUnits: [],
      pairings: { offensive: [], defensive: [], transition: [] },
      minQuarters: 2
    };
  }

  const games = team.games.filter(g => g.status === 'normal' && g.scores && g.lineup && isGameInPast(g));

  // 4-player units
  const attackingUnits = {}; // GS-GA-WA-C
  const defensiveUnits = {}; // GK-GD-WD-C

  // 2-player position pairings
  const pairings = {
    offensive: {}, // GS-GA, GA-WA, WA-C
    defensive: {}, // GK-GD, GD-WD, WD-C
    transition: {} // WD-WA, C connections
  };

  games.forEach(game => {
    ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
      const quarter = game.lineup[q];
      if (!quarter) return;

      const gs = quarter.GS;
      const ga = quarter.GA;
      const wa = quarter.WA;
      const c = quarter.C;
      const wd = quarter.WD;
      const gd = quarter.GD;
      const gk = quarter.GK;

      const ourGoals = (quarter.ourGsGoals || 0) + (quarter.ourGaGoals || 0);
      const theirGoals = (quarter.oppGsGoals || 0) + (quarter.oppGaGoals || 0);
      const plusMinus = ourGoals - theirGoals;

      // Attacking unit (GS-GA-WA-C)
      if (gs && ga && wa && c) {
        const key = [gs, ga, wa, c].sort().join(' | ');
        if (!attackingUnits[key]) {
          attackingUnits[key] = {
            players: { GS: gs, GA: ga, WA: wa, C: c },
            goalsFor: 0,
            goalsAgainst: 0,
            quarters: 0
          };
        }
        attackingUnits[key].goalsFor += ourGoals;
        attackingUnits[key].goalsAgainst += theirGoals;
        attackingUnits[key].quarters++;
      }

      // Defensive unit (GK-GD-WD-C)
      if (gk && gd && wd && c) {
        const key = [gk, gd, wd, c].sort().join(' | ');
        if (!defensiveUnits[key]) {
          defensiveUnits[key] = {
            players: { GK: gk, GD: gd, WD: wd, C: c },
            goalsFor: 0,
            goalsAgainst: 0,
            quarters: 0
          };
        }
        defensiveUnits[key].goalsFor += ourGoals;
        defensiveUnits[key].goalsAgainst += theirGoals;
        defensiveUnits[key].quarters++;
      }

      // Position pairings - Offensive
      const offensivePairDefs = [
        { pos1: 'GS', pos2: 'GA', p1: gs, p2: ga },
        { pos1: 'GA', pos2: 'WA', p1: ga, p2: wa },
        { pos1: 'WA', pos2: 'C', p1: wa, p2: c }
      ];

      offensivePairDefs.forEach(({ pos1, pos2, p1, p2 }) => {
        if (p1 && p2) {
          const key = `${pos1}-${pos2}: ${[p1, p2].sort().join(' & ')}`;
          if (!pairings.offensive[key]) {
            pairings.offensive[key] = {
              positions: `${pos1}-${pos2}`,
              players: [p1, p2],
              goalsFor: 0,
              goalsAgainst: 0,
              quarters: 0
            };
          }
          pairings.offensive[key].goalsFor += ourGoals;
          pairings.offensive[key].goalsAgainst += theirGoals;
          pairings.offensive[key].quarters++;
        }
      });

      // Position pairings - Defensive
      const defensivePairDefs = [
        { pos1: 'GK', pos2: 'GD', p1: gk, p2: gd },
        { pos1: 'GD', pos2: 'WD', p1: gd, p2: wd },
        { pos1: 'WD', pos2: 'C', p1: wd, p2: c }
      ];

      defensivePairDefs.forEach(({ pos1, pos2, p1, p2 }) => {
        if (p1 && p2) {
          const key = `${pos1}-${pos2}: ${[p1, p2].sort().join(' & ')}`;
          if (!pairings.defensive[key]) {
            pairings.defensive[key] = {
              positions: `${pos1}-${pos2}`,
              players: [p1, p2],
              goalsFor: 0,
              goalsAgainst: 0,
              quarters: 0
            };
          }
          pairings.defensive[key].goalsFor += ourGoals;
          pairings.defensive[key].goalsAgainst += theirGoals;
          pairings.defensive[key].quarters++;
        }
      });

      // Transition pairings (WD-WA bridge)
      if (wd && wa) {
        const key = `WD-WA: ${[wd, wa].sort().join(' & ')}`;
        if (!pairings.transition[key]) {
          pairings.transition[key] = {
            positions: 'WD-WA',
            players: [wd, wa],
            goalsFor: 0,
            goalsAgainst: 0,
            quarters: 0
          };
        }
        pairings.transition[key].goalsFor += ourGoals;
        pairings.transition[key].goalsAgainst += theirGoals;
        pairings.transition[key].quarters++;
      }
    });
  });

  const MIN_QUARTERS = 2;

  // Process attacking units
  const attackingUnitsList = Object.values(attackingUnits)
    .filter(u => u.quarters >= MIN_QUARTERS)
    .map(u => ({
      ...u,
      avgFor: Math.round((u.goalsFor / u.quarters) * 10) / 10,
      avgAgainst: Math.round((u.goalsAgainst / u.quarters) * 10) / 10,
      plusMinus: Math.round(((u.goalsFor - u.goalsAgainst) / u.quarters) * 10) / 10
    }))
    .sort((a, b) => b.avgFor - a.avgFor);

  // Process defensive units
  const defensiveUnitsList = Object.values(defensiveUnits)
    .filter(u => u.quarters >= MIN_QUARTERS)
    .map(u => ({
      ...u,
      avgFor: Math.round((u.goalsFor / u.quarters) * 10) / 10,
      avgAgainst: Math.round((u.goalsAgainst / u.quarters) * 10) / 10,
      plusMinus: Math.round(((u.goalsFor - u.goalsAgainst) / u.quarters) * 10) / 10
    }))
    .sort((a, b) => a.avgAgainst - b.avgAgainst); // Lower GA is better

  // Process pairings
  const processPairings = (pairingObj, sortBy) => {
    return Object.values(pairingObj)
      .filter(p => p.quarters >= MIN_QUARTERS)
      .map(p => ({
        ...p,
        avgFor: Math.round((p.goalsFor / p.quarters) * 10) / 10,
        avgAgainst: Math.round((p.goalsAgainst / p.quarters) * 10) / 10,
        plusMinus: Math.round(((p.goalsFor - p.goalsAgainst) / p.quarters) * 10) / 10
      }))
      .sort(sortBy);
  };

  return {
    attackingUnits: attackingUnitsList,
    defensiveUnits: defensiveUnitsList,
    pairings: {
      offensive: processPairings(pairings.offensive, (a, b) => b.avgFor - a.avgFor),
      defensive: processPairings(pairings.defensive, (a, b) => a.avgAgainst - b.avgAgainst),
      transition: processPairings(pairings.transition, (a, b) => b.plusMinus - a.plusMinus)
    },
    minQuarters: MIN_QUARTERS
  };
}

/**
 * Get all analytics data for a team in one call.
 * @param {Object} team - Team data
 * @returns {Object} Complete analytics object
 */
export function calculateAllAnalytics(team) {
  return {
    advanced: calculateAdvancedStats(team),
    leaderboards: calculateLeaderboards(team),
    combinations: calculateCombinations(team)
  };
}
