// ========================================
// SHARE & EXPORT UTILITIES
// Pure functions for sharing and exporting data
// ========================================

import { escapeHtml } from './utils.js';

/**
 * Format a game result for sharing.
 * @param {Object} game - Game object with scores, lineup, etc.
 * @param {string} teamName - Team name
 * @param {string} location - 'Home' or 'Away'
 * @returns {string} Formatted share text
 */
export function formatGameShareText(game, teamName, location = '') {
  if (!game || !game.scores) {
    return '';
  }

  const { scores, round, opponent, lineup } = game;
  const us = scores.us;
  const them = scores.opponent;
  const diff = us - them;

  // Determine result
  let resultEmoji, resultText;
  if (us > them) {
    resultEmoji = '🏆';
    resultText = 'WIN';
  } else if (us < them) {
    resultEmoji = '😞';
    resultText = 'LOSS';
  } else {
    resultEmoji = '🤝';
    resultText = 'DRAW';
  }

  // Build share text
  let text = `🏐 ${teamName} - Round ${round}\n`;
  text += `vs ${opponent}`;
  if (location) {
    text += ` @ ${location}`;
  }
  text += '\n\n';
  text += `${resultEmoji} ${resultText} ${us}-${them}`;
  if (diff !== 0) {
    text += ` (${diff > 0 ? '+' : ''}${diff})`;
  }

  // Add quarter breakdown if lineup exists
  if (lineup) {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const quarterScores = quarters
      .map((q) => {
        if (lineup[q]) {
          const qFor = (lineup[q].ourGsGoals || 0) + (lineup[q].ourGaGoals || 0);
          const qAgainst = lineup[q].opponentScore || 0;
          return `${q}: ${qFor}-${qAgainst}`;
        }
        return null;
      })
      .filter(Boolean);

    if (quarterScores.length > 0) {
      text += '\n\n' + quarterScores.join(' | ');
    }
  }

  return text;
}

/**
 * Format lineup as a text table for copying.
 * @param {Object} game - Game object with lineup
 * @returns {string} Formatted lineup table
 */
export function formatLineupText(game) {
  if (!game || !game.lineup) {
    return '';
  }

  const { round, opponent, lineup } = game;
  const positions = ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'];
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

  // Header
  let text = `Round ${round} vs ${opponent} - Lineup\n\n`;

  // Column headers
  text += '     ' + quarters.map((q) => q.padEnd(6)).join('') + '\n';

  // Each position row
  positions.forEach((pos) => {
    let row = pos.padEnd(5);
    quarters.forEach((q) => {
      const playerName = lineup[q]?.[pos] || '-';
      // Get first name only, truncate to 5 chars
      const shortName = playerName.split(' ')[0].substring(0, 5);
      row += shortName.padEnd(6);
    });
    text += row + '\n';
  });

  return text.trim();
}

/**
 * Copy text to clipboard with fallback for older browsers.
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text) {
  if (!text) {
    return false;
  }

  // Modern Clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Clipboard API failed:', err);
      // Fall through to legacy method
    }
  }

  // Legacy fallback using execCommand
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch (err) {
    console.error('Legacy clipboard copy failed:', err);
    return false;
  }
}

/**
 * Share data using Web Share API with clipboard fallback.
 * @param {Object} shareData - { title, text, url? }
 * @param {Function} showToast - Toast notification function
 * @returns {Promise<boolean>} Success status
 */
export async function shareData(shareData, showToast) {
  const { title, text, url } = shareData;

  // Check if Web Share API is available
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        ...(url && { url }),
      });
      return true;
    } catch (err) {
      // User cancelled or error
      if (err.name === 'AbortError') {
        // User cancelled - not an error
        return false;
      }
      console.error('Web Share failed:', err);
      // Fall through to clipboard
    }
  }

  // Fallback: copy to clipboard
  const success = await copyToClipboard(text);
  if (success && showToast) {
    showToast('Copied to clipboard', 'success');
  } else if (!success && showToast) {
    showToast('Failed to copy', 'error');
  }
  return success;
}

/**
 * Download data as a JSON file.
 * @param {Object} data - Data to export
 * @param {string} filename - Filename (without extension)
 */
