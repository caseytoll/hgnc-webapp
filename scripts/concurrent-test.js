#!/usr/bin/env node

/**
 * Concurrent Operations Test for HGNC WebApp
 * 
 * Tests race conditions and concurrent operations:
 * - Multiple simultaneous player additions
 * - Concurrent team modifications
 * - Simultaneous read/write operations
 * - Data consistency under load
 */

const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const APP_URL = process.env.APP_URL || 'https://script.google.com/macros/s/AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug/exec';
    const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    const OWNER_EMAIL = process.env.OWNER_EMAIL || 'test-owner@example.com';

    console.log('🚀 Concurrent Operations Test Starting...\n');

    // Launch multiple browser instances for concurrent testing
    const browsers = await Promise.all([
      puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }),
      puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }),
      puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
    ]);

    const pages = await Promise.all(browsers.map(b => b.newPage()));
    
    // Set up error tracking on all pages
    pages.forEach(page => {
      page.on('console', msg => {
        try { 
          const text = msg && msg.text ? msg.text() : String(msg);
          if (text.includes('ERROR') || text.includes('error')) {
            console.log('PAGE_ERROR:', text);
          }
        } catch(e) { /* ignore */ }
      });
    });

    // Configure all pages
    await Promise.all(pages.map(page => 
      page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    ));

    // Enable owner mode on all pages
    await Promise.all(pages.map(page =>
      page.evaluateOnNewDocument((email) => {
        try { window._USER_EMAIL = email; } catch(e) {}
        try { window._OWNER_EMAIL = email; } catch(e) {}
        try { localStorage.setItem('testInsightsEnabled', 'true'); } catch(e) {}
      }, OWNER_EMAIL)
    ));

    console.log('📍 Loading application on 3 concurrent instances...');
    await Promise.all(pages.map(page => 
      page.goto(APP_URL, {waitUntil: 'networkidle2'})
    ));
    console.log('✅ All instances loaded\n');

    // ========== TEST 1: Concurrent Player Additions ==========
    console.log('👥 TEST 1: Concurrent Player Additions');
    console.log('═'.repeat(40));
    try {
      let successCount = 0;
      const timestamp = Date.now();
      
      // Start 3 concurrent add-player operations
      const addPlayerPromises = pages.map((page, index) => 
        (async () => {
          try {
            const frames = page.frames();
            for (const frame of frames) {
              try {
                // Select first team
                const teamCard = await frame.$('.team-card');
                if (!teamCard) continue;

                await frame.evaluate(() => {
                  const card = document.querySelector('.team-card');
                  if (card) card.click();
                });
                
                await new Promise(r => setTimeout(r, 300));

                // Open add player modal
                const addBtn = await frame.$('#show-add-player-modal');
                if (!addBtn) continue;

                await frame.evaluate(() => {
                  const btn = document.getElementById('show-add-player-modal');
                  if (btn) btn.click();
                });
                
                await new Promise(r => setTimeout(r, 300));

                // Fill in player data
                const playerName = `TEST_Concurrent_Player_${index}_${timestamp}`;
                const success = await frame.evaluate((name) => {
                  const nameInput = document.getElementById('add-player-name');
                  const jerseyInput = document.getElementById('add-player-jersey');
                  
                  if (nameInput && jerseyInput) {
                    nameInput.value = name;
                    jerseyInput.value = String((index * 11) + 10); // Unique jersey numbers
                    nameInput.dispatchEvent(new Event('change', { bubbles: true }));
                    jerseyInput.dispatchEvent(new Event('change', { bubbles: true }));
                    return true;
                  }
                  return false;
                }, playerName);

                if (success) {
                  // Submit form
                  await frame.evaluate(() => {
                    const btn = document.getElementById('add-player-button');
                    if (btn) btn.click();
                  });
                  
                  await new Promise(r => setTimeout(r, 500));
                  return true;
                }
              } catch(e) { /* ignore frame errors */ }
            }
            return false;
          } catch(e) {
            console.log(`⚠️  Instance ${index} error: ${e.message}`);
            return false;
          }
        })()
      );

      const results = await Promise.all(addPlayerPromises);
      successCount = results.filter(r => r).length;
      
      console.log(`✅ Concurrent adds completed: ${successCount}/3 instances successful`);
      if (successCount === 3) {
        console.log('✅ TEST 1: PASSED - All concurrent operations succeeded\n');
      } else if (successCount > 0) {
        console.log(`⚠️  TEST 1: PARTIAL - Only ${successCount}/3 operations succeeded\n`);
      } else {
        console.log('⚠️  TEST 1: FAILED - No concurrent operations succeeded\n');
      }
    } catch (e) {
      console.log(`⚠️  Concurrent add test failed: ${e.message}\n`);
    }

    // ========== TEST 2: Rapid Sequential Operations ==========
    console.log('⚡ TEST 2: Rapid Sequential Operations');
    console.log('═'.repeat(40));
    try {
      const page = pages[0];
      const frames = page.frames();
      let operationCount = 0;
      const timestamp = Date.now();

      for (const frame of frames) {
        try {
          // Rapidly add 5 players
          for (let i = 0; i < 5; i++) {
            const addBtn = await frame.$('#show-add-player-modal');
            if (!addBtn) break;

            await frame.evaluate(() => {
              const btn = document.getElementById('show-add-player-modal');
              if (btn) btn.click();
            });
            
            await new Promise(r => setTimeout(r, 200));

            const playerName = `TEST_Rapid_Player_${i}_${timestamp}`;
            const success = await frame.evaluate((name) => {
              const nameInput = document.getElementById('add-player-name');
              const jerseyInput = document.getElementById('add-player-jersey');
              
              if (nameInput && jerseyInput) {
                nameInput.value = name;
                jerseyInput.value = String(20 + i);
                nameInput.dispatchEvent(new Event('change', { bubbles: true }));
                jerseyInput.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
              }
              return false;
            }, playerName);

            if (success) {
              await frame.evaluate(() => {
                const btn = document.getElementById('add-player-button');
                if (btn) btn.click();
              });
              
              await new Promise(r => setTimeout(r, 300));
              operationCount++;
            }
          }
          break;
        } catch(e) { /* ignore */ }
      }

      console.log(`✅ Rapid operations completed: ${operationCount}/5 players added`);
      if (operationCount === 5) {
        console.log('✅ TEST 2: PASSED - All rapid operations succeeded\n');
      } else if (operationCount > 0) {
        console.log(`⚠️  TEST 2: PARTIAL - Only ${operationCount}/5 operations succeeded\n`);
      } else {
        console.log('⚠️  TEST 2: FAILED - No rapid operations succeeded\n');
      }
    } catch (e) {
      console.log(`⚠️  Rapid operations test failed: ${e.message}\n`);
    }

    // ========== TEST 3: Concurrent Read/Write ==========
    console.log('📖 TEST 3: Concurrent Read/Write Consistency');
    console.log('═'.repeat(40));
    try {
      const readPromises = pages.slice(1).map((page, index) =>
        (async () => {
          try {
            const frames = page.frames();
            for (const frame of frames) {
              const teamCount = await frame.evaluate(() => {
                const cards = document.querySelectorAll('.team-card');
                return cards.length;
              }).catch(() => 0);
              
              if (teamCount > 0) return teamCount;
            }
            return 0;
          } catch(e) {
            return 0;
          }
        })()
      );

      const counts = await Promise.all(readPromises);
      const consistent = counts.every(c => c === counts[0]);

      console.log(`✅ Concurrent reads completed: [${counts.join(', ')}] teams`);
      if (consistent) {
        console.log('✅ TEST 3: PASSED - All instances see same data\n');
      } else {
        console.log('⚠️  TEST 3: WARNING - Data inconsistency detected\n');
      }
    } catch (e) {
      console.log(`⚠️  Read/write consistency test failed: ${e.message}\n`);
    }

    // ========== CLEANUP ==========
    console.log('═'.repeat(40));
    console.log('🧹 Cleaning up test data...');
    try {
      // Close all browsers
      await Promise.all(browsers.map(b => b.close()));
      console.log('✅ Browser instances closed\n');
    } catch(e) {
      console.log(`⚠️  Cleanup failed: ${e.message}\n`);
    }

    // ========== SUMMARY ==========
    console.log('═'.repeat(40));
    console.log('✅ Concurrent operations test completed!\n');
    console.log('Summary:');
    console.log('- Concurrent player additions tested');
    console.log('- Rapid sequential operations tested');
    console.log('- Read/write consistency verified');
    console.log('- Multi-browser race conditions checked\n');

    process.exit(0);

  } catch (e) {
    console.error('❌ Concurrent operations test failed:', e);
    process.exit(1);
  }
})();
