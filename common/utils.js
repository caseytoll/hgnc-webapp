// ========================================
// UTILITY FUNCTIONS
// Exported for use in app.js and testing
// ========================================

/**
 * Escapes HTML special characters to prevent XSS attacks.
 * Use this for ALL user-controlled data rendered in the DOM.
 * @param {*} str - The string to escape
 * @returns {string} - The escaped string
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  if (typeof str !== 'string') str = String(str);

  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };

  return str.replace(/[&<>"'`=/]/g, char => htmlEscapes[char]);
}

/**
 * Escapes a string for use in HTML attributes.
 * More strict than escapeHtml for attribute contexts.
 * @param {*} str - The string to escape
 * @returns {string} - The escaped string
 */
export function escapeAttr(str) {
  if (str === null || str === undefined) return '';
  if (typeof str !== 'string') str = String(str);
  return escapeHtml(str);
}

/**
 * Creates a promise that resolves after a specified delay.
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Formats a date string for display.
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @returns {string} - Formatted date string (e.g., "Sat, 5 Apr")
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

/**
 * Formats a date/time string into the user's regional date/time format.
 * Falls back to an ISO string if parsing fails.
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const locale = navigator.language || 'en-AU';
  // Use compact date and time style
  try {
    return d.toLocaleString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return d.toISOString();
  }
}

/**
 * Validates a player name.
 * @param {string} name - The name to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePlayerName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Name is required' };
  }

  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Name is required' };
  }

  if (trimmed.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'Name is too long (max 100 characters)' };
  }

  if (!/[a-zA-Z]/.test(trimmed)) {
    return { valid: false, error: 'Name must contain at least one letter' };
  }

  return { valid: true };
}

/**
 * Validates a team name.
 * @param {string} name - The name to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateTeamName(name) {
  return validatePlayerName(name); // Same rules
}

/**
 * Validates an opponent name.
 * @param {string} name - The name to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateOpponentName(name) {
  return validatePlayerName(name); // Same rules
}

/**
 * Validates a round number.
 * @param {*} round - The round to validate
 * @returns {{ valid: boolean, error?: string, value?: number }}
 */
export function validateRound(round) {
  const num = parseInt(round);

  if (isNaN(num)) {
    return { valid: false, error: 'Round must be a number' };
  }

  if (num < 1) {
    return { valid: false, error: 'Round must be at least 1' };
  }

  if (num > 99) {
    return { valid: false, error: 'Round cannot exceed 99' };
  }

  return { valid: true, value: num };
}

/**
 * Validates a year.
 * @param {*} year - The year to validate
 * @returns {{ valid: boolean, error?: string, value?: number }}
 */
export function validateYear(year) {
  const num = parseInt(year);

  if (isNaN(num)) {
    return { valid: false, error: 'Year must be a number' };
  }

  if (num < 2000) {
    return { valid: false, error: 'Year must be 2000 or later' };
  }

  if (num > 2100) {
    return { valid: false, error: 'Year cannot exceed 2100' };
  }

  return { valid: true, value: num };
}

/**
 * Validates a netball position.
 * @param {string} position - The position to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePosition(position) {
  const validPositions = ['', 'GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'];

  if (!validPositions.includes(position)) {
    return { valid: false, error: 'Invalid position' };
  }

  return { valid: true };
}

/**
 * Validates a game location.
 * @param {string} location - The location to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateLocation(location) {
  const validLocations = ['Home', 'Away'];

  if (!validLocations.includes(location)) {
    return { valid: false, error: 'Location must be Home or Away' };
  }

  return { valid: true };
}

/**
 * Validates a season.
 * @param {string} season - The season to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateSeason(season) {
  const validSeasons = ['Season 1', 'Season 2', 'NFNL'];

  if (!validSeasons.includes(season)) {
    return { valid: false, error: 'Invalid season' };
  }

  return { valid: true };
}

/**
 * Checks if a name already exists in a list (case-insensitive).
 * @param {string} name - The name to check
 * @param {Array<{name: string, id?: string}>} list - The list to check against
 * @param {string} [excludeId] - Optional ID to exclude from the check
 * @returns {boolean}
 */
export function isDuplicateName(name, list, excludeId = null) {
  if (!name || !Array.isArray(list)) return false;

  const normalizedName = name.toLowerCase().trim();

  return list.some(item => {
    if (excludeId && item.id === excludeId) return false;
    return item.name && item.name.toLowerCase().trim() === normalizedName;
  });
}

/**
 * Generates a unique ID with a prefix.
 * @param {string} prefix - The prefix for the ID
 * @returns {string}
 */
export function generateId(prefix = 'id') {
  return `${prefix}${Date.now()}`;
}

/**
 * Calculates initials from a name.
 * @param {string} name - The full name
 * @returns {string} - The initials (e.g., "John Smith" -> "JS")
 */
export function getInitials(name) {
  if (!name || typeof name !== 'string') return '';
  return name.split(' ').map(n => n[0] || '').join('').toUpperCase();
}

/**
 * Check if a game date/time is in the past (i.e., the game has been played).
 * Used to exclude upcoming games from stats calculations.
 * @param {Object} game - Game object with date and optional time fields
 * @returns {boolean} True if the game is in the past or date is missing
 */
export function isGameInPast(game) {
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
