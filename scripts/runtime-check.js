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
            return {visible: true, hasTable, hasEmptyState};
          });
          console.log('Player Analysis view check:', playerResult);
          if (!playerResult.visible || (!playerResult.hasTable && !playerResult.hasEmptyState)) {
            console.error('Player Analysis view appears blank or missing table content');
            process.exit(4);
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
          return {visible: true, hasTable, hasEmptyState};
        });
        console.log('Player Analysis view check:', playerResult);
        if (!playerResult.visible || (!playerResult.hasTable && !playerResult.hasEmptyState)) {
          console.error('Player Analysis view appears blank or missing table content');
          process.exit(4);
        }
      } else {
        console.warn('Player Analysis menu card not found to click');
      }
    }

    // Click the Ladder tab and validate the ladder table rendered correctly
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
        const hasEmpty = !!txt && (!txt.toLowerCase().includes('error') && !txt.toLowerCase().includes('not found'));
        return {hasTable: html.includes('<table'), hasRK: html.includes('>RK<') || html.includes('RK</th>'), hasEmpty, txt};
      }) : await page.evaluate(() => {
        const container = document.getElementById('netball-ladder-table');
        if (!container) return {error: 'Ladder container not found'};
        const html = container.innerHTML || '';
        const txt = (container.innerText || '').trim();
        const hasEmpty = txt.includes('Loading external ladder data') || txt.toLowerCase().includes('no match data') || txt.toLowerCase().includes('no cached match results');
        return {hasTable: html.includes('<table'), hasRK: html.includes('>RK<') || html.includes('RK</th>'), hasEmpty, txt};
      });
      console.log('Ladder rendered check:', ladderResult);
      ladderOk = ladderResult && ((ladderResult.hasTable && ladderResult.hasRK) || (ladderResult && ladderResult.hasEmpty));
      if (!ladderOk && ladderResult && ladderResult.txt) console.log('Ladder container text:', ladderResult.txt.substring(0, 400));
    } else {
      console.warn('Ladder tab button not found on page');
    }

    await browser.close();

    const playerOk = requests.some(r => r.status === 200) || (result.computedBg && result.computedBg.includes('player-analysis-icon'));
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
