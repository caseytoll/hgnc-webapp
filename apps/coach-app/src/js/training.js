import { state, saveToLocalStorage } from './state.js';
import { syncToGoogleSheets, debouncedSync } from './sync.js';
import { API_CONFIG } from './config.js';
import { escapeHtml, escapeAttr, generateId } from '../../../../common/utils.js';
import { formatAIContent, renderAIFeedback, getOpponentDifficulty } from './helpers.js';
import { contextHelpIcon } from './help.js';

export function renderTraining() {
  const container = document.getElementById('training-container');
  if (!container) return;

  const team = state.currentTeamData;
  if (!team || !team.games) {
    container.innerHTML = '<div class="empty-state"><p>No data available</p></div>';
    return;
  }

  // Migrate old format to new history array format
  if (team.trainingFocus && !team.trainingFocusHistory) {
    team.trainingFocusHistory = [team.trainingFocus];
    delete team.trainingFocus;
    saveToLocalStorage();
  }

  // Build both sections: Training Sessions + AI Training Focus
  container.innerHTML = `
    <div class="training-header-row">
      <span>Training</span>
      ${contextHelpIcon('training')}
    </div>
    ${renderTrainingSessions()}
    ${renderTrainingFocus()}
  `;
}

// Render Training Sessions section
function renderTrainingSessions() {
  const team = state.currentTeamData;
  const sessions = team.trainingSessions || [];
  const players = team.players || [];
  const playerCount = players.filter(p => !p.fillIn).length;

  // Sort sessions by date descending (most recent first)
  const sortedSessions = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));

  let sessionListHtml = '';
  if (sortedSessions.length === 0) {
    sessionListHtml = `
      <div class="empty-state" style="padding: var(--space-lg);">
        <p style="color: var(--text-secondary); font-size: 0.9rem;">No training sessions recorded yet.</p>
        <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 8px;">
          Record what you practiced and who attended to get AI insights on training effectiveness.
        </p>
      </div>
    `;
  } else {
    sessionListHtml = sortedSessions.map(session => {
      const dateObj = new Date(session.date + 'T12:00:00');
      const dateStr = dateObj.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
      const attendedCount = (session.attendedPlayerIDs || []).length;
      return `
        <div class="training-session-item" onclick="openTrainingDetail('${escapeAttr(session.sessionID)}')">
          <div class="training-session-date">${escapeHtml(dateStr)}</div>
          <div class="training-session-focus">${escapeHtml(session.focus || 'Training session')}</div>
          <div class="training-session-meta">${attendedCount}/${playerCount} players attended</div>
        </div>
      `;
    }).join('');
  }

  return `
    <div class="stats-section">
      <div class="stats-section-title" style="display: flex; justify-content: space-between; align-items: center;">
        <span>Training Sessions</span>
        <button class="btn btn-sm" onclick="openAddTrainingModal()">+ Add</button>
      </div>
      <div class="training-session-list">
        ${sessionListHtml}
      </div>
    </div>
  `;
}

