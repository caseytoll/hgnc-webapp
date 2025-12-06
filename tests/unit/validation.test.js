/**
 * Unit Tests for Validation Functions
 */

const { JSDOM } = require('jsdom');

const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
global.window = dom.window;
global.document = dom.window.document;

// Test helpers
function assertEquals(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
  }
}

function assertTrue(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertFalse(condition, message) {
  if (condition) throw new Error(`Assertion failed: ${message}`);
}

// Validation functions to test
function isValidEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPlayerName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= 100;
}

function isValidTeamName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= 100;
}

function isValidDate(dateStr) {
  if (!dateStr) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function isValidTime(timeStr) {
  if (!timeStr) return true; // Time is optional
  const regex = /^\d{2}:\d{2}$/;
  if (!regex.test(timeStr)) return false;
  
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function isValidScore(score) {
  if (score === null || score === undefined || score === '') return true; // Optional
  const num = Number(score);
  return !isNaN(num) && num >= 0 && num <= 999 && Number.isInteger(num);
}

// Test runner
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

// Run tests
console.log('🧪 Running Validation Tests\n');
console.log('════════════════════════════════════════');

describe('isValidEmail', () => {
  test('accepts valid email', () => {
    assertTrue(isValidEmail('test@example.com'), 'Should accept valid email');
  });

  test('rejects email without @', () => {
    assertFalse(isValidEmail('testexample.com'), 'Should reject email without @');
  });

  test('rejects email without domain', () => {
    assertFalse(isValidEmail('test@'), 'Should reject email without domain');
  });

  test('rejects empty string', () => {
    assertFalse(isValidEmail(''), 'Should reject empty string');
  });

  test('rejects null', () => {
    assertFalse(isValidEmail(null), 'Should reject null');
  });
});

describe('isValidPlayerName', () => {
  test('accepts valid name', () => {
    assertTrue(isValidPlayerName('John Doe'), 'Should accept valid name');
  });

  test('accepts name with special characters', () => {
    assertTrue(isValidPlayerName("O'Connor"), 'Should accept name with apostrophe');
  });

  test('rejects empty string', () => {
    assertFalse(isValidPlayerName(''), 'Should reject empty string');
  });

  test('rejects whitespace only', () => {
    assertFalse(isValidPlayerName('   '), 'Should reject whitespace only');
  });

  test('rejects null', () => {
    assertFalse(isValidPlayerName(null), 'Should reject null');
  });

  test('rejects overly long name', () => {
    const longName = 'A'.repeat(101);
    assertFalse(isValidPlayerName(longName), 'Should reject name over 100 chars');
  });
});

describe('isValidDate', () => {
  test('accepts valid date', () => {
    assertTrue(isValidDate('2025-12-07'), 'Should accept valid date');
  });

  test('rejects invalid format', () => {
    assertFalse(isValidDate('12/07/2025'), 'Should reject MM/DD/YYYY format');
  });

  test('rejects invalid date', () => {
    assertFalse(isValidDate('2025-13-45'), 'Should reject invalid month/day');
  });

  test('rejects empty string', () => {
    assertFalse(isValidDate(''), 'Should reject empty string');
  });
});

describe('isValidTime', () => {
  test('accepts valid time', () => {
    assertTrue(isValidTime('14:30'), 'Should accept valid time');
  });

  test('accepts midnight', () => {
    assertTrue(isValidTime('00:00'), 'Should accept midnight');
  });

  test('accepts end of day', () => {
    assertTrue(isValidTime('23:59'), 'Should accept 23:59');
  });

  test('rejects invalid hour', () => {
    assertFalse(isValidTime('24:00'), 'Should reject hour 24');
  });

  test('rejects invalid minute', () => {
    assertFalse(isValidTime('12:60'), 'Should reject minute 60');
  });

  test('accepts empty (optional)', () => {
    assertTrue(isValidTime(''), 'Should accept empty time (optional)');
  });
});

describe('isValidScore', () => {
  test('accepts valid score', () => {
    assertTrue(isValidScore(15), 'Should accept valid score');
  });

  test('accepts zero', () => {
    assertTrue(isValidScore(0), 'Should accept zero');
  });

  test('rejects negative score', () => {
    assertFalse(isValidScore(-5), 'Should reject negative score');
  });

  test('rejects decimal score', () => {
    assertFalse(isValidScore(15.5), 'Should reject decimal score');
  });

  test('accepts empty (optional)', () => {
    assertTrue(isValidScore(''), 'Should accept empty score');
  });

  test('rejects overly large score', () => {
    assertFalse(isValidScore(1000), 'Should reject score over 999');
  });
});

console.log('\n════════════════════════════════════════');
if (process.exitCode === 1) {
  console.log('❌ Some tests failed\n');
} else {
  console.log('✅ All tests passed!\n');
}
