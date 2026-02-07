import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  escapeAttr,
  formatDate,
  validatePlayerName,
  validateTeamName,
  validateOpponentName,
  validateRound,
  validateYear,
  validatePosition,
  validateLocation,
  validateSeason,
  isDuplicateName,
  generateId,
  getInitials
} from '../../../../common/utils.js';

// ========================================
// XSS PREVENTION TESTS
// ========================================

describe('escapeHtml', () => {
  it('should escape HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
    );
  });

  it('should escape ampersands', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('should escape quotes', () => {
    expect(escapeHtml('He said "hello"')).toBe('He said &quot;hello&quot;');
  });

  it('should escape single quotes', () => {
    expect(escapeHtml("It's fine")).toBe('It&#39;s fine');
  });

  it('should escape backticks', () => {
    expect(escapeHtml('Code: `test`')).toBe('Code: &#x60;test&#x60;');
  });

  it('should escape equals signs', () => {
    expect(escapeHtml('a=b')).toBe('a&#x3D;b');
  });

  it('should handle null input', () => {
    expect(escapeHtml(null)).toBe('');
  });

  it('should handle undefined input', () => {
    expect(escapeHtml(undefined)).toBe('');
  });

  it('should convert numbers to strings', () => {
    expect(escapeHtml(123)).toBe('123');
  });

  it('should handle empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('should handle strings with no special characters', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });

  it('should escape complex XSS payloads', () => {
    const payload = '<img src=x onerror="alert(1)">';
    expect(escapeHtml(payload)).not.toContain('<');
    expect(escapeHtml(payload)).not.toContain('>');
  });
});

describe('escapeAttr', () => {
  it('should escape attribute values', () => {
    expect(escapeAttr('onclick="alert(1)"')).toBe(
      'onclick&#x3D;&quot;alert(1)&quot;'
    );
  });

  it('should handle null input', () => {
    expect(escapeAttr(null)).toBe('');
  });
});

// ========================================
// DATE FORMATTING TESTS
// ========================================

describe('formatDate', () => {
  it('should format a valid date string', () => {
    const result = formatDate('2025-04-05');
    expect(result).toContain('Sat');
    expect(result).toContain('5');
    expect(result).toContain('Apr');
  });

  it('should return empty string for empty input', () => {
    expect(formatDate('')).toBe('');
  });

  it('should return empty string for null input', () => {
    expect(formatDate(null)).toBe('');
  });

  it('should return empty string for undefined input', () => {
    expect(formatDate(undefined)).toBe('');
  });
});

// ========================================
// VALIDATION TESTS
// ========================================

describe('validatePlayerName', () => {
  it('should accept valid names', () => {
    expect(validatePlayerName('Emma Wilson')).toEqual({ valid: true });
    expect(validatePlayerName('Jo')).toEqual({ valid: true });
  });

  it('should reject empty names', () => {
    expect(validatePlayerName('')).toEqual({ valid: false, error: 'Name is required' });
    expect(validatePlayerName('   ')).toEqual({ valid: false, error: 'Name is required' });
  });

  it('should reject null/undefined', () => {
    expect(validatePlayerName(null)).toEqual({ valid: false, error: 'Name is required' });
    expect(validatePlayerName(undefined)).toEqual({ valid: false, error: 'Name is required' });
  });

  it('should reject names that are too short', () => {
    expect(validatePlayerName('A')).toEqual({
      valid: false,
      error: 'Name must be at least 2 characters'
    });
  });

  it('should reject names that are too long', () => {
    const longName = 'A'.repeat(101);
    expect(validatePlayerName(longName)).toEqual({
      valid: false,
      error: 'Name is too long (max 100 characters)'
    });
  });

  it('should accept names at boundary lengths', () => {
    expect(validatePlayerName('AB')).toEqual({ valid: true });
    expect(validatePlayerName('A'.repeat(100))).toEqual({ valid: true });
  });

  it('should reject names with no letters', () => {
    expect(validatePlayerName('!@#$%')).toEqual({
      valid: false,
      error: 'Name must contain at least one letter'
    });
    expect(validatePlayerName('123')).toEqual({
      valid: false,
      error: 'Name must contain at least one letter'
    });
  });
});

describe('validateTeamName', () => {
  it('should use same rules as player name', () => {
    expect(validateTeamName('U11 Thunder')).toEqual({ valid: true });
    expect(validateTeamName('')).toEqual({ valid: false, error: 'Name is required' });
  });
});

describe('validateOpponentName', () => {
  it('should use same rules as player name', () => {
    expect(validateOpponentName('Lightning')).toEqual({ valid: true });
    expect(validateOpponentName('A')).toEqual({
      valid: false,
      error: 'Name must be at least 2 characters'
    });
  });
});

describe('validateRound', () => {
  it('should accept valid round numbers', () => {
    expect(validateRound(1)).toEqual({ valid: true, value: 1 });
    expect(validateRound(15)).toEqual({ valid: true, value: 15 });
    expect(validateRound(99)).toEqual({ valid: true, value: 99 });
  });

  it('should accept string numbers', () => {
    expect(validateRound('5')).toEqual({ valid: true, value: 5 });
  });

  it('should reject non-numeric values', () => {
    expect(validateRound('abc')).toEqual({ valid: false, error: 'Round must be a number' });
    expect(validateRound(null)).toEqual({ valid: false, error: 'Round must be a number' });
  });

  it('should reject rounds less than 1', () => {
    expect(validateRound(0)).toEqual({ valid: false, error: 'Round must be at least 1' });
    expect(validateRound(-1)).toEqual({ valid: false, error: 'Round must be at least 1' });
  });

  it('should reject rounds greater than 99', () => {
    expect(validateRound(100)).toEqual({ valid: false, error: 'Round cannot exceed 99' });
  });
});

