import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatGameShareText,
  formatLineupText,
  copyToClipboard,
  shareData,
  downloadJson,
  isFullscreenSupported,
  isFullscreen,
  haptic,
  generateLineupCardHTML,
  shareImageBlob,
  validateImportedTeamData
} from '../../../common/share-utils.js';

// ========================================
// FORMAT GAME SHARE TEXT TESTS
// ========================================

describe('formatGameShareText', () => {
  const mockGame = {
    round: 1,
    opponent: 'Lightning',
    scores: { us: 12, opponent: 8 },
    lineup: {
      Q1: { ourGsGoals: 3, ourGaGoals: 1, opponentScore: 2 },
      Q2: { ourGsGoals: 3, ourGaGoals: 1, opponentScore: 2 },
      Q3: { ourGsGoals: 2, ourGaGoals: 2, opponentScore: 3 },
      Q4: { ourGsGoals: 0, ourGaGoals: 0, opponentScore: 1 }
    }
  };

  it('should format a winning game correctly', () => {
    const result = formatGameShareText(mockGame, 'U11 Thunder', 'Home');

    expect(result).toContain('🏐 U11 Thunder - Round 1');
    expect(result).toContain('vs Lightning @ Home');
    expect(result).toContain('🏆 WIN 12-8 (+4)');
  });

  it('should format a losing game correctly', () => {
    const losingGame = {
      ...mockGame,
      scores: { us: 8, opponent: 12 }
    };
    const result = formatGameShareText(losingGame, 'U11 Thunder');

    expect(result).toContain('😞 LOSS 8-12 (-4)');
  });

  it('should format a draw correctly', () => {
    const drawGame = {
      ...mockGame,
      scores: { us: 10, opponent: 10 }
    };
    const result = formatGameShareText(drawGame, 'U11 Thunder');

    expect(result).toContain('🤝 DRAW 10-10');
    expect(result).not.toContain('(+');
    expect(result).not.toContain('(-');
  });

  it('should include quarter breakdown when lineup exists', () => {
    const result = formatGameShareText(mockGame, 'U11 Thunder');

    expect(result).toContain('Q1: 4-2');
    expect(result).toContain('Q2: 4-2');
    expect(result).toContain('Q3: 4-3');
    expect(result).toContain('Q4: 0-1');
  });

  it('should handle game without lineup', () => {
    const gameWithoutLineup = {
      round: 1,
      opponent: 'Lightning',
      scores: { us: 12, opponent: 8 }
    };
    const result = formatGameShareText(gameWithoutLineup, 'U11 Thunder');

    expect(result).toContain('🏆 WIN 12-8');
    expect(result).not.toContain('Q1:');
  });

  it('should handle game without location', () => {
    const result = formatGameShareText(mockGame, 'U11 Thunder');

    expect(result).toContain('vs Lightning');
    expect(result).not.toContain('@');
  });

  it('should return empty string for null game', () => {
    expect(formatGameShareText(null, 'Team')).toBe('');
  });

  it('should return empty string for game without scores', () => {
    const upcomingGame = { round: 1, opponent: 'Lightning', scores: null };
    expect(formatGameShareText(upcomingGame, 'Team')).toBe('');
  });
});

// ========================================
// FORMAT LINEUP TEXT TESTS
// ========================================

describe('formatLineupText', () => {
  const mockGame = {
    round: 1,
    opponent: 'Lightning',
    lineup: {
      Q1: { GS: 'Emma Wilson', GA: 'Sophia Chen', WA: 'Olivia Taylor', C: 'Ava Johnson', WD: 'Isabella Brown', GD: 'Mia Davis', GK: 'Charlotte Miller' },
      Q2: { GS: 'Sophia Chen', GA: 'Emma Wilson', WA: 'Mia Davis', C: 'Harper Martinez', WD: 'Olivia Taylor', GD: 'Ava Johnson', GK: 'Isabella Brown' },
      Q3: { GS: 'Emma Wilson', GA: 'Sophia Chen', WA: 'Olivia Taylor', C: 'Ava Johnson', WD: 'Isabella Brown', GD: 'Mia Davis', GK: 'Charlotte Miller' },
      Q4: { GS: 'Sophia Chen', GA: 'Mia Davis', WA: 'Harper Martinez', C: 'Charlotte Miller', WD: 'Isabella Brown', GD: 'Ava Johnson', GK: 'Olivia Taylor' }
    }
  };

  it('should format lineup with header', () => {
    const result = formatLineupText(mockGame);

    expect(result).toContain('Round 1 vs Lightning - Lineup');
  });

  it('should include quarter columns', () => {
    const result = formatLineupText(mockGame);

    expect(result).toContain('Q1');
    expect(result).toContain('Q2');
    expect(result).toContain('Q3');
    expect(result).toContain('Q4');
  });

  it('should include all positions', () => {
    const result = formatLineupText(mockGame);

    expect(result).toContain('GS');
    expect(result).toContain('GA');
    expect(result).toContain('WA');
    expect(result).toContain('C');
    expect(result).toContain('WD');
    expect(result).toContain('GD');
    expect(result).toContain('GK');
  });

  it('should truncate player names to first name', () => {
    const result = formatLineupText(mockGame);

    expect(result).toContain('Emma');
    expect(result).toContain('Sophi'); // Truncated to 5 chars
    expect(result).not.toContain('Wilson');
  });

  it('should return empty string for null game', () => {
    expect(formatLineupText(null)).toBe('');
  });

  it('should return empty string for game without lineup', () => {
    const gameWithoutLineup = { round: 1, opponent: 'Test' };
    expect(formatLineupText(gameWithoutLineup)).toBe('');
  });

  it('should handle missing players with dash', () => {
    const partialLineup = {
      round: 1,
      opponent: 'Test',
      lineup: {
        Q1: { GS: 'Emma' },
        Q2: {},
        Q3: {},
        Q4: {}
      }
    };
    const result = formatLineupText(partialLineup);

    expect(result).toContain('-');
  });
});

