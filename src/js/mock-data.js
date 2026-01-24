// Auto-exported mock data

/**
 * Calculate basic team and player statistics from team data.
 * @param {Object} team - Team data with games array
 * @returns {Object} Stats object with team totals and player stats
 */
export function calculateMockStats(team) {
  if (!team || !team.games) {
    return {
      gameCount: 0, wins: 0, losses: 0, draws: 0,
      goalsFor: 0, goalsAgainst: 0, goalDiff: 0, winRate: 0,
      playerStats: []
    };
  }

  // Filter to completed games only (status 'normal' or has scores)
  const games = team.games.filter(g => (g.status === 'normal' || g.scores) && g.status !== 'bye' && g.status !== 'abandoned');

  if (games.length === 0) {
    return {
      gameCount: 0, wins: 0, losses: 0, draws: 0,
      goalsFor: 0, goalsAgainst: 0, goalDiff: 0, winRate: 0,
      playerStats: []
    };
  }

  let wins = 0, losses = 0, draws = 0;
  let goalsFor = 0, goalsAgainst = 0;

  // Track player stats: { name: { goals, quarters, gamesPlayed: [], gameBreakdown: [] } }
  const playerData = {};

  games.forEach(game => {
    const us = game.scores.us;
    const them = game.scores.opponent;
    goalsFor += us;
    goalsAgainst += them;

    if (us > them) wins++;
    else if (us < them) losses++;
    else draws++;

    // Process lineup for player stats
    if (game.lineup) {
      const playersInGame = new Set();

      ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
        const quarter = game.lineup[q];
        if (!quarter) return;

        // Track players in positions
        ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'].forEach(pos => {
          const playerName = quarter[pos];
          if (playerName) {
            if (!playerData[playerName]) {
              playerData[playerName] = { goals: 0, quarters: 0, scoringQuarters: 0, gamesPlayed: [], gameGoals: {} };
            }
            playerData[playerName].quarters++;
            playersInGame.add(playerName);

            // Track goals for GS and GA
            if (pos === 'GS' && quarter.ourGsGoals) {
              playerData[playerName].goals += quarter.ourGsGoals;
              playerData[playerName].scoringQuarters++;
              // Aggregate by game
              if (!playerData[playerName].gameGoals[game.gameID]) {
                playerData[playerName].gameGoals[game.gameID] = { round: game.round, opponent: game.opponent, gsGoals: 0, gaGoals: 0 };
              }
              playerData[playerName].gameGoals[game.gameID].gsGoals += quarter.ourGsGoals;
            }
            if (pos === 'GA' && quarter.ourGaGoals) {
              playerData[playerName].goals += quarter.ourGaGoals;
              playerData[playerName].scoringQuarters++;
              // Aggregate by game
              if (!playerData[playerName].gameGoals[game.gameID]) {
                playerData[playerName].gameGoals[game.gameID] = { round: game.round, opponent: game.opponent, gsGoals: 0, gaGoals: 0 };
              }
              playerData[playerName].gameGoals[game.gameID].gaGoals += quarter.ourGaGoals;
            }
          }
        });
      });

      // Record which games each player participated in
      playersInGame.forEach(name => {
        if (!playerData[name].gamesPlayed.includes(game.gameID)) {
          playerData[name].gamesPlayed.push(game.gameID);
        }
      });
    }
  });

  // Convert to array and sort by goals descending
  const playerStats = Object.entries(playerData)
    .map(([name, data]) => {
      // Convert gameGoals object to gameBreakdown array with totals
      const gameBreakdown = Object.values(data.gameGoals).map(g => ({
        round: g.round,
        opponent: g.opponent,
        gsGoals: g.gsGoals,
        gaGoals: g.gaGoals,
        total: g.gsGoals + g.gaGoals
      }));
      return {
        name,
        goals: data.goals,
        quarters: data.quarters,
        scoringQuarters: data.scoringQuarters,
        gamesPlayed: data.gamesPlayed,
        gameBreakdown
      };
    })
    .sort((a, b) => b.goals - a.goals);

  return {
    gameCount: games.length,
    wins,
    losses,
    draws,
    goalsFor,
    goalsAgainst,
    goalDiff: goalsFor - goalsAgainst,
    winRate: Math.round((wins / games.length) * 100),
    playerStats
  };
}