// Render AI Training Focus section
function renderTrainingFocus() {
  const team = state.currentTeamData;

  // Count games with notes
  const gamesWithNotes = team.games.filter(g => {
    if (!g.lineup) return false;
    return ['Q1', 'Q2', 'Q3', 'Q4'].some(q => g.lineup[q]?.notes?.trim());
  });

  const history = team.trainingFocusHistory || [];
  const selectedIndex = state.selectedTrainingHistoryIndex || 0;
  const currentNoteCount = countTotalNotes();

  // Empty state - no notes recorded
  if (gamesWithNotes.length === 0) {
    return `
      <div class="stats-section">
        <div class="stats-section-title">AI Training Focus</div>
        <div class="empty-state">
          <p style="color: var(--text-secondary); font-size: 0.9rem;"><strong>No game notes recorded yet.</strong></p>
          <p style="margin-top: 8px; font-size: 0.85rem; color: var(--text-muted);">
            To get personalized training suggestions:<br>
            1. Open a game from the Schedule<br>
            2. Go to the Scoring tab<br>
            3. Use the quick-insert buttons to record observations<br><br>
            The more notes you add, the better the suggestions will be!
          </p>
        </div>
      </div>
    `;
  }

  // Has notes but no history yet - show generate button
  if (history.length === 0) {
    return `
      <div class="stats-section">
        <div class="stats-section-title">AI Training Focus</div>
        <p class="training-intro">Based on your game notes and performance data, generate AI-powered training suggestions.</p>
        <div class="training-summary" style="background: var(--bg-card); border-radius: var(--radius-md); padding: var(--space-md); margin-bottom: var(--space-md);">
          <div style="display: flex; gap: var(--space-lg); flex-wrap: wrap;">
            <div>
              <div style="font-size: 1.5rem; font-weight: 600; color: var(--primary-400);">${gamesWithNotes.length}</div>
              <div style="font-size: 0.8rem; color: var(--text-secondary);">Games with Notes</div>
            </div>
            <div>
              <div style="font-size: 1.5rem; font-weight: 600; color: var(--primary-400);">${currentNoteCount}</div>
              <div style="font-size: 0.8rem; color: var(--text-secondary);">Total Notes</div>
            </div>
          </div>
        </div>
        <div id="training-focus-container">
          <button class="btn btn-primary" onclick="fetchTrainingFocus()">
            Generate Training Suggestions
          </button>
        </div>
      </div>
    `;
  }

  // Has history - show tabs and selected entry
  const selected = history[selectedIndex] || history[0];
  const selectedDate = new Date(selected.generatedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  const isLatest = selectedIndex === 0;
  const staleWarning = isLatest && currentNoteCount > (selected.noteCount || 0)
    ? `<div class="ai-stale-warning" style="background: var(--warning-bg, rgba(245, 158, 11, 0.1)); padding: 8px 12px; border-radius: 8px; margin-bottom: 12px; font-size: 13px;">New notes added since last analysis. Generate new suggestions to include them.</div>`
    : '';

  let html = formatAIContent(selected.text);

  // Build history tabs
  const historyTabs = history.map((entry, idx) => {
    const date = new Date(entry.generatedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
    const isSelected = idx === selectedIndex;
    return `<button class="training-history-tab ${isSelected ? 'active' : ''}" onclick="selectTrainingHistory(${idx})">${idx === 0 ? 'Latest' : date}</button>`;
  }).join('');

  return `
    <div class="stats-section">
      <div class="stats-section-title" style="display: flex; justify-content: space-between; align-items: center;">
        <span>AI Training Focus</span>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-sm" onclick="shareAIReport('training')">Share</button>
          <button class="btn btn-sm" onclick="fetchTrainingFocus()">+ New</button>
        </div>
      </div>

      ${history.length > 1 ? `
      <div class="training-history-tabs" style="display: flex; gap: 8px; margin-bottom: var(--space-md); overflow-x: auto; padding-bottom: 4px;">
        ${historyTabs}
      </div>
      ` : ''}

      ${staleWarning}
      <div class="ai-insights-content">${html}</div>
      <div class="ai-meta" style="margin-top: 12px; font-size: 12px; color: var(--text-tertiary);">
        Generated: ${escapeHtml(selectedDate)} (from ${selected.noteCount || 0} notes across ${selected.gameCount || 0} games)
        ${selected.recentGames ? ` • Focused on last ${selected.recentGames} games` : ''}
      </div>
      ${renderAIFeedback('training')}
      <div id="training-focus-container"></div>
    </div>
  `;
}

// Select a training history entry to view
window.selectTrainingHistory = function(index) {
  state.selectedTrainingHistoryIndex = index;
  renderTraining();
};

// ========================================
// TRAINING SESSION CRUD FUNCTIONS
// ========================================

// Open Add Training Session modal
window.openAddTrainingModal = function() {
  const team = state.currentTeamData;
  const players = (team?.players || []).filter(p => !p.fillIn);
  const today = new Date().toISOString().split('T')[0];

  // Build player attendance checklist (all checked by default)
  const playerCheckboxes = players.map(p => `
    <label class="attendance-checkbox">
      <input type="checkbox" value="${escapeAttr(p.id)}" checked>
      <span>${escapeHtml(p.name)}</span>
    </label>
  `).join('');

  openModal('Add Training Session', `
    <div class="form-group">
      <label class="form-label">Date</label>
      <input type="date" class="form-input" id="training-date" value="${today}">
    </div>
    <div class="form-group">
      <label class="form-label">Focus <span class="form-label-desc">(what was the main focus?)</span></label>
      <input type="text" class="form-input" id="training-focus" placeholder="e.g. Footwork and landing technique" maxlength="100">
    </div>
    <div class="form-group">
      <label class="form-label">Notes <span class="form-label-desc">(optional observations)</span></label>
      <textarea class="form-textarea" id="training-notes" rows="3" placeholder="What did you observe? Any players who stood out?" maxlength="500"></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Attendance <span class="form-label-desc">(uncheck absent players)</span></label>
      <div class="attendance-grid" id="attendance-grid">
        ${playerCheckboxes}
      </div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="addTrainingSession()">Add Session</button>
  `);
};

// Add a new training session
window.addTrainingSession = async function() {
  const dateInput = document.getElementById('training-date');
  const focusInput = document.getElementById('training-focus');
  const notesInput = document.getElementById('training-notes');
  const attendanceGrid = document.getElementById('attendance-grid');

  const date = dateInput.value.trim();
  const focus = focusInput.value.trim();
  const notes = notesInput.value.trim();

  // Validation
  if (!date) {
    showToast('Please select a date', 'error');
    dateInput.focus();
    return;
  }

  if (!focus) {
    showToast('Please enter the training focus', 'error');
    focusInput.focus();
    return;
  }

  // Collect attended player IDs
  const attendedPlayerIDs = [];
  attendanceGrid.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
    attendedPlayerIDs.push(cb.value);
  });

  const newSession = {
    sessionID: `ts-${Date.now()}`,
    date: date,
    attendedPlayerIDs: attendedPlayerIDs,
    focus: focus,
    notes: notes
  };

  // Initialize trainingSessions array if needed
  if (!state.currentTeamData.trainingSessions) {
    state.currentTeamData.trainingSessions = [];
  }

  state.currentTeamData.trainingSessions.push(newSession);

  saveToLocalStorage();
  closeModal();
  renderTraining();

  // Sync to Google Sheets
  if (navigator.onLine) {
    try {
      await syncToGoogleSheets();
      showToast('Training session added (synced)', 'success');
    } catch (err) {
      console.error('[Sync] Failed to sync training session:', err);
      showToast('Session added locally. Sync failed.', 'warning');
    }
  } else {
    showToast('Training session added', 'success');
  }
};