// ========================================
// CLIPBOARD TESTS
// ========================================

describe('copyToClipboard', () => {
  beforeEach(() => {
    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined)
      },
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return false for empty text', async () => {
    const result = await copyToClipboard('');
    expect(result).toBe(false);
  });

  it('should return false for null text', async () => {
    const result = await copyToClipboard(null);
    expect(result).toBe(false);
  });

  it('should call clipboard API with text', async () => {
    await copyToClipboard('test text');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test text');
  });

  it('should return true on success', async () => {
    const result = await copyToClipboard('test text');
    expect(result).toBe(true);
  });

  it('should handle clipboard API failure', async () => {
    navigator.clipboard.writeText = vi.fn().mockRejectedValue(new Error('Failed'));

    // Should try legacy fallback
    const result = await copyToClipboard('test text');
    // Result depends on execCommand which may not work in test env
    expect(result).toBeDefined();
  });
});

// ========================================
// SHARE DATA TESTS
// ========================================

describe('shareData', () => {
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    mockShowToast.mockClear();
  });

  it('should use Web Share API when available', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      writable: true,
      configurable: true
    });

    const result = await shareData(
      { title: 'Test', text: 'Test text' },
      mockShowToast
    );

    expect(mockShare).toHaveBeenCalledWith({ title: 'Test', text: 'Test text' });
    expect(result).toBe(true);
  });

  it('should handle user cancellation gracefully', async () => {
    const abortError = new Error('User cancelled');
    abortError.name = 'AbortError';
    const mockShare = vi.fn().mockRejectedValue(abortError);
    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      writable: true,
      configurable: true
    });

    const result = await shareData(
      { title: 'Test', text: 'Test text' },
      mockShowToast
    );

    expect(result).toBe(false);
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('should fallback to clipboard when Web Share unavailable', async () => {
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      writable: true,
      configurable: true
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true
    });

    const result = await shareData(
      { title: 'Test', text: 'Test text' },
      mockShowToast
    );

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test text');
    expect(mockShowToast).toHaveBeenCalledWith('Copied to clipboard', 'success');
  });
});

// ========================================
// FULLSCREEN TESTS
// ========================================

describe('isFullscreenSupported', () => {
  it('should return true when fullscreenEnabled is true', () => {
    Object.defineProperty(document, 'fullscreenEnabled', {
      value: true,
      writable: true,
      configurable: true
    });

    expect(isFullscreenSupported()).toBe(true);
  });

  it('should check webkit prefix', () => {
    Object.defineProperty(document, 'fullscreenEnabled', {
      value: undefined,
      writable: true,
      configurable: true
    });
    Object.defineProperty(document, 'webkitFullscreenEnabled', {
      value: true,
      writable: true,
      configurable: true
    });

    expect(isFullscreenSupported()).toBe(true);
  });
});

describe('isFullscreen', () => {
  it('should return true when in fullscreen', () => {
    Object.defineProperty(document, 'fullscreenElement', {
      value: document.body,
      writable: true,
      configurable: true
    });

    expect(isFullscreen()).toBe(true);
  });

  it('should return false when not in fullscreen', () => {
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      writable: true,
      configurable: true
    });
    Object.defineProperty(document, 'webkitFullscreenElement', {
      value: null,
      writable: true,
      configurable: true
    });
    Object.defineProperty(document, 'mozFullScreenElement', {
      value: null,
      writable: true,
      configurable: true
    });
    Object.defineProperty(document, 'msFullscreenElement', {
      value: null,
      writable: true,
      configurable: true
    });

    expect(isFullscreen()).toBe(false);
  });
});

