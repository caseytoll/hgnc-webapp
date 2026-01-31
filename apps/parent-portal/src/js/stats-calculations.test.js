import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateAdvancedStats,
  calculateLeaderboards,
  calculateCombinations,
  calculateAllAnalytics
} from '../../../../common/stats-calculations.js';

// ========================================
// TEST DATA FIXTURES
// ========================================

const createTestTeam = (overrides = {}) => ({
  teamID: 'test-team',
  teamName: 'Test Team',
  players: [
    { id: 'p1', name: 'Player One', fillIn: false, favPosition: 'GS' },
    { id: 'p2', name: 'Player Two', fillIn: false, favPosition: 'GA' },
    { id: 'p3', name: 'Player Three', fillIn: false, favPosition: 'WA' },
    { id: 'p4', name: 'Player Four', fillIn: false, favPosition: 'C' },
    { id: 'p5', name: 'Player Five', fillIn: false, favPosition: 'WD' },
    { id: 'p6', name: 'Player Six', fillIn: false, favPosition: 'GD' },
    { id: 'p7', name: 'Player Seven', fillIn: false, favPosition: 'GK' }
  ],
  games: [
    {
      gameID: 'g1',
      round: 1,
      opponent: 'Team A',
      status: 'normal',
      scores: { us: 12, opponent: 8 },
      lineup: {
        Q1: { GS: 'Player One', GA: 'Player Two', WA: 'Player Three', C: 'Player Four', WD: 'Player Five', GD: 'Player Six', GK: 'Player Seven', ourGsGoals: 3, ourGaGoals: 1, oppGsGoals: 1, oppGaGoals: 1 },
        Q2: { GS: 'Player One', GA: 'Player Two', WA: 'Player Three', C: 'Player Four', WD: 'Player Five', GD: 'Player Six', GK: 'Player Seven', ourGsGoals: 2, ourGaGoals: 2, oppGsGoals: 1, oppGaGoals: 1 },
        Q3: { GS: 'Player Two', GA: 'Player One', WA: 'Player Three', C: 'Player Four', WD: 'Player Five', GD: 'Player Six', GK: 'Player Seven', ourGsGoals: 2, ourGaGoals: 1, oppGsGoals: 1, oppGaGoals: 1 },
        Q4: { GS: 'Player One', GA: 'Player Two', WA: 'Player Three', C: 'Player Four', WD: 'Player Five', GD: 'Player Six', GK: 'Player Seven', ourGsGoals: 1, ourGaGoals: 0, oppGsGoals: 1, oppGaGoals: 1 }
      }
    },
    {
      gameID: 'g2',
      round: 2,
      opponent: 'Team B',
      status: 'normal',
      scores: { us: 10, opponent: 12 },
      lineup: {
        Q1: { GS: 'Player One', GA: 'Player Two', WA: 'Player Three', C: 'Player Four', WD: 'Player Five', GD: 'Player Six', GK: 'Player Seven', ourGsGoals: 2, ourGaGoals: 1, oppGsGoals: 2, oppGaGoals: 1 },
        Q2: { GS: 'Player Two', GA: 'Player One', WA: 'Player Three', C: 'Player Four', WD: 'Player Five', GD: 'Player Six', GK: 'Player Seven', ourGsGoals: 3, ourGaGoals: 1, oppGsGoals: 2, oppGaGoals: 2 },
        Q3: { GS: 'Player One', GA: 'Player Two', WA: 'Player Three', C: 'Player Four', WD: 'Player Five', GD: 'Player Six', GK: 'Player Seven', ourGsGoals: 1, ourGaGoals: 1, oppGsGoals: 1, oppGaGoals: 1 },
        Q4: { GS: 'Player One', GA: 'Player Two', WA: 'Player Three', C: 'Player Four', WD: 'Player Five', GD: 'Player Six', GK: 'Player Seven', ourGsGoals: 1, ourGaGoals: 0, oppGsGoals: 2, oppGaGoals: 1 }
      }
    },
    {
      gameID: 'g3',
      round: 3,
      opponent: 'Team C',
      status: 'upcoming',
      scores: null,
      lineup: null
    }
  ],
  ...overrides
});

