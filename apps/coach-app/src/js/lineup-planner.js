import { state, saveToLocalStorage } from './state.js';
import { debouncedSync } from './sync.js';
import { escapeHtml, escapeAttr } from '../../../../common/utils.js';
import { normalizeFavPositions } from './helpers.js';
import { haptic } from '../../../../common/share-utils.js';

// ========================================
// LINEUP PLANNER (Desktop 4-Quarter View)
// ========================================

// Position group helper
function getPosGroup(pos) {
  if (pos === 'GS' || pos === 'GA') return 'pos-shooter';
  if (pos === 'WA' || pos === 'C' || pos === 'WD') return 'pos-midcourt';
  return 'pos-defence';
}

// Get available players for the current game
function getPlannerAvailablePlayers() {
  const game = state.currentGame;
  if (!game) return [];
  const availableSet = game.availablePlayerIDs ? new Set(game.availablePlayerIDs) : null;
  return state.currentTeamData.players.filter((p) => !availableSet || availableSet.has(p.id));
}

// Build position stats from history (cached per render cycle)
let _plannerPositionStatsCache = null;
function getPlannerPositionStats() {
  if (_plannerPositionStatsCache) return _plannerPositionStatsCache;
  const team = state.currentTeamData;
  if (!team || !team.players || !team.games) return [];
  const players = team.players.filter((p) => !p.fillIn);
  const currentGameID = state.currentGame?.gameID;
  const games = team.games.filter((g) => g.lineup && (g.status === 'normal' || g.gameID === currentGameID));
  const positions = ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'];
  _plannerPositionStatsCache = players
    .map((player) => {
      const counts = { GS: 0, GA: 0, WA: 0, C: 0, WD: 0, GD: 0, GK: 0 };
      let offQuarters = 0;
      let captainCount = 0;
      games.forEach((game) => {
        let quartersOnCourt = 0;
        let playedInGame = false;
        ['Q1', 'Q2', 'Q3', 'Q4'].forEach((quarter) => {
          const qData = game.lineup[quarter];
          if (!qData) return;
          positions.forEach((pos) => {
            if (qData[pos] === player.name) {
              counts[pos]++;
              quartersOnCourt++;
              playedInGame = true;
            }
          });
        });
        if (playedInGame) offQuarters += 4 - quartersOnCourt;
        if (game.captain === player.name) captainCount++;
      });
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      const favPositions = new Set(normalizeFavPositions(player.favPosition));
      return { name: player.name, counts, offQuarters, captainCount, total, favPositions };
    })
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total);
  return _plannerPositionStatsCache;
}

window.openPlannerView = function () {
  const game = state.currentGame;
  if (!game) return;

  const subtitle = `Round ${escapeHtml(game.round || '?')} vs ${escapeHtml(game.opponent || '?')}`;
  document.getElementById('planner-subtitle').innerHTML = subtitle;

  state.selectedPlayer = null;
  state._plannerActiveQuarter = 'Q1';
  state._plannerUndoStack = [];
  state._plannerCopySource = null;
  state._plannerDragPlayer = null;
  state._plannerDragSource = null;

  renderPlannerView();
  updatePlannerUndoBtn();
  showView('planner-view');
};

window.closePlannerView = function () {
  state.selectedPlayer = null;
  state._plannerDragPlayer = null;
  renderLineupBuilder();
  showView('game-detail-view');
};

function renderPlannerView() {
  _plannerPositionStatsCache = null; // clear cache each render cycle
  renderPlannerQuarters();
  renderPlannerBench();
  renderPlannerPositionHistory();
  renderPlannerLoadSummary();
}