export function downloadJson(data, filename) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Trigger a file input for JSON import.
 * @param {Function} onFileSelected - Callback with parsed JSON data
 * @param {Function} onError - Error callback
 */
export function triggerJsonImport(onFileSelected, onError) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';

  input.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      onFileSelected(data, file.name);
    } catch (err) {
      console.error('Failed to parse JSON:', err);
      if (onError) {
        onError(err);
      }
    }
  };

  input.click();
}

/**
 * Validate imported team data structure.
 * @param {Object} data - Imported data to validate
 * @returns {{ valid: boolean, errors: string[], data?: Object }}
 */
export function validateImportedTeamData(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid data format'] };
  }

  // Check required fields
  if (!data.teamName || typeof data.teamName !== 'string') {
    errors.push('Missing or invalid team name');
  }

  if (!data.year || typeof data.year !== 'number' || data.year < 2000 || data.year > 2100) {
    errors.push('Missing or invalid year (must be 2000-2100)');
  }

  if (!data.season || !['Season 1', 'Season 2', 'NFNL'].includes(data.season)) {
    errors.push('Missing or invalid season');
  }

  // Validate players array
  if (!Array.isArray(data.players)) {
    errors.push('Missing players array');
  } else {
    data.players.forEach((player, i) => {
      if (!player.name || typeof player.name !== 'string') {
        errors.push(`Player ${i + 1}: Missing name`);
      }
      if (!player.id) {
        errors.push(`Player ${i + 1}: Missing ID`);
      }
    });
  }

  // Validate games array (optional but validate if present)
  if (data.games && !Array.isArray(data.games)) {
    errors.push('Games must be an array');
  } else if (data.games) {
    data.games.forEach((game, i) => {
      if (!game.round || typeof game.round !== 'number') {
        errors.push(`Game ${i + 1}: Missing or invalid round`);
      }
      if (!game.opponent || typeof game.opponent !== 'string') {
        errors.push(`Game ${i + 1}: Missing opponent`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    data: errors.length === 0 ? data : undefined,
  };
}

/**
 * Check if fullscreen is supported.
 * @returns {boolean}
 */
export function isFullscreenSupported() {
  return !!(
    document.fullscreenEnabled ||
    document.webkitFullscreenEnabled ||
    document.mozFullScreenEnabled ||
    document.msFullscreenEnabled
  );
}

/**
 * Check if currently in fullscreen mode.
 * @returns {boolean}
 */
export function isFullscreen() {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

/**
 * Enter fullscreen mode.
 * @returns {Promise<boolean>} Success status
 */
export async function enterFullscreen() {
  const elem = document.documentElement;

  try {
    if (elem.requestFullscreen) {
      await elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      await elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      await elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) {
      await elem.msRequestFullscreen();
    } else {
      return false;
    }
    return true;
  } catch (err) {
    console.error('Enter fullscreen failed:', err);
    return false;
  }
}

/**
 * Exit fullscreen mode.
 * @returns {Promise<boolean>} Success status
 */
export async function exitFullscreen() {
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      await document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      await document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      await document.msExitFullscreen();
    } else {
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exit fullscreen failed:', err);
    return false;
  }
}

/**
 * Toggle fullscreen mode.
 * @returns {Promise<boolean>} New fullscreen state
 */
export async function toggleFullscreen() {
  if (!isFullscreenSupported()) {
    return false;
  }

  if (isFullscreen()) {
    await exitFullscreen();
    return false;
  } else {
    await enterFullscreen();
    return true;
  }
}

/**
 * Trigger haptic feedback if available.
 * @param {number|number[]} pattern - Vibration pattern in ms
 */
export function haptic(pattern = 50) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

/**
 * Format a date string to "d MMM yyyy" format (e.g., "15 Mar 2025").
 * @param {string} dateStr - Date string in any parseable format
 * @returns {string} Formatted date or original string if parsing fails
 */
export function formatDateForDisplay(dateStr) {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return dateStr; // Return original if parsing fails
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

/**
 * Generate HTML for a styled lineup card suitable for image capture.
 * @param {Object} game - Game object with lineup
 * @param {string} teamName - Team name
 * @returns {string} HTML string for the lineup card
 */
export function generateLineupCardHTML(game, teamName) {
  if (!game || !game.lineup) {
    return '';
  }

  const { round, opponent, lineup, date, time, location, captain } = game;
  const positions = ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'];
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

  // Collect all unique players from the lineup
  const playersSet = new Set();
  quarters.forEach((q) => {
    if (lineup[q]) {
      positions.forEach((pos) => {
        const player = lineup[q][pos];
        if (player) {
          playersSet.add(player);
        }
      });
    }
  });

  // Sort players alphabetically by first name
  const players = Array.from(playersSet).sort((a, b) => {
    const nameA = a.split(' ')[0].toLowerCase();
    const nameB = b.split(' ')[0].toLowerCase();
    return nameA.localeCompare(nameB);
  });

  // Get player's first name
  const getFirstName = (fullName) => {
    return fullName.split(' ')[0];
  };

  // Get player's position in a quarter (or "Off" if not playing)
  const getPlayerPosition = (playerName, quarter) => {
    if (!lineup[quarter]) return 'Off';
    for (const pos of positions) {
      if (lineup[quarter][pos] === playerName) {
        return pos;
      }
    }
    return 'Off';
  };

  // Get captain first name for display
  const getCaptainName = () => {
    if (!captain) return null;
    return captain.split(' ')[0];
  };

  // Build player rows (players down the side, positions under each quarter)
  const playerRows = players
    .map(
      (player) => `
    <tr>
      <td class="player-name-cell">${getFirstName(player)}</td>
      ${quarters.map((q) => `<td class="pos-cell">${getPlayerPosition(player, q)}</td>`).join('')}
    </tr>
  `
    )
    .join('');

  const captainName = getCaptainName();

  // Build game details line (date, time, location)
  const gameDetails = [date ? formatDateForDisplay(date) : null, time || null, location || null]
    .filter(Boolean)
    .join(' • ');

  return `
    <div class="lineup-card-header">
      <div class="lineup-card-team">Team Sheet</div>
      <div class="lineup-card-match">Round ${round} - ${teamName} vs ${opponent}</div>
      ${gameDetails ? `<div class="lineup-card-date">${gameDetails}</div>` : ''}
      ${captainName ? `<div class="lineup-card-captain">Captain: ${captainName}</div>` : ''}
    </div>
    <table class="lineup-card-table">
      <thead>
        <tr>
          <th>Name</th>
          ${quarters.map((q) => `<th>${q}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${playerRows}
      </tbody>
    </table>
  `;
}

/**
 * Generate a printable HTML document for a lineup card with manual score/notes fields.
 * This returns a full HTML string that can be opened in a new window for printing.
 * @param {Object} game
 * @param {string} teamName
 * @returns {string} Full HTML document string
 */
export function generateLineupCardPrintableHTML(game, teamName) {
  const fragment = generateLineupCardHTML(game, teamName);
  if (!fragment) return '';

  // local helpers for printable builder
  const lineup = (game && game.lineup) || {};
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

  // Minimal inline styles to ensure print fidelity when opened in a new window
  const styles = `
    body { font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color: #111827; padding: 20px; }
    .lineup-card-header { text-align: left; margin-bottom: 8px; }
    .lineup-card-team { font-weight: 700; font-size: 18px; color: #7c3aed; }
    .lineup-card-match { font-size: 16px; margin-top: 4px; }
    .lineup-card-date, .lineup-card-captain { font-size: 12px; color: #6b7280; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border-bottom: 1px solid #e5e7eb; padding: 8px 6px; text-align: left; }
    th { font-weight: 600; color: #374151; }
    .player-name-cell { width: 35%; }
    .pos-cell { width: 9%; text-align: center; }
    .manual-section { margin-top: 18px; border-top: 2px dashed #e5e7eb; padding-top: 12px; }
    .manual-scores { display:flex; gap:12px; align-items:center; font-weight:600; margin-bottom:8px; }
    .manual-score-box { width: 80px; height: 28px; border-bottom: 2px solid #111827; display:inline-block; }
    .manual-notes { min-height: 120px; }
    .note-line { border-bottom: 1px dashed #9ca3af; height: 20px; margin-bottom:10px; }
    @media print { @page { size: A4; margin: 15mm; } }
  `;

  // Shooter scoring table (GS/GA per quarter) — show our team values if present and provide opponent placeholders
  const shooterRows = (() => {
    const qCols = quarters.map((q) => {
      const qdata = (lineup && lineup[q]) || {};
      const ourGs = qdata.ourGsGoals != null ? String(qdata.ourGsGoals) : '';
      const ourGa = qdata.ourGaGoals != null ? String(qdata.ourGaGoals) : '';
      const oppGs = qdata.oppGsGoals != null ? String(qdata.oppGsGoals) : (qdata.opponentGsGoals != null ? String(qdata.opponentGsGoals) : '');
      const oppGa = qdata.oppGaGoals != null ? String(qdata.oppGaGoals) : (qdata.opponentGaGoals != null ? String(qdata.opponentGaGoals) : '');

      return {
        q,
        our: `GS: ${ourGs}${ourGs && ourGa ? ' ' : ''}${ourGa ? '<br>GA: ' + ourGa : ''}`.trim(),
        opp: `GS: ${oppGs}${oppGs && oppGa ? ' ' : ''}${oppGa ? '<br>GA: ' + oppGa : ''}`.trim(),
      };
    });

    const header = `<thead><tr><th></th>${qCols.map(c => `<th>${c.q}</th>`).join('')}</tr></thead>`;
    const ourRow = `<tr><td style="font-weight:600">Our GS / GA</td>${qCols.map(c => `<td style="text-align:center">${c.our || '&nbsp;'}</td>`).join('')}</tr>`;
    const oppRow = `<tr><td style="font-weight:600">Opp GS / GA</td>${qCols.map(c => `<td style="text-align:center">${c.opp || '&nbsp;'}</td>`).join('')}</tr>`;

    return `<div class="shooter-scoring"><table class="shooter-table">${header}<tbody>${ourRow}${oppRow}</tbody></table></div>`;
  })();

  const manualFields = `
    <div class="manual-section">
      <div class="manual-scores">
        <div>Our score: <span class="manual-score-box"></span></div>
        <div>Opponent score: <span class="manual-score-box"></span></div>
        <div style="margin-left:auto;font-weight:400;color:#6b7280;">Date/Time: _____________________</div>
      </div>
      <div style="font-weight:600;margin-bottom:8px;">Notes (coach/assistant):</div>
      <div class="manual-notes">
        ${Array.from({ length: 6 }).map(() => '<div class="note-line">&nbsp;</div>').join('')}
      </div>
    </div>
  `;

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>${escapeHtml(teamName)} - Lineup Sheet</title>
        <style>${styles}
          .shooter-scoring { margin-top: 12px; }
          .shooter-table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 13px; }
          .shooter-table th, .shooter-table td { border-bottom: 1px solid #e5e7eb; padding: 6px; }
          .shooter-table th { text-align: center; font-weight:600; }
        </style>
      </head>
      <body>
        <div class="lineup-card-printable">
          ${fragment}
          ${shooterRows}
          ${manualFields}
        </div>
        <script>window.focus(); window.print();</script>
      </body>
    </html>
  `;
}

/**
 * Share an image blob using Web Share API or download as fallback.
 * @param {Blob} blob - Image blob
 * @param {string} filename - Filename for the image
 * @param {string} title - Share title
 * @param {Function} showToast - Toast notification function
 * @returns {Promise<boolean>} Success status
 */
export async function shareImageBlob(blob, filename, title, showToast) {
  // Try Web Share API with file support
  if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'image/png' })] })) {
    try {
      const file = new File([blob], filename, { type: 'image/png' });
      await navigator.share({
        title,
        files: [file],
      });
      return true;
    } catch (err) {
      if (err.name === 'AbortError') {
        return false; // User cancelled
      }
      console.error('Share failed:', err);
      // Fall through to download
    }
  }

  // Fallback: download the image
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  if (showToast) {
    showToast('Lineup image downloaded', 'success');
  }
  return true;
}
