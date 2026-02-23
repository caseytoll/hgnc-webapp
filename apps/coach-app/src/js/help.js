// ========================================
// HELP SYSTEM
// Three-layer help: Help Page, Walkthrough, Contextual Help
// ========================================

const WALKTHROUGH_KEY = 'hgnc.helpWalkthroughSeen';

// ========================================
// HELP CONTENT
// Shared content used by all three layers
// ========================================

const helpContent = {
  gettingStarted: {
    title: 'Getting Started',
    icon: '&#9889;', // ⚡
    summary: 'Create a team and add your players to get started.',
    body: `
      <p><strong>Create a team:</strong> Tap "Add New Team" on the home screen. The wizard walks you through team name, competition type, season, and optional fixture integration.</p>
      <p><strong>Add players:</strong> After selecting your team, go to the <strong>Roster</strong> tab and tap "Add Player". You can set each player's preferred position.</p>
      <p><strong>Team settings:</strong> Tap the gear icon in the top-right to change team name, season, coach, or competition settings.</p>
    `,
  },
  managingGames: {
    title: 'Managing Games',
    icon: '&#128197;', // 📅
    summary: 'Schedule games, sync fixtures, and track game statuses.',
    body: `
      <p><strong>Add a game:</strong> On the <strong>Schedule</strong> tab, tap "Add Game". Enter the round, opponent, date, and location (Home/Away).</p>
      <p><strong>Fixture sync:</strong> If your team is linked to Squadi or GameDay, games are automatically imported. Synced fields (date, time, opponent) fill in automatically — your manual data (scores, lineups, notes) is never overwritten.</p>
      <p><strong>Game statuses:</strong></p>
      <ul>
        <li><strong>Normal</strong> — A regular game that counts in stats</li>
        <li><strong>Upcoming</strong> — Scheduled but not yet played</li>
        <li><strong>Bye</strong> — No opponent, doesn't count in stats</li>
        <li><strong>Abandoned / Forfeit</strong> — Recorded but excluded from stats</li>
      </ul>
    `,
  },
  scoring: {
    title: 'Scoring & Positions',
    icon: '&#127936;', // 🏀
    summary: 'Record scores and assign positions each quarter.',
    body: `
      <p><strong>Open a game</strong> from the Schedule tab, then use the <strong>Scoring</strong> game tab.</p>
      <p><strong>Quarter accordion:</strong> Tap a quarter header (Q1–Q4) to expand it. Each quarter has:</p>
      <ul>
        <li><strong>Position grid</strong> — Assign a player to each position (GS, GA, WA, C, WD, GD, GK)</li>
        <li><strong>Score steppers</strong> — Tap +/− to record goals for your GS, GA, and opponent shooters</li>
        <li><strong>Notes</strong> — Tap the notes icon to add quarter-specific coaching notes. Use quick-insert buttons for player names and timestamps</li>
      </ul>
      <p><strong>Score validation:</strong> If fixture sync is active, a green tick confirms your score matches the official result. A warning appears if they differ.</p>
    `,
  },
  planner: {
    title: 'Lineup Planner',
    icon: '&#128203;', // 📋
    summary: 'Plan your lineup across all four quarters (desktop recommended).',
    body: `
      <p><strong>Open the planner</strong> from a game detail screen — tap "Lineup Planner". Best used on a tablet or desktop for the full 4-quarter view.</p>
      <p><strong>Assign players:</strong> Drag players from the bench (left sidebar) into position slots. Or tap a slot and select a player.</p>
      <p><strong>Features:</strong></p>
      <ul>
        <li><strong>Auto-fill</strong> — Automatically fills the active quarter based on preferred positions and load balance</li>
        <li><strong>Copy quarter</strong> — Copy one quarter's lineup and paste it into another</li>
        <li><strong>Undo</strong> — Up to 20 steps of undo for all changes</li>
        <li><strong>Player load</strong> — The summary grid shows which players are on/off each quarter, highlighting uneven loads</li>
        <li><strong>Position colours</strong> — Shooters (pink), Midcourt (blue), Defence (green)</li>
      </ul>
    `,
  },
  security: {
    title: 'Team Security (PINs)',
    icon: '&#128274;', // 🔒
    summary: 'Protect your team data with a 4-digit PIN.',
    body: `
      <p><strong>Set a PIN:</strong> Go to Team Settings (gear icon) and scroll to the Security section. Set a 4-digit PIN to protect your team's data from accidental edits.</p>
      <p><strong>How it works:</strong> When a PIN is set, any device needs to enter it once to unlock editing. The device remembers your PIN so you won't be asked again unless you log out.</p>
      <p><strong>Viewing is always open:</strong> Parents and spectators can always <em>view</em> your team via the Parent Portal — the PIN only protects editing in the Coach's App.</p>
      <p><strong>Log out all devices:</strong> If you need to revoke access (e.g., a shared device), use "Log Out All Devices" in Team Settings. All devices except yours will need to re-enter the PIN.</p>
    `,
  },
  sharing: {
    title: 'Sharing with Parents',
    icon: '&#128279;', // 🔗
    summary: 'Share your team with parents via the Parent Portal.',
    body: `
      <p><strong>Parent Portal:</strong> Parents can view your team's schedule, scores, lineups, and stats at <strong>hgnc-gameday.pages.dev</strong>. No login needed — it's read-only.</p>
      <p><strong>Team Sheet:</strong> Before a game, open the game detail and tap "Share Lineup" to generate a visual team sheet image. Share it directly to WhatsApp, Messages, or any app.</p>
      <p><strong>What parents see:</strong> Game schedule, scores, player positions per quarter, team stats, and leaderboards. They cannot edit anything.</p>
    `,
  },
  stats: {
    title: 'Stats & AI Insights',
    icon: '&#128200;', // 📈
    summary: 'Track performance and get AI-powered analysis.',
    body: `
      <p><strong>Stats tabs:</strong> The Stats section has five tabs:</p>
      <ul>
        <li><strong>Overview</strong> — Win/loss record, goal difference, form guide, and season metrics</li>
        <li><strong>Leaders</strong> — Top scorers (GS & GA), sorted by total goals or per-quarter average</li>
        <li><strong>Positions</strong> — How often each player has played each position</li>
        <li><strong>Combos</strong> — Best scoring pairs and position combinations</li>
        <li><strong>Attendance</strong> — Games played per player across the season</li>
      </ul>
      <p><strong>AI Insights:</strong> Tap "Get AI Insights" on the Overview tab for an AI-generated season summary including strengths, areas to improve, and lineup recommendations.</p>
      <p><strong>Training Focus:</strong> On the Training tab, "Get AI Training Focus" analyses your coaching notes across games to suggest what to work on at training.</p>
    `,
  },
};