// ========================================
// CALCULATE ADVANCED STATS TESTS
// ========================================

describe('calculateAdvancedStats', () => {
  describe('basic calculations', () => {
    it('should calculate game count correctly', () => {
      const team = createTestTeam();
      const stats = calculateAdvancedStats(team);
      expect(stats.gameCount).toBe(2); // Excludes upcoming game
    });

    it('should calculate wins, losses, draws correctly', () => {
      const team = createTestTeam();
      const stats = calculateAdvancedStats(team);
      expect(stats.wins).toBe(1);
      expect(stats.losses).toBe(1);
      expect(stats.draws).toBe(0);
    });

    it('should calculate goals correctly', () => {
      const team = createTestTeam();
      const stats = calculateAdvancedStats(team);
      expect(stats.goalsFor).toBe(22); // 12 + 10
      expect(stats.goalsAgainst).toBe(20); // 8 + 12
      expect(stats.goalDiff).toBe(2);
    });

    it('should calculate win rate correctly', () => {
      const team = createTestTeam();
      const stats = calculateAdvancedStats(team);
      expect(stats.winRate).toBe(50);
    });

    it('should calculate averages correctly', () => {
      const team = createTestTeam();
      const stats = calculateAdvancedStats(team);
      expect(stats.avgFor).toBe(11); // 22/2
      expect(stats.avgAgainst).toBe(10); // 20/2
    });
  });

  describe('form calculation', () => {
    it('should return last 5 games form (most recent first)', () => {
      const team = createTestTeam();
      const stats = calculateAdvancedStats(team);
      expect(stats.form).toEqual(['L', 'W']); // Round 2 loss, Round 1 win
    });

    it('should handle team with fewer than 5 games', () => {
      const team = createTestTeam();
      const stats = calculateAdvancedStats(team);
      expect(stats.form.length).toBeLessThanOrEqual(5);
    });
  });

  describe('quarter stats calculation', () => {
    it('should track goals per quarter', () => {
      const team = createTestTeam();
      const stats = calculateAdvancedStats(team);

      expect(stats.quarterStats.Q1.for).toBe(7); // (3+1) + (2+1)
      expect(stats.quarterStats.Q1.against).toBe(5); // 2 + 3
    });

    it('should identify best quarter', () => {
      const team = createTestTeam();
      const stats = calculateAdvancedStats(team);
      expect(stats.bestQuarter).toBeDefined();
      expect(['Q1', 'Q2', 'Q3', 'Q4']).toContain(stats.bestQuarter);
    });
  });

  describe('game results tracking', () => {
    it('should track individual game results', () => {
      const team = createTestTeam();
      const stats = calculateAdvancedStats(team);

      expect(stats.gameResults.length).toBe(2);
      expect(stats.gameResults[0]).toMatchObject({
        round: 1,
        opponent: 'Team A',
        result: 'W'
      });
    });
  });

  describe('edge cases', () => {
    it('should handle team with no games', () => {
      const team = createTestTeam({ games: [] });
      const stats = calculateAdvancedStats(team);

      expect(stats.gameCount).toBe(0);
      expect(stats.wins).toBe(0);
      expect(stats.winRate).toBe(0);
      expect(stats.form).toEqual([]);
      expect(stats.bestQuarter).toBeNull();
    });

    it('should handle team with only upcoming games', () => {
      const team = createTestTeam({
        games: [{
          gameID: 'g1',
          round: 1,
          opponent: 'Team A',
          status: 'upcoming',
          scores: null,
          lineup: null
        }]
      });
      const stats = calculateAdvancedStats(team);

      expect(stats.gameCount).toBe(0);
    });

    it('should handle games without lineup data', () => {
      const team = createTestTeam({
        games: [{
          gameID: 'g1',
          round: 1,
          opponent: 'Team A',
          status: 'normal',
          scores: { us: 10, opponent: 8 },
          lineup: null
        }]
      });
      const stats = calculateAdvancedStats(team);

      expect(stats.gameCount).toBe(1);
      expect(stats.wins).toBe(1);
      expect(stats.bestQuarter).toBeNull(); // No lineup to analyze
    });

    it('should handle draw games', () => {
      const team = createTestTeam({
        games: [{
          gameID: 'g1',
          round: 1,
          opponent: 'Team A',
          status: 'normal',
          scores: { us: 10, opponent: 10 },
          lineup: null
        }]
      });
      const stats = calculateAdvancedStats(team);

      expect(stats.draws).toBe(1);
      expect(stats.form).toEqual(['D']);
    });
  });
});