// Open training session detail view
window.openTrainingDetail = function(sessionID) {
  const team = state.currentTeamData;
  const session = (team.trainingSessions || []).find(s => s.sessionID === sessionID);
  if (!session) {
    showToast('Session not found', 'error');
    return;
  }

  const players = (team.players || []).filter(p => !p.fillIn);
  const dateObj = new Date(session.date + 'T12:00:00');
  const dateStr = dateObj.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Build attendance list
  const attendedSet = new Set(session.attendedPlayerIDs || []);
  const attendanceList = players.map(p => {
    const attended = attendedSet.has(p.id);
    return `
      <div class="attendance-item ${attended ? 'attended' : 'missed'}">
        <span class="attendance-icon">${attended ? '✓' : '✗'}</span>
        <span class="attendance-name">${escapeHtml(p.name)}</span>
      </div>
    `;
  }).join('');

  const attendedCount = session.attendedPlayerIDs?.length || 0;
  const missedCount = players.length - attendedCount;

  openModal(escapeHtml(session.focus || 'Training Session'), `
    <div class="training-detail">
      <div class="training-detail-date">${escapeHtml(dateStr)}</div>

      ${session.notes ? `
        <div class="training-detail-section">
          <div class="training-detail-label">Coach Notes</div>
          <div class="training-detail-notes">${escapeHtml(session.notes)}</div>
        </div>
      ` : ''}

      <div class="training-detail-section">
        <div class="training-detail-label">Attendance (${attendedCount} present, ${missedCount} absent)</div>
        <div class="attendance-list">
          ${attendanceList}
        </div>
      </div>
    </div>
  `, `
    <button class="btn btn-ghost btn-danger" onclick="deleteTrainingSession('${escapeAttr(sessionID)}')">Delete</button>
    <button class="btn btn-ghost" onclick="closeModal()">Close</button>
    <button class="btn btn-primary" onclick="openEditTrainingModal('${escapeAttr(sessionID)}')">Edit</button>
  `);
};

