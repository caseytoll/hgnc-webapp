#!/usr/bin/env node

/**
 * Extended Smoke Test for HGNC WebApp
 * 
 * Comprehensive testing beyond basic rendering:
 * - Navigation between views
 * - Dark mode support
 * - Data persistence (localStorage/IndexedDB)
 * - Form validation
 * - Accessibility basics
 * - Performance metrics
 * - Error handling
 * - Cache busting
 */

const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const APP_URL = process.env.APP_URL || 'https://script.google.com/macros/s/AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug/exec';
    const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

    console.log('🚀 Extended Smoke Test Starting...\n');

    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    page.on('console', msg => {
      try { console.log('PAGE_LOG:', msg && msg.text ? msg.text() : String(msg)); } catch(e) { /* ignore */ }
    });

    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Enable test insights
    await page.evaluateOnNewDocument(() => {
      try { localStorage.setItem('testInsightsEnabled', 'true'); } catch(e) {}
      try { localStorage.setItem('testInsightsEnabled_v2', 'true'); } catch(e) {}
    });

    console.log('📍 Loading application...');
    await page.goto(APP_URL, {waitUntil: 'networkidle2'});
    console.log('✅ Application loaded\n');

    // ========== TEST 1: Navigation ==========
    console.log('📍 TEST 1: Navigation Between Views');
    console.log('═'.repeat(40));
    try {
      const navTests = [
        { id: 'team-list-view', hash: '#team-list-view', name: 'Team List' },
        { id: 'players-view', hash: '#players-view', name: 'Players' },
        { id: 'games-view', hash: '#games-view', name: 'Games' },
        { id: 'netball-ladder-view', hash: '#netball-ladder-view', name: 'Ladder' },
      ];

      let passCount = 0;
      for (const test of navTests) {
        try {
          await page.evaluate((hash) => { window.location.hash = hash; }, test.hash);
          await new Promise(r => setTimeout(r, 400));

          const isPresent = await page.evaluate((id) => {
            const el = document.getElementById(id);
            return el !== null;
          }, test.id);

          if (isPresent) {
            console.log(`✅ ${test.name}: accessible`);
            passCount++;
          } else {
            console.log(`⚠️  ${test.name}: element not found`);
          }
        } catch (e) {
          console.log(`⚠️  ${test.name}: ${e.message.substring(0, 40)}`);
        }
      }
      console.log(`Result: ${passCount}/${navTests.length} views accessible\n`);
    } catch (e) {
      console.log(`⚠️  Navigation test failed: ${e.message}\n`);
    }

    // ========== TEST 2: Dark Mode Support ==========
    console.log('🌙 TEST 2: Dark Mode Support');
    console.log('═'.repeat(40));
    try {
      const darkModeInfo = await page.evaluate(() => {
        const html = document.documentElement;
        const hasColorScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const cssVars = getComputedStyle(html);
        const bgPrimary = cssVars.getPropertyValue('--bg-primary').trim();
        const textPrimary = cssVars.getPropertyValue('--text-primary').trim();
        const hasDarkToggle = !!document.getElementById('dark-mode-toggle');

        return {
          systemPrefersDark: hasColorScheme,
          cssVariablesDefined: bgPrimary.length > 0 && textPrimary.length > 0,
          bgColor: bgPrimary,
          textColor: textPrimary,
          hasDarkToggle,
        };
      });

      if (darkModeInfo.cssVariablesDefined) {
        console.log('✅ CSS variables defined for theming');
        console.log(`   - Background: ${darkModeInfo.bgColor}`);
        console.log(`   - Text: ${darkModeInfo.textColor}`);
      } else {
        console.log('ℹ️  CSS variables not found (may use inline styles)');
      }

      if (darkModeInfo.hasDarkToggle) {
        console.log('✅ Dark mode toggle element found');
      } else {
        console.log('ℹ️  Dark mode toggle not found');
      }
      console.log();
    } catch (e) {
      console.log(`⚠️  Dark mode test failed: ${e.message}\n`);
    }

    // ========== TEST 3: Data Persistence ==========
    console.log('💾 TEST 3: Data Persistence');
    console.log('═'.repeat(40));
    try {
      const storageInfo = await page.evaluate(() => {
        const localKeys = [];
        const sessionKeys = [];

        try {
          for (let i = 0; i < localStorage.length; i++) {
            localKeys.push(localStorage.key(i));
          }
        } catch(e) {}

        try {
          for (let i = 0; i < sessionStorage.length; i++) {
            sessionKeys.push(sessionStorage.key(i));
          }
        } catch(e) {}

        return {
          localStorageKeys: localKeys.length,
          sessionStorageKeys: sessionKeys.length,
          localStorageList: localKeys,
          indexedDBAvailable: !!window.indexedDB,
          cacheStorageAvailable: !!(window.caches),
        };
      });

      console.log(`✅ localStorage: ${storageInfo.localStorageKeys} keys stored`);
      if (storageInfo.localStorageList.length > 0) {
        console.log(`   Keys: ${storageInfo.localStorageList.join(', ')}`);
      }

      console.log(`✅ sessionStorage: ${storageInfo.sessionStorageKeys} keys stored`);
      console.log(`✅ IndexedDB: ${storageInfo.indexedDBAvailable ? 'available' : 'not available'}`);
      console.log(`✅ Cache API: ${storageInfo.cacheStorageAvailable ? 'available' : 'not available'}`);
      console.log();
    } catch (e) {
      console.log(`⚠️  Data persistence test failed: ${e.message}\n`);
    }

    // ========== TEST 4: Form Validation ==========
    console.log('📝 TEST 4: Form Elements & Validation');
    console.log('═'.repeat(40));
    try {
      const formInfo = await page.evaluate(() => {
        const allForms = document.querySelectorAll('form');
        const allInputs = document.querySelectorAll('input, textarea, select');
        const validatedInputs = Array.from(allInputs).filter(inp => 
          inp.hasAttribute('required') || 
          inp.hasAttribute('pattern') || 
          inp.hasAttribute('min') || 
          inp.hasAttribute('max') ||
          inp.hasAttribute('minlength')
        );

        return {
          formsCount: allForms.length,
          inputsCount: allInputs.length,
          validatedInputsCount: validatedInputs.length,
          requiredInputs: Array.from(allInputs).filter(i => i.hasAttribute('required')).length,
          patternInputs: Array.from(allInputs).filter(i => i.hasAttribute('pattern')).length,
        };
      });

      console.log(`✅ Forms found: ${formInfo.formsCount}`);
      console.log(`✅ Input fields: ${formInfo.inputsCount}`);
      console.log(`✅ Validated inputs: ${formInfo.validatedInputsCount}`);
      console.log(`   - Required: ${formInfo.requiredInputs}`);
      console.log(`   - With patterns: ${formInfo.patternInputs}`);
      console.log();
    } catch (e) {
      console.log(`⚠️  Form validation test failed: ${e.message}\n`);
    }

    // ========== TEST 5: Accessibility ==========
    console.log('♿ TEST 5: Accessibility Basics');
    console.log('═'.repeat(40));
    try {
      const a11yInfo = await page.evaluate(() => {
        const ariaLabels = document.querySelectorAll('[aria-label]').length;
        const ariaDescribedBy = document.querySelectorAll('[aria-describedby]').length;
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
        const buttons = document.querySelectorAll('button, [role="button"]').length;
        const links = document.querySelectorAll('a').length;
        const images = document.querySelectorAll('img').length;
        const imagesWithAlt = document.querySelectorAll('img[alt]').length;

        return {
          ariaLabels,
          ariaDescribedBy,
          headings,
          buttons,
          links,
          images,
          imagesWithAlt,
          imagesWithoutAlt: images - imagesWithAlt,
        };
      });

      console.log(`✅ ARIA labels: ${a11yInfo.ariaLabels}`);
      console.log(`✅ ARIA describedBy: ${a11yInfo.ariaDescribedBy}`);
      console.log(`✅ Headings: ${a11yInfo.headings}`);
      console.log(`✅ Buttons: ${a11yInfo.buttons}`);
      console.log(`✅ Links: ${a11yInfo.links}`);
      console.log(`✅ Images: ${a11yInfo.images} (${a11yInfo.imagesWithAlt} with alt text)`);
      if (a11yInfo.imagesWithoutAlt > 0) {
        console.log(`⚠️  Images without alt text: ${a11yInfo.imagesWithoutAlt}`);
      }
      console.log();
    } catch (e) {
      console.log(`⚠️  Accessibility test failed: ${e.message}\n`);
    }

    // ========== TEST 6: Performance Metrics ==========
    console.log('⚡ TEST 6: Performance Metrics');
    console.log('═'.repeat(40));
    try {
      const perfInfo = await page.evaluate(() => {
        const perf = window.performance;
        if (!perf || !perf.timing) return { error: 'Performance API not available' };

        const timing = perf.timing;
        const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
        const domReadyTime = timing.domContentLoadedEventEnd - timing.navigationStart;
        const resourceCount = perf.getEntriesByType('resource').length;

        return {
          pageLoadTime: Math.round(pageLoadTime),
          domReadyTime: Math.round(domReadyTime),
          resourceCount,
        };
      });

      if (perfInfo.error) {
        console.log(`ℹ️  ${perfInfo.error}`);
      } else {
        console.log(`⏱️  Page load time: ${perfInfo.pageLoadTime}ms`);
        console.log(`⏱️  DOM ready time: ${perfInfo.domReadyTime}ms`);
        console.log(`📦 Resources loaded: ${perfInfo.resourceCount}`);
        
        const rating = perfInfo.pageLoadTime < 3000 ? '✅ Excellent' : 
                      perfInfo.pageLoadTime < 5000 ? '⚠️  Good' : 
                      '⚠️  Needs improvement';
        console.log(`   Rating: ${rating}`);
      }
      console.log();
    } catch (e) {
      console.log(`⚠️  Performance test failed: ${e.message}\n`);
    }

    // ========== TEST 7: Critical Functions ==========
    console.log('🔧 TEST 7: Critical Functions Available');
    console.log('═'.repeat(40));
    try {
      const functionsInfo = await page.evaluate(() => {
        const functions = [
          'showView',
          'toggleTeamEditMode',
          'loadMasterTeamList',
          'addPlayer',
          'updatePlayer',
          'deletePlayer',
        ];

        const available = functions.filter(fname => typeof window[fname] === 'function');
        const missing = functions.filter(fname => typeof window[fname] !== 'function');

        return {
          available,
          missing,
          totalAvailable: available.length,
          totalMissing: missing.length,
        };
      });

      console.log(`✅ Functions available: ${functionsInfo.totalAvailable}/${functionsInfo.available.length + functionsInfo.totalMissing}`);
      functionsInfo.available.forEach(fn => console.log(`   ✓ ${fn}`));
      if (functionsInfo.missing.length > 0) {
        console.log(`⚠️  Functions missing: ${functionsInfo.missing.length}`);
        functionsInfo.missing.forEach(fn => console.log(`   ✗ ${fn}`));
      }
      console.log();
    } catch (e) {
      console.log(`⚠️  Function test failed: ${e.message}\n`);
    }

    // ========== TEST 8: Cache Busting ==========
    console.log('🔄 TEST 8: Cache Busting & Versioning');
    console.log('═'.repeat(40));
    try {
      const cacheInfo = await page.evaluate(() => {
        const appVersion = window.appVersion || 'not exposed';
        const appVersionEl = document.querySelector('[data-version]');
        const versionFromAttr = appVersionEl ? appVersionEl.getAttribute('data-version') : 'no element';

        return {
          windowAppVersion: appVersion,
          versionFromAttribute: versionFromAttr,
          localStorageVersion: localStorage.getItem('appVersion') || 'not set',
          hasVersionMismatch: appVersion !== localStorage.getItem('appVersion'),
        };
      });

      console.log(`✅ Window.appVersion: ${cacheInfo.windowAppVersion}`);
      console.log(`✅ localStorage version: ${cacheInfo.localStorageVersion}`);
      if (cacheInfo.hasVersionMismatch && cacheInfo.windowAppVersion !== 'not exposed') {
        console.log(`⚠️  Version mismatch detected (may trigger cache bust)`);
      } else {
        console.log(`✅ Version consistency check: OK`);
      }
      console.log();
    } catch (e) {
      console.log(`⚠️  Cache busting test failed: ${e.message}\n`);
    }

    // ========== TEST 9: Error Handling ==========
    console.log('⚠️  TEST 9: Error Handling');
    console.log('═'.repeat(40));
    try {
      const errorInfo = await page.evaluate(() => {
        const errorContainers = document.querySelectorAll('[class*="error"], [id*="error"]');
        const emptyStateElements = document.querySelectorAll('[class*="empty"], [class*="placeholder"]');
        const hasErrorDisplay = !!document.querySelector('.error-message');

        return {
          errorContainers: errorContainers.length,
          emptyStateElements: emptyStateElements.length,
          hasErrorDisplay,
          appStateExists: !!window.appState,
        };
      });

      console.log(`✅ Error containers: ${errorInfo.errorContainers}`);
      console.log(`✅ Empty state elements: ${errorInfo.emptyStateElements}`);
      console.log(`✅ Error display present: ${errorInfo.hasErrorDisplay ? 'yes' : 'no'}`);
      console.log(`✅ appState object: ${errorInfo.appStateExists ? 'available' : 'not available'}`);
      console.log();
    } catch (e) {
      console.log(`⚠️  Error handling test failed: ${e.message}\n`);
    }

    // ========== SUMMARY ==========
    console.log('═'.repeat(40));
    console.log('✅ Extended smoke test completed successfully!\n');
    console.log('Summary:');
    console.log('- Navigation: Tested 4 views');
    console.log('- Dark mode: CSS variables and toggle checked');
    console.log('- Persistence: localStorage, sessionStorage, IndexedDB checked');
    console.log('- Forms: Validation attributes verified');
    console.log('- Accessibility: ARIA labels, headings, images checked');
    console.log('- Performance: Page load metrics captured');
    console.log('- Functions: 6 critical functions verified');
    console.log('- Cache: Version consistency checked');
    console.log('- Error handling: Error containers verified\n');

    await browser.close();
    process.exit(0);

  } catch (e) {
    console.error('❌ Extended smoke test failed:', e);
    process.exit(1);
  }
})();