function renderPlannerQuarters() {
  const game = state.currentGame;
  if (!game) return;

  const lineup = game.lineup || {};
  const positions = ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'];
  const activeQ = state._plannerActiveQuarter;
  const availablePlayers = getPlannerAvailablePlayers();

  ['Q1', 'Q2', 'Q3', 'Q4'].forEach((q) => {
    const qData = lineup[q] || {};
    const container = document.getElementById(`planner-court-${q}`);
    const card = container.closest('.planner-quarter-card');

    // Highlight active quarter
    card.classList.toggle('planner-quarter-active', q === activeQ);

    // Count filled positions
    let filledCount = 0;
    positions.forEach((pos) => {
      if (qData[pos]) filledCount++;
    });

    // Update header (fill count + copy button)
    const headerRight = card.querySelector('.planner-quarter-header-right');
    if (headerRight) {
      const copySource = state._plannerCopySource;
      if (copySource && copySource !== q) {
        // Show as paste target
        headerRight.innerHTML = `
          <span class="planner-fill-count">${filledCount}/7</span>
          <button class="planner-copy-target" onclick="plannerPasteQuarter('${escapeAttr(copySource)}', '${escapeAttr(q)}')"
                  title="Paste from ${escapeAttr(copySource)}">Paste</button>`;
      } else if (copySource === q) {
        headerRight.innerHTML = `
          <span class="planner-fill-count">${filledCount}/7</span>
          <button class="planner-copy-btn" onclick="plannerCancelCopy()" style="color:var(--warning)">Cancel</button>`;
      } else {
        headerRight.innerHTML = `
          <span class="planner-fill-count">${filledCount}/7</span>
          <button class="planner-copy-btn" onclick="plannerStartCopy('${escapeAttr(q)}')" title="Copy lineup">Copy</button>`;
      }
    }

    // Render position slots with color coding + drag-and-drop
    container.innerHTML = positions
      .map((pos) => {
        const playerName = qData[pos] || '';
        const filled = playerName.length > 0;
        const isCaptain = filled && game.captain === playerName;
        const firstName = filled ? escapeHtml(playerName.split(' ')[0]) : '';
        const captainBadge = isCaptain ? '<span class="captain-badge">C</span>' : '';
        const posGroup = getPosGroup(pos);

        return `
        <div class="planner-slot ${filled ? 'filled' : ''}"
             data-quarter="${escapeAttr(q)}" data-position="${escapeAttr(pos)}"
             ${filled ? `draggable="true" ondragstart="plannerDragStart(event, '${escapeAttr(playerName)}', '${escapeAttr(q)}', '${escapeAttr(pos)}')"` : ''}
             ondragover="plannerDragOver(event)"
             ondragleave="plannerDragLeave(event)"
             ondrop="plannerDrop(event, '${escapeAttr(q)}', '${escapeAttr(pos)}')"
             onclick="plannerPositionClick('${escapeAttr(q)}', '${escapeAttr(pos)}', '${filled ? escapeAttr(playerName) : ''}')">
          <span class="planner-slot-label ${posGroup}">${escapeHtml(pos)}</span>
          ${
            filled
              ? `<span class="planner-slot-player">${firstName}${captainBadge}</span>`
              : `<span class="planner-slot-empty">—</span>`
          }
        </div>
      `;
      })
      .join('');

    // Off indicator: show who's sitting out this quarter
    const assignedNames = new Set(positions.map((pos) => qData[pos]).filter(Boolean));
    const offPlayers = availablePlayers.filter((p) => !assignedNames.has(p.name));
    const existingOff = card.querySelector('.planner-quarter-off');
    if (existingOff) existingOff.remove();
    if (offPlayers.length > 0 && filledCount > 0) {
      const offDiv = document.createElement('div');
      offDiv.className = 'planner-quarter-off';
      offDiv.innerHTML = `<span class="planner-quarter-off-label">Off:</span>${offPlayers.map((p) => escapeHtml(p.name.split(' ')[0])).join(', ')}`;
      card.appendChild(offDiv);
    }
  });
}