// Open edit training session modal
window.openEditTrainingModal = function(sessionID) {
  const team = state.currentTeamData;
  const session = (team.trainingSessions || []).find(s => s.sessionID === sessionID);
  if (!session) {
    showToast('Session not found', 'error');
    return;
  }

  const players = (team.players || []).filter(p => !p.fillIn);
  const attendedSet = new Set(session.attendedPlayerIDs || []);

  // Build player attendance checklist with current state
  const playerCheckboxes = players.map(p => `
    <label class="attendance-checkbox">
      <input type="checkbox" value="${escapeAttr(p.id)}" ${attendedSet.has(p.id) ? 'checked' : ''}>
      <span>${escapeHtml(p.name)}</span>
    </label>
  `).join('');

  openModal('Edit Training Session', `
    <div class="form-group">
      <label class="form-label">Date</label>
      <input type="date" class="form-input" id="edit-training-date" value="${escapeAttr(session.date)}">
    </div>
    <div class="form-group">
      <label class="form-label">Focus</label>
      <input type="text" class="form-input" id="edit-training-focus" value="${escapeAttr(session.focus || '')}" maxlength="100">
    </div>
    <div class="form-group">
      <label class="form-label">Notes</label>
      <textarea class="form-textarea" id="edit-training-notes" rows="3" maxlength="500">${escapeHtml(session.notes || '')}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Attendance</label>
      <div class="attendance-grid" id="edit-attendance-grid">
        ${playerCheckboxes}
      </div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="openTrainingDetail('${escapeAttr(sessionID)}')">Cancel</button>
    <button class="btn btn-primary" onclick="saveTrainingSession('${escapeAttr(sessionID)}')">Save Changes</button>
  `);
};

// Save training session edits
window.saveTrainingSession = async function(sessionID) {
  const dateInput = document.getElementById('edit-training-date');
  const focusInput = document.getElementById('edit-training-focus');
  const notesInput = document.getElementById('edit-training-notes');
  const attendanceGrid = document.getElementById('edit-attendance-grid');

  const date = dateInput.value.trim();
  const focus = focusInput.value.trim();
  const notes = notesInput.value.trim();

  // Validation
  if (!date) {
    showToast('Please select a date', 'error');
    return;
  }

  if (!focus) {
    showToast('Please enter the training focus', 'error');
    return;
  }

  // Collect attended player IDs
  const attendedPlayerIDs = [];
  attendanceGrid.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
    attendedPlayerIDs.push(cb.value);
  });

  // Find and update the session
  const sessions = state.currentTeamData.trainingSessions || [];
  const sessionIndex = sessions.findIndex(s => s.sessionID === sessionID);
  if (sessionIndex === -1) {
    showToast('Session not found', 'error');
    return;
  }

  sessions[sessionIndex] = {
    ...sessions[sessionIndex],
    date: date,
    focus: focus,
    notes: notes,
    attendedPlayerIDs: attendedPlayerIDs
  };

  saveToLocalStorage();
  closeModal();
  renderTraining();

  // Sync to Google Sheets
  if (navigator.onLine) {
    try {
      await syncToGoogleSheets();
      showToast('Training session updated (synced)', 'success');
    } catch (err) {
      console.error('[Sync] Failed to sync training session update:', err);
      showToast('Session updated locally. Sync failed.', 'warning');
    }
  } else {
    showToast('Training session updated', 'success');
  }
};