// Section keys in display order
const helpSectionOrder = ['gettingStarted', 'managingGames', 'scoring', 'planner', 'security', 'sharing', 'stats'];

// ========================================
// LAYER 1: HELP PAGE (full accordion view)
// ========================================

export function openHelpView() {
  const sectionsHtml = helpSectionOrder
    .map((key) => {
      const section = helpContent[key];
      return `
      <div class="help-section">
        <button class="help-section-header" onclick="toggleHelpSection(this)">
          <div class="help-section-title">
            <span class="help-section-icon">${section.icon}</span>
            <div>
              <div class="help-section-name">${section.title}</div>
              <div class="help-section-summary">${section.summary}</div>
            </div>
          </div>
          <svg class="help-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
        <div class="help-section-content">
          ${section.body}
        </div>
      </div>
    `;
    })
    .join('');

  const bodyHtml = `
    <div class="help-page">
      ${sectionsHtml}
      <div class="help-footer">
        <button class="btn btn-outline btn-sm" onclick="replayWalkthrough()">Replay Welcome Tour</button>
        <p class="help-version">v${typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : ''}</p>
      </div>
    </div>
  `;

  window.openModal('Help', bodyHtml);
}

window.toggleHelpSection = function (header) {
  const section = header.closest('.help-section');
  const wasOpen = section.classList.contains('open');

  // Close all sections first (accordion behavior)
  document.querySelectorAll('.help-section.open').forEach((s) => s.classList.remove('open'));

  // Toggle the clicked one
  if (!wasOpen) {
    section.classList.add('open');
  }
};

window.replayWalkthrough = function () {
  window.closeModal();
  setTimeout(() => showWalkthrough(true), 300);
};

// ========================================
// LAYER 2: FIRST-TIME WALKTHROUGH
// ========================================