function renderPlannerBench() {
  const game = state.currentGame;
  if (!game) return;

  const activeQ = state._plannerActiveQuarter;
  const lineup = game.lineup || {};
  const qData = lineup[activeQ] || {};

  // Render quarter tabs
  const tabsContainer = document.getElementById('planner-bench-tabs');
  tabsContainer.innerHTML = ['Q1', 'Q2', 'Q3', 'Q4']
    .map(
      (q) =>
        `<button class="planner-bench-tab ${q === activeQ ? 'active' : ''}"
            onclick="setPlannerActiveQuarter('${escapeAttr(q)}')">${escapeHtml(q)}</button>`
    )
    .join('');

  // Get available players for active quarter
  const availablePlayers = getPlannerAvailablePlayers();
  const assignedNames = new Set(Object.values(qData).filter((v) => typeof v === 'string'));
  const benchPlayers = availablePlayers.filter((p) => !assignedNames.has(p.name));

  const listContainer = document.getElementById('planner-bench-list');
  listContainer.innerHTML =
    benchPlayers.length > 0
      ? benchPlayers
          .map((p) => {
            const favPositions = normalizeFavPositions(p.favPosition);
            const favTags =
              favPositions.length > 0
                ? `<span class="planner-bench-fav">${favPositions
                    .map((pos) => `<span class="planner-bench-fav-tag ${getPosGroup(pos)}">${escapeHtml(pos)}</span>`)
                    .join('')}</span>`
                : '';
            return `
          <div class="planner-bench-player ${state.selectedPlayer === p.name ? 'selected' : ''}"
               draggable="true"
               onclick="plannerSelectBenchPlayer('${escapeAttr(p.name)}')"
               ondragstart="plannerDragStart(event, '${escapeAttr(p.name)}', null, null)"
               onmouseenter="plannerHighlightPositions('${escapeAttr(p.name)}')"
               onmouseleave="plannerClearHighlights()">${escapeHtml(p.name)}${favTags}</div>`;
          })
          .join('')
      : '<span class="text-muted" style="padding: 8px;">All players assigned</span>';

  // Show/hide bench drop zone based on drag state
  const dropZone = document.getElementById('planner-bench-drop-zone');
  if (dropZone) {
    dropZone.classList.toggle('drag-active', !!state._plannerDragPlayer);
  }
}

function renderPlannerPositionHistory() {
  const container = document.getElementById('planner-history-grid');
  const positionStats = getPlannerPositionStats();

  if (positionStats.length === 0) {
    container.innerHTML = '<span class="text-muted">No past games</span>';
    return;
  }

  const positions = ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'];

  container.innerHTML = `
    <div class="planner-history-row planner-history-header-row">
      <span class="planner-history-name"></span>
      ${positions.map((pos) => `<span class="planner-history-pos ${getPosGroup(pos)}">${escapeHtml(pos)}</span>`).join('')}
      <span class="planner-history-pos planner-history-off">Off</span>
      <span class="planner-history-pos planner-history-capt">Cpt</span>
    </div>
    ${positionStats
      .map(
        (player) => `
      <div class="planner-history-row">
        <span class="planner-history-name">${escapeHtml(player.name.split(' ')[0])}</span>
        ${positions
          .map((pos) => {
            const c = player.counts[pos];
            return `<span class="planner-history-cell ${c > 0 ? 'has-count' : ''}">${c > 0 ? c : '—'}</span>`;
          })
          .join('')}
        <span class="planner-history-cell planner-history-off-cell ${player.offQuarters > 0 ? 'has-count' : ''}">${player.offQuarters > 0 ? player.offQuarters : '—'}</span>
        <span class="planner-history-cell planner-history-capt-cell ${player.captainCount > 0 ? 'has-count' : ''}">${player.captainCount > 0 ? player.captainCount : '—'}</span>
      </div>
    `
      )
      .join('')}
  `;
}

// Feature 4: Quarter Load Summary
function renderPlannerLoadSummary() {
  const game = state.currentGame;
  const container = document.getElementById('planner-load-summary');
  if (!game || !container) return;

  const lineup = game.lineup || {};
  const positions = ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'];
  const availablePlayers = getPlannerAvailablePlayers();
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

  const playerLoads = availablePlayers.map((p) => {
    const onQuarters = quarters.map((q) => {
      const qData = lineup[q] || {};
      return positions.some((pos) => qData[pos] === p.name);
    });
    const total = onQuarters.filter(Boolean).length;
    return { name: p.name, onQuarters, total };
  });

  // Sort: lowest play time first to highlight imbalances
  playerLoads.sort((a, b) => a.total - b.total);

  container.innerHTML = `
    <div class="planner-load-title">Player Load</div>
    <div class="planner-load-grid">
      ${playerLoads
        .map((p) => {
          const cls = p.total === 4 ? 'imbalance-high' : p.total === 0 ? 'imbalance-low' : '';
          return `
          <div class="planner-load-player ${cls}">
            <span class="planner-load-name">${escapeHtml(p.name.split(' ')[0])}</span>
            <span class="planner-load-dots">
              ${p.onQuarters.map((on) => `<span class="planner-load-dot ${on ? 'on' : ''}"></span>`).join('')}
            </span>
          </div>`;
        })
        .join('')}
    </div>
  `;
}