// Delete a training session
window.deleteTrainingSession = async function(sessionID) {
  if (!confirm('Delete this training session?')) return;

  const sessions = state.currentTeamData.trainingSessions || [];
  state.currentTeamData.trainingSessions = sessions.filter(s => s.sessionID !== sessionID);

  saveToLocalStorage();
  closeModal();
  renderTraining();

  // Sync to Google Sheets
  if (navigator.onLine) {
    try {
      await syncToGoogleSheets();
      showToast('Training session deleted (synced)', 'success');
    } catch (err) {
      console.error('[Sync] Failed to sync training session delete:', err);
      showToast('Session deleted locally. Sync failed.', 'warning');
    }
  } else {
    showToast('Training session deleted', 'success');
  }
};

// Count total notes across all games
function countTotalNotes() {
  const games = state.currentTeamData?.games || [];
  let count = 0;
  games.forEach(g => {
    if (!g.lineup) return;
    ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
      if (g.lineup[q]?.notes?.trim()) count++;
    });
  });
  return count;
}

// Calculate game result (W/L/D) from game data
function calculateGameResult(game) {
  if (!game.lineup || game.status === 'abandoned' || game.status === 'bye') return '-';

  let us = 0, them = 0;
  ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
    const qData = game.lineup[q] || {};
    us += (parseInt(qData.ourGsGoals) || 0) + (parseInt(qData.ourGaGoals) || 0);
    them += (parseInt(qData.oppGsGoals) || 0) + (parseInt(qData.oppGaGoals) || 0);
  });

  if (us > them) return 'W';
  if (them > us) return 'L';
  return 'D';
}

// Count keyword frequency in notes
function countNoteKeywords(allGameNotes) {
  const frequency = {};
  const keywords = ['Defence', 'Defense', 'Goalers', 'Midcourt', 'Team', 'Opp', 'transition', 'passing', 'shooting', 'pressure', 'turnover'];

  // Add player names as keywords
  const players = state.currentTeamData?.players || [];
  players.forEach(p => {
    const firstName = p.name.split(' ')[0];
    keywords.push(firstName);
  });

  allGameNotes.forEach(game => {
    game.notes.forEach(n => {
      const text = n.text.toLowerCase();
      keywords.forEach(kw => {
        if (text.toLowerCase().includes(kw.toLowerCase())) {
          frequency[kw] = (frequency[kw] || 0) + 1;
        }
      });
    });
  });

  // Filter to only keywords that appear
  return Object.fromEntries(
    Object.entries(frequency).filter(([_, count]) => count > 0)
  );
}

// Identify weak quarters based on stats
function identifyWeakQuarters(quarterStats) {
  if (!quarterStats) return null;

  const weakQuarters = {};
  ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
    const qs = quarterStats[q];
    if (qs && qs.games > 0) {
      const avgDiff = (qs.diff / qs.games).toFixed(1);
      if (parseFloat(avgDiff) < -1) {
        weakQuarters[q] = { avgDiff: parseFloat(avgDiff) };
      }
    }
  });

  return Object.keys(weakQuarters).length > 0 ? weakQuarters : null;
}

