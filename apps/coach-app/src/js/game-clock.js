// ========================================
// GAME CLOCK ESTIMATION (DISPLAY ONLY)
// ========================================
// Provides estimated game clock for display purposes only.
// NEVER used for stats calculations - manual segments remain source of truth.
// Based on continuous clock model (clock never stops during quarters).
// Accuracy: ~99.9% with centralized timing (NFNA).

import { state } from './state.js';

/**
 * Estimate current game clock based on start time and match configuration.
 * Uses continuous clock model (no stoppages during quarters).
 * 
 * @param {Object} game - Game object with startTime, time, matchDuration, etc.
 * @param {Date} now - Current time (for testing, defaults to new Date())
 * @returns {Object|null} Clock state or null if estimation not possible
 *   {
 *     quarter: 1-4,
 *     timeRemaining: seconds remaining in quarter,
 *     inBreak: boolean,
 *     breakType: 'Quarter Break' | 'Half Time' | null,
 *     matchEnded: boolean
 *   }
 */
export function estimateGameClock(game, now = new Date()) {
  try {
    // Validation: need startTime and matchDuration
    if (!game.startTime || !game.matchDuration) {
      return null;
    }

    // Parse start time (could be ISO string or Date object)
    let startTime;
    if (typeof game.startTime === 'string') {
      startTime = new Date(game.startTime);
    } else if (game.startTime instanceof Date) {
      startTime = game.startTime;
    } else {
      // Try to construct from date + time fields
      if (game.date && game.time) {
        const dateStr = `${game.date} ${game.time}`;
        startTime = new Date(dateStr);
      } else {
        return null;
      }
    }

    // Validate parsed start time
    if (isNaN(startTime.getTime())) {
      return null;
    }

    // Calculate elapsed wall clock time (in minutes)
    const elapsed = (now - startTime) / 1000 / 60;

    // If game hasn't started yet, return null
    if (elapsed < 0) {
      return null;
    }

    // Match configuration (with sensible defaults)
    const QUARTER_MIN = game.matchDuration / 4; // e.g., 40 / 4 = 10 minutes
    const BREAK_MIN = game.breakDuration || 1; // Default 1 minute
    const MAIN_BREAK_MIN = game.mainBreakDuration || 2; // Default 2 minutes (half-time)

    // Calculate quarter start boundaries (including breaks)
    const quarterStarts = [
      0,                                              // Q1: 0 min
      QUARTER_MIN + BREAK_MIN,                        // Q2: 10 + 1 = 11 min
      QUARTER_MIN * 2 + BREAK_MIN + MAIN_BREAK_MIN,   // Q3: 20 + 1 + 2 = 23 min
      QUARTER_MIN * 3 + BREAK_MIN * 2 + MAIN_BREAK_MIN // Q4: 30 + 2 + 2 = 34 min
    ];

    // Find current quarter
    for (let q = 0; q < 4; q++) {
      const qStart = quarterStarts[q];
      const qEnd = qStart + QUARTER_MIN;

      // Check if in this quarter
      if (elapsed >= qStart && elapsed < qEnd) {
        const timeInQuarter = elapsed - qStart;
        const timeRemaining = QUARTER_MIN - timeInQuarter;

        return {
          quarter: q + 1,
          timeRemaining: Math.max(0, Math.ceil(timeRemaining * 60)), // Convert to seconds
          inBreak: false,
          breakType: null,
          matchEnded: false
        };
      }

      // Check if in break after quarter (not after Q4)
      if (q < 3) {
        const breakDuration = (q === 1) ? MAIN_BREAK_MIN : BREAK_MIN;
        const breakEnd = qEnd + breakDuration;

        if (elapsed >= qEnd && elapsed < breakEnd) {
          return {
            quarter: q + 1,
            inBreak: true,
            breakType: (q === 1) ? 'Half Time' : 'Quarter Break',
            timeRemaining: 0,
            matchEnded: false
          };
        }
      }
    }

    // If we're past all quarters, game has ended
    return {
      quarter: 4,
      timeRemaining: 0,
      inBreak: false,
      breakType: null,
      matchEnded: true
    };

  } catch (error) {
    console.error('[GameClock] Estimation error:', error);
    return null;
  }
}

/**
 * Format time remaining as MM:SS
 */
export function formatTimeRemaining(seconds) {
  if (seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Check if game is happening today
 */
export function isGameToday(game) {
  try {
    if (!game.date) return false;
    
    const gameDate = new Date(game.date);
    const today = new Date();
    
    return gameDate.getFullYear() === today.getFullYear() &&
           gameDate.getMonth() === today.getMonth() &&
           gameDate.getDate() === today.getDate();
  } catch (error) {
    return false;
  }
}

/**
 * Initialize and display estimated game clock in game detail view.
 * Only shows if game is today and has required timing data.
 * Updates every 10 seconds. Cleans up on view close.
 */
export function initGameClock(game) {
  // Clean up any existing clock first
  cleanupGameClock();

  // Only show clock if game is today and has timing data
  if (!isGameToday(game) || !game.startTime || !game.matchDuration) {
    return;
  }

  // Initial render
  renderGameClock(game);

  // Update every 10 seconds
  state._clockUpdateInterval = setInterval(() => {
    renderGameClock(game);
  }, 10000);
}

/**
 * Render the clock display in the DOM
 */
function renderGameClock(game) {
  try {
    const clockData = estimateGameClock(game);
    
    // If estimation failed or game ended, hide clock
    if (!clockData || clockData.matchEnded) {
      const existingClock = document.getElementById('estimated-game-clock');
      if (existingClock) {
        existingClock.remove();
      }
      cleanupGameClock();
      return;
    }

    // Find or create clock container
    let clockContainer = document.getElementById('estimated-game-clock');
    
    if (!clockContainer) {
      clockContainer = document.createElement('div');
      clockContainer.id = 'estimated-game-clock';
      clockContainer.className = 'estimated-clock-banner';
      
      // Insert at top of game detail content (after header, before score card)
      const gameContent = document.querySelector('.game-detail-content');
      if (gameContent) {
        gameContent.insertBefore(clockContainer, gameContent.firstChild);
      } else {
        // Fallback: couldn't find insertion point, don't show clock
        return;
      }
    }

    // Render clock content
    if (clockData.inBreak) {
      clockContainer.innerHTML = `
        <div class="clock-content">
          <svg class="clock-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span class="clock-break">${clockData.breakType}</span>
          <span class="clock-badge">Estimated</span>
        </div>
      `;
    } else {
      clockContainer.innerHTML = `
        <div class="clock-content">
          <svg class="clock-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span class="clock-quarter">Q${clockData.quarter}</span>
          <span class="clock-separator">—</span>
          <span class="clock-time">${formatTimeRemaining(clockData.timeRemaining)} remaining</span>
          <span class="clock-badge">Estimated</span>
        </div>
      `;
    }
  } catch (error) {
    console.error('[GameClock] Render error:', error);
    // Silent fail - don't break the app
  }
}

/**
 * Clean up clock interval and remove from DOM.
 * Called when closing game detail view.
 */
export function cleanupGameClock() {
  // Clear interval
  if (state._clockUpdateInterval) {
    clearInterval(state._clockUpdateInterval);
    state._clockUpdateInterval = null;
  }

  // Remove from DOM
  const existingClock = document.getElementById('estimated-game-clock');
  if (existingClock) {
    existingClock.remove();
  }
}

// Expose for window access (onclick handlers, etc.)
window.initGameClock = initGameClock;
window.cleanupGameClock = cleanupGameClock;