window.setPlannerActiveQuarter = function (quarter) {
  state._plannerActiveQuarter = quarter;
  state.selectedPlayer = null;
  renderPlannerView();
};

window.plannerSelectBenchPlayer = function (playerName) {
  state.selectedPlayer = state.selectedPlayer === playerName ? null : playerName;
  renderPlannerView();
};

window.plannerPositionClick = function (quarter, position, playerName) {
  if (state.selectedPlayer) {
    // Switch active quarter to match where they're assigning
    state._plannerActiveQuarter = quarter;
    plannerAssignPosition(quarter, position);
  } else if (playerName) {
    // Toggle captain
    toggleCaptain(playerName);
    // Re-render planner (toggleCaptain renders lineup builder which is hidden, harmless)
    renderPlannerView();
  }
};

// Feature 6: Undo support
function plannerPushUndo(quarter) {
  const game = state.currentGame;
  if (!game) return;
  if (!state._plannerUndoStack) state._plannerUndoStack = [];
  state._plannerUndoStack.push({
    quarter,
    snapshot: JSON.parse(JSON.stringify(game.lineup || {})),
  });
  // Limit stack size
  if (state._plannerUndoStack.length > 20) state._plannerUndoStack.shift();
  updatePlannerUndoBtn();
}

function updatePlannerUndoBtn() {
  const btn = document.getElementById('planner-undo-btn');
  if (btn) btn.disabled = !state._plannerUndoStack || state._plannerUndoStack.length === 0;
}

window.plannerUndo = function () {
  const game = state.currentGame;
  if (!game || !state._plannerUndoStack || state._plannerUndoStack.length === 0) return;
  const entry = state._plannerUndoStack.pop();
  game.lineup = entry.snapshot;
  state.selectedPlayer = null;
  saveToLocalStorage();
  debouncedSync();
  renderPlannerView();
  updatePlannerUndoBtn();
  showToast('Undone', 'info');
};

function plannerAssignPosition(quarter, position) {
  if (!ensureNotReadOnly('assignPosition')) return;
  const game = state.currentGame;
  if (!game) return;

  plannerPushUndo(quarter);

  if (!game.lineup) game.lineup = {};
  if (!game.lineup[quarter]) game.lineup[quarter] = {};

  // Remove player from any other position in this quarter
  Object.keys(game.lineup[quarter]).forEach((pos) => {
    if (game.lineup[quarter][pos] === state.selectedPlayer) {
      game.lineup[quarter][pos] = null;
    }
  });

  // Assign to new position
  game.lineup[quarter][position] = state.selectedPlayer;
  state.selectedPlayer = null;

  saveToLocalStorage();
  debouncedSync();
  renderPlannerView();
  updatePlannerUndoBtn();
}

// Feature 5: Copy quarter lineup
window.plannerStartCopy = function (sourceQ) {
  state._plannerCopySource = sourceQ;
  renderPlannerView();
};

window.plannerCancelCopy = function () {
  state._plannerCopySource = null;
  renderPlannerView();
};

window.plannerPasteQuarter = function (sourceQ, targetQ) {
  const game = state.currentGame;
  if (!game) return;

  plannerPushUndo(targetQ);

  if (!game.lineup) game.lineup = {};
  const source = game.lineup[sourceQ] || {};
  // Deep copy position assignments only (not score/notes fields)
  const positions = ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'];
  if (!game.lineup[targetQ]) game.lineup[targetQ] = {};
  positions.forEach((pos) => {
    game.lineup[targetQ][pos] = source[pos] || null;
  });

  state._plannerCopySource = null;
  saveToLocalStorage();
  debouncedSync();
  renderPlannerView();
  updatePlannerUndoBtn();
  showToast(`Copied ${sourceQ} to ${targetQ}`, 'success');
};

