// ========================================
// MAIN APP, LADDER, SCHEDULE, & ROSTER RENDERING
// ========================================

import { API_CONFIG } from './config.js';
import { state } from './state.js';
import {
  escapeHtml,
  escapeAttr,
  formatDate,
  formatDateTime
} from '../../../../common/utils.js';
import { clubSlugFor } from '../../../../common/utils.js';
import clubLogos from '../../../../data/club-logos.json';

// ========================================
// MAIN APP RENDERING
// ========================================

function renderMainApp() {
  const team = state.currentTeam;
  const data = state.currentTeamData;
  const stats = state.stats;

  // Update header - textContent is safe, no escaping needed
  document.getElementById('current-team-name').textContent = team.teamName;
  document.getElementById('current-team-season').textContent = `${team.year} ${team.season}`;

  // REMOVE any dynamically rendered back/switch team button in the top bar if present
  const topBar = document.querySelector('#main-app-view .top-bar');
  if (topBar) {
    const legacyBackBtn = topBar.querySelector('.icon-btn.switch-team');
    if (legacyBackBtn) legacyBackBtn.remove();
  }

  // Update quick stats
  document.getElementById('qs-record').textContent = `${stats.wins}-${stats.losses}-${stats.draws}`;

  const gdSign = stats.goalDiff >= 0 ? '+' : '';
  document.getElementById('qs-gd').textContent = `${gdSign}${stats.goalDiff}`;
  document.getElementById('qs-gd').className = `quick-stat-value ${stats.goalDiff >= 0 ? 'text-success' : 'text-error'}`;

  // Next game (find earliest round without scores)
  const nextGame = data.games
    .filter(g => !g.scores)
    .sort((a, b) => a.round - b.round)[0];
  document.getElementById('qs-next').textContent = nextGame ? `R${nextGame.round}` : 'Done';

  // Render content
  renderSchedule();
  renderRoster();

  // Render Ladder Tab if ladderUrl is set
  renderLadderTab(team);
}
// Expose for cross-module access
window.renderMainApp = renderMainApp;

// ========================================
// LADDER TAB RENDERING
// ========================================

