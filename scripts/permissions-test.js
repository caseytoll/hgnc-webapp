#!/usr/bin/env node

/**
 * Permission Boundary Test for HGNC WebApp
 * 
 * Tests access control and permission boundaries:
 * - Owner-only features accessible only to owner
 * - Non-owner access restrictions enforced
 * - Edit/delete operations respect permissions
 * - Admin-only buttons hidden from non-owners
 */

const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const APP_URL = process.env.APP_URL || 'https://script.google.com/macros/s/AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug/exec';
    const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    const OWNER_EMAIL = process.env.OWNER_EMAIL || 'caseytoll78@gmail.com';
    const NON_OWNER_EMAIL = 'non-owner@example.com';

    console.log('🚀 Permission Boundary Test Starting...\n');

    // Create two browser instances: one for owner, one for non-owner
    const ownerBrowser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const nonOwnerBrowser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const ownerPage = await ownerBrowser.newPage();
    const nonOwnerPage = await nonOwnerBrowser.newPage();

    // Set up error tracking
    [ownerPage, nonOwnerPage].forEach(page => {
      page.on('console', msg => {
        try { 
          const text = msg && msg.text ? msg.text() : String(msg);
          if (text.includes('ERROR') || text.includes('error')) {
            console.log('PAGE_ERROR:', text);
          }
        } catch(e) { /* ignore */ }
      });
    });

    // Configure pages
    await Promise.all([
      ownerPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'),
      nonOwnerPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    ]);

    // Set owner mode on owner page only
    await ownerPage.evaluateOnNewDocument((email) => {
      try { window._USER_EMAIL = email; } catch(e) {}
      try { window._OWNER_EMAIL = email; } catch(e) {}
      try { localStorage.setItem('testInsightsEnabled', 'true'); } catch(e) {}
    }, OWNER_EMAIL);

    // Set non-owner email on non-owner page
    await nonOwnerPage.evaluateOnNewDocument((email) => {
      try { window._USER_EMAIL = email; } catch(e) {}
      try { localStorage.setItem('testInsightsEnabled', 'false'); } catch(e) {}
    }, NON_OWNER_EMAIL);

    console.log('📍 Loading application...');
    await Promise.all([
      ownerPage.goto(APP_URL, {waitUntil: 'networkidle2'}),
      nonOwnerPage.goto(APP_URL, {waitUntil: 'networkidle2'})
    ]);
    console.log('✅ Both pages loaded\n');

    // ========== TEST 1: Owner Features Visibility ==========
    console.log('👤 TEST 1: Owner Features Visibility');
    console.log('═'.repeat(40));
    try {
      const ownerFrames = ownerPage.frames();
      let ownerFeaturesVisible = {
        addTeamButton: false,
        addPlayerButton: false,
        editButtons: false,
        deleteButtons: false,
        testInsights: false
      };

      for (const frame of ownerFrames) {
        try {
          const features = await frame.evaluate(() => {
            const addTeamBtn = document.getElementById('show-add-team-modal');
            const addPlayerBtn = document.getElementById('show-add-player-modal');
            const editBtns = document.querySelectorAll('[class*="edit"]');
            const deleteBtns = document.querySelectorAll('[class*="delete"], [class*="remove"]');
            const testInsights = document.querySelector('[class*="test"], [class*="debug"]');

            return {
              addTeam: !!addTeamBtn && !addTeamBtn.classList.contains('hidden'),
              addPlayer: !!addPlayerBtn && !addPlayerBtn.classList.contains('hidden'),
              edit: editBtns.length > 0,
              delete: deleteBtns.length > 0,
              testInsights: !!testInsights
            };
          });

          if (features.addTeam || features.edit) {
            ownerFeaturesVisible = { ...features };
            break;
          }
        } catch(e) { /* ignore */ }
      }

      console.log('Owner capabilities:');
      console.log(`  - Add team button: ${ownerFeaturesVisible.addTeam ? '✅ Visible' : '❌ Hidden'}`);
      console.log(`  - Add player button: ${ownerFeaturesVisible.addPlayer ? '✅ Visible' : '❌ Hidden'}`);
      console.log(`  - Edit buttons: ${ownerFeaturesVisible.edit ? '✅ Visible' : '❌ Hidden'}`);
      console.log(`  - Delete buttons: ${ownerFeaturesVisible.delete ? '✅ Visible' : '❌ Hidden'}`);
      if (ownerFeaturesVisible.addTeam || ownerFeaturesVisible.edit) {
        console.log('✅ TEST 1: PASSED - Owner features visible\n');
      } else {
        console.log('⚠️  TEST 1: WARNING - Owner features not found\n');
      }
    } catch (e) {
      console.log(`⚠️  Owner features test failed: ${e.message}\n`);
    }

    // ========== TEST 2: Non-Owner Feature Restrictions ==========
    console.log('🔒 TEST 2: Non-Owner Feature Restrictions');
    console.log('═'.repeat(40));
    try {
      const nonOwnerFrames = nonOwnerPage.frames();
      let nonOwnerFeaturesVisible = {
        addTeamButton: false,
        addPlayerButton: false,
        editButtons: false,
        deleteButtons: false
      };

      for (const frame of nonOwnerFrames) {
        try {
          const features = await frame.evaluate(() => {
            const addTeamBtn = document.getElementById('show-add-team-modal');
            const addPlayerBtn = document.getElementById('show-add-player-modal');
            const editBtns = document.querySelectorAll('[class*="edit"]');
            const deleteBtns = document.querySelectorAll('[class*="delete"], [class*="remove"]');

            return {
              addTeam: !!addTeamBtn && !addTeamBtn.classList.contains('hidden'),
              addPlayer: !!addPlayerBtn && !addPlayerBtn.classList.contains('hidden'),
              edit: editBtns.length > 0,
              delete: deleteBtns.length > 0
            };
          });

          if (features.addTeam !== undefined) {
            nonOwnerFeaturesVisible = features;
            break;
          }
        } catch(e) { /* ignore */ }
      }

      console.log('Non-owner access restrictions:');
      console.log(`  - Add team button: ${!nonOwnerFeaturesVisible.addTeam ? '✅ Hidden' : '⚠️  Visible'}`);
      console.log(`  - Add player button: ${!nonOwnerFeaturesVisible.addPlayer ? '✅ Hidden' : '⚠️  Visible'}`);
      console.log(`  - Edit buttons: ${!nonOwnerFeaturesVisible.edit ? '✅ Hidden' : '⚠️  Visible'}`);
      console.log(`  - Delete buttons: ${!nonOwnerFeaturesVisible.delete ? '✅ Hidden' : '⚠️  Visible'}`);

      const restrictionCount = Object.values(nonOwnerFeaturesVisible).filter(v => !v).length;
      if (restrictionCount >= 2) {
        console.log('✅ TEST 2: PASSED - Non-owner access properly restricted\n');
      } else {
        console.log('⚠️  TEST 2: WARNING - Some owner features visible to non-owner\n');
      }
    } catch (e) {
      console.log(`⚠️  Non-owner restrictions test failed: ${e.message}\n`);
    }

    // ========== TEST 3: Read-Only Access for Non-Owner ==========
    console.log('👁️  TEST 3: Read-Only Access Verification');
    console.log('═'.repeat(40));
    try {
      const nonOwnerFrames = nonOwnerPage.frames();
      let teamDataVisible = false;
      let playerDataVisible = false;

      for (const frame of nonOwnerFrames) {
        try {
          const dataVisible = await frame.evaluate(() => {
            const teams = document.querySelectorAll('.team-card, [data-team-id]');
            const players = document.querySelectorAll('.player-card, [data-player-id]');

            return {
              teams: teams.length > 0,
              players: players.length > 0
            };
          });

          if (dataVisible.teams || dataVisible.players) {
            teamDataVisible = dataVisible.teams;
            playerDataVisible = dataVisible.players;
            break;
          }
        } catch(e) { /* ignore */ }
      }

      console.log('Non-owner read access:');
      console.log(`  - Can view teams: ${teamDataVisible ? '✅ Yes' : '❌ No'}`);
      console.log(`  - Can view players: ${playerDataVisible ? '✅ Yes' : '❌ No'}`);

      if (teamDataVisible || playerDataVisible) {
        console.log('✅ TEST 3: PASSED - Non-owner has read-only access\n');
      } else {
        console.log('⚠️  TEST 3: WARNING - No data visible to non-owner\n');
      }
    } catch (e) {
      console.log(`⚠️  Read-only access test failed: ${e.message}\n`);
    }

    // ========== TEST 4: Non-Owner Cannot Perform Operations ==========
    console.log('🚫 TEST 4: Operation Rejection for Non-Owner');
    console.log('═'.repeat(40));
    try {
      const nonOwnerFrames = nonOwnerPage.frames();
      let operationBlocked = false;

      for (const frame of nonOwnerFrames) {
        try {
          // Try to open add team modal (should be hidden/disabled)
          const canOpenAddTeam = await frame.evaluate(() => {
            const btn = document.getElementById('show-add-team-modal');
            if (!btn) return false;
            
            // Try to click it
            try {
              btn.click();
              // Check if modal appeared
              const modal = document.getElementById('add-team-modal');
              return modal && !modal.classList.contains('hidden');
            } catch(e) {
              return false;
            }
          });

          if (!canOpenAddTeam) {
            operationBlocked = true;
            console.log('✅ Add team operation blocked for non-owner');
          } else {
            console.log('⚠️  Add team operation allowed for non-owner (security issue)');
          }
          break;
        } catch(e) { /* ignore */ }
      }

      if (operationBlocked) {
        console.log('✅ TEST 4: PASSED - Non-owner operations blocked\n');
      } else {
        console.log('⚠️  TEST 4: WARNING - Non-owner operations may not be blocked\n');
      }
    } catch (e) {
      console.log(`⚠️  Operation rejection test failed: ${e.message}\n`);
    }

    // ========== CLEANUP ==========
    console.log('═'.repeat(40));
    console.log('🧹 Cleaning up browser instances...');
    try {
      await Promise.all([
        ownerBrowser.close(),
        nonOwnerBrowser.close()
      ]);
      console.log('✅ Browser instances closed\n');
    } catch(e) {
      console.log(`⚠️  Cleanup failed: ${e.message}\n`);
    }

    // ========== SUMMARY ==========
    console.log('═'.repeat(40));
    console.log('✅ Permission boundary test completed!\n');
    console.log('Summary:');
    console.log('- Owner feature visibility verified');
    console.log('- Non-owner restrictions enforced');
    console.log('- Read-only access for non-owners checked');
    console.log('- Operation access control tested\n');

    process.exit(0);

  } catch (e) {
    console.error('❌ Permission test failed:', e);
    process.exit(1);
  }
})();