// Feature 7: Hover highlight positions
window.plannerHighlightPositions = function (playerName) {
  // Don't highlight while dragging
  if (state._plannerDragPlayer) return;

  const player = state.currentTeamData?.players?.find((p) => p.name === playerName);
  if (!player) return;

  const favPositions = new Set(normalizeFavPositions(player.favPosition));
  const posStats = getPlannerPositionStats();
  const playerStat = posStats.find((p) => p.name === playerName);

  // Get positions to highlight: favPositions + top 3 from history
  const highlightPositions = new Set(favPositions);
  if (playerStat) {
    const sorted = Object.entries(playerStat.counts)
      .filter(([, c]) => c > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    sorted.forEach(([pos]) => highlightPositions.add(pos));
  }

  // Add highlight class to matching empty slots
  document.querySelectorAll('#planner-view .planner-slot:not(.filled)').forEach((slot) => {
    const pos = slot.dataset.position;
    if (highlightPositions.has(pos)) {
      slot.classList.add('planner-slot-highlight');
    }
  });
};

window.plannerClearHighlights = function () {
  document.querySelectorAll('#planner-view .planner-slot-highlight').forEach((el) => {
    el.classList.remove('planner-slot-highlight');
  });
};

// Feature 8: Drag and Drop
window.plannerDragStart = function (event, playerName, fromQuarter, fromPosition) {
  state._plannerDragPlayer = playerName;
  state._plannerDragSource = fromQuarter && fromPosition ? { quarter: fromQuarter, position: fromPosition } : null;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', playerName);

  // Style the dragged element
  requestAnimationFrame(() => {
    event.target.classList.add('dragging');
  });

  // Show bench drop zone
  const dropZone = document.getElementById('planner-bench-drop-zone');
  if (dropZone && state._plannerDragSource) {
    dropZone.classList.add('drag-active');
  }
};

window.plannerDragOver = function (event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  event.currentTarget.classList.add('drag-over');
};

window.plannerDragLeave = function (event) {
  event.currentTarget.classList.remove('drag-over');
};

window.plannerDrop = function (event, targetQuarter, targetPosition) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');

  const playerName = state._plannerDragPlayer;
  const source = state._plannerDragSource;
  if (!playerName) return;

  const game = state.currentGame;
  if (!game) return;

  plannerPushUndo(targetQuarter);

  if (!game.lineup) game.lineup = {};
  if (!game.lineup[targetQuarter]) game.lineup[targetQuarter] = {};

  const currentOccupant = game.lineup[targetQuarter][targetPosition];

  // Remove dragged player from source position (if from a slot)
  if (source) {
    if (!game.lineup[source.quarter]) game.lineup[source.quarter] = {};
    game.lineup[source.quarter][source.position] = currentOccupant || null; // swap
  } else {
    // From bench: remove from any other position in target quarter
    Object.keys(game.lineup[targetQuarter]).forEach((pos) => {
      if (game.lineup[targetQuarter][pos] === playerName) {
        game.lineup[targetQuarter][pos] = null;
      }
    });
  }

  // Place dragged player in target
  game.lineup[targetQuarter][targetPosition] = playerName;

  state._plannerDragPlayer = null;
  state._plannerDragSource = null;
  state.selectedPlayer = null;

  saveToLocalStorage();
  debouncedSync();
  renderPlannerView();
  updatePlannerUndoBtn();
};

window.plannerDropToBench = function (event) {
  event.preventDefault();
  const dropZone = document.getElementById('planner-bench-drop-zone');
  if (dropZone) dropZone.classList.remove('drag-over');

  const source = state._plannerDragSource;
  if (!source) return; // only allow unassign from a slot

  const game = state.currentGame;
  if (!game) return;

  plannerPushUndo(source.quarter);

  if (game.lineup && game.lineup[source.quarter]) {
    game.lineup[source.quarter][source.position] = null;
  }

  state._plannerDragPlayer = null;
  state._plannerDragSource = null;

  saveToLocalStorage();
  debouncedSync();
  renderPlannerView();
  updatePlannerUndoBtn();
};