// ========================================
// CALCULATE LEADERBOARDS TESTS
// ========================================

describe('calculateLeaderboards', () => {
  describe('offensive leaderboards', () => {
    it('should track top scorers by total', () => {
      const team = createTestTeam();
      const leaderboards = calculateLeaderboards(team);

      expect(leaderboards.offensive.topScorersByTotal.length).toBeGreaterThan(0);
      expect(leaderboards.offensive.topScorersByTotal[0]).toHaveProperty('name');
      expect(leaderboards.offensive.topScorersByTotal[0]).toHaveProperty('goals');
      expect(leaderboards.offensive.topScorersByTotal[0]).toHaveProperty('quarters');
      expect(leaderboards.offensive.topScorersByTotal[0]).toHaveProperty('avg');
    });

    it('should sort scorers by total goals (highest first)', () => {
      const team = createTestTeam();
      const leaderboards = calculateLeaderboards(team);
      const scorers = leaderboards.offensive.topScorersByTotal;

      for (let i = 0; i < scorers.length - 1; i++) {
        expect(scorers[i].goals).toBeGreaterThanOrEqual(scorers[i + 1].goals);
      }
    });

    it('should track scoring pairs', () => {
      const team = createTestTeam();
      const leaderboards = calculateLeaderboards(team);

      expect(leaderboards.offensive.topScoringPairsByTotal.length).toBeGreaterThan(0);
      expect(leaderboards.offensive.topScoringPairsByTotal[0]).toHaveProperty('players');
      expect(leaderboards.offensive.topScoringPairsByTotal[0].players).toHaveLength(2);
    });

    it('should filter by minimum quarters for efficiency rankings', () => {
      const team = createTestTeam();
      const leaderboards = calculateLeaderboards(team);

      leaderboards.offensive.topScorersByEfficiency.forEach(scorer => {
        expect(scorer.quarters).toBeGreaterThanOrEqual(leaderboards.minQuarters);
      });
    });
  });

  describe('defensive leaderboards', () => {
    it('should track top defenders', () => {
      const team = createTestTeam();
      const leaderboards = calculateLeaderboards(team);

      // May be empty if no defenders meet minimum quarters
      if (leaderboards.defensive.topDefenders.length > 0) {
        expect(leaderboards.defensive.topDefenders[0]).toHaveProperty('name');
        expect(leaderboards.defensive.topDefenders[0]).toHaveProperty('goalsAgainst');
        expect(leaderboards.defensive.topDefenders[0]).toHaveProperty('avg');
      }
    });

    it('should sort defenders by efficiency (lowest GA/quarter first)', () => {
      const team = createTestTeam();
      const leaderboards = calculateLeaderboards(team);
      const defenders = leaderboards.defensive.topDefenders;

      for (let i = 0; i < defenders.length - 1; i++) {
        expect(defenders[i].avg).toBeLessThanOrEqual(defenders[i + 1].avg);
      }
    });

    it('should track defensive pairs', () => {
      const team = createTestTeam();
      const leaderboards = calculateLeaderboards(team);

      if (leaderboards.defensive.topDefensivePairs.length > 0) {
        expect(leaderboards.defensive.topDefensivePairs[0]).toHaveProperty('players');
        expect(leaderboards.defensive.topDefensivePairs[0].players).toHaveLength(2);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle team with no completed games', () => {
      const team = createTestTeam({ games: [] });
      const leaderboards = calculateLeaderboards(team);

      expect(leaderboards.offensive.topScorersByTotal).toEqual([]);
      expect(leaderboards.defensive.topDefenders).toEqual([]);
    });

    it('should handle games without lineup', () => {
      const team = createTestTeam({
        games: [{
          gameID: 'g1',
          round: 1,
          opponent: 'Team A',
          status: 'normal',
          scores: { us: 10, opponent: 8 },
          lineup: null
        }]
      });
      const leaderboards = calculateLeaderboards(team);

      expect(leaderboards.offensive.topScorersByTotal).toEqual([]);
    });
  });
});

// ========================================
// CALCULATE COMBINATIONS TESTS
// ========================================

describe('calculateCombinations', () => {
  describe('attacking units', () => {
    it('should track 4-player attacking combinations', () => {
      const team = createTestTeam();
      const combos = calculateCombinations(team);

      // May be empty if no units meet minimum quarters
      if (combos.attackingUnits.length > 0) {
        expect(combos.attackingUnits[0]).toHaveProperty('players');
        expect(combos.attackingUnits[0].players).toHaveProperty('GS');
        expect(combos.attackingUnits[0].players).toHaveProperty('GA');
        expect(combos.attackingUnits[0].players).toHaveProperty('WA');
        expect(combos.attackingUnits[0].players).toHaveProperty('C');
      }
    });

    it('should calculate goals and plus/minus for units', () => {
      const team = createTestTeam();
      const combos = calculateCombinations(team);

      if (combos.attackingUnits.length > 0) {
        expect(combos.attackingUnits[0]).toHaveProperty('goalsFor');
        expect(combos.attackingUnits[0]).toHaveProperty('avgFor');
        expect(combos.attackingUnits[0]).toHaveProperty('plusMinus');
      }
    });

    it('should sort attacking units by goals per quarter (highest first)', () => {
      const team = createTestTeam();
      const combos = calculateCombinations(team);
      const units = combos.attackingUnits;

      for (let i = 0; i < units.length - 1; i++) {
        expect(units[i].avgFor).toBeGreaterThanOrEqual(units[i + 1].avgFor);
      }
    });
  });

  describe('defensive units', () => {
    it('should track 4-player defensive combinations', () => {
      const team = createTestTeam();
      const combos = calculateCombinations(team);

      if (combos.defensiveUnits.length > 0) {
        expect(combos.defensiveUnits[0]).toHaveProperty('players');
        expect(combos.defensiveUnits[0].players).toHaveProperty('GK');
        expect(combos.defensiveUnits[0].players).toHaveProperty('GD');
        expect(combos.defensiveUnits[0].players).toHaveProperty('WD');
        expect(combos.defensiveUnits[0].players).toHaveProperty('C');
      }
    });

    it('should sort defensive units by goals against (lowest first)', () => {
      const team = createTestTeam();
      const combos = calculateCombinations(team);
      const units = combos.defensiveUnits;

      for (let i = 0; i < units.length - 1; i++) {
        expect(units[i].avgAgainst).toBeLessThanOrEqual(units[i + 1].avgAgainst);
      }
    });
  });

  describe('position pairings', () => {
    it('should track offensive pairings (GS-GA, GA-WA, WA-C)', () => {
      const team = createTestTeam();
      const combos = calculateCombinations(team);

      if (combos.pairings.offensive.length > 0) {
        expect(combos.pairings.offensive[0]).toHaveProperty('positions');
        expect(combos.pairings.offensive[0]).toHaveProperty('players');
        expect(combos.pairings.offensive[0].players).toHaveLength(2);
      }
    });

    it('should track defensive pairings (GK-GD, GD-WD, WD-C)', () => {
      const team = createTestTeam();
      const combos = calculateCombinations(team);

      if (combos.pairings.defensive.length > 0) {
        expect(combos.pairings.defensive[0]).toHaveProperty('positions');
        expect(combos.pairings.defensive[0]).toHaveProperty('avgAgainst');
      }
    });

    it('should track transition pairings (WD-WA)', () => {
      const team = createTestTeam();
      const combos = calculateCombinations(team);

      if (combos.pairings.transition.length > 0) {
        expect(combos.pairings.transition[0].positions).toBe('WD-WA');
      }
    });
  });

  describe('filtering', () => {
    it('should filter by minimum quarters', () => {
      const team = createTestTeam();
      const combos = calculateCombinations(team);

      combos.attackingUnits.forEach(unit => {
        expect(unit.quarters).toBeGreaterThanOrEqual(combos.minQuarters);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle team with no games', () => {
      const team = createTestTeam({ games: [] });
      const combos = calculateCombinations(team);

      expect(combos.attackingUnits).toEqual([]);
      expect(combos.defensiveUnits).toEqual([]);
    });

    it('should handle incomplete lineups', () => {
      const team = createTestTeam({
        games: [{
          gameID: 'g1',
          round: 1,
          opponent: 'Team A',
          status: 'normal',
          scores: { us: 10, opponent: 8 },
          lineup: {
            Q1: { GS: 'Player One', GA: 'Player Two', ourGsGoals: 3, ourGaGoals: 2, opponentScore: 2 }
            // Missing other positions and quarters
          }
        }]
      });
      const combos = calculateCombinations(team);

      // Should not crash, units may be empty due to missing positions
      expect(combos.attackingUnits).toBeDefined();
    });
  });
});

// ========================================
// CALCULATE ALL ANALYTICS TESTS
// ========================================

describe('calculateAllAnalytics', () => {
  it('should return combined analytics object', () => {
    const team = createTestTeam();
    const analytics = calculateAllAnalytics(team);

    expect(analytics).toHaveProperty('advanced');
    expect(analytics).toHaveProperty('leaderboards');
    expect(analytics).toHaveProperty('combinations');
  });

  it('should have consistent data across all calculations', () => {
    const team = createTestTeam();
    const analytics = calculateAllAnalytics(team);

    // Game count should be same
    expect(analytics.advanced.gameCount).toBe(2);
  });

  it('should handle empty team gracefully', () => {
    const team = createTestTeam({ games: [] });
    const analytics = calculateAllAnalytics(team);

    expect(analytics.advanced.gameCount).toBe(0);
    expect(analytics.leaderboards.offensive.topScorersByTotal).toEqual([]);
    expect(analytics.combinations.attackingUnits).toEqual([]);
  });
});

// ========================================
// ADDITIONAL EDGE CASE TESTS
// ========================================

describe('edge cases - comprehensive', () => {
  it('should handle single game correctly', () => {
    const team = createTestTeam({
      games: [{
        gameID: 'g1',
        round: 1,
        opponent: 'Team A',
        status: 'normal',
        scores: { us: 10, opponent: 8 },
        lineup: {
          Q1: { GS: 'Player One', GA: 'Player Two', WA: 'Player Three', C: 'Player Four', WD: 'Player Five', GD: 'Player Six', GK: 'Player Seven', ourGsGoals: 3, ourGaGoals: 2, opponentScore: 2 },
          Q2: { GS: 'Player One', GA: 'Player Two', WA: 'Player Three', C: 'Player Four', WD: 'Player Five', GD: 'Player Six', GK: 'Player Seven', ourGsGoals: 2, ourGaGoals: 1, opponentScore: 2 },
          Q3: { GS: 'Player One', GA: 'Player Two', WA: 'Player Three', C: 'Player Four', WD: 'Player Five', GD: 'Player Six', GK: 'Player Seven', ourGsGoals: 1, ourGaGoals: 1, opponentScore: 2 },
          Q4: { GS: 'Player One', GA: 'Player Two', WA: 'Player Three', C: 'Player Four', WD: 'Player Five', GD: 'Player Six', GK: 'Player Seven', ourGsGoals: 0, ourGaGoals: 0, opponentScore: 2 }
        }
      }]
    });

    const stats = calculateAdvancedStats(team);
    expect(stats.gameCount).toBe(1);
    expect(stats.winRate).toBe(100);
    expect(stats.form).toEqual(['W']);
  });

  it('should handle zero goals correctly', () => {
    const team = createTestTeam({
      games: [{
        gameID: 'g1',
        round: 1,
        opponent: 'Team A',
        status: 'normal',
        scores: { us: 0, opponent: 5 },
        lineup: {
          Q1: { GS: 'Player One', GA: 'Player Two', WA: 'Player Three', C: 'Player Four', WD: 'Player Five', GD: 'Player Six', GK: 'Player Seven', ourGsGoals: 0, ourGaGoals: 0, opponentScore: 2 },
          Q2: { GS: 'Player One', GA: 'Player Two', WA: 'Player Three', C: 'Player Four', WD: 'Player Five', GD: 'Player Six', GK: 'Player Seven', ourGsGoals: 0, ourGaGoals: 0, opponentScore: 3 },
          Q3: { GS: 'Player One', GA: 'Player Two', WA: 'Player Three', C: 'Player Four', WD: 'Player Five', GD: 'Player Six', GK: 'Player Seven', ourGsGoals: 0, ourGaGoals: 0, opponentScore: 0 },
          Q4: { GS: 'Player One', GA: 'Player Two', WA: 'Player Three', C: 'Player Four', WD: 'Player Five', GD: 'Player Six', GK: 'Player Seven', ourGsGoals: 0, ourGaGoals: 0, opponentScore: 0 }
        }
      }]
    });

    const stats = calculateAdvancedStats(team);
    expect(stats.goalsFor).toBe(0);
    expect(stats.avgFor).toBe(0);
    expect(stats.losses).toBe(1);

    const leaderboards = calculateLeaderboards(team);
    // Scorers should have 0 goals
    leaderboards.offensive.topScorersByTotal.forEach(scorer => {
      expect(scorer.goals).toBe(0);
    });
  });

  it('should handle player rotation correctly', () => {
    const team = createTestTeam({
      games: [{
        gameID: 'g1',
        round: 1,
        opponent: 'Team A',
        status: 'normal',
        scores: { us: 10, opponent: 8 },
        lineup: {
          Q1: { GS: 'Player One', GA: 'Player Two', WA: 'Player Three', C: 'Player Four', WD: 'Player Five', GD: 'Player Six', GK: 'Player Seven', ourGsGoals: 3, ourGaGoals: 1, opponentScore: 2 },
          Q2: { GS: 'Player Two', GA: 'Player Three', WA: 'Player Four', C: 'Player Five', WD: 'Player Six', GD: 'Player Seven', GK: 'Player One', ourGsGoals: 2, ourGaGoals: 1, opponentScore: 2 },
          Q3: { GS: 'Player Three', GA: 'Player Four', WA: 'Player Five', C: 'Player Six', WD: 'Player Seven', GD: 'Player One', GK: 'Player Two', ourGsGoals: 1, ourGaGoals: 1, opponentScore: 2 },
          Q4: { GS: 'Player Four', GA: 'Player Five', WA: 'Player Six', C: 'Player Seven', WD: 'Player One', GD: 'Player Two', GK: 'Player Three', ourGsGoals: 1, ourGaGoals: 0, opponentScore: 2 }
        }
      }]
    });

    const leaderboards = calculateLeaderboards(team);
    // Multiple players should have scored
    const playersWithGoals = leaderboards.offensive.topScorersByTotal.filter(s => s.goals > 0);
    expect(playersWithGoals.length).toBeGreaterThan(1);
  });
});
