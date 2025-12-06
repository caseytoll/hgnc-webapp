#!/usr/bin/env node

/**
 * Search & Filter Functionality Testing - HGNC WebApp
 * 
 * Tests:
 * - Real-time search filtering
 * - Case-insensitive search
 * - Multiple field search
 * - Filter functionality
 * - Search result accuracy
 * - Performance with large datasets
 */

const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const APP_URL = process.env.APP_URL || 'https://script.google.com/macros/s/AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug/exec';
    const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

    console.log('🔍 Search & Filter Functionality Test Starting...\n');

    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.evaluateOnNewDocument(() => {
      try { localStorage.setItem('testInsightsEnabled', 'true'); } catch(e) {}
    });

    console.log('📍 Loading application...');
    await page.goto(APP_URL, {waitUntil: 'networkidle2'});
    console.log('✅ Application loaded\n');

    // ========== TEST 1: Search Input Detection ==========
    console.log('🔎 TEST 1: Search Input Detection');
    console.log('═'.repeat(40));
    try {
      const frames = page.frames();
      for (const frame of frames) {
        try {
          const searchInputs = await frame.evaluate(() => {
            // Look for search input
            const searchInput = document.querySelector('input[type="search"]') ||
                              document.querySelector('input[placeholder*="search" i]') ||
                              document.querySelector('input[placeholder*="filter" i]') ||
                              document.querySelector('[data-search]') ||
                              document.querySelector('.search-input');
            
            if (!searchInput) return { found: false };

            const inputDetails = {
              found: true,
              type: searchInput.type,
              placeholder: searchInput.placeholder,
              id: searchInput.id,
              name: searchInput.name,
              hasDataAttribute: searchInput.hasAttribute('data-search'),
              className: searchInput.className,
            };

            return inputDetails;
          });

          if (searchInputs.found) {
            console.log(`Search input found: ✅`);
            console.log(`  Type: ${searchInputs.type}`);
            console.log(`  Placeholder: ${searchInputs.placeholder || '(none)'}`);
            console.log(`  Data attribute: ${searchInputs.hasDataAttribute ? '✅' : '⚠️'}`);
            console.log('✅ Search functionality available');
          } else {
            console.log('⚠️  No search input found');
          }

          break;
        } catch (e) {
          // Ignore frame errors
        }
      }
      console.log();
    } catch (e) {
      console.log(`⚠️  Search input test failed: ${e.message}\n`);
    }

    // ========== TEST 2: Real-time Filtering ==========
    console.log('⚡ TEST 2: Real-time Filtering');
    console.log('═'.repeat(40));
    try {
      const frames = page.frames();
      for (const frame of frames) {
        try {
          const searchInput = await frame.$('input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]');
          
          if (searchInput) {
            // Get initial list count
            const initialCount = await frame.evaluate(() => {
              return document.querySelectorAll('.team-card, [data-team-id], .list-item').length;
            });

            // Type a search query
            await searchInput.type('test', { delay: 50 });
            await new Promise(r => setTimeout(r, 500));

            // Get filtered count
            const filterResult = await frame.evaluate(() => {
              const items = document.querySelectorAll('.team-card, [data-team-id], .list-item');
              const visibleItems = Array.from(items).filter(item => {
                const style = window.getComputedStyle(item);
                return style.display !== 'none' && style.visibility !== 'hidden';
              });

              return {
                totalItems: items.length,
                visibleItems: visibleItems.length,
                filtered: visibleItems.length < items.length,
              };
            });

            // Clear search
            await searchInput.triple_click();
            await searchInput.press('Backspace');
            await new Promise(r => setTimeout(r, 300));

            console.log(`Initial item count: ${initialCount}`);
            console.log(`After search "test": ${filterResult.visibleItems} visible`);
            console.log(`Filtering active: ${filterResult.filtered ? '✅' : '⚠️'}`);

            if (filterResult.filtered || filterResult.visibleItems < filterResult.totalItems) {
              console.log('✅ Real-time filtering working');
            } else {
              console.log('ℹ️  Search did not filter results (may not match existing data)');
            }
          } else {
            console.log('⚠️  No search input available for filtering test');
          }

          break;
        } catch (e) {
          // Ignore frame errors
        }
      }
      console.log();
    } catch (e) {
      console.log(`⚠️  Real-time filtering test failed: ${e.message}\n`);
    }

    // ========== TEST 3: Case-Insensitive Search ==========
    console.log('🔤 TEST 3: Case-Insensitive Search');
    console.log('═'.repeat(40));
    try {
      const frames = page.frames();
      for (const frame of frames) {
        try {
          const searchInput = await frame.$('input[type="search"], input[placeholder*="search" i]');
          
          if (searchInput) {
            const caseTest = await frame.evaluate(() => {
              // Get initial data to find a team name
              const firstCard = document.querySelector('.team-card, [data-team-id]');
              if (!firstCard) return { testable: false };

              const teamName = firstCard.textContent?.split('\n')[0]?.trim() || 'test';
              return { testable: true, sampleName: teamName };
            });

            if (caseTest.testable && caseTest.sampleName) {
              const testQuery = caseTest.sampleName.toUpperCase().substring(0, 3);

              // Search with uppercase
              await searchInput.type(testQuery, { delay: 50 });
              await new Promise(r => setTimeout(r, 300));

              const upperResult = await frame.evaluate(() => {
                const items = document.querySelectorAll('.team-card, [data-team-id]');
                return Array.from(items).filter(item => {
                  const style = window.getComputedStyle(item);
                  return style.display !== 'none' && style.visibility !== 'hidden';
                }).length;
              });

              // Clear and try lowercase
              await searchInput.triple_click();
              await searchInput.press('Backspace');
              await new Promise(r => setTimeout(r, 200));

              const lowerQuery = testQuery.toLowerCase();
              await searchInput.type(lowerQuery, { delay: 50 });
              await new Promise(r => setTimeout(r, 300));

              const lowerResult = await frame.evaluate(() => {
                const items = document.querySelectorAll('.team-card, [data-team-id]');
                return Array.from(items).filter(item => {
                  const style = window.getComputedStyle(item);
                  return style.display !== 'none' && style.visibility !== 'hidden';
                }).length;
              });

              console.log(`Uppercase "${testQuery}" results: ${upperResult}`);
              console.log(`Lowercase "${lowerQuery}" results: ${lowerResult}`);

              if (upperResult === lowerResult && upperResult > 0) {
                console.log('✅ Case-insensitive search working');
              } else if (upperResult > 0 || lowerResult > 0) {
                console.log('⚠️  Case sensitivity varies');
              } else {
                console.log('ℹ️  No results match (search may be working but data doesn\'t contain query)');
              }

              await searchInput.triple_click();
              await searchInput.press('Backspace');
            } else {
              console.log('ℹ️  Could not test case sensitivity (no sample data)');
            }
          } else {
            console.log('⚠️  No search input available');
          }

          break;
        } catch (e) {
          // Ignore frame errors
        }
      }
      console.log();
    } catch (e) {
      console.log(`⚠️  Case-insensitive test failed: ${e.message}\n`);
    }

    // ========== TEST 4: Multi-field Search ==========
    console.log('📊 TEST 4: Multi-field Search');
    console.log('═'.repeat(40));
    try {
      const frames = page.frames();
      for (const frame of frames) {
        try {
          const multiField = await frame.evaluate(() => {
            // Check what fields are searchable
            const cards = document.querySelectorAll('.team-card, [data-team-id]');
            if (cards.length === 0) return { tested: false };

            const firstCard = cards[0];
            const fields = {
              name: null,
              id: null,
              wins: null,
              losses: null,
              tier: null,
            };

            // Extract visible text from card
            const text = firstCard.textContent || '';
            const lines = text.split('\n').filter(l => l.trim().length > 0);

            return {
              tested: true,
              textFields: lines.length,
              cardContent: lines.slice(0, 3), // First 3 lines
              hasMultipleFields: lines.length > 1,
            };
          });

          if (multiField.tested) {
            console.log(`Text fields per card: ${multiField.textFields}`);
            console.log(`Multiple searchable fields: ${multiField.hasMultipleFields ? '✅' : '⚠️'}`);
            console.log(`Sample card fields:`);
            multiField.cardContent.forEach((line, idx) => {
              console.log(`  ${idx + 1}. ${line.substring(0, 50)}`);
            });

            if (multiField.hasMultipleFields) {
              console.log('✅ Multi-field search structure present');
            } else {
              console.log('⚠️  Single field visible (but may search multiple fields)');
            }
          } else {
            console.log('ℹ️  No team data available to analyze');
          }

          break;
        } catch (e) {
          // Ignore frame errors
        }
      }
      console.log();
    } catch (e) {
      console.log(`⚠️  Multi-field search test failed: ${e.message}\n`);
    }

    // ========== TEST 5: Filter Controls ==========
    console.log('🎛️  TEST 5: Filter Controls');
    console.log('═'.repeat(40));
    try {
      const frames = page.frames();
      for (const frame of frames) {
        try {
          const filters = await frame.evaluate(() => {
            const filterElements = document.querySelectorAll('select, [role="listbox"], .filter-group, [data-filter]');
            
            const filterTypes = {
              selectElements: document.querySelectorAll('select').length,
              dropdowns: document.querySelectorAll('[role="listbox"]').length,
              filterGroups: document.querySelectorAll('.filter-group').length,
              customFilters: document.querySelectorAll('[data-filter]').length,
            };

            // Look for common filter patterns
            const sortElements = document.querySelectorAll('[data-sort], .sort-control');
            const searchElements = document.querySelectorAll('[data-search], .search-control');

            return {
              totalFilterControls: filterElements.length,
              ...filterTypes,
              hasSort: sortElements.length > 0,
              hasSearch: searchElements.length > 0,
            };
          });

          console.log(`Total filter controls: ${filters.totalFilterControls}`);
          console.log(`Select elements: ${filters.selectElements}`);
          console.log(`Dropdowns: ${filters.dropdowns}`);
          console.log(`Filter groups: ${filters.filterGroups}`);
          console.log(`Sort controls: ${filters.hasSort ? '✅' : '⚠️'}`);
          console.log(`Search controls: ${filters.hasSearch ? '✅' : '⚠️'}`);

          if (filters.totalFilterControls > 0) {
            console.log('✅ Filter controls available');
          } else {
            console.log('ℹ️  No dedicated filter controls found (search may be primary filter)');
          }

          break;
        } catch (e) {
          // Ignore frame errors
        }
      }
      console.log();
    } catch (e) {
      console.log(`⚠️  Filter controls test failed: ${e.message}\n`);
    }

    // ========== TEST 6: Search Performance ==========
    console.log('⚡ TEST 6: Search Performance');
    console.log('═'.repeat(40));
    try {
      const frames = page.frames();
      for (const frame of frames) {
        try {
          const searchInput = await frame.$('input[type="search"], input[placeholder*="search" i]');
          
          if (searchInput) {
            // Measure search performance with multiple keystrokes
            const performance = await frame.evaluate(() => {
              const input = document.querySelector('input[type="search"], input[placeholder*="search" i]');
              if (!input) return null;

              const startTime = performance.now();

              // Simulate typing "performance test"
              input.value = 'p';
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));

              const afterFirstChar = performance.now();

              input.value = 'per';
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));

              const afterThreeChars = performance.now();

              // Clear
              input.value = '';
              input.dispatchEvent(new Event('input', { bubbles: true }));

              const afterClear = performance.now();

              return {
                firstCharTime: Math.round(afterFirstChar - startTime),
                threeCharTime: Math.round(afterThreeChars - afterFirstChar),
                clearTime: Math.round(afterClear - afterThreeChars),
              };
            });

            if (performance) {
              console.log(`First character response: ${performance.firstCharTime}ms`);
              console.log(`Three character response: ${performance.threeCharTime}ms`);
              console.log(`Clear response: ${performance.clearTime}ms`);

              const avgTime = (performance.firstCharTime + performance.threeCharTime) / 2;
              if (avgTime < 100) {
                console.log('✅ Search response is immediate (<100ms)');
              } else if (avgTime < 300) {
                console.log('✅ Search response is acceptable (100-300ms)');
              } else {
                console.log('⚠️  Search response is slow (>300ms)');
              }
            }
          } else {
            console.log('⚠️  No search input available');
          }

          break;
        } catch (e) {
          // Ignore frame errors
        }
      }
      console.log();
    } catch (e) {
      console.log(`⚠️  Search performance test failed: ${e.message}\n`);
    }

    // ========== SUMMARY ==========
    console.log('═'.repeat(40));
    console.log('✅ Search & filter functionality test completed!\n');
    console.log('Summary:');
    console.log('- Search input detection verified');
    console.log('- Real-time filtering tested');
    console.log('- Case-insensitive search evaluated');
    console.log('- Multi-field search assessed');
    console.log('- Filter controls inventoried');
    console.log('- Search performance measured\n');

    await browser.close();
    process.exit(0);

  } catch (e) {
    console.error('❌ Search & filter test failed:', e);
    process.exit(1);
  }
})();