const walkthroughSlides = [
  {
    title: 'Welcome to HGNC Team Manager',
    body: `
      <p>This app helps you manage your netball team — schedule games, track scores and positions, view stats, and share with parents.</p>
      <p>Let's take a quick tour of the key features.</p>
    `,
  },
  {
    title: 'Your Team',
    body: `
      <p><strong>Select or create a team</strong> from the home screen. Each team has its own roster, schedule, and stats.</p>
      <p>Add your players in the <strong>Roster</strong> tab — set preferred positions to help with lineup planning.</p>
    `,
  },
  {
    title: 'Game Day',
    body: `
      <p>The <strong>Schedule</strong> tab shows all your games. Tap a game to enter scores, assign positions, and add notes for each quarter.</p>
      <p>If your competition is linked (Squadi/GameDay), fixtures sync automatically — you just need to fill in scores and lineups.</p>
    `,
  },
  {
    title: 'Lineup & Stats',
    body: `
      <p>Use the <strong>Lineup Planner</strong> (best on tablet/desktop) to drag and drop players into positions across all four quarters.</p>
      <p>The <strong>Stats</strong> tab tracks win/loss records, top scorers, position history, and scoring combinations.</p>
    `,
  },
  {
    title: 'Sharing & Security',
    body: `
      <p><strong>Parents</strong> can view your team at <strong>hgnc-gameday.pages.dev</strong> — it's read-only, no login needed.</p>
      <p>Set a <strong>PIN</strong> in Team Settings to prevent accidental edits. Tap <strong>?</strong> anytime for help.</p>
    `,
  },
];

export function showWalkthrough(forceShow = false) {
  if (!forceShow && localStorage.getItem(WALKTHROUGH_KEY)) return;

  let currentSlide = 0;

  function renderSlide() {
    const slide = walkthroughSlides[currentSlide];
    const totalSlides = walkthroughSlides.length;
    const isFirst = currentSlide === 0;
    const isLast = currentSlide === totalSlides - 1;

    const dots = walkthroughSlides
      .map((_, i) => `<span class="walkthrough-dot${i === currentSlide ? ' active' : ''}"></span>`)
      .join('');

    const bodyHtml = `
      <div class="walkthrough-slide">
        <div class="walkthrough-body">${slide.body}</div>
        <div class="walkthrough-dots">${dots}</div>
      </div>
    `;

    const footerHtml = `
      <div class="walkthrough-nav">
        ${
          isFirst
            ? '<button class="btn btn-ghost btn-sm" onclick="dismissWalkthrough()">Skip</button>'
            : '<button class="btn btn-ghost btn-sm" onclick="walkthroughBack()">Back</button>'
        }
        ${
          isLast
            ? '<button class="btn btn-primary btn-sm" onclick="dismissWalkthrough()">Get Started</button>'
            : '<button class="btn btn-primary btn-sm" onclick="walkthroughNext()">Next</button>'
        }
      </div>
    `;

    window.openModal(slide.title, bodyHtml, footerHtml);
  }

  window.walkthroughNext = function () {
    if (currentSlide < walkthroughSlides.length - 1) {
      currentSlide++;
      renderSlide();
    }
  };

  window.walkthroughBack = function () {
    if (currentSlide > 0) {
      currentSlide--;
      renderSlide();
    }
  };

  window.dismissWalkthrough = function () {
    localStorage.setItem(WALKTHROUGH_KEY, '1');
    window.closeModal();
  };

  renderSlide();
}

// ========================================
// LAYER 3: CONTEXTUAL HELP
// ========================================

const contextHelpTopics = {
  scoring: { title: 'Scoring & Positions', content: helpContent.scoring.body },
  planner: { title: 'Lineup Planner', content: helpContent.planner.body },
  security: { title: 'Team Security', content: helpContent.security.body },
  stats: { title: 'Understanding Stats', content: helpContent.stats.body },
  training: {
    title: 'Training & AI Focus',
    content: helpContent.stats.body.split('</ul>')[1] || helpContent.stats.body,
  },
  sharing: { title: 'Sharing with Parents', content: helpContent.sharing.body },
  games: { title: 'Managing Games', content: helpContent.managingGames.body },
};

export function showContextHelp(topic) {
  const help = contextHelpTopics[topic];
  if (!help) return;
  window.openModal(help.title, `<div class="context-help-body">${help.content}</div>`);
}

// Expose to window for onclick handlers
window.openHelpView = openHelpView;
window.showContextHelp = showContextHelp;
window.showWalkthrough = showWalkthrough;

// ========================================
// HELP BUTTON HTML GENERATOR
// ========================================

export function helpButtonHtml() {
  return `<button class="help-btn" onclick="openHelpView()" aria-label="Help">?</button>`;
}

export function contextHelpIcon(topic) {
  return `<button class="context-help-btn" onclick="event.stopPropagation(); showContextHelp('${topic}')" aria-label="Help">?</button>`;
}