// Build payload for training focus API with rolling window
function buildTrainingPayload() {
  const games = state.currentTeamData?.games || [];
  const players = state.currentTeamData?.players || [];
  const trainingSessions = state.currentTeamData?.trainingSessions || [];
  const { advanced, leaderboards } = state.analytics || {};

  // Sort games by round (descending) to get most recent first
  const sortedGames = [...games]
    .filter(g => g.lineup)
    .sort((a, b) => (parseInt(b.round) || 0) - (parseInt(a.round) || 0));

  // Collect notes from all games
  const allGameNotes = sortedGames
    .map(g => {
      const gameNotes = ['Q1', 'Q2', 'Q3', 'Q4']
        .map(q => ({ quarter: q, text: g.lineup?.[q]?.notes || '' }))
        .filter(n => n.text.trim());

      return {
        round: g.round,
        opponent: g.opponent,
        date: g.date,
        result: calculateGameResult(g),
        notes: gameNotes
      };
    })
    .filter(g => g.notes.length > 0);

  // Split into recent (last 3 games with notes) and earlier
  const recentGameNotes = allGameNotes.slice(0, 3);
  const earlierGameNotes = allGameNotes.slice(3);

  // Count keyword frequency (weight recent games higher)
  const recentNoteFrequency = countNoteKeywords(recentGameNotes);
  const earlierNoteFrequency = countNoteKeywords(earlierGameNotes);

  // Build training sessions data for AI context
  const trainingSessionsForAI = buildTrainingSessionsForAI(trainingSessions, players);

  // Calculate player training attendance rates
  const playerTrainingAttendance = calculatePlayerTrainingAttendance(trainingSessions, players);

  // Build issue timeline correlating game notes with training sessions
  const issueTimeline = buildIssueTimeline(allGameNotes, trainingSessions, players);

  return {
    teamName: state.currentTeam?.teamName || 'Team',
    seasonRecord: {
      wins: advanced?.wins || 0,
      losses: advanced?.losses || 0,
      draws: advanced?.draws || 0,
      gameCount: advanced?.gameCount || 0,
      winRate: advanced?.winRate || 0
    },
    recentGameNotes,      // Last 3 games with notes (focus area)
    earlierGameNotes,     // Older games (context for persistent issues)
    recentNoteFrequency,  // Keywords from recent games
    earlierNoteFrequency, // Keywords from earlier season
    weakQuarters: identifyWeakQuarters(advanced?.quarterStats),
    playerStats: leaderboards?.offensive?.topScorersByTotal?.slice(0, 5).map(s => ({
      name: s.name,
      goals: s.goals,
      quarters: s.quarters
    })) || [],
    form: advanced?.form || [],
    // NEW: Training session context
    trainingSessions: trainingSessionsForAI,
    playerTrainingAttendance,
    issueTimeline
  };
}

// Build training sessions data for AI analysis
function buildTrainingSessionsForAI(trainingSessions, players) {
  if (!trainingSessions || trainingSessions.length === 0) return [];

  // Sort sessions by date descending (most recent first)
  const sortedSessions = [...trainingSessions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10); // Limit to last 10 sessions

  // Create player ID to name map
  const playerMap = new Map();
  players.forEach(p => {
    playerMap.set(p.id, p.name.split(' ')[0]); // Use first name
  });

  // Get all non-fill-in player IDs
  const regularPlayerIds = new Set(players.filter(p => !p.fillIn).map(p => p.id));

  return sortedSessions.map(session => {
    const attendedNames = (session.attendedPlayerIDs || [])
      .filter(id => playerMap.has(id))
      .map(id => playerMap.get(id));

    const missedNames = [];
    regularPlayerIds.forEach(id => {
      if (!(session.attendedPlayerIDs || []).includes(id) && playerMap.has(id)) {
        missedNames.push(playerMap.get(id));
      }
    });

    return {
      date: session.date,
      focus: session.focus,
      notes: session.notes || '',
      attended: attendedNames,
      missed: missedNames
    };
  });
}