function renderLadderTab(team) {
  const navContainer = document.querySelector('.bottom-nav');
  const tabPanelContainer = document.querySelector('.tab-content-area');
  if (!navContainer || !tabPanelContainer) return;

  // Remove existing ladder tab if present
  const existingNav = navContainer.querySelector('.nav-item[data-tab="ladder"]');
  if (existingNav) existingNav.remove();
  const existingPanel = tabPanelContainer.querySelector('#tab-ladder');
  if (existingPanel) existingPanel.remove();

  // Determine ladder source: NFNL (ladderUrl), Squadi (resultsApi), or GameDay (resultsApi)
  const fixtureConfig = window.parseFixtureConfig(team.resultsApi);
  const squadiConfig = fixtureConfig && fixtureConfig.source === 'squadi' ? fixtureConfig : null;
  const gamedayConfig = fixtureConfig && fixtureConfig.source === 'gameday' ? fixtureConfig : null;
  const hasLadder = team.ladderUrl || squadiConfig || gamedayConfig;
  if (!hasLadder) return;

  // Add Ladder tab to nav (insert before the Stats button to keep order)
  const ladderNav = document.createElement('button');
  ladderNav.className = 'nav-item';
  ladderNav.dataset.tab = 'ladder';
  ladderNav.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <line x1="6" y1="2" x2="6" y2="22" />
      <line x1="18" y1="2" x2="18" y2="22" />
      <line x1="6" y1="6" x2="18" y2="6" />
      <line x1="6" y1="12" x2="18" y2="12" />
      <line x1="6" y1="18" x2="18" y2="18" />
    </svg>
    <span>Ladder</span>
  `;
  ladderNav.setAttribute('aria-label', 'Ladder');
  ladderNav.title = 'Ladder';
  ladderNav.onclick = () => window.switchTab('ladder');
  const statsBtn = navContainer.querySelector('.nav-item[data-tab="stats"]');
  if (statsBtn) {
    navContainer.insertBefore(ladderNav, statsBtn);
  } else {
    navContainer.appendChild(ladderNav);
  }

  // Add Ladder tab panel
  const ladderPanel = document.createElement('div');
  ladderPanel.className = 'tab-panel';
  ladderPanel.id = 'tab-ladder';
  ladderPanel.innerHTML = `<div id="ladder-content"><div class="ladder-loading">Loading ladder...</div></div>`;
  tabPanelContainer.appendChild(ladderPanel);

  // Fetch ladder data from appropriate source (with daily localStorage cache)
  const ladderPromise = (squadiConfig || gamedayConfig)
    ? getCachedLadder(team.teamID, () => fetchSquadiLadder(team.teamID))
    : getCachedLadder(team.teamID, () => fetch(`/ladder-${team.teamID}.json`).then(res => res.json()));

  // Use the configured team name for highlighting
  const highlightName = squadiConfig ? (squadiConfig.squadiTeamName || team.teamName || '')
    : gamedayConfig ? (gamedayConfig.teamName || team.teamName || '')
    : (team.teamName || '');

  ladderPromise
    .then(data => {
      const ladderDiv = ladderPanel.querySelector('#ladder-content');
      if (!data.ladder || !data.ladder.rows || !data.ladder.headers) {
        console.warn('[Ladder] No ladder data. Full response:', JSON.stringify(data));
        ladderDiv.innerHTML = `<div class="ladder-error">No ladder data available yet.</div>`;
        return;
      }
      renderLadderTable(ladderDiv, data, team, highlightName);
    })
    .catch(() => {
      const ladderDiv = ladderPanel.querySelector('#ladder-content');
      ladderDiv.innerHTML = `<div class="ladder-error">Failed to load ladder. Please try again later.</div>`;
    });
}

function getCachedLadder(teamID, fetchFn, force) {
  const cacheKey = `ladder.cache.${teamID}`;
  const today = new Date().toISOString().slice(0, 10);
  if (!force) {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey));
      if (cached && cached.date === today && cached.data) {
        return Promise.resolve(cached.data);
      }
    } catch (_e) { /* corrupt cache, refetch */ }
  }
  return fetchFn().then(data => {
    // Only cache when we have real rows — don't cache an empty ladder
    if (data && data.ladder && data.ladder.rows && data.ladder.rows.length > 0) {
      try { localStorage.setItem(cacheKey, JSON.stringify({ date: today, data })); } catch (_e) { /* quota */ }
    }
    return data;
  });
}

function fetchSquadiLadder(teamID, force) {
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const baseUrl = isLocalDev ? '/__api/gas-proxy' : API_CONFIG.baseUrl;
  const forceParam = force ? '&forceRefresh=true' : '';
  return fetch(`${baseUrl}?api=true&action=getSquadiLadder&teamID=${encodeURIComponent(teamID)}${forceParam}`)
    .then(res => res.json());
}

/**
 * Pre-warm the ladder cache for a team on load, so opponent difficulty is
 * available immediately rather than only after the ladder tab is opened.
 * Called non-blocking from data-loader.js after team data loads.
 */
window.prewarmLadderCache = function(team, force) {
  if (!team) return;
  const fixCfg = window.parseFixtureConfig ? window.parseFixtureConfig(team.resultsApi) : null;
  const hasFixture = fixCfg && (fixCfg.source === 'squadi' || fixCfg.source === 'gameday');
  if (!hasFixture && !team.ladderUrl) return; // no ladder source configured
  const fetchFn = hasFixture
    ? () => fetchSquadiLadder(team.teamID, force)
    : () => fetch(`/ladder-${team.teamID}.json`).then(res => res.json());
  getCachedLadder(team.teamID, fetchFn, force).catch(() => { /* silent fail — ladder is optional */ });
};

function renderLadderTable(ladderDiv, data, team, highlightName) {
  const allHeaders = data.ladder.headers;
  const headers = allHeaders.filter(h => h !== 'Logo' && h.toLowerCase() !== 'logo');
  const numericHeaders = headers.map(h => /^(POS|P|W|L|D|B|FF|FG|For|Agst|GD|PPG|%|% Won|PTS)$/i.test(h));

  let formatted = formatDateTime(data.lastUpdated || '');

  const showKey = `ladder.showExtra.${team.teamID}`;
  const showExtra = (localStorage.getItem(showKey) === 'true');

  let html = `<div class="ladder-updated">Last updated: ${escapeHtml(formatted || data.lastUpdated || '')}`;
  html += ` <button class="btn btn-ghost btn-xs show-columns-toggle" aria-pressed="${showExtra ? 'true' : 'false'}">${showExtra ? 'Hide extra columns' : 'Show extra columns'}</button>`;
  html += ` <button class="btn btn-ghost btn-xs ladder-refresh-btn" aria-label="Refresh ladder"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg> Refresh</button>`;
  html += `</div>`;

  const orderedHeaders = headers.filter(h => h !== 'POS');
  html += `<div class="ladder-container ${showExtra ? 'expanded-columns' : ''}" role="region" aria-label="Ladder" data-teamid="${escapeAttr(team.teamID)}"><table class="ladder-table"><thead><tr>`;
  html += `<th data-key="POS" class="numeric">POS</th>`;
  html += `<th class="logo-col" aria-hidden="true"></th>`;
  html += orderedHeaders.map((h, idx) => {
    if (h === 'Logo' || h.toLowerCase() === 'logo') return '';
    return `<th data-key="${escapeAttr(h)}" class="${numericHeaders[headers.indexOf(h)] ? 'numeric' : ''}">${escapeHtml(h)}</th>`;
  }).join('') + `</tr></thead><tbody>`;

  html += data.ladder.rows.map(row => {
    const rowTeamName = String(row['TEAM'] || row['Team'] || '').toLowerCase();
    const isCurrent = highlightName && rowTeamName.includes(highlightName.toLowerCase());

    let logoSrc = row['Logo'];
    if (!logoSrc) {
      const clubSlug = clubSlugFor(row['TEAM'] || '');
      logoSrc = clubLogos[clubSlug] || null;
    }
    const logoHtml = logoSrc ? `<img src="${escapeAttr(logoSrc)}" class="team-logo-ladder" alt="${escapeAttr(row['TEAM'] || '')} logo" onerror="this.style.display='none'">` : '';

    let rowHtml = `<tr class="${isCurrent ? 'highlight' : ''}">`;
    rowHtml += `<td data-key="POS" class="numeric">${escapeHtml(row['POS'] || row['Pos'] || '')}</td>`;
    rowHtml += `<td class="logo-col">${logoHtml}</td>`;

    headers.forEach((h, idx) => {
      if (h === 'POS' || h === 'Logo' || h.toLowerCase() === 'logo') return;

      let cellValue = row[h] || '';
      if (h === 'TEAM') {
        if (cellValue && (cellValue.match(/^https?:\/\//) || /\.png|\.jpe?g|\.svg/i.test(cellValue))) {
          cellValue = '';
        }
        rowHtml += `<td data-key="${escapeAttr(h)}" class="team-cell">${escapeHtml(cellValue)}</td>`;
      } else {
        rowHtml += `<td data-key="${escapeAttr(h)}" class="${numericHeaders[idx] ? 'numeric' : ''}">${escapeHtml(cellValue)}</td>`;
      }
    });

    rowHtml += `</tr>`;
    return rowHtml;
  }).join('');

  html += `</tbody></table></div>`;
  ladderDiv.innerHTML = html;

  try {
    const theadCount = ladderDiv.querySelectorAll('.ladder-table thead th').length;
    const firstRow = ladderDiv.querySelector('.ladder-table tbody tr');
    const rowTdCount = firstRow ? firstRow.querySelectorAll('td').length : 0;
    if (theadCount !== rowTdCount) {
      console.warn('LADDER DOM MISMATCH: thead th count=%d != first row td count=%d', theadCount, rowTdCount, { theadCount, rowTdCount });
    } else {
      console.debug('LADDER DOM OK: header cells match row cells', theadCount);
    }
  } catch (e) { console.error(e); }

  const container = ladderDiv.querySelector('.ladder-container');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (container) {
    if (!prefersReduced) {
      container.classList.add('ladder-enter');
      requestAnimationFrame(() => requestAnimationFrame(() => container.classList.add('visible')));
      container.addEventListener('transitionend', () => container.classList.remove('ladder-enter'), { once: true });
    } else {
      container.classList.add('visible');
    }
  }

  const toggle = ladderDiv.querySelector('.show-columns-toggle');
  if (toggle && container) {
    toggle.addEventListener('click', () => {
      const expanded = container.classList.toggle('expanded-columns');
      toggle.textContent = expanded ? 'Hide extra columns' : 'Show extra columns';
      toggle.setAttribute('aria-pressed', expanded ? 'true' : 'false');
      try { localStorage.setItem(showKey, expanded ? 'true' : 'false'); } catch (_e) { /* ignore */ }
    });
  }

  const refreshBtn = ladderDiv.querySelector('.ladder-refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      try { localStorage.removeItem(`ladder.cache.${team.teamID}`); } catch (_e) { /* ignore */ }
      ladderDiv.innerHTML = `<div class="ladder-loading">Refreshing ladder...</div>`;
      const fixCfg = window.parseFixtureConfig(team.resultsApi);
      const squadiCfg = fixCfg && fixCfg.source === 'squadi' ? fixCfg : null;
      const gamedayCfg = fixCfg && fixCfg.source === 'gameday' ? fixCfg : null;
      const fetchFn = (squadiCfg || gamedayCfg)
        ? () => fetchSquadiLadder(team.teamID, true)
        : () => fetch(`/ladder-${team.teamID}.json`).then(res => res.json());
      getCachedLadder(team.teamID, fetchFn, true)
        .then(freshData => {
          if (!freshData.ladder || !freshData.ladder.rows || !freshData.ladder.headers) {
            ladderDiv.innerHTML = `<div class="ladder-error">No ladder data available yet.</div>`;
            return;
          }
          renderLadderTable(ladderDiv, freshData, team, highlightName);
          showToast('Ladder updated');
        })
        .catch(() => {
          ladderDiv.innerHTML = `<div class="ladder-error">Failed to refresh ladder.</div>`;
        });
    });
  }
}

// ========================================
// SCHEDULE RENDERING
// ========================================

function renderSchedule() {
  const container = document.getElementById('schedule-list');

  try {
    const games = (state.currentTeamData?.games || []).slice().sort((a, b) => a.round - b.round);

    if (games.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📅</div>
          <p>No games scheduled yet.</p>
        </div>
      `;
      return;
    }

  container.innerHTML = games.map(game => {
    let resultClass = '';
    let scoreDisplay = '';

    if (game.status === 'abandoned') {
      scoreDisplay = `<div class="game-score-label">Abandoned</div>`;
      resultClass = 'abandoned';
    } else if (game.status === 'bye') {
      scoreDisplay = '';
      resultClass = 'bye';
    } else if (game.scores) {
      const { us, opponent } = game.scores;
      if (us > opponent) resultClass = 'win';
      else if (us < opponent) resultClass = 'loss';
      else resultClass = 'draw';
      scoreDisplay = `<div class="game-score-value">${escapeHtml(us)} - ${escapeHtml(opponent)}</div>`;
    } else {
      scoreDisplay = `<div class="game-score-label">Upcoming</div>`;
    }

    // Score validation badge
    let validationBadge = '';
    if (game.fixtureScore && game.scores && game.status === 'normal') {
      if (game.scores.us === game.fixtureScore.us && game.scores.opponent === game.fixtureScore.opponent) {
        validationBadge = '<span class="score-validated" title="Matches official result">✓</span>';
      } else {
        validationBadge = `<span class="score-mismatch" title="Official: ${game.fixtureScore.us}-${game.fixtureScore.opponent}">⚠</span>`;
      }
    }

    // Opponent difficulty badge (from ladder data)
    let difficultyBadge = '';
    if (game.status !== 'bye' && game.opponent) {
      const diff = window.getOpponentDifficulty(game.opponent);
      if (diff) {
        difficultyBadge = `<span class="opp-rank opp-rank-${diff.tier}" title="${diff.label} of ${diff.totalTeams}">${diff.label}</span>`;
      }
    }

    return `
      <div class="game-item ${resultClass}" onclick="openGameDetail('${escapeAttr(game.gameID)}')">
        <div class="game-round">R${escapeHtml(game.round)}</div>
        <div class="game-info">
          <div class="game-opponent">
            ${game.status === 'bye' ? 'Bye' : `vs ${escapeHtml(game.opponent)}`}
            ${game.opponentDetails && game.opponentDetails.logoUrl ? `<img src="${escapeAttr(game.opponentDetails.logoUrl)}" class="team-logo-small" alt="${escapeAttr(game.opponent)} logo" onerror="this.style.display='none'">` : ''}
            ${difficultyBadge}
            ${game.lineupConfirmed !== undefined ? `<span class="lineup-status ${game.lineupConfirmed ? 'confirmed' : 'pending'}" title="Your lineup ${game.lineupConfirmed ? 'confirmed' : 'pending'}">📋</span>` : ''}
            ${game.opponentLineupConfirmed !== undefined ? `<span class="lineup-status ${game.opponentLineupConfirmed ? 'confirmed' : 'pending'}" title="Opponent lineup ${game.opponentLineupConfirmed ? 'confirmed' : 'pending'}">👥</span>` : ''}
          </div>
          <div class="game-meta">
            ${escapeHtml(formatDate(game.date))} • ${escapeHtml(game.time)} • ${escapeHtml(game.location)}
            ${game.venueDetails && game.venueDetails.lat ? `<a href="https://maps.google.com/?q=${game.venueDetails.lat},${game.venueDetails.lng}" target="_blank" class="venue-link" title="View on map">📍</a>` : ''}
            ${game.livestreamUrl ? `<a href="${escapeAttr(game.livestreamUrl)}" target="_blank" class="livestream-link" title="Watch live">📺</a>` : ''}
          </div>
        </div>
        <div class="game-score">
          ${scoreDisplay}${validationBadge}
        </div>
      </div>
    `;
  }).join('');
  } catch (error) {
    console.error('[Schedule] Error rendering schedule:', error);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <p>Error loading schedule. Please try again.</p>
      </div>
    `;
  }
}
// Expose for cross-module access
window.renderSchedule = renderSchedule;

// ========================================
// ROSTER RENDERING
// ========================================

function renderRoster() {
  const container = document.getElementById('roster-grid');

  try {
    const players = state.currentTeamData?.players || [];

    if (players.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">👥</div>
          <p>No players added yet.</p>
        </div>
      `;
      return;
    }

    const regular = players.filter(p => !p.fillIn);
    const fillIns = players.filter(p => p.fillIn);

    let html = regular.map(player => renderPlayerCard(player)).join('');

    if (fillIns.length > 0) {
      html += `<div class="roster-section-title">Fill-in Players</div>`;
      html += fillIns.map(player => renderPlayerCard(player, true)).join('');
    }

    container.innerHTML = html;
  } catch (error) {
    console.error('[Roster] Error rendering roster:', error);
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">⚠️</div>
        <p>Error loading roster. Please try again.</p>
      </div>
    `;
  }
}
// Expose for cross-module access
window.renderRoster = renderRoster;

function renderPlayerCard(player, isFillIn = false) {
  const initials = player.name.split(' ').map(n => n[0]).join('').toUpperCase();
  const positions = normalizeFavPositions(player.favPosition);
  const positionDisplay = positions.length > 0 ? positions.join(', ') : 'Flexible';
  return `
    <div class="player-card ${isFillIn ? 'fill-in' : ''}" onclick="openPlayerDetail('${escapeAttr(player.id)}')">
      <div class="player-avatar">${escapeHtml(initials)}</div>
      <div class="player-name">${escapeHtml(player.name)}</div>
      <div class="player-position">${escapeHtml(positionDisplay)}</div>
    </div>
  `;
}

/**
 * Normalize favPosition to always be an array (handles legacy string values)
 */
function normalizeFavPositions(favPosition) {
  if (!favPosition) return [];
  if (Array.isArray(favPosition)) return favPosition.filter(p => p);
  if (typeof favPosition === 'string' && favPosition.trim()) return [favPosition.trim()];
  return [];
}
// Expose for other modules that need it
window.normalizeFavPositions = normalizeFavPositions;
