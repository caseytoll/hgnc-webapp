const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const APP_URL = process.env.APP_URL || 'https://script.google.com/macros/s/AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug/exec';
    const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

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
      await page.waitForTimeout(1000);
    }

    // Wait a moment for runtime script to run and apply fallbacks
  await new Promise((r) => setTimeout(r, 1500));

  // For debugging, capture a snapshot of the page's HTML (trimmed)
  const html = await page.content();
  console.log('HTML snapshot (first 400 chars):\n', html.substring(0, 400));

    const result = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.insights-menu-card'));
      let playerCard = null;
      for (const card of cards) {
        const title = card.querySelector('.insights-menu-card-title')?.textContent?.trim() || '';
        if (title === 'Player Analysis') {
          playerCard = card;
          break;
        }
      }
      if (!playerCard) return {error: 'Player Analysis card not found'};
      const computedBg = window.getComputedStyle(playerCard).backgroundImage;
      return {computedBg};
    });

    console.log('Computed background:', result.computedBg);
    console.log('Network requests for player-analysis assets:', requests);

    // Click the Ladder tab and validate the ladder table rendered correctly
    const ladderBtn = await page.$('#show-netball-ladder-tab');
    let ladderOk = false;
    if (ladderBtn) {
      await ladderBtn.click();
      await page.waitForTimeout(1000);
      const ladderResult = await page.evaluate(() => {
        const container = document.getElementById('netball-ladder-table');
        if (!container) return {error: 'Ladder container not found'};
        const html = container.innerHTML || '';
        return {hasTable: html.includes('<table'), hasRK: html.includes('>RK<') || html.includes('RK</th>')};
      });
      console.log('Ladder rendered check:', ladderResult);
      ladderOk = ladderResult && ladderResult.hasTable && ladderResult.hasRK;
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