// Calculate player training attendance rates
function calculatePlayerTrainingAttendance(trainingSessions, players) {
  if (!trainingSessions || trainingSessions.length === 0) return {};

  const regularPlayers = players.filter(p => !p.fillIn);
  const attendance = {};

  regularPlayers.forEach(player => {
    const firstName = player.name.split(' ')[0];
    let attended = 0;
    let missed = 0;

    trainingSessions.forEach(session => {
      if ((session.attendedPlayerIDs || []).includes(player.id)) {
        attended++;
      } else {
        missed++;
      }
    });

    const total = attended + missed;
    if (total > 0) {
      attendance[firstName] = {
        attended,
        missed,
        rate: Math.round((attended / total) * 100)
      };
    }
  });

  return attendance;
}

// Build issue timeline correlating game notes with training sessions
function buildIssueTimeline(allGameNotes, trainingSessions, players) {
  if (!allGameNotes || allGameNotes.length === 0) return [];

  // Common issue keywords to track
  const issueKeywords = [
    { keyword: 'stepping', aliases: ['step', 'stepped', 'footwork'] },
    { keyword: 'turnover', aliases: ['turnovers', 'giving away'] },
    { keyword: 'passing', aliases: ['passes', 'pass', 'intercept'] },
    { keyword: 'shooting', aliases: ['shot', 'shots', 'missing', 'accuracy'] },
    { keyword: 'pressure', aliases: ['pressured', 'under pressure'] },
    { keyword: 'timing', aliases: ['late', 'early', 'slow'] },
    { keyword: 'defence', aliases: ['defense', 'defending', 'marking'] }
  ];

  // Create player name map for detection
  const playerFirstNames = new Map();
  players.forEach(p => {
    const firstName = p.name.split(' ')[0].toLowerCase();
    playerFirstNames.set(firstName, p);
  });

  const issues = [];

  issueKeywords.forEach(({ keyword, aliases }) => {
    const allTerms = [keyword, ...aliases].map(t => t.toLowerCase());
    const gamesMentioningIssue = [];
    const playersWithIssue = new Set();

    // Find all games mentioning this issue
    allGameNotes.forEach(game => {
      let issueFound = false;
      game.notes.forEach(note => {
        const noteLower = note.text.toLowerCase();
        if (allTerms.some(term => noteLower.includes(term))) {
          issueFound = true;

          // Check if any player names appear near the issue
          playerFirstNames.forEach((player, firstName) => {
            if (noteLower.includes(firstName)) {
              playersWithIssue.add(player.name.split(' ')[0]);
            }
          });
        }
      });

      if (issueFound) {
        gamesMentioningIssue.push({
          round: game.round,
          date: game.date
        });
      }
    });

    if (gamesMentioningIssue.length === 0) return;

    // Find the first mention
    const sortedGamesByDate = [...gamesMentioningIssue].sort((a, b) =>
      new Date(a.date || 0) - new Date(b.date || 0)
    );
    const firstMention = sortedGamesByDate[0];
    const firstMentionDate = firstMention?.date ? new Date(firstMention.date) : null;

    // Find training sessions that happened after the first mention and address this issue
    const relevantTrainingSessions = [];
    if (firstMentionDate && trainingSessions.length > 0) {
      trainingSessions.forEach(session => {
        const sessionDate = new Date(session.date);
        if (sessionDate > firstMentionDate) {
          // Check if session focus relates to the issue
          const focusLower = (session.focus || '').toLowerCase();
          const notesLower = (session.notes || '').toLowerCase();
          if (allTerms.some(term => focusLower.includes(term) || notesLower.includes(term))) {
            const attendedNames = (session.attendedPlayerIDs || [])
              .map(id => {
                const player = players.find(p => p.id === id);
                return player ? player.name.split(' ')[0] : null;
              })
              .filter(n => n);

            const missedNames = players
              .filter(p => !p.fillIn && !(session.attendedPlayerIDs || []).includes(p.id))
              .map(p => p.name.split(' ')[0]);

            relevantTrainingSessions.push({
              date: session.date,
              focus: session.focus,
              attended: attendedNames,
              missed: missedNames
            });
          }
        }
      });
    }

    // Check if issue still appears in recent games (last 2)
    const recentGames = gamesMentioningIssue.slice(0, 2);
    const stillAppearingFor = [];

    if (recentGames.length > 0 && playersWithIssue.size > 0) {
      // Check which players who had the issue are still being mentioned
      playersWithIssue.forEach(playerName => {
        let stillAppears = false;
        recentGames.forEach(game => {
          const gameData = allGameNotes.find(g => g.round === game.round);
          if (gameData) {
            gameData.notes.forEach(note => {
              const noteLower = note.text.toLowerCase();
              if (noteLower.includes(playerName.toLowerCase()) &&
                  allTerms.some(term => noteLower.includes(term))) {
                stillAppears = true;
              }
            });
          }
        });
        if (stillAppears) {
          stillAppearingFor.push(playerName);
        }
      });
    }

    issues.push({
      issue: keyword,
      firstMentioned: `R${firstMention?.round || '?'}`,
      playersWithIssue: Array.from(playersWithIssue),
      trainingSinceFirst: relevantTrainingSessions,
      stillAppearingFor
    });
  });

  // Only return issues that have enough data to be useful
  return issues.filter(i =>
    i.playersWithIssue.length > 0 ||
    i.trainingSinceFirst.length > 0
  );
}

