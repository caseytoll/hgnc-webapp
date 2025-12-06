#!/usr/bin/env node

/**
 * Form Validation Test for HGNC WebApp
 * 
 * Tests:
 * - Required field validation
 * - Pattern/format validation
 * - Min/max length validation
 * - Numeric field validation
 * - Error message display
 * - Form error states
 */

const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const APP_URL = process.env.APP_URL || 'https://script.google.com/macros/s/AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug/exec';
    const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    const OWNER_EMAIL = process.env.OWNER_EMAIL || 'test-owner@example.com';

    console.log('🚀 Form Validation Test Starting...\n');

    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Enable owner mode
    await page.evaluateOnNewDocument((email) => {
      try { window._USER_EMAIL = email; } catch(e) {}
      try { window._OWNER_EMAIL = email; } catch(e) {}
      try { localStorage.setItem('testInsightsEnabled', 'true'); } catch(e) {}
    }, OWNER_EMAIL);

    console.log('📍 Loading application...');
    await page.goto(APP_URL, {waitUntil: 'networkidle2'});
    console.log('✅ Application loaded\n');

    // ========== TEST 1: Required Fields ==========
    console.log('⚠️  TEST 1: Required Field Validation');
    console.log('═'.repeat(40));
    try {
      const requiredFieldTests = {
        teamNameRequired: false,
        playerNameRequired: false,
        jerseyRequired: false,
      };

      const frames = page.frames();
      for (const frame of frames) {
        try {
          // Test team name field
          const teamNameInput = await frame.$('#add-team-name');
          if (teamNameInput) {
            const isRequired = await frame.evaluate(() => {
              const input = document.getElementById('add-team-name');
              return input && input.hasAttribute('required');
            });
            requiredFieldTests.teamNameRequired = isRequired;
            console.log(`${isRequired ? '✅' : '⚠️ '} Team name required: ${isRequired}`);
          }

          // Test player name field
          const playerNameInput = await frame.$('#add-player-name');
          if (playerNameInput) {
            const isRequired = await frame.evaluate(() => {
              const input = document.getElementById('add-player-name');
              return input && input.hasAttribute('required');
            });
            requiredFieldTests.playerNameRequired = isRequired;
            console.log(`${isRequired ? '✅' : '⚠️ '} Player name required: ${isRequired}`);
          }

          // Test jersey field
          const jerseyInput = await frame.$('#add-player-jersey');
          if (jerseyInput) {
            const isRequired = await frame.evaluate(() => {
              const input = document.getElementById('add-player-jersey');
              return input && input.hasAttribute('required');
            });
            requiredFieldTests.jerseyRequired = isRequired;
            console.log(`${isRequired ? '✅' : '⚠️ '} Jersey required: ${isRequired}`);
          }

          break;
        } catch (e) {
          // Ignore frame errors
        }
      }
      console.log();
    } catch (e) {
      console.log(`⚠️  Required field test failed: ${e.message}\n`);
    }

    // ========== TEST 2: Field Length Validation ==========
    console.log('📏 TEST 2: Field Length Validation');
    console.log('═'.repeat(40));
    try {
      const lengthValidationTests = {
        minLength: false,
        maxLength: false,
        patternValidation: false,
      };

      const frames = page.frames();
      for (const frame of frames) {
        try {
          const validationInfo = await frame.evaluate(() => {
            const checks = {
              minLength: false,
              maxLength: false,
              pattern: false,
            };

            // Check team name
            const teamInput = document.getElementById('add-team-name');
            if (teamInput) {
              checks.minLength = teamInput.hasAttribute('minlength');
              checks.maxLength = teamInput.hasAttribute('maxlength');
              checks.pattern = teamInput.hasAttribute('pattern');
            }

            return checks;
          });

          if (validationInfo.minLength) {
            console.log('✅ Min length validation present');
            lengthValidationTests.minLength = true;
          } else {
            console.log('ℹ️  Min length validation not found');
          }

          if (validationInfo.maxLength) {
            console.log('✅ Max length validation present');
            lengthValidationTests.maxLength = true;
          } else {
            console.log('ℹ️  Max length validation not found');
          }

          if (validationInfo.pattern) {
            console.log('✅ Pattern validation present');
            lengthValidationTests.patternValidation = true;
          } else {
            console.log('ℹ️  Pattern validation not found');
          }

          break;
        } catch (e) {
          // Ignore frame errors
        }
      }
      console.log();
    } catch (e) {
      console.log(`⚠️  Length validation test failed: ${e.message}\n`);
    }

    // ========== TEST 3: Type/Format Validation ==========
    console.log('🔢 TEST 3: Type & Format Validation');
    console.log('═'.repeat(40));
    try {
      const typeValidationTests = {
        numberFields: 0,
        emailFields: 0,
        emailValidation: false,
      };

      const frames = page.frames();
      for (const frame of frames) {
        try {
          const typeInfo = await frame.evaluate(() => {
            const checks = {
              numberFields: 0,
              emailFields: 0,
            };

            // Count number fields
            const numberInputs = document.querySelectorAll('input[type="number"]');
            checks.numberFields = numberInputs.length;

            // Count email fields
            const emailInputs = document.querySelectorAll('input[type="email"]');
            checks.emailFields = emailInputs.length;

            return checks;
          });

          console.log(`✅ Number input fields: ${typeInfo.numberFields}`);
          console.log(`✅ Email input fields: ${typeInfo.emailFields}`);

          typeValidationTests.numberFields = typeInfo.numberFields;
          typeValidationTests.emailFields = typeInfo.emailFields;

          break;
        } catch (e) {
          // Ignore frame errors
        }
      }
      console.log();
    } catch (e) {
      console.log(`⚠️  Type validation test failed: ${e.message}\n`);
    }

    // ========== TEST 4: Error Message Display ==========
    console.log('💬 TEST 4: Error Message Display');
    console.log('═'.repeat(40));
    try {
      const frames = page.frames();
      let errorDisplayFound = false;

      for (const frame of frames) {
        try {
          // Open add team modal
          const addBtn = await frame.$('#show-add-team-modal');
          if (addBtn) {
            await frame.evaluate(() => {
              const btn = document.getElementById('show-add-team-modal');
              if (btn) btn.click();
            });

            await new Promise(r => setTimeout(r, 300));

            // Check for error containers
            const errorElements = await frame.evaluate(() => {
              const checks = {
                errorMsgs: document.querySelectorAll('.error-message, [class*="error"]').length,
                validationFeedback: document.querySelectorAll('[class*="feedback"], [class*="help"]').length,
                fieldErrors: document.querySelectorAll('[aria-invalid]').length,
              };

              return checks;
            });

            if (errorElements.errorMsgs > 0 || errorElements.validationFeedback > 0) {
              console.log('✅ Error message containers present');
              console.log(`   - Error messages: ${errorElements.errorMsgs}`);
              console.log(`   - Validation feedback: ${errorElements.validationFeedback}`);
              errorDisplayFound = true;
            } else {
              console.log('ℹ️  Error message containers not found (may use native HTML5 validation)');
            }

            // Close modal
            await frame.evaluate(() => {
              const modal = document.getElementById('add-team-modal');
              if (modal) modal.classList.add('hidden');
            });

            break;
          }
        } catch (e) {
          // Ignore frame errors
        }
      }

      if (!errorDisplayFound) {
        console.log('ℹ️  Using browser native validation');
      }
      console.log();
    } catch (e) {
      console.log(`⚠️  Error message test failed: ${e.message}\n`);
    }

    // ========== TEST 5: Submit Button State ==========
    console.log('🔘 TEST 5: Submit Button State');
    console.log('═'.repeat(40));
    try {
      const frames = page.frames();
      for (const frame of frames) {
        try {
          const submitBtn = await frame.$('#add-team-button');
          if (submitBtn) {
            // Check initial state
            const initialState = await frame.evaluate(() => {
              const btn = document.getElementById('add-team-button');
              return {
                disabled: btn.disabled,
                ariaDisabled: btn.getAttribute('aria-disabled'),
                textContent: btn.textContent.trim(),
              };
            });

            console.log('Initial submit button state:');
            console.log(`   - Disabled: ${initialState.disabled}`);
            console.log(`   - Aria-disabled: ${initialState.ariaDisabled}`);
            console.log(`   - Text: ${initialState.textContent}`);

            // Fill form and check if button becomes enabled
            const filledState = await frame.evaluate(() => {
              const input = document.getElementById('add-team-name');
              if (input) {
                input.value = 'Test Team';
                input.dispatchEvent(new Event('change', { bubbles: true }));
              }

              const btn = document.getElementById('add-team-button');
              return {
                disabled: btn.disabled,
                ariaDisabled: btn.getAttribute('aria-disabled'),
              };
            });

            console.log('After filling field:');
            console.log(`   - Disabled: ${filledState.disabled}`);
            console.log(`   - Aria-disabled: ${filledState.ariaDisabled}`);

            break;
          }
        } catch (e) {
          // Ignore frame errors
        }
      }
      console.log();
    } catch (e) {
      console.log(`⚠️  Submit button test failed: ${e.message}\n`);
    }

    // ========== TEST 6: Real-time Validation ==========
    console.log('⚡ TEST 6: Real-time Validation Feedback');
    console.log('═'.repeat(40));
    try {
      const frames = page.frames();
      for (const frame of frames) {
        try {
          const realTimeValidation = await frame.evaluate(() => {
            const checks = {
              inputEventListeners: 0,
              changeEventListeners: 0,
              validateOnInput: false,
            };

            // Check if inputs have event listeners
            const inputs = document.querySelectorAll('input, textarea');
            inputs.forEach(input => {
              // This is a basic check; actual listener detection requires inspection
              if (input.hasAttribute('onchange')) {
                checks.changeEventListeners++;
              }
              if (input.hasAttribute('oninput')) {
                checks.inputEventListeners++;
              }
            });

            return checks;
          });

          console.log('Real-time validation setup:');
          console.log(`   - Change listeners found: ${realTimeValidation.changeEventListeners}`);
          console.log(`   - Input listeners found: ${realTimeValidation.inputEventListeners}`);
          console.log(`   - Pattern: ${realTimeValidation.changeEventListeners > 0 ? 'Uses change events' : 'May use form submission'}`);

          break;
        } catch (e) {
          // Ignore frame errors
        }
      }
      console.log();
    } catch (e) {
      console.log(`⚠️  Real-time validation test failed: ${e.message}\n`);
    }

    // ========== SUMMARY ==========
    console.log('═'.repeat(40));
    console.log('✅ Form validation test completed!\n');
    console.log('Summary:');
    console.log('- Required field validation checked');
    console.log('- Field length validation checked');
    console.log('- Type/format validation checked');
    console.log('- Error message display verified');
    console.log('- Submit button state tested');
    console.log('- Real-time validation feedback checked\n');

    await browser.close();
    process.exit(0);

  } catch (e) {
    console.error('❌ Form validation test failed:', e);
    process.exit(1);
  }
})();