// Clean up drag state on dragend (fires even if drop didn't happen)
document.addEventListener('dragend', function () {
  state._plannerDragPlayer = null;
  state._plannerDragSource = null;
  document.querySelectorAll('#planner-view .dragging').forEach((el) => el.classList.remove('dragging'));
  document.querySelectorAll('#planner-view .drag-over').forEach((el) => el.classList.remove('drag-over'));
  const dropZone = document.getElementById('planner-bench-drop-zone');
  if (dropZone) dropZone.classList.remove('drag-active', 'drag-over');
});

// Feature 9: Auto-fill
window.plannerAutoFill = function () {
  const game = state.currentGame;
  if (!game) return;
  if (!ensureNotReadOnly('autoFill')) return;

  const activeQ = state._plannerActiveQuarter;
  const positions = ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'];
  const lineup = game.lineup || {};
  const qData = lineup[activeQ] || {};

  // Find empty positions
  const emptyPositions = positions.filter((pos) => !qData[pos]);
  if (emptyPositions.length === 0) {
    showToast('All positions filled', 'info');
    return;
  }

  // Get bench players for this quarter
  const availablePlayers = getPlannerAvailablePlayers();
  const assignedNames = new Set(Object.values(qData).filter((v) => typeof v === 'string'));
  const benchPlayers = availablePlayers.filter((p) => !assignedNames.has(p.name));

  if (benchPlayers.length === 0) {
    showToast('No players available', 'info');
    return;
  }

  // Count how many quarters each player is already assigned to (for load balancing)
  const playerQuarterCounts = {};
  availablePlayers.forEach((p) => {
    let count = 0;
    ['Q1', 'Q2', 'Q3', 'Q4'].forEach((q) => {
      if (q === activeQ) return; // don't count the quarter we're filling
      const qd = lineup[q] || {};
      if (positions.some((pos) => qd[pos] === p.name)) count++;
    });
    playerQuarterCounts[p.name] = count;
  });

  // Get position history stats
  const posStats = getPlannerPositionStats();
  const statsMap = {};
  posStats.forEach((p) => {
    statsMap[p.name] = p.counts;
  });

  plannerPushUndo(activeQ);

  if (!game.lineup) game.lineup = {};
  if (!game.lineup[activeQ]) game.lineup[activeQ] = {};

  // Score and assign greedily
  const assigned = new Set(assignedNames);
  let fillCount = 0;

  // Build all (player, position) pairs with scores
  const remaining = [...emptyPositions];
  const available = [...benchPlayers];

  while (remaining.length > 0 && available.length > 0) {
    let bestScore = -Infinity;
    let bestPair = null;

    for (const pos of remaining) {
      for (const player of available) {
        if (assigned.has(player.name)) continue;
        let score = 0;

        // Favourite position bonus
        const favs = normalizeFavPositions(player.favPosition);
        if (favs.includes(pos)) score += 10;

        // History bonus
        const hist = statsMap[player.name];
        if (hist && hist[pos]) score += hist[pos];

        // Load balance penalty
        score -= (playerQuarterCounts[player.name] || 0) * 5;

        if (score > bestScore) {
          bestScore = score;
          bestPair = { player, pos };
        }
      }
    }

    if (!bestPair) break;

    game.lineup[activeQ][bestPair.pos] = bestPair.player.name;
    assigned.add(bestPair.player.name);
    remaining.splice(remaining.indexOf(bestPair.pos), 1);
    available.splice(available.indexOf(bestPair.player), 1);
    fillCount++;
  }

  state.selectedPlayer = null;
  saveToLocalStorage();
  debouncedSync();
  renderPlannerView();
  updatePlannerUndoBtn();
  showToast(`Auto-filled ${activeQ}: ${fillCount} player${fillCount !== 1 ? 's' : ''} assigned`, 'success');
};