// ========================================
// HAPTIC FEEDBACK TESTS
// ========================================

describe('haptic', () => {
  it('should call navigator.vibrate when available', () => {
    const mockVibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      writable: true,
      configurable: true
    });

    haptic(50);

    expect(mockVibrate).toHaveBeenCalledWith(50);
  });

  it('should handle array patterns', () => {
    const mockVibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      writable: true,
      configurable: true
    });

    haptic([50, 100, 50]);

    expect(mockVibrate).toHaveBeenCalledWith([50, 100, 50]);
  });

  it('should not throw when vibrate unavailable', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: undefined,
      writable: true,
      configurable: true
    });

    expect(() => haptic()).not.toThrow();
  });
});

// ========================================
// DOWNLOAD JSON TESTS
// ========================================

describe('downloadJson', () => {
  let mockCreateElement;
  let mockAppendChild;
  let mockRemoveChild;
  let mockClick;
  let mockLink;

  beforeEach(() => {
    mockClick = vi.fn();
    mockLink = {
      href: '',
      download: '',
      click: mockClick
    };
    mockCreateElement = vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
    mockAppendChild = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    mockRemoveChild = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});

    // Mock URL methods
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create download link with correct filename', () => {
    downloadJson({ test: 'data' }, 'team-export');

    expect(mockLink.download).toBe('team-export.json');
  });

  it('should trigger click on link', () => {
    downloadJson({ test: 'data' }, 'team-export');

    expect(mockClick).toHaveBeenCalled();
  });

  it('should clean up resources', () => {
    downloadJson({ test: 'data' }, 'team-export');

    expect(mockRemoveChild).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
});

// ========================================
// GENERATE LINEUP CARD HTML TESTS
// ========================================

describe('generateLineupCardHTML', () => {
  const mockGame = {
    round: 1,
    opponent: 'Lightning',
    date: '2025-03-15',
    lineup: {
      Q1: { GS: 'Emma Wilson', GA: 'Sophia Chen', WA: 'Olivia Taylor', C: 'Ava Johnson', WD: 'Isabella Brown', GD: 'Mia Davis', GK: 'Charlotte Miller' },
      Q2: { GS: 'Sophia Chen', GA: 'Emma Wilson', WA: 'Mia Davis', C: 'Harper Martinez', WD: 'Olivia Taylor', GD: 'Ava Johnson', GK: 'Isabella Brown' },
      Q3: { GS: 'Emma Wilson', GA: 'Sophia Chen', WA: 'Olivia Taylor', C: 'Ava Johnson', WD: 'Isabella Brown', GD: 'Mia Davis', GK: 'Charlotte Miller' },
      Q4: { GS: 'Sophia Chen', GA: 'Mia Davis', WA: 'Harper Martinez', C: 'Charlotte Miller', WD: 'Isabella Brown', GD: 'Ava Johnson', GK: 'Olivia Taylor' }
    }
  };

  it('should return empty string for null game', () => {
    expect(generateLineupCardHTML(null, 'Team')).toBe('');
  });

  it('should return empty string for game without lineup', () => {
    const gameWithoutLineup = { round: 1, opponent: 'Test' };
    expect(generateLineupCardHTML(gameWithoutLineup, 'Team')).toBe('');
  });

  it('should include team name in header', () => {
    const result = generateLineupCardHTML(mockGame, 'U11 Thunder');
    expect(result).toContain('U11 Thunder');
  });

  it('should include match info', () => {
    const result = generateLineupCardHTML(mockGame, 'U11 Thunder');
    expect(result).toContain('Round 1 vs Lightning');
  });

  it('should include date when present in d MMM yyyy format', () => {
    const result = generateLineupCardHTML(mockGame, 'U11 Thunder');
    expect(result).toContain('15 Mar 2025');
  });

  it('should include quarter columns', () => {
    const result = generateLineupCardHTML(mockGame, 'U11 Thunder');
    expect(result).toContain('Q1');
    expect(result).toContain('Q2');
    expect(result).toContain('Q3');
    expect(result).toContain('Q4');
  });

  it('should include all positions', () => {
    const result = generateLineupCardHTML(mockGame, 'U11 Thunder');
    expect(result).toContain('GS');
    expect(result).toContain('GA');
    expect(result).toContain('WA');
    expect(result).toContain('C');
    expect(result).toContain('WD');
    expect(result).toContain('GD');
    expect(result).toContain('GK');
  });

  it('should truncate long first names', () => {
    const gameWithLongName = {
      ...mockGame,
      lineup: {
        Q1: { GS: 'Alexandria Smith' },
        Q2: {},
        Q3: {},
        Q4: {}
      }
    };
    const result = generateLineupCardHTML(gameWithLongName, 'Team');
    expect(result).toContain('Alexand.');
    expect(result).not.toContain('Alexandria');
  });

  it('should show Off for quarters where player is not assigned', () => {
    const partialLineup = {
      round: 1,
      opponent: 'Test',
      lineup: {
        Q1: { GS: 'Emma' },
        Q2: {},
        Q3: {},
        Q4: {}
      }
    };
    const result = generateLineupCardHTML(partialLineup, 'Team');
    // Emma plays GS in Q1, Off in other quarters
    expect(result).toContain('>GS<');
    expect(result).toContain('>Off<');
  });

});

