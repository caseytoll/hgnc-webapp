import { describe, it, expect, beforeEach } from 'vitest';
import { mockTeams, calculateTeamStats } from '../../../../common/mock-data.js';

// ========================================
// MOCK DATA STRUCTURE TESTS
// ========================================

describe('mockTeams', () => {
  it('should have at least one team', () => {
    expect(mockTeams.length).toBeGreaterThan(0);
  });

  it('should have valid team structure', () => {
    mockTeams.forEach(team => {
      expect(team).toHaveProperty('teamID');
      expect(team).toHaveProperty('year');
      expect(team).toHaveProperty('season');
      expect(team).toHaveProperty('teamName');
      expect(team).toHaveProperty('players');
      expect(team).toHaveProperty('games');
      expect(Array.isArray(team.players)).toBe(true);
      expect(Array.isArray(team.games)).toBe(true);
    });
  });

  it('should have valid player structure', () => {
    mockTeams.forEach(team => {
      team.players.forEach(player => {
        expect(player).toHaveProperty('id');
        expect(player).toHaveProperty('name');
        expect(player).toHaveProperty('fillIn');
        expect(typeof player.fillIn).toBe('boolean');
      });
    });
  });

  it('should have valid game structure', () => {
    mockTeams.forEach(team => {
      team.games.forEach(game => {
        expect(game).toHaveProperty('gameID');
        expect(game).toHaveProperty('round');
        expect(game).toHaveProperty('opponent');
        expect(game).toHaveProperty('date');
        expect(game).toHaveProperty('time');
        expect(game).toHaveProperty('location');
        expect(game).toHaveProperty('status');
      });
    });
  });
});

// ========================================
// STATS CALCULATION TESTS
// ========================================

describe('calculateTeamStats', () => {
  const testTeam = {
    teamID: 'test-team',
    teamName: 'Test Team',
    players: [
      { id: 'p1', name: 'Player One', fillIn: false, favPosition: 'GS' },
      { id: 'p2', name: 'Player Two', fillIn: false, favPosition: 'GA' },
      { id: 'p3', name: 'Player Three', fillIn: false, favPosition: 'C' }
    ],
    games: [
      {
        gameID: 'g1',
        round: 1,
        opponent: 'Opponent A',
        status: 'normal',
        scores: { us: 10, opponent: 5 },
        lineup: {
          Q1: { GS: 'Player One', GA: 'Player Two', ourGsGoals: 3, ourGaGoals: 1, opponentScore: 1 },
          Q2: { GS: 'Player One', GA: 'Player Two', ourGsGoals: 2, ourGaGoals: 1, opponentScore: 2 },
          Q3: { GS: 'Player One', GA: 'Player Two', ourGsGoals: 2, ourGaGoals: 0, opponentScore: 1 },
          Q4: { GS: 'Player Two', GA: 'Player One', ourGsGoals: 1, ourGaGoals: 0, opponentScore: 1 }
        }
      },
      {
        gameID: 'g2',
        round: 2,
        opponent: 'Opponent B',
        status: 'normal',
        scores: { us: 8, opponent: 10 },
        lineup: {
          Q1: { GS: 'Player One', GA: 'Player Two', ourGsGoals: 2, ourGaGoals: 1, opponentScore: 3 },
          Q2: { GS: 'Player One', GA: 'Player Two', ourGsGoals: 1, ourGaGoals: 1, opponentScore: 2 },
          Q3: { GS: 'Player One', GA: 'Player Two', ourGsGoals: 1, ourGaGoals: 1, opponentScore: 3 },
          Q4: { GS: 'Player One', GA: 'Player Two', ourGsGoals: 0, ourGaGoals: 1, opponentScore: 2 }
        }
      }
    ]
  };

  let stats;

  beforeEach(() => {
    stats = calculateTeamStats(testTeam);
  });

  it('should calculate game count correctly', () => {
    expect(stats.gameCount).toBe(2);
  });

  it('should calculate wins/losses/draws correctly', () => {
    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(1);
    expect(stats.draws).toBe(0);
  });

  it('should calculate goals for/against correctly', () => {
    expect(stats.goalsFor).toBe(18); // 10 + 8
    expect(stats.goalsAgainst).toBe(15); // 5 + 10
  });

  it('should calculate goal difference correctly', () => {
    expect(stats.goalDiff).toBe(3); // 18 - 15
  });

  it('should calculate win rate correctly', () => {
    expect(stats.winRate).toBe(50); // 1 win out of 2 games
  });

  it('should return player stats array', () => {
    expect(Array.isArray(stats.playerStats)).toBe(true);
    expect(stats.playerStats.length).toBeGreaterThan(0);
  });

  it('should track goals per player', () => {
    const playerOne = stats.playerStats.find(p => p.name === 'Player One');
    expect(playerOne).toBeDefined();
    expect(playerOne.goals).toBeGreaterThan(0);
  });

  it('should track quarters played per player', () => {
    const playerOne = stats.playerStats.find(p => p.name === 'Player One');
    expect(playerOne.quarters).toBeGreaterThan(0);
  });

  it('should sort players by goals (descending)', () => {
    for (let i = 0; i < stats.playerStats.length - 1; i++) {
      expect(stats.playerStats[i].goals).toBeGreaterThanOrEqual(stats.playerStats[i + 1].goals);
    }
  });

  it('should track game breakdown for scorers', () => {
    const scorer = stats.playerStats.find(p => p.goals > 0);
    expect(scorer.gameBreakdown).toBeDefined();
    expect(Array.isArray(scorer.gameBreakdown)).toBe(true);
  });

  it('should track games played for each player', () => {
    const playerOne = stats.playerStats.find(p => p.name === 'Player One');
    expect(playerOne.gamesPlayed).toBeDefined();
    expect(Array.isArray(playerOne.gamesPlayed)).toBe(true);
  });
});

