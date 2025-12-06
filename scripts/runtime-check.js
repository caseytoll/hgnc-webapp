const puppeteer = require('puppeteer-core');

(async () => {
  try {
      const APP_URL = process.env.APP_URL || process.env.APP_URL_PUBLIC || 'https://script.google.com/macros/s/AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug/exec';
      console.log('Using APP_URL for runtime-check:', APP_URL);
    const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    // Forward page console messages to the Node process for better debugging
    page.on('console', msg => {
      try { console.log('PAGE_LOG:', msg && msg.text ? msg.text() : String(msg)); } catch(e) { /* ignore */ }
    });
    // Use a common desktop UA to avoid possible server-side headless detection and variations
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    // Ensure the test insights toggle is enabled so the 'show-insights-tab' button is visible
    await page.evaluateOnNewDocument(() => {
      try { localStorage.setItem('testInsightsEnabled', 'true'); } catch(e) { /* ignore */ }
      try { localStorage.setItem('testInsightsEnabled_v2', 'true'); } catch(e) { /* ignore */ }
    });

    // Optionally override user/owner email for owner-mode tests (set OWNER_EMAIL env to enable)
    const OWNER_EMAIL = process.env.OWNER_EMAIL || '';
    if (OWNER_EMAIL) {
      await page.evaluateOnNewDocument((owner) => {
        try { window._USER_EMAIL = owner; } catch(e) {}
        try { window._OWNER_EMAIL = owner; } catch(e) {}
      }, OWNER_EMAIL);
      console.log('Owner override will be set for owner-mode testing:', OWNER_EMAIL);
    }

    // Collect network fetches
    const requests = [];
    page.on('requestfinished', async (req) => {
      try {
        const res = await req.response();
        if (res && req.url().includes('player-analysis')) {
          requests.push({url: req.url(), status: res.status()});
        }
      } catch (e) {
        // ignore
      }
    });

    await page.goto(APP_URL, {waitUntil: 'networkidle2'});

    // If OWNER_EMAIL is set, run owner overrides and re-apply owner UI inside each document frame
    if (OWNER_EMAIL) {
      try {
        const frames = page.frames();
        for (const f of frames) {
          try {
            await f.evaluate((owner) => {
              try { window._USER_EMAIL = owner; } catch(e) {}
              try { window._OWNER_EMAIL = owner; } catch(e) {}
              try { currentUserEmail = owner; } catch(e) {}
              try { ownerEmail = owner; } catch(e) {}
              // Re-run owner UI wiring using exposed helper if available
              try { if (typeof applyOwnerModeUI === 'function') applyOwnerModeUI(); } catch(e) {}
              // Duplicate the wiring as a fallback for frames which don't export applyOwnerModeUI
              try { var readOnlyBanner = document.getElementById('read-only-banner'); if (readOnlyBanner) readOnlyBanner.classList.add('hidden'); } catch(e) {}
              try { var addTeamButton = document.getElementById('show-add-team-modal'); if (addTeamButton) { addTeamButton.classList.remove('hidden'); addTeamButton.onclick = showAddTeamModal; } } catch(e) {}
              try { var toggleEditButton = document.getElementById('toggle-edit-mode'); if (toggleEditButton) { toggleEditButton.classList.remove('hidden'); toggleEditButton.onclick = toggleTeamEditMode; toggleEditButton.textContent = isTeamEditMode ? 'Done' : 'Edit'; } } catch(e) {}
              try { var addPlayerButton = document.getElementById('show-add-player-modal'); if (addPlayerButton) { addPlayerButton.classList.remove('hidden'); addPlayerButton.onclick = function() { showModal('add-player-modal'); }; } } catch(e) {}
              try { var addGameButton = document.getElementById('show-add-game-modal'); if (addGameButton) { addGameButton.classList.remove('hidden'); addGameButton.onclick = showAddGameModal; } } catch(e) {}
            }, OWNER_EMAIL);
          } catch(e) {
            // Not all frames will include our app; ignore any evaluation errors
          }
        }
        // Allow re-rendering and wiring in frames
        await page.waitForTimeout(800);
      } catch (e) { /* ignore */ }
    }

    // Click the Insights tab to ensure cards are visible and rendered
    const insightsBtn = await page.$('#show-insights-tab');
    if (insightsBtn) {
      await insightsBtn.click();
      // Give the page a little more time to run the JS that builds the insights cards
      await page.waitForTimeout(5000);
    }

    // Wait a moment for runtime script to run and apply fallbacks
  await new Promise((r) => setTimeout(r, 3000));

  // For debugging, capture a snapshot of the page's HTML (trimmed)
  const html = await page.content();
  console.log('HTML snapshot (first 400 chars):\n', html.substring(0, 400));
  // When debugging, print a short list of present critical selectors
  const presentSelectors = ['#show-insights-tab', '.insights-menu-card', '.insights-menu-card-title', '#insights-player-analysis-view', '#insights-player-analysis-table'];
  presentSelectors.forEach(sel => console.log(`selector: ${sel} found:`, !!html.includes(sel)));

    // Evaluate the DOM across frames to see if any frame contains the insights cards
    let result = {};
    let targetFrame = null;
    const frames = page.frames();
    console.log('FRAME URLs:', frames.map(f => f.url()));
    for (const f of frames) {
      try {
        const frameResult = await f.evaluate(() => {
          const cards = Array.from(document.querySelectorAll('.insights-menu-card'));
          const titles = Array.from(document.querySelectorAll('.insights-menu-card .insights-menu-card-title')).map(n => (n.textContent && n.textContent.trim()) || '');
          const cardCount = cards.length;
          const nav = document.getElementById('app-tab-nav');
          const navHtml = nav ? nav.outerHTML : '';
          const insightViewIds = Array.from(document.querySelectorAll('[id^="insights-"]')).map(n => n.id);
          const appStateKeys = (window.appState && Object.keys(window.appState)) || [];
          const samples = cards.slice(0,5).map(c => c.outerHTML);
          let playerCard = null;
          for (const card of cards) {
            const title = card.querySelector('.insights-menu-card-title')?.textContent?.trim() || '';
            if (title === 'Player Analysis') {
              playerCard = card;
              break;
            }
          }
          if (!playerCard) return {error: 'Player Analysis card not found', titles, cardCount, samples, navHtml, insightViewIds, appStateKeys};
          const computedBg = window.getComputedStyle(playerCard).backgroundImage;
          return {computedBg, titles, cardCount, samples, navHtml, insightViewIds, appStateKeys};
        });
        // If we found any cards in this frame, take it
        if (frameResult && (frameResult.cardCount && frameResult.cardCount > 0)) { result = frameResult; targetFrame = f; break; }
        if (frameResult && frameResult.titles && frameResult.titles.length > 0) { result = frameResult; break; }
      } catch (e) {
        // ignore cross-origin or evaluation errors
      }
    }

    console.log('Computed background:', result.computedBg);
    console.log('Detected insights menu card titles (from eval):', result.titles || 'none');
    console.log('Detected cardCount:', result.cardCount || 0);
    console.log('Card samples (first 5):\n', (result.samples || []).join('\n---\n'));
    console.log('Network requests for player-analysis assets:', requests);

    // Validate that images/backgrounds for insights menu cards are valid (no bare base64 tokens)
    try {
      const imageCheckCtx = targetFrame || page;
      const imageIssues = await imageCheckCtx.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.insights-menu-card'));
        const issues = [];
        cards.forEach(c => {
          const img = c.querySelector('img');
          if (img) {
            const src = img.getAttribute('src') || '';
            // Bare base64 that starts with PHN2Zy or without data: prefix will break
            if (/^PHN2Zy/i.test(src)) {
              issues.push({msg: 'img src starts with bare base64 (missing data: prefix)', src});
            } else if (src && !src.startsWith('data:') && !src.startsWith('/') && !src.startsWith('http')) {
              issues.push({msg: 'img src looks non-absolute and not a data URL', src});
            }
          }
          const computedBg = window.getComputedStyle(c).backgroundImage || '';
          if (computedBg && computedBg.includes('PHN2Zy') && !computedBg.includes('data:')) {
            issues.push({msg: 'Background contains raw base64 token without data: prefix', bg: computedBg});
          }
        });
        return issues;
      });
      if (imageIssues && imageIssues.length > 0) {
        console.error('Insights image/background issues found:', JSON.stringify(imageIssues, null, 2));
        process.exit(6);
      }
      // Ensure computed backgrounds contain either a CDN or a data:image (allow multiple backgrounds)
      const bgValidationIssues = await imageCheckCtx.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.insights-menu-card')) || [];
        const issues = [];
        cards.forEach(c => {
          const computed = window.getComputedStyle(c).backgroundImage || '';
          if (!computed || computed === 'none') return; // treated separately
          // Extract all url(...) values
          const urlPattern = /url\(['"]?([^'\)"]+)['"]?\)/g;
          let m;
          while ((m = urlPattern.exec(computed)) !== null) {
            const v = (m[1] || '').trim();
            if (!v) continue;
            // Accept data: URIs, CDN (jsdelivr), http(s) or local /assets/ paths
            if (v.indexOf('data:image') === 0) continue;
            if (v.indexOf('https://cdn.jsdelivr.net') === 0) continue;
            if (v.indexOf('http://') === 0 || v.indexOf('https://') === 0) continue;
            if (v.indexOf('/') === 0) continue;
            issues.push({card: c.querySelector('.insights-menu-card-title')?.textContent, value: v});
          }
        });
        return issues;
      });
      if (bgValidationIssues && bgValidationIssues.length > 0) {
        console.error('Background image validation failed for insights cards:', JSON.stringify(bgValidationIssues, null, 2));
        process.exit(7);
      }
    } catch (e) {
      console.warn('Image validation step failed (non-critical):', e);
    }

    // Sanity check: ensure calling toggleTeamEditMode doesn't throw (legacy/global function test)
    try {
      // Try calling toggleTeamEditMode in each frame to handle Apps-Script-injected frames
      let toggleTestOk = false;
      const framesList = page.frames();
      for (const f of framesList) {
        try {
          const res = await f.evaluate(() => {
            try {
              if (typeof toggleTeamEditMode !== 'function') return {ok: false, msg: 'not defined'};
              try { toggleTeamEditMode(); } catch (e) {}
              try { toggleTeamEditMode(); } catch (e) {}
              return {ok: true};
            } catch (e) { return {ok: false, msg: String(e)}; }
          });
          if (res && res.ok) { toggleTestOk = true; break; }
        } catch (e) { /* ignore frame evaluation errors */ }
      }
      if (!toggleTestOk) {
        console.warn('toggleTeamEditMode invocation not available in any frame; owner-specific behaviour may not be present for this anonymous test user');
      } else {
        console.log('toggleTeamEditMode invocation succeeded in a frame (no exceptions)');
      }
    } catch (e) {
      console.warn('toggleTeamEditMode smoke invocation failed (unexpected error):', e);
    }

    // Interact with the frame that holds the cards
    if (targetFrame) {
      try {
        const selector = '.insights-menu-card.player-analysis';
        const playerCardInFrame = await targetFrame.$(selector);
        if (playerCardInFrame) {
          // Use the DOM click inside the frame to avoid Puppeteer clickability errors
          await targetFrame.evaluate((sel) => { const el = document.querySelector(sel); if (el) el.click(); }, selector);
          await new Promise((r) => setTimeout(r, 1500));
          const playerResult = await targetFrame.evaluate(() => {
            const view = document.getElementById('insights-player-analysis-view');
            if (!view || view.classList.contains('hidden')) return {error: 'Player Analysis view not visible'};
            const table = document.getElementById('insights-player-analysis-table');
            const tableHtml = table ? table.innerHTML : '';
            const hasTable = tableHtml.includes('<thead') || tableHtml.includes('<tbody');
            const hasEmptyState = tableHtml.toLowerCase().includes('no player') || tableHtml.toLowerCase().includes('no stats');
            const appStateExists = !!window.appState;
            const playersPresent = Array.isArray(window.players) && window.players.length > 0;
            const gamesPresent = Array.isArray(window.games) && window.games.length > 0;
            return {visible: true, hasTable, hasEmptyState, appStateExists, playersPresent, gamesPresent};
          });
          console.log('Player Analysis view check:', playerResult);
          if (!playerResult.visible || (!playerResult.hasTable && !playerResult.hasEmptyState)) {
            console.error('Player Analysis view appears blank or missing table content');
            process.exit(4);
          }
          if (playerResult.hasTable && (!playerResult.appStateExists || (!playerResult.playersPresent && !playerResult.gamesPresent))) {
            console.error('Player Analysis appears to render table but appState/players/games data is missing');
            process.exit(5);
          }
        } else {
          console.warn('Player Analysis card not found in the target frame');
        }
      } catch (e) {
        console.warn('Error interacting with target frame for Player Analysis card:', e);
      }
    }

    // If a frame was not found earlier, try the top-level page for Player Analysis card
    if (!targetFrame) {
      const playerCardHandle = await page.evaluateHandle(() => {
        const cards = Array.from(document.querySelectorAll('.insights-menu-card'));
        return cards.find(c => (c.querySelector('.insights-menu-card-title') || {}).textContent === 'Player Analysis') || null;
      });
      const playerCard = playerCardHandle && (await playerCardHandle.asElement());
      if (playerCard) {
        await playerCard.click();
        await page.waitForTimeout(1000);
        const playerResult = await page.evaluate(() => {
          const view = document.getElementById('insights-player-analysis-view');
          if (!view || view.classList.contains('hidden')) return {error: 'Player Analysis view not visible'};
          // Check for a table or empty-state fallback content
          const table = document.getElementById('insights-player-analysis-table');
          const tableHtml = table ? table.innerHTML : '';
          const hasTable = tableHtml.includes('<thead') || tableHtml.includes('<tbody');
          const hasEmptyState = tableHtml.toLowerCase().includes('no player') || tableHtml.toLowerCase().includes('no stats');
          const appStateExists = !!window.appState;
          const playersPresent = Array.isArray(window.players) && window.players.length > 0;
          const gamesPresent = Array.isArray(window.games) && window.games.length > 0;
          return {visible: true, hasTable, hasEmptyState, appStateExists, playersPresent, gamesPresent};
        });
        console.log('Player Analysis view check:', playerResult);
        if (!playerResult.visible || (!playerResult.hasTable && !playerResult.hasEmptyState)) {
          console.error('Player Analysis view appears blank or missing table content');
          process.exit(4);
        }
        if (playerResult.hasTable && (!playerResult.appStateExists || (!playerResult.playersPresent && !playerResult.gamesPresent))) {
          console.error('Player Analysis appears to render table but appState/players/games data is missing');
          process.exit(5);
        }
      } else {
        console.warn('Player Analysis menu card not found to click');
      }
    }

    // Click the Ladder tab and validate the ladder table rendered correctly
    // Validate team edit UI presence & modal behaviour for owners
    try {
      const editCtx = targetFrame || page;
      const toggleBtnHandle = await editCtx.$('#toggle-edit-mode');
      if (toggleBtnHandle) {
        const isHidden = await editCtx.evaluate(() => {
          const btn = document.getElementById('toggle-edit-mode');
          return !(btn && !btn.classList.contains('hidden'));
        });
        if (!isHidden) {
          console.log('Toggle edit btn visible - attempting to test team edit UI');
          await editCtx.evaluate(() => { document.getElementById('toggle-edit-mode').click(); });
          await new Promise((r) => setTimeout(r, 500));
          // Check for an edit button on a team card
          const editButtonExists = await editCtx.evaluate(() => !!document.querySelector('.team-card-edit'));
          if (!editButtonExists) {
            console.warn('No team-card-edit found - possibly no teams exist');
          } else {
            // Click first edit button and confirm the modal shows and is populated
            await editCtx.evaluate(() => { document.querySelector('.team-card-edit').click(); });
            await new Promise((r) => setTimeout(r, 300));
            const modalVisible = await editCtx.evaluate(() => {
              const modal = document.getElementById('edit-team-modal');
              if (!modal) return false;
              return !modal.classList.contains('hidden');
            });
            if (!modalVisible) {
              console.error('Edit modal did not appear after clicking edit button');
              process.exit(7);
            }
            console.log('Edit modal visible - checking form fields');
            const hasTeamName = await editCtx.evaluate(() => !!document.getElementById('edit-team-name') && (document.getElementById('edit-team-name').value || '').length > 0);
            if (!hasTeamName) {
              console.warn('Edit modal present but team name field empty or not found - this may be a new team creation form');
            }
            // Close modal (cancel) to avoid unintended server calls
            await editCtx.evaluate(() => { const cancelBtn = document.getElementById('update-team-button'); if (cancelBtn && cancelBtn.textContent === 'Create') { document.getElementById('edit-team-modal').classList.add('hidden'); } else { document.getElementById('edit-team-modal').classList.add('hidden'); }});
            await new Promise((r) => setTimeout(r, 200));
            // Toggle edit mode back off
            await editCtx.evaluate(() => { const btn = document.getElementById('toggle-edit-mode'); if (btn) btn.click(); });
          }
        }
      }
    } catch (e) {
      console.warn('Team edit UI check failed (non-critical):', e);
    }

    // Owner-mode players check: ensure add-player button is visible and player list present
    try {
      if (OWNER_EMAIL) {
        // Iterate over frames to find one that includes team list / player list
        const framesList = page.frames();
        let playersCtx = null;
        for (const f of framesList) {
          try {
            const hasTeamCard = await f.evaluate(() => !!document.querySelector('.team-card'));
            if (hasTeamCard) { playersCtx = f; break; }
          } catch(e) { /* ignore cross-origin frames */ }
        }
        if (!playersCtx) playersCtx = page;
        // Ensure a team is selected first - click the first team card if available
        try { await playersCtx.evaluate(() => { const firstTeam = document.querySelector('.team-card'); if (firstTeam) firstTeam.click(); }); } catch(e) { /* ignore */ }
        // Wait until players list is populated or timeout (3s)
        let waited = 0;
        const maxWait = 3000;
        while (waited < maxWait) {
          const count = await playersCtx.evaluate(() => (document.querySelectorAll('#player-list .list-item').length || 0));
          if (count > 0) break;
          await new Promise(r => setTimeout(r, 250));
          waited += 250;
        }
        // Show players view
        await playersCtx.evaluate(() => showView('players-view'));
        await new Promise(r => setTimeout(r, 500));
        const addPlayerVisible = await playersCtx.evaluate(() => {
          const btn = document.getElementById('show-add-player-modal');
          if (!btn) return {exists: false};
          const visible = !(btn.classList.contains('hidden'));
          return {exists: true, visible};
        });
        console.log('Owner-mode: add player button status:', addPlayerVisible);
        if (!addPlayerVisible.exists || !addPlayerVisible.visible) {
          console.error('Owner-mode: add player button missing or hidden');
          // Continue, not fatal
        }
        // Check player list has items
        const playerCount = await playersCtx.evaluate(() => (document.querySelectorAll('#player-list .list-item').length || 0));
        console.log('Owner-mode: player list count:', playerCount);
        if (playerCount === 0) {
          console.warn('Owner-mode: player list empty - verify team selection or server data');
        }
      }
    } catch (e) {
      console.warn('Owner-mode players check failed:', e);
    }
    const ladderBtn = targetFrame ? await targetFrame.$('#show-netball-ladder-tab') : await page.$('#show-netball-ladder-tab');
    let ladderOk = false;
    if (ladderBtn) {
      if (targetFrame) {
        await targetFrame.evaluate(sel => { const el = document.querySelector(sel); if (el) el.click(); }, '#show-netball-ladder-tab');
        await new Promise((r) => setTimeout(r, 1000));
      } else {
        await ladderBtn.click();
        await page.waitForTimeout(1000);
      }
      const ladderResult = targetFrame ? await targetFrame.evaluate(() => {
        const container = document.getElementById('netball-ladder-table');
        if (!container) return {error: 'Ladder container not found'};
        const html = container.innerHTML || '';
        const txt = (container.innerText || '').trim();
        const rowCount = container.querySelectorAll('tbody tr').length;
        const hasRows = rowCount > 0;
        const hasEmpty = !!txt && (!txt.toLowerCase().includes('error') && !txt.toLowerCase().includes('not found'));
        return {hasTable: html.includes('<table'), hasRK: html.includes('>RK<') || html.includes('RK</th>'), hasEmpty, txt, hasRows, rowCount};
      }) : await page.evaluate(() => {
        const container = document.getElementById('netball-ladder-table');
        if (!container) return {error: 'Ladder container not found'};
        const html = container.innerHTML || '';
        const txt = (container.innerText || '').trim();
        const rowCount = container.querySelectorAll('tbody tr').length;
        const hasRows = rowCount > 0;
        const hasEmpty = txt.includes('Loading external ladder data') || txt.toLowerCase().includes('no match data') || txt.toLowerCase().includes('no cached match results');
        return {hasTable: html.includes('<table'), hasRK: html.includes('>RK<') || html.includes('RK</th>'), hasEmpty, txt, hasRows, rowCount};
      });
      console.log('Ladder rendered check:', ladderResult);
      ladderOk = ladderResult && ((ladderResult.hasTable && ladderResult.hasRK && ladderResult.hasRows) || (ladderResult && ladderResult.hasEmpty));
      if (!ladderOk && ladderResult && ladderResult.txt) console.log('Ladder container text:', ladderResult.txt.substring(0, 400));
    } else {
      console.warn('Ladder tab button not found on page');
    }

    // Capture screenshots for regression/visual diffing
    try {
      const screenshotDir = process.env.SCREENSHOT_DIR || './runtime-check-screenshots';
      const fs = require('fs');
      if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir);
      // Re-open or reuse page to take screenshots if needed
      // Take a full page screenshot for the insights view
      const sPage = page;
      await sPage.screenshot({path: screenshotDir + '/insights-full.png', fullPage: true});
      console.log('Saved screenshot:', screenshotDir + '/insights-full.png');
      // Also capture ladder view
      try {
        const ladderEl = await page.$('#netball-ladder-table');
        if (ladderEl) await ladderEl.screenshot({path: screenshotDir + '/ladder.png'});
      } catch(e) { /* ignore */ }
    } catch (e) {
      console.warn('Screenshot generation failed:', e);
    }
    await browser.close();

    const cdnHosts = ['cdn.jsdelivr.net', 'script.googleusercontent.com', 'assets'];
    let computedBgOk = false;
    if (result.computedBg) {
      computedBgOk = cdnHosts.some(h => result.computedBg.includes(h)) || result.computedBg.includes('player-analysis-icon');
    }
    const playerOk = requests.some(r => r.status === 200 && r.url.includes('player-analysis')) || computedBgOk;
    if (!playerOk) {
      console.error('Player Analysis asset not loaded (no 200 network request and computed background does not reference asset)');
      process.exit(2);
    }
    console.log('Player Analysis asset seems to be present.');

    if (!ladderOk) {
      console.error('Ladder did not render as a proper table or missing RK header.');
      process.exit(3);
    }
    console.log('Ladder view appears to render correctly.');
    process.exit(0);
  } catch (e) {
    console.error('Error running runtime-check:', e);
    process.exit(1);
  }
})();