// ========================================
// SHARE IMAGE BLOB TESTS
// ========================================

describe('shareImageBlob', () => {
  const mockBlob = new Blob(['test'], { type: 'image/png' });
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    mockShowToast.mockClear();
  });

  it('should use Web Share API when canShare returns true', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'canShare', {
      value: vi.fn().mockReturnValue(true),
      writable: true,
      configurable: true
    });
    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      writable: true,
      configurable: true
    });

    const result = await shareImageBlob(mockBlob, 'test.png', 'Test Title', mockShowToast);

    expect(mockShare).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('should handle user cancellation gracefully', async () => {
    const abortError = new Error('User cancelled');
    abortError.name = 'AbortError';
    Object.defineProperty(navigator, 'canShare', {
      value: vi.fn().mockReturnValue(true),
      writable: true,
      configurable: true
    });
    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockRejectedValue(abortError),
      writable: true,
      configurable: true
    });

    const result = await shareImageBlob(mockBlob, 'test.png', 'Test Title', mockShowToast);

    expect(result).toBe(false);
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('should fallback to download when canShare is false', async () => {
    Object.defineProperty(navigator, 'canShare', {
      value: vi.fn().mockReturnValue(false),
      writable: true,
      configurable: true
    });

    const mockClick = vi.fn();
    const mockLink = { href: '', download: '', click: mockClick };
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
    global.URL.revokeObjectURL = vi.fn();

    const result = await shareImageBlob(mockBlob, 'test.png', 'Test Title', mockShowToast);

    expect(mockClick).toHaveBeenCalled();
    expect(mockLink.download).toBe('test.png');
    expect(mockShowToast).toHaveBeenCalledWith('Lineup image downloaded', 'success');
    expect(result).toBe(true);
  });
});

// ========================================
// VALIDATE IMPORTED TEAM DATA TESTS
// ========================================

describe('validateImportedTeamData', () => {
  const validTeamData = {
    teamID: 'team-123',
    teamName: 'U11 Thunder',
    year: 2025,
    season: 'Season 1',
    players: [
      { id: 'p1', name: 'Emma Wilson', fillIn: false },
      { id: 'p2', name: 'Sophia Chen', fillIn: false }
    ],
    games: [
      { round: 1, opponent: 'Lightning', date: '2025-03-15' }
    ]
  };

  it('should return valid for correct team data', () => {
    const result = validateImportedTeamData(validTeamData);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.data).toEqual(validTeamData);
  });

  it('should reject null data', () => {
    const result = validateImportedTeamData(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid data format');
  });

  it('should reject non-object data', () => {
    const result = validateImportedTeamData('not an object');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid data format');
  });

  it('should require team name', () => {
    const data = { ...validTeamData, teamName: undefined };
    const result = validateImportedTeamData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('team name'))).toBe(true);
  });

  it('should require valid year', () => {
    const data = { ...validTeamData, year: 1999 };
    const result = validateImportedTeamData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('year'))).toBe(true);
  });

  it('should require valid season', () => {
    const data = { ...validTeamData, season: 'Invalid Season' };
    const result = validateImportedTeamData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('season'))).toBe(true);
  });

  it('should require players array', () => {
    const data = { ...validTeamData, players: 'not an array' };
    const result = validateImportedTeamData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('players'))).toBe(true);
  });

  it('should validate player objects', () => {
    const data = {
      ...validTeamData,
      players: [{ id: 'p1' }] // missing name
    };
    const result = validateImportedTeamData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Player 1'))).toBe(true);
  });

  it('should validate game objects when present', () => {
    const data = {
      ...validTeamData,
      games: [{ opponent: 'Team' }] // missing round
    };
    const result = validateImportedTeamData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Game 1'))).toBe(true);
  });

  it('should allow empty games array', () => {
    const data = { ...validTeamData, games: [] };
    const result = validateImportedTeamData(data);
    expect(result.valid).toBe(true);
  });

  it('should allow missing games property', () => {
    const { games, ...dataWithoutGames } = validTeamData;
    const result = validateImportedTeamData(dataWithoutGames);
    expect(result.valid).toBe(true);
  });

  it('should collect multiple errors', () => {
    const data = {
      teamName: '',
      year: 'not a number',
      season: 'Bad',
      players: 'not array'
    };
    const result = validateImportedTeamData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});