// Fetch training focus suggestions from AI
window.fetchTrainingFocus = async function(forceRefresh = false) {
  const container = document.getElementById('training-focus-container');

  if (!state.currentTeam || !state.currentTeamData) {
    showToast('No team data loaded', 'error');
    return;
  }

  // Show loading state
  if (container) {
    container.innerHTML = '<div class="ai-loading"><div class="spinner"></div><p>Analyzing game notes...</p></div>';
  }

  try {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
    const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;
    const trainingData = buildTrainingPayload();

    // POST training data to backend
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        api: true,
        action: 'getTrainingFocus',
        trainingData: trainingData
      }),
      redirect: 'follow'
    });
    const data = await response.json();

    if (data.success && data.suggestions) {
      // Create new history entry
      const currentNoteCount = countTotalNotes();
      const currentGameCount = state.analytics?.advanced?.gameCount || 0;
      const newEntry = {
        text: data.suggestions,
        generatedAt: new Date().toISOString(),
        gameCount: currentGameCount,
        noteCount: currentNoteCount,
        recentGames: trainingData.recentGameNotes.length
      };

      // Add to history (newest first, max 5 entries)
      if (!state.currentTeamData.trainingFocusHistory) {
        state.currentTeamData.trainingFocusHistory = [];
      }
      state.currentTeamData.trainingFocusHistory.unshift(newEntry);
      if (state.currentTeamData.trainingFocusHistory.length > 5) {
        state.currentTeamData.trainingFocusHistory.pop();
      }

      // Reset selected index to show latest
      state.selectedTrainingHistoryIndex = 0;

      // Remove old format if present
      delete state.currentTeamData.trainingFocus;

      // Save and sync
      saveToLocalStorage();
      await syncToGoogleSheets();

      // Re-render the training tab to show results
      renderTraining();

      showToast('Training suggestions generated', 'success');
    } else {
      throw new Error(data.error || 'Failed to get training suggestions');
    }
  } catch (err) {
    console.error('[Training Focus] Error:', err);
    if (container) {
      container.innerHTML = '<div class="ai-error"><p>Failed to get suggestions: ' + escapeHtml(err.message) + '</p>' +
        '<button class="btn btn-primary" onclick="fetchTrainingFocus(true)">Try Again</button></div>';
    }
  }
};
