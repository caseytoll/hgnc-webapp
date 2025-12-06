/**
 * Unit Tests for Core Logic Functions
 * 
 * Tests isolated functions from js-core-logic.html without requiring full browser environment
 */

const { JSDOM } = require('jsdom');

// Mock DOM environment
const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
global.window = dom.window;
global.document = dom.window.document;

// Test helper functions
function assertEquals(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
  }
}

function assertTrue(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertFalse(condition, message) {
  if (condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Test Suite: Date/Time Functions
describe('isGameInPast', () => {
  // Function to test (extracted from js-core-logic.html)
  function isGameInPast(game) {
    if (!game || !game.date) return false;
    
    // Fast path: If game has quarter data entered, it's been played
    if (game.quarters && game.quarters.length > 0) {
      for (var i = 0; i < game.quarters.length; i++) {
        var q = game.quarters[i];
        if ((q.ourGsGoals > 0) || (q.ourGaGoals > 0) || 
            (q.opponentGsGoals > 0) || (q.opponentGaGoals > 0)) {
          return true;
        }
      }
    }
    
    // Parse date
    try {
      var dateParts = game.date.split('-');
      if (dateParts.length !== 3) return false;
      
      var gameDate = new Date(
        parseInt(dateParts[0], 10),
        parseInt(dateParts[1], 10) - 1,
        parseInt(dateParts[2], 10)
      );
      
      if (game.time) {
        var timeParts = game.time.split(':');
        if (timeParts.length === 2) {
          gameDate.setHours(parseInt(timeParts[0], 10));
          gameDate.setMinutes(parseInt(timeParts[1], 10));
        } else {
          gameDate.setHours(23, 59, 59, 999);
        }
      } else {
        gameDate.setHours(23, 59, 59, 999);
      }
      
      var now = new Date();
      return gameDate < now;
    } catch (e) {
      console.error('Error parsing game date:', e);
      return false;
    }
  }

  test('returns false for game without date', () => {
    const game = {};
    assertFalse(isGameInPast(game), 'Game without date should return false');
  });

  test('returns true for game with quarter data', () => {
    const game = {
      date: '2025-12-20',  // Future date
      quarters: [
        { ourGsGoals: 5, ourGaGoals: 3, opponentGsGoals: 4, opponentGaGoals: 2 }
      ]
    };
    assertTrue(isGameInPast(game), 'Game with quarter data should be considered played');
  });

  test('returns true for past game', () => {
    const game = {
      date: '2020-01-01',
      time: '10:00'
    };
    assertTrue(isGameInPast(game), 'Game in 2020 should be in the past');
  });

  test('returns false for future game', () => {
    const game = {
      date: '2030-12-31',
      time: '23:59'
    };
    assertFalse(isGameInPast(game), 'Game in 2030 should be in the future');
  });

  test('handles game without time', () => {
    const game = {
      date: '2020-06-15'
    };
    assertTrue(isGameInPast(game), 'Past date without time should be in the past');
  });

  test('returns false for invalid date format', () => {
    const game = {
      date: 'invalid-date'
    };
    assertFalse(isGameInPast(game), 'Invalid date should return false');
  });
});

// Test Suite: Array Helper Functions
describe('arrayFind', () => {
  function arrayFind(array, predicate) {
    for (var i = 0; i < array.length; i++) {
      if (predicate(array[i])) {
        return array[i];
      }
    }
    return null;
  }

  test('finds element when predicate matches', () => {
    const arr = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
    const result = arrayFind(arr, item => item.id === 2);
    assertEquals(result, { id: 2, name: 'Bob' }, 'Should find Bob');
  });

  test('returns null when no match', () => {
    const arr = [{ id: 1, name: 'Alice' }];
    const result = arrayFind(arr, item => item.id === 999);
    assertEquals(result, null, 'Should return null when not found');
  });

  test('returns first match when multiple exist', () => {
    const arr = [{ id: 1, value: 'A' }, { id: 1, value: 'B' }];
    const result = arrayFind(arr, item => item.id === 1);
    assertEquals(result, { id: 1, value: 'A' }, 'Should return first match');
  });
});

// Test Suite: Player Creation
describe('createPlayer', () => {
  function createPlayer(name) {
    return {
      id: 'player-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      name: name,
      favoritePosition: null,
      gameStats: []
    };
  }

  test('creates player with name', () => {
    const player = createPlayer('Test Player');
    assertEquals(player.name, 'Test Player', 'Player should have correct name');
    assertTrue(player.id.startsWith('player-'), 'Player should have ID prefix');
    assertEquals(player.favoritePosition, null, 'Default position should be null');
    assertEquals(player.gameStats, [], 'Game stats should be empty array');
  });

  test('creates unique IDs', () => {
    const player1 = createPlayer('Player 1');
    const player2 = createPlayer('Player 2');
    assertTrue(player1.id !== player2.id, 'Player IDs should be unique');
  });
});

// Runner
function describe(suiteName, fn) {
  console.log(`\n📦 ${suiteName}`);
  fn();
}

function test(testName, fn) {
  try {
    fn();
    console.log(`  ✅ ${testName}`);
  } catch (error) {
    console.log(`  ❌ ${testName}`);
    console.log(`     ${error.message}`);
    process.exitCode = 1;
  }
}

// Run all tests
console.log('🧪 Running Unit Tests\n');
console.log('════════════════════════════════════════');

// Execute test suites
describe('isGameInPast', () => {
  test('returns false for game without date', () => {
    const game = {};
    assertFalse(isGameInPast(game), 'Game without date should return false');
  });

  test('returns true for game with quarter data', () => {
    const game = {
      date: '2025-12-20',
      quarters: [
        { ourGsGoals: 5, ourGaGoals: 3, opponentGsGoals: 4, opponentGaGoals: 2 }
      ]
    };
    assertTrue(isGameInPast(game), 'Game with quarter data should be considered played');
  });

  test('returns true for past game', () => {
    const game = {
      date: '2020-01-01',
      time: '10:00'
    };
    assertTrue(isGameInPast(game), 'Game in 2020 should be in the past');
  });

  test('returns false for future game', () => {
    const game = {
      date: '2030-12-31',
      time: '23:59'
    };
    assertFalse(isGameInPast(game), 'Game in 2030 should be in the future');
  });
});

// Function implementations
function isGameInPast(game) {
  if (!game || !game.date) return false;
  
  if (game.quarters && game.quarters.length > 0) {
    for (var i = 0; i < game.quarters.length; i++) {
      var q = game.quarters[i];
      if ((q.ourGsGoals > 0) || (q.ourGaGoals > 0) || 
          (q.opponentGsGoals > 0) || (q.opponentGaGoals > 0)) {
        return true;
      }
    }
  }
  
  try {
    var dateParts = game.date.split('-');
    if (dateParts.length !== 3) return false;
    
    var gameDate = new Date(
      parseInt(dateParts[0], 10),
      parseInt(dateParts[1], 10) - 1,
      parseInt(dateParts[2], 10)
    );
    
    if (game.time) {
      var timeParts = game.time.split(':');
      if (timeParts.length === 2) {
        gameDate.setHours(parseInt(timeParts[0], 10));
        gameDate.setMinutes(parseInt(timeParts[1], 10));
      } else {
        gameDate.setHours(23, 59, 59, 999);
      }
    } else {
      gameDate.setHours(23, 59, 59, 999);
    }
    
    var now = new Date();
    return gameDate < now;
  } catch (e) {
    console.error('Error parsing game date:', e);
    return false;
  }
}

console.log('\n════════════════════════════════════════');
if (process.exitCode === 1) {
  console.log('❌ Some tests failed\n');
} else {
  console.log('✅ All tests passed!\n');
}