describe('calculateTeamStats with empty data', () => {
  it('should handle team with no games', () => {
    const emptyTeam = {
      teamID: 'empty',
      teamName: 'Empty Team',
      players: [{ id: 'p1', name: 'Player', fillIn: false }],
      games: []
    };

    const stats = calculateTeamStats(emptyTeam);

    expect(stats.gameCount).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.draws).toBe(0);
    expect(stats.goalsFor).toBe(0);
    expect(stats.goalsAgainst).toBe(0);
    expect(stats.winRate).toBe(0);
  });

  it('should handle games without lineups', () => {
    const teamWithNoLineup = {
      teamID: 'no-lineup',
      teamName: 'No Lineup Team',
      players: [{ id: 'p1', name: 'Player', fillIn: false }],
      games: [
        {
          gameID: 'g1',
          round: 1,
          opponent: 'Opp',
          status: 'normal',
          scores: { us: 5, opponent: 3 },
          lineup: null
        }
      ]
    };

    const stats = calculateTeamStats(teamWithNoLineup);

    expect(stats.gameCount).toBe(1);
    expect(stats.wins).toBe(1);
    expect(stats.goalsFor).toBe(5);
  });

  it('should handle upcoming games (no scores)', () => {
    const teamWithUpcoming = {
      teamID: 'upcoming',
      teamName: 'Upcoming Team',
      players: [{ id: 'p1', name: 'Player', fillIn: false }],
      games: [
        {
          gameID: 'g1',
          round: 1,
          opponent: 'Opp',
          status: 'upcoming',
          scores: null,
          lineup: null
        }
      ]
    };

    const stats = calculateTeamStats(teamWithUpcoming);

    expect(stats.gameCount).toBe(0); // Upcoming games shouldn't count
  });

  it('should handle draw games', () => {
    const teamWithDraw = {
      teamID: 'draw',
      teamName: 'Draw Team',
      players: [{ id: 'p1', name: 'Player', fillIn: false }],
      games: [
        {
          gameID: 'g1',
          round: 1,
          opponent: 'Opp',
          status: 'normal',
          scores: { us: 5, opponent: 5 },
          lineup: null
        }
      ]
    };

    const stats = calculateTeamStats(teamWithDraw);

    expect(stats.draws).toBe(1);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
  });
});

describe('calculateTeamStats with real mock data', () => {
  it('should calculate stats for all mock teams without errors', () => {
    mockTeams.forEach(team => {
      const stats = calculateTeamStats(team);

      expect(stats).toHaveProperty('gameCount');
      expect(stats).toHaveProperty('wins');
      expect(stats).toHaveProperty('losses');
      expect(stats).toHaveProperty('draws');
      expect(stats).toHaveProperty('goalsFor');
      expect(stats).toHaveProperty('goalsAgainst');
      expect(stats).toHaveProperty('goalDiff');
      expect(stats).toHaveProperty('winRate');
      expect(stats).toHaveProperty('playerStats');

      // Verify data consistency
      expect(stats.wins + stats.losses + stats.draws).toBe(stats.gameCount);
      expect(stats.goalDiff).toBe(stats.goalsFor - stats.goalsAgainst);
    });
  });
});
