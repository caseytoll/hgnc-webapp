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
    
    page.on('console', msg => {
      try { console.log('PAGE_LOG:', msg && msg.text ? msg.text() : String(msg)); } catch(e) {}
    });
    
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.evaluateOnNewDocument(() => {
      try { localStorage.setItem('testInsightsEnabled', 'true'); } catch(e) {}
    });

    console.log('\n=== LOADING PAGE ===');
    await page.goto(APP_URL, {waitUntil: 'networkidle2'});
    await new Promise(r => setTimeout(r, 3000));

    // Debug: Check all frames and their content
    console.log('\n=== FRAME ANALYSIS ===');
    const frames = page.frames();
    console.log('Total frames:', frames.length);
    
    let targetFrame = null;
    for (let i = 0; i < frames.length; i++) {
      try {
        const frameInfo = await frames[i].evaluate(() => {
          const hasTeamButtons = !!document.querySelector('[onclick*="selectTeam"]');
          const hasInsightsTab = !!document.getElementById('show-insights-tab');
          const hasTeamSelectors = document.querySelectorAll('.team-selector, button[onclick*="Hazel"]').length;
          const hasInsightsCards = document.querySelectorAll('.insights-menu-card').length;
          return { hasTeamButtons, hasInsightsTab, hasTeamSelectors, hasInsightsCards };
        });
        console.log(`Frame ${i} (${frames[i].url().substring(0, 80)}):`, frameInfo);
        if (frameInfo.hasInsightsCards > 0) {
          targetFrame = frames[i];
          console.log(`✓ Target frame found: Frame ${i}`);
        }
      } catch (e) {
        // cross-origin or other error
      }
    }

    if (!targetFrame) {
      console.error('Could not find target frame with insights cards');
      process.exit(1);
    }

    // Try to find and click team in any frame
    console.log('\n=== ATTEMPTING TEAM SELECTION IN FRAMES ===');
    // Find and click the first team option
    const teamSelected = await page.evaluate(() => {
      // Try to find team selector
      const teamSelector = document.querySelector('.team-selector, select, [data-team], button[onclick*="selectTeam"]');
      if (teamSelector) {
        console.log('Team selector found:', teamSelector.className || teamSelector.tagName);
        return true;
      }
      return false;
    });
    console.log('Team selector found:', teamSelected);

    // Try clicking on a team item
    const teamClicked = await page.evaluate(() => {
      // Look for team select handlers
      const buttons = Array.from(document.querySelectorAll('button, div[role="button"], [onclick*="team"]'));
      for (const btn of buttons) {
        const text = btn.textContent?.toLowerCase() || '';
        if (text.includes('hazel') || text.includes('team') || btn.onclick?.toString().includes('handleSelectTeam')) {
          btn.click();
          return true;
        }
      }
      return false;
    });
    console.log('Team clicked:', teamClicked);

    // Wait for team selection to complete
    await new Promise(r => setTimeout(r, 3000));

    console.log('\n=== NAVIGATING TO INSIGHTS ===');
    // Click the Insights tab/button
    const insightsClicked = await page.evaluate(() => {
      const insightsBtn = document.getElementById('show-insights-tab');
      if (insightsBtn) {
        insightsBtn.click();
        return true;
      }
      const insightsLink = Array.from(document.querySelectorAll('a, button, [role="tab"]')).find(el => 
        el.textContent?.toLowerCase().includes('insights') || el.id?.includes('insights')
      );
      if (insightsLink) {
        insightsLink.click();
        return true;
      }
      return false;
    });
    console.log('Insights clicked:', insightsClicked);
    await new Promise(r => setTimeout(r, 3000));

    console.log('\n=== CLICKING TEAM PERFORMANCE CARD ===');
    const teamPerfClicked = await page.evaluate(() => {
      const card = document.querySelector('.insights-menu-card[onclick*="insights-team-performance-view"]');
      if (card) {
        console.log('Team Performance card found, clicking...');
        card.click();
        return true;
      }
      return false;
    });
    console.log('Team Performance card clicked:', teamPerfClicked);
    await new Promise(r => setTimeout(r, 3000));

    console.log('\n=== CHECKING TEAM PERFORMANCE VIEW ===');
    const viewState = await page.evaluate(() => {
      const view = document.getElementById('insights-team-performance-view');
      if (!view) return { error: 'View not found' };
      
      return {
        viewFound: true,
        viewVisible: !view.classList.contains('hidden'),
        viewDisplay: window.getComputedStyle(view).display,
        viewHeight: view.offsetHeight,
        hasContent: {
          seasonStats: !!document.getElementById('insights-season-stats')?.textContent,
          perfRecord: document.getElementById('perf-record')?.textContent,
          perfWinRate: document.getElementById('perf-win-rate')?.textContent,
          perfGoalDiff: document.getElementById('perf-goal-diff')?.textContent,
          perfForm: document.getElementById('perf-form')?.textContent,
        },
        containerHeights: {
          dashboardContainer: document.querySelector('.insights-dashboard')?.offsetHeight,
          perfMetricsGrid: document.querySelector('.perf-metrics-grid')?.offsetHeight,
          perfFlipContainer: document.querySelector('.perf-flip-container')?.offsetHeight,
          perfFlipCard: document.querySelector('.perf-flip-card')?.offsetHeight,
          perfCardFront: document.querySelector('.perf-card-front')?.offsetHeight,
        },
        gridInfo: {
          gridDisplay: window.getComputedStyle(document.querySelector('.perf-metrics-grid')).display,
          firstContainerDisplay: window.getComputedStyle(document.querySelector('.perf-flip-container')).display,
        }
      };
    });
    
    console.log('\n=== VIEW STATE ===');
    console.log(JSON.stringify(viewState, null, 2));

    console.log('\n=== FINAL CHECK ===');
    if (viewState.viewVisible && viewState.hasContent.perfRecord && viewState.hasContent.perfRecord !== '0-0-0') {
      console.log('✅ SUCCESS: Team Performance view is visible with populated content!');
      console.log('  Record:', viewState.hasContent.perfRecord);
      console.log('  Win Rate:', viewState.hasContent.perfWinRate);
      console.log('  Goal Diff:', viewState.hasContent.perfGoalDiff);
    } else {
      console.log('❌ FAILED: Team Performance view not properly displayed');
      if (!viewState.viewVisible) {
        console.log('  - View is hidden');
      }
      if (!viewState.hasContent.perfRecord) {
        console.log('  - No record data');
      }
      if (viewState.containerHeights.perfMetricsGrid === 0) {
        console.log('  - perf-metrics-grid has height: 0');
      }
    }

    await browser.close();
  } catch (e) {
    console.error('Test failed:', e);
    process.exit(1);
  }
})();