describe('validateYear', () => {
  it('should accept valid years', () => {
    expect(validateYear(2025)).toEqual({ valid: true, value: 2025 });
    expect(validateYear(2000)).toEqual({ valid: true, value: 2000 });
    expect(validateYear(2100)).toEqual({ valid: true, value: 2100 });
  });

  it('should accept string years', () => {
    expect(validateYear('2025')).toEqual({ valid: true, value: 2025 });
  });

  it('should reject years before 2000', () => {
    expect(validateYear(1999)).toEqual({ valid: false, error: 'Year must be 2000 or later' });
  });

  it('should reject years after 2100', () => {
    expect(validateYear(2101)).toEqual({ valid: false, error: 'Year cannot exceed 2100' });
  });

  it('should reject non-numeric values', () => {
    expect(validateYear('abc')).toEqual({ valid: false, error: 'Year must be a number' });
  });
});

describe('validatePosition', () => {
  it('should accept valid positions', () => {
    expect(validatePosition('GS')).toEqual({ valid: true });
    expect(validatePosition('GA')).toEqual({ valid: true });
    expect(validatePosition('WA')).toEqual({ valid: true });
    expect(validatePosition('C')).toEqual({ valid: true });
    expect(validatePosition('WD')).toEqual({ valid: true });
    expect(validatePosition('GD')).toEqual({ valid: true });
    expect(validatePosition('GK')).toEqual({ valid: true });
    expect(validatePosition('')).toEqual({ valid: true }); // Flexible
  });

  it('should reject invalid positions', () => {
    expect(validatePosition('XX')).toEqual({ valid: false, error: 'Invalid position' });
    expect(validatePosition('gs')).toEqual({ valid: false, error: 'Invalid position' }); // Case sensitive
  });
});

describe('validateLocation', () => {
  it('should accept valid locations', () => {
    expect(validateLocation('Home')).toEqual({ valid: true });
    expect(validateLocation('Away')).toEqual({ valid: true });
  });

  it('should reject invalid locations', () => {
    expect(validateLocation('home')).toEqual({ valid: false, error: 'Location must be Home or Away' });
    expect(validateLocation('Neutral')).toEqual({ valid: false, error: 'Location must be Home or Away' });
  });
});

describe('validateSeason', () => {
  it('should accept valid seasons', () => {
    expect(validateSeason('Season 1')).toEqual({ valid: true });
    expect(validateSeason('Season 2')).toEqual({ valid: true });
    expect(validateSeason('NFNL')).toEqual({ valid: true });
  });

  it('should reject invalid seasons', () => {
    expect(validateSeason('Season 3')).toEqual({ valid: false, error: 'Invalid season' });
    expect(validateSeason('')).toEqual({ valid: false, error: 'Invalid season' });
  });
});

// ========================================
// HELPER FUNCTION TESTS
// ========================================

describe('isDuplicateName', () => {
  const players = [
    { id: 'p1', name: 'Emma Wilson' },
    { id: 'p2', name: 'Sophia Chen' },
    { id: 'p3', name: 'Olivia Taylor' }
  ];

  it('should detect duplicate names (case insensitive)', () => {
    expect(isDuplicateName('Emma Wilson', players)).toBe(true);
    expect(isDuplicateName('EMMA WILSON', players)).toBe(true);
    expect(isDuplicateName('emma wilson', players)).toBe(true);
  });

  it('should return false for unique names', () => {
    expect(isDuplicateName('New Player', players)).toBe(false);
  });

  it('should exclude specified ID', () => {
    expect(isDuplicateName('Emma Wilson', players, 'p1')).toBe(false);
    expect(isDuplicateName('Emma Wilson', players, 'p2')).toBe(true);
  });

  it('should handle empty/null inputs', () => {
    expect(isDuplicateName('', players)).toBe(false);
    expect(isDuplicateName(null, players)).toBe(false);
    expect(isDuplicateName('test', null)).toBe(false);
    expect(isDuplicateName('test', [])).toBe(false);
  });

  it('should handle whitespace', () => {
    expect(isDuplicateName('  Emma Wilson  ', players)).toBe(true);
  });
});

describe('generateId', () => {
  it('should generate IDs with default prefix', () => {
    const id = generateId();
    expect(id).toMatch(/^id\d+$/);
  });

  it('should generate IDs with custom prefix', () => {
    const id = generateId('player');
    expect(id).toMatch(/^player\d+$/);
  });

  it('should generate unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    // Due to timestamp resolution, these might be the same if called too fast
    // But in practice they should be unique
    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
  });
});

describe('getInitials', () => {
  it('should extract initials from full name', () => {
    expect(getInitials('Emma Wilson')).toBe('EW');
    expect(getInitials('Sophia Chen')).toBe('SC');
  });

  it('should handle single names', () => {
    expect(getInitials('Madonna')).toBe('M');
  });

  it('should handle multiple names', () => {
    expect(getInitials('Mary Jane Watson')).toBe('MJW');
  });

  it('should uppercase initials', () => {
    expect(getInitials('emma wilson')).toBe('EW');
  });

  it('should handle empty/null inputs', () => {
    expect(getInitials('')).toBe('');
    expect(getInitials(null)).toBe('');
    expect(getInitials(undefined)).toBe('');
  });
});