export const mockTeams = [
  {
    "teamID": "team-001",
    "year": 2025,
    "season": "Season 1",
    "teamName": "U11 Thunder",
    "players": [
      {
        "id": "p1",
        "name": "Emma Wilson",
        "fillIn": false,
        "favPosition": "GS"
      },
      {
        "id": "p2",
        "name": "Sophia Chen",
        "fillIn": false,
        "favPosition": "GA"
      },
      {
        "id": "p3",
        "name": "Olivia Taylor",
        "fillIn": false,
        "favPosition": "WA"
      },
      {
        "id": "p4",
        "name": "Ava Johnson",
        "fillIn": false,
        "favPosition": "C"
      },
      {
        "id": "p5",
        "name": "Isabella Brown",
        "fillIn": false,
        "favPosition": "WD"
      },
      {
        "id": "p6",
        "name": "Mia Davis",
        "fillIn": false,
        "favPosition": "GD"
      },
      {
        "id": "p7",
        "name": "Charlotte Miller",
        "fillIn": false,
        "favPosition": "GK"
      },
      {
        "id": "p8",
        "name": "Amelia Garcia",
        "fillIn": false,
        "favPosition": ""
      },
      {
        "id": "p9",
        "name": "Harper Martinez",
        "fillIn": false,
        "favPosition": ""
      },
      {
        "id": "p10",
        "name": "Evelyn White",
        "fillIn": true,
        "favPosition": ""
      }
    ],
    "games": [
      {
        "gameID": "g1",
        "round": 1,
        "opponent": "Lightning",
        "date": "2025-04-05",
        "time": "09:00",
        "location": "Home",
        "status": "normal",
        "scores": {
          "us": 12,
          "opponent": 8
        },
        "availablePlayerIDs": [
          "p1",
          "p2",
          "p3",
          "p4",
          "p5",
          "p6",
          "p7",
          "p8",
          "p9"
        ],
        "lineup": {
          "Q1": {
            "GS": "Emma Wilson",
            "GA": "Sophia Chen",
            "WA": "Olivia Taylor",
            "C": "Ava Johnson",
            "WD": "Isabella Brown",
            "GD": "Mia Davis",
            "GK": "Charlotte Miller",
            "ourGsGoals": 2,
            "ourGaGoals": 1,
            "opponentScore": 2
          },
          "Q2": {
            "GS": "Sophia Chen",
            "GA": "Emma Wilson",
            "WA": "Amelia Garcia",
            "C": "Harper Martinez",
            "WD": "Olivia Taylor",
            "GD": "Ava Johnson",
            "GK": "Isabella Brown",
            "ourGsGoals": 3,
            "ourGaGoals": 1,
            "opponentScore": 2
          },
          "Q3": {
            "GS": "Emma Wilson",
            "GA": "Sophia Chen",
            "WA": "Olivia Taylor",
            "C": "Ava Johnson",
            "WD": "Isabella Brown",
            "GD": "Mia Davis",
            "GK": "Charlotte Miller",
            "ourGsGoals": 2,
            "ourGaGoals": 2,
            "opponentScore": 3
          },
          "Q4": {
            "GS": "Sophia Chen",
            "GA": "Amelia Garcia",
            "WA": "Harper Martinez",
            "C": "Charlotte Miller",
            "WD": "Mia Davis",
            "GD": "Isabella Brown",
            "GK": "Ava Johnson",
            "ourGsGoals": 1,
            "ourGaGoals": 0,
            "opponentScore": 1
          }
        }
      },
      {
        "gameID": "g2",
        "round": 2,
        "opponent": "Storm",
        "date": "2025-04-12",
        "time": "10:30",
        "location": "Away",
        "status": "normal",
        "scores": {
          "us": 15,
          "opponent": 10
        },
        "availablePlayerIDs": [
          "p1",
          "p2",
          "p3",
          "p4",
          "p5",
          "p6",
          "p7",
          "p8"
        ],
        "lineup": {
          "Q1": {
            "GS": "Emma Wilson",
            "GA": "Sophia Chen",
            "WA": "Olivia Taylor",
            "C": "Ava Johnson",
            "WD": "Isabella Brown",
            "GD": "Mia Davis",
            "GK": "Charlotte Miller",
            "ourGsGoals": 4,
            "ourGaGoals": 2,
            "opponentScore": 3
          },
          "Q2": {
            "GS": "Sophia Chen",
            "GA": "Emma Wilson",
            "WA": "Amelia Garcia",
            "C": "Olivia Taylor",
            "WD": "Ava Johnson",
            "GD": "Isabella Brown",
            "GK": "Mia Davis",
            "ourGsGoals": 2,
            "ourGaGoals": 1,
            "opponentScore": 2
          },
          "Q3": {
            "GS": "Emma Wilson",
            "GA": "Sophia Chen",
            "WA": "Olivia Taylor",
            "C": "Ava Johnson",
            "WD": "Isabella Brown",
            "GD": "Mia Davis",
            "GK": "Charlotte Miller",
            "ourGsGoals": 3,
            "ourGaGoals": 1,
            "opponentScore": 3
          },
          "Q4": {
            "GS": "Sophia Chen",
            "GA": "Amelia Garcia",
            "WA": "Charlotte Miller",
            "C": "Mia Davis",
            "WD": "Isabella Brown",
            "GD": "Ava Johnson",
            "GK": "Olivia Taylor",
            "ourGsGoals": 1,
            "ourGaGoals": 1,
            "opponentScore": 2
          }
        }
      },
      {
        "gameID": "g3",
        "round": 3,
        "opponent": "Flames",
        "date": "2025-04-19",
        "time": "09:00",
        "location": "Home",
        "status": "upcoming",
        "scores": null,
        "availablePlayerIDs": [
          "p1",
          "p2",
          "p3",
          "p4",
          "p5",
          "p6",
          "p7",
          "p8",
          "p9"
        ],
        "lineup": null
      }
    ]
  },
  {
    "teamID": "team-002",
    "year": 2025,
    "season": "Season 1",
    "teamName": "U13 Lightning",
    "players": [
      {
        "id": "p1",
        "name": "Zoe Anderson",
        "fillIn": false,
        "favPosition": "GS"
      },
      {
        "id": "p2",
        "name": "Lily Thompson",
        "fillIn": false,
        "favPosition": "GA"
      },
      {
        "id": "p3",
        "name": "Grace Lee",
        "fillIn": false,
        "favPosition": "WA"
      },
      {
        "id": "p4",
        "name": "Chloe Harris",
        "fillIn": false,
        "favPosition": "C"
      },
      {
        "id": "p5",
        "name": "Ella Clark",
        "fillIn": false,
        "favPosition": "WD"
      },
      {
        "id": "p6",
        "name": "Aria Lewis",
        "fillIn": false,
        "favPosition": "GD"
      },
      {
        "id": "p7",
        "name": "Luna Walker",
        "fillIn": false,
        "favPosition": "GK"
      },
      {
        "id": "p8",
        "name": "Stella Hall",
        "fillIn": false,
        "favPosition": ""
      }
    ],
    "games": [
      {
        "gameID": "g1",
        "round": 1,
        "opponent": "Eagles",
        "date": "2025-04-05",
        "time": "11:00",
        "location": "Home",
        "status": "normal",
        "scores": {
          "us": 18,
          "opponent": 14
        },
        "availablePlayerIDs": [
          "p1",
          "p2",
          "p3",
          "p4",
          "p5",
          "p6",
          "p7",
          "p8"
        ],
        "lineup": {
          "Q1": {
            "GS": "Zoe Anderson",
            "GA": "Lily Thompson",
            "WA": "Grace Lee",
            "C": "Chloe Harris",
            "WD": "Ella Clark",
            "GD": "Aria Lewis",
            "GK": "Luna Walker",
            "ourGsGoals": 5,
            "ourGaGoals": 2,
            "opponentScore": 4
          },
          "Q2": {
            "GS": "Lily Thompson",
            "GA": "Zoe Anderson",
            "WA": "Stella Hall",
            "C": "Grace Lee",
            "WD": "Chloe Harris",
            "GD": "Ella Clark",
            "GK": "Aria Lewis",
            "ourGsGoals": 3,
            "ourGaGoals": 2,
            "opponentScore": 3
          },
          "Q3": {
            "GS": "Zoe Anderson",
            "GA": "Lily Thompson",
            "WA": "Grace Lee",
            "C": "Chloe Harris",
            "WD": "Ella Clark",
            "GD": "Aria Lewis",
            "GK": "Luna Walker",
            "ourGsGoals": 4,
            "ourGaGoals": 1,
            "opponentScore": 4
          },
          "Q4": {
            "GS": "Lily Thompson",
            "GA": "Stella Hall",
            "WA": "Luna Walker",
            "C": "Aria Lewis",
            "WD": "Ella Clark",
            "GD": "Chloe Harris",
            "GK": "Grace Lee",
            "ourGsGoals": 1,
            "ourGaGoals": 0,
            "opponentScore": 3
          }
        }
      }
    ]
  },
  {
    "teamID": "team_1769222442072",
    "year": 2026,
    "season": "Season 1",
    "teamName": "U11 Fire",
    "players": [
      {
        "id": "p1769222466720",
        "name": "Ella",
        "favPosition": "C",
        "fillIn": false
      },
      {
        "id": "p1769222474206",
        "name": "Laylah",
        "favPosition": "GS",
        "fillIn": false
      }
    ],
    "games": [
      {
        "gameID": "g1769222491409",
        "round": 1,
        "opponent": "monty",
        "date": "2026-01-23",
        "time": "09:00",
        "location": "Home",
        "status": "upcoming",
        "scores": {
          "us": 8,
          "opponent": 0
        },
        "availablePlayerIDs": [
          "p1769222466720",
          "p1769222474206"
        ],
        "lineup": {
          "Q1": {
            "GS": "Ella",
            "GA": "Laylah",
            "C": null,
            "ourGsGoals": 4,
            "ourGaGoals": 4
          }
        }
      }
    ]
  }
];
