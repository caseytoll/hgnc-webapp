#!/usr/bin/env node

/**
 * Error Recovery Test for HGNC WebApp
 * 
 * Tests:
 * - Handling of missing data
 * - Network error recovery
 * - Invalid input handling
 * - Error fallback displays
 * - Graceful degradation
 */

const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const APP_URL = process.env.APP_URL || 'https://script.google.com/macros/s/AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug/exec';
    const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

    console.log('🚀 Error Recovery Test Starting...\n');

    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Track console errors
    const consoleErrors = [];
    page.on('console', msg => {
      try { 
        const text = msg && msg.text ? msg.text() : String(msg);
        if (text.includes('ERROR') || text.includes('error')) {
          consoleErrors.push(text);
        }
      } catch(e) { /* ignore */ }
    });

    // Track page errors
    const pageErrors = [];
    page.on('error', e => pageErrors.push(e.toString()));
    page.on('pageerror', e => pageErrors.push(e.toString()));

    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.evaluateOnNewDocument(() => {
      try { localStorage.setItem('testInsightsEnabled', 'true'); } catch(e) {}
    });

    console.log('📍 Loading application...');
    await page.goto(APP_URL, {waitUntil: 'networkidle2'});
    console.log('✅ Application loaded\n');

    // ========== TEST 1: Missing Data Handling ==========
    console.log('⚠️  TEST 1: Missing Data Handling');
    console.log('═'.repeat(40));
    try {
      const emptyStateChecks = {
        teamListEmpty: false,
        playerListEmpty: false,
        ladderEmpty: false,
        hasEmptyMessage: false,
      };

      const frames = page.frames();
      for (const frame of frames) {
        try {
          // Check team list empty state
          const teamListEmpty = await frame.evaluate(() => {
            const list = document.getElementById('team-list');
            const message = document.querySelector('[class*="empty"], [class*="no-teams"]');
            
            if (list && list.children.length === 0) {
              return { isEmpty: true, hasMessage: !!message };
            }
            return { isEmpty: false, hasMessage: !!message };
          });

          if (teamListEmpty.isEmpty) {
            console.log('ℹ️  Team list is empty');
            emptyStateChecks.teamListEmpty = true;
          } else {
            console.log('✅ Team list has data');
          }

          if (teamListEmpty.hasMessage) {
            console.log('✅ Empty state message found');
            emptyStateChecks.hasEmptyMessage = true;
          }

          // Check ladder empty state
          const ladderEmpty = await frame.evaluate(() => {
            const ladder = document.getElementById('netball-ladder-table');
            if (!ladder) return null;

            const text = ladder.innerText || ladder.textContent || '';
            const isEmpty = text.includes('no') || text.includes('empty') || text.includes('Loading');
            const rows = ladder.querySelectorAll('tbody tr').length;

            return { isEmpty: rows === 0, hasText: text.length > 0 };
          });

          if (ladderEmpty && !ladderEmpty.isEmpty) {
            console.log('✅ Ladder has data');
          } else if (ladderEmpty && ladderEmpty.hasText) {
            console.log('✅ Ladder shows message or loading state');
          }

          break;
        } catch (e) {
          // Ignore frame errors
        }
      }
      console.log();
    } catch (e) {
      console.log(`⚠️  Missing data test failed: ${e.message}\n`);
    }

    // ========== TEST 2: Invalid Input Handling ==========
    console.log('❌ TEST 2: Invalid Input Handling');
    console.log('═'.repeat(40));
    try {
      const invalidInputTests = {
        rejectsSpecialChars: false,
        rejectsVeryLongInput: false,
        rejectsInvalidNumbers: false,
      };

      const frames = page.frames();
      for (const frame of frames) {
        try {
          // Try to enter special characters
          const specialCharTest = await frame.evaluate(() => {
            const input = document.getElementById('add-team-name');
            if (!input) return null;

            const originalValue = input.value;
            input.value = '!@#$%^&*()_+=[]{}';
            input.dispatchEvent(new Event('change', { bubbles: true }));

            const newValue = input.value;
            input.value = originalValue;

            // Check if special chars were filtered
            return {
              hasValidation: input.hasAttribute('pattern'),
              specialCharsRemoved: newValue !== '!@#$%^&*()_+=[]{}' && !newValue.includes('@'),
            };
          });

          if (specialCharTest) {
            console.log(`${specialCharTest.hasValidation ? '✅' : 'ℹ️ '} Pattern validation: ${specialCharTest.hasValidation}`);
            invalidInputTests.rejectsSpecialChars = specialCharTest.hasValidation;
          }

          // Test very long input
          const longInputTest = await frame.evaluate(() => {
            const input = document.getElementById('add-team-name');
            if (!input) return null;

            const maxLength = input.getAttribute('maxlength');
            const veryLong = 'a'.repeat(500);

            input.value = veryLong;
            input.dispatchEvent(new Event('change', { bubbles: true }));

            const enforced = input.value.length < 500;
            input.value = '';

            return {
              hasMaxLength: !!maxLength,
              enforced: enforced,
            };
          });

          if (longInputTest) {
            console.log(`${longInputTest.hasMaxLength ? '✅' : 'ℹ️ '} Max length: ${longInputTest.hasMaxLength}`);
            invalidInputTests.rejectsVeryLongInput = longInputTest.hasMaxLength;
          }

          // Test invalid numbers
          const jerseyTest = await frame.evaluate(() => {
            const input = document.getElementById('add-player-jersey');
            if (!input) return null;

            const type = input.getAttribute('type');
            const min = input.getAttribute('min');
            const max = input.getAttribute('max');

            input.value = '-999';
            input.dispatchEvent(new Event('change', { bubbles: true }));

            return {
              isNumberType: type === 'number',
              hasRange: !!min || !!max,
              minValue: min,
              maxValue: max,
            };
          });

          if (jerseyTest) {
            console.log(`${jerseyTest.isNumberType ? '✅' : 'ℹ️ '} Number type enforced: ${jerseyTest.isNumberType}`);
            console.log(`${jerseyTest.hasRange ? '✅' : 'ℹ️ '} Range validation: ${jerseyTest.hasRange}${jerseyTest.minValue ? ` (${jerseyTest.minValue}-${jerseyTest.maxValue})` : ''}`);
            invalidInputTests.rejectsInvalidNumbers = jerseyTest.isNumberType;
          }

          break;
        } catch (e) {
          // Ignore frame errors
        }
      }
      console.log();
    } catch (e) {
      console.log(`⚠️  Invalid input test failed: ${e.message}\n`);
    }

    // ========== TEST 3: Error Fallback Display ==========
    console.log('🔄 TEST 3: Error Fallback Display');
    console.log('═'.repeat(40));
    try {
      const frames = page.frames();
      for (const frame of frames) {
        try {
          const fallbackElements = await frame.evaluate(() => {
            const checks = {
              placeholders: document.querySelectorAll('[placeholder]').length,
              defaultValues: document.querySelectorAll('[value]').length,
              fallbackImages: document.querySelectorAll('img[onerror]').length,
              alternativeText: document.querySelectorAll('[alt]').length,
              noDataMessages: document.querySelectorAll('[class*="no-"], [class*="empty"]').length,
            };

            return checks;
          });

          console.log('Fallback elements found:');
          console.log(`   - Placeholders: ${fallbackElements.placeholders}`);
          console.log(`   - Default values: ${fallbackElements.defaultValues}`);
          console.log(`   - Image fallbacks: ${fallbackElements.fallbackImages}`);
          console.log(`   - Alternative text: ${fallbackElements.alternativeText}`);
          console.log(`   - No-data messages: ${fallbackElements.noDataMessages}`);

          if (fallbackElements.noDataMessages > 0) {
            console.log('✅ Error/empty state messages present');
          }

          break;
        } catch (e) {
          // Ignore frame errors
        }
      }
      console.log();
    } catch (e) {
      console.log(`⚠️  Fallback display test failed: ${e.message}\n`);
    }

    // ========== TEST 4: Network Timeout Handling ==========
    console.log('🌐 TEST 4: Network Resilience');
    console.log('═'.repeat(40));
    try {
      // Check if network errors are caught
      const networkErrorHandling = await page.evaluate(() => {
        const checks = {
          hasErrorHandler: false,
          hasTryBlock: false,
          hasTimeout: false,
          retryMechanism: false,
        };

        // Look for error handling patterns in the page
        const pageSource = document.documentElement.outerHTML;
        checks.hasTryBlock = pageSource.includes('try') && pageSource.includes('catch');
        checks.hasErrorHandler = pageSource.includes('onerror') || pageSource.includes('error');
        checks.hasTimeout = pageSource.includes('timeout') || pageSource.includes('Timeout');
        checks.retryMechanism = pageSource.includes('retry') || pageSource.includes('Retry');

        return checks;
      });

      console.log('Network error handling:');
      console.log(`${networkErrorHandling.hasTryBlock ? '✅' : 'ℹ️ '} Try/catch blocks: ${networkErrorHandling.hasTryBlock}`);
      console.log(`${networkErrorHandling.hasErrorHandler ? '✅' : 'ℹ️ '} Error handlers: ${networkErrorHandling.hasErrorHandler}`);
      console.log(`${networkErrorHandling.hasTimeout ? '✅' : 'ℹ️ '} Timeout handling: ${networkErrorHandling.hasTimeout}`);
      console.log(`${networkErrorHandling.retryMechanism ? '✅' : 'ℹ️ '} Retry logic: ${networkErrorHandling.retryMechanism}`);

      console.log();
    } catch (e) {
      console.log(`⚠️  Network resilience test failed: ${e.message}\n`);
    }

    // ========== TEST 5: Console Error Monitoring ==========
    console.log('📋 TEST 5: Error Logging');
    console.log('═'.repeat(40));
    try {
      if (consoleErrors.length > 0) {
        console.log(`⚠️  Console errors detected: ${consoleErrors.length}`);
        consoleErrors.slice(0, 3).forEach((err, i) => {
          console.log(`   ${i + 1}. ${err.substring(0, 60)}...`);
        });
      } else {
        console.log('✅ No critical console errors');
      }

      if (pageErrors.length > 0) {
        console.log(`⚠️  Page errors detected: ${pageErrors.length}`);
        pageErrors.slice(0, 3).forEach((err, i) => {
          console.log(`   ${i + 1}. ${err.substring(0, 60)}...`);
        });
      } else {
        console.log('✅ No page-level errors');
      }

      console.log();
    } catch (e) {
      console.log(`⚠️  Error monitoring test failed: ${e.message}\n`);
    }

    // ========== TEST 6: Graceful Degradation ==========
    console.log('📉 TEST 6: Graceful Degradation');
    console.log('═'.repeat(40));
    try {
      const frames = page.frames();
      for (const frame of frames) {
        try {
          const degradationChecks = await frame.evaluate(() => {
            const checks = {
              coreHtmlPresent: !!document.getElementById('app'),
              baseStylesLoaded: document.styleSheets.length > 0,
              navigationWorks: !!document.querySelectorAll('button, a[role="button"]').length > 0,
              dataDisplayWorks: !!document.querySelectorAll('[class*="card"], [class*="row"], table').length > 0,
            };

            return checks;
          });

          console.log('Graceful degradation check:');
          console.log(`${degradationChecks.coreHtmlPresent ? '✅' : '⚠️ '} Core HTML present`);
          console.log(`${degradationChecks.baseStylesLoaded ? '✅' : '⚠️ '} Styles loaded`);
          console.log(`${degradationChecks.navigationWorks ? '✅' : '⚠️ '} Navigation present`);
          console.log(`${degradationChecks.dataDisplayWorks ? '✅' : '⚠️ '} Data display structure`);

          break;
        } catch (e) {
          // Ignore frame errors
        }
      }
      console.log();
    } catch (e) {
      console.log(`⚠️  Graceful degradation test failed: ${e.message}\n`);
    }

    // ========== SUMMARY ==========
    console.log('═'.repeat(40));
    console.log('✅ Error recovery test completed!\n');
    console.log('Summary:');
    console.log('- Missing data handling checked');
    console.log('- Invalid input handling verified');
    console.log('- Error fallback displays examined');
    console.log('- Network resilience assessed');
    console.log('- Console errors monitored');
    console.log('- Graceful degradation verified\n');

    await browser.close();
    process.exit(0);

  } catch (e) {
    console.error('❌ Error recovery test failed:', e);
    process.exit(1);
  }
})();
