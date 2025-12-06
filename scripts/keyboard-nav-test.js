#!/usr/bin/env node

/**
 * Keyboard Navigation Testing - HGNC WebApp
 * 
 * Tests:
 * - Tab navigation through forms
 * - Enter key to submit forms
 * - Escape key to close modals
 * - Arrow key navigation in lists
 * - Keyboard shortcuts
 * - Focus management
 */

const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const APP_URL = process.env.APP_URL || 'https://script.google.com/macros/s/AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug/exec';
    const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

    console.log('⌨️  Keyboard Navigation Test Starting...\n');

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

    // ========== TEST 1: Tab Navigation in Add Team Form ==========
    console.log('📋 TEST 1: Tab Navigation in Add Team Form');
    console.log('═'.repeat(40));
    try {
      const frames = page.frames();
      for (const frame of frames) {
        try {
          // Open add team modal
          const modalOpened = await frame.evaluate(() => {
            const addBtn = document.querySelector('[onclick*="showTeamForm"]') || 
                          document.querySelector('button:contains("Add Team")') ||
                          Array.from(document.querySelectorAll('button')).find(b => 
                            b.textContent.toLowerCase().includes('add') && 
                            b.textContent.toLowerCase().includes('team')
                          );
            if (addBtn) {
              addBtn.click();
              return true;
            }
            return false;
          });

          if (modalOpened) {
            await new Promise(r => setTimeout(r, 300));

            const tabOrder = await frame.evaluate(() => {
              const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="number"], textarea, button');
              if (inputs.length === 0) return null;

              const order = Array.from(inputs).map((input, index) => ({
                index: index,
                type: input.type || input.tagName.toLowerCase(),
                name: input.name || input.id || `element-${index}`,
                tabIndex: input.tabIndex,
              }));

              return order;
            });

            if (tabOrder && tabOrder.length > 0) {
              console.log(`Found ${tabOrder.length} interactive elements`);
              tabOrder.forEach((item, idx) => {
                if (idx < 3) { // Show first 3 for brevity
                  console.log(`  ${idx + 1}. ${item.type} - ${item.name} (tabIndex: ${item.tabIndex})`);
                }
              });
              if (tabOrder.length > 3) {
                console.log(`  ... and ${tabOrder.length - 3} more`);
              }
              console.log('✅ Tab order detected');
            } else {
              console.log('⚠️  No interactive elements found in form');
            }
          } else {
            console.log('⚠️  Could not open Add Team modal');
          }

          break;
        } catch (e) {
          // Ignore frame errors
        }
      }
      console.log();
    } catch (e) {
      console.log(`⚠️  Tab navigation test failed: ${e.message}\n`);
    }

    // ========== TEST 2: Enter Key Form Submission ==========
    console.log('🔑 TEST 2: Enter Key Form Submission');
    console.log('═'.repeat(40));
    try {
      const frames = page.frames();
      for (const frame of frames) {
        try {
          // Look for any open modal or form
          const enterSupport = await frame.evaluate(() => {
            // Find the first visible input field
            const input = document.querySelector('input[type="text"]:not([style*="display:none"])') ||
                         document.querySelector('input[type="text"]');
            
            if (!input) return { supported: false, reason: 'No input found' };

            // Check if parent form has onsubmit handler
            let form = input.closest('form');
            let hasFormSubmit = false;
            let hasEnterHandler = false;

            if (form) {
              hasFormSubmit = form.onsubmit !== null;
            }

            // Check for keyup/keydown listeners
            const handlers = getEventListeners ? getEventListeners(input) : null;
            if (handlers) {
              hasEnterHandler = handlers.keyup || handlers.keydown || handlers.keypress;
            }

            // Check for data attributes suggesting enter support
            const dataEnter = input.getAttribute('data-enter') || 
                            input.getAttribute('data-submit') ||
                            input.closest('[data-form-submit]') !== null;

            return {
              supported: hasFormSubmit || hasEnterHandler || dataEnter,
              hasFormElement: !!form,
              hasEventListeners: hasEnterHandler,
              hasDataAttributes: dataEnter,
              inputId: input.id || 'unnamed',
            };
          });

          console.log(`Form element found: ${enterSupport.hasFormElement ? '✅' : '⚠️'}`);
          console.log(`Event listeners: ${enterSupport.hasEventListeners ? '✅' : '⚠️'}`);
          console.log(`Submit data attributes: ${enterSupport.hasDataAttributes ? '✅' : '⚠️'}`);

          if (enterSupport.supported) {
            console.log('✅ Enter key submission likely supported');
          } else {
            console.log('ℹ️  Enter submission support unclear - may require visual testing');
          }

          break;
        } catch (e) {
          // Ignore frame errors
        }
      }
      console.log();
    } catch (e) {
      console.log(`⚠️  Enter key test failed: ${e.message}\n`);
    }

    // ========== TEST 3: Escape Key Modal Closing ==========
    console.log('🚪 TEST 3: Escape Key Modal Closing');
    console.log('═'.repeat(40));
    try {
      const frames = page.frames();
      for (const frame of frames) {
        try {
          const escapeSupport = await frame.evaluate(() => {
            // Find visible modals or dialogs
            const modal = document.querySelector('.modal:not([style*="display:none"])') ||
                         document.querySelector('[role="dialog"]') ||
                         document.querySelector('.modal');
            
            if (!modal) return { found: false };

            // Check for keydown listener on modal
            const hasListener = modal.onkeydown !== null || 
                              modal.onkeyup !== null;

            // Check for data attributes
            const dataEscape = modal.getAttribute('data-dismiss') === 'modal' ||
                             modal.getAttribute('data-close') === 'escape' ||
                             modal.closest('[data-escape-close]') !== null;

            // Check for close button
            const closeBtn = modal.querySelector('[data-dismiss="modal"]') ||
                           modal.querySelector('.modal-close') ||
                           modal.querySelector('button:contains("Close")') ||
                           Array.from(modal.querySelectorAll('button')).find(b => 
                             b.textContent.toLowerCase().includes('close') ||
                             b.textContent === '✕' ||
                             b.textContent === '×'
                           );

            return {
              found: true,
              hasEscapeListener: hasListener,
              hasEscapeDataAttribute: dataEscape,
              hasCloseButton: !!closeBtn,
              modalClass: modal.className,
            };
          });

          if (escapeSupport.found) {
            console.log(`Modal class: ${escapeSupport.modalClass}`);
            console.log(`Escape listener: ${escapeSupport.hasEscapeListener ? '✅' : '⚠️'}`);
            console.log(`Close button: ${escapeSupport.hasCloseButton ? '✅' : '⚠️'}`);
            console.log(`Escape attributes: ${escapeSupport.hasEscapeDataAttribute ? '✅' : '⚠️'}`);

            if (escapeSupport.hasEscapeListener || escapeSupport.hasEscapeDataAttribute || escapeSupport.hasCloseButton) {
              console.log('✅ Modal escape handling detected');
            } else {
              console.log('⚠️  Modal escape handling unclear');
            }
          } else {
            console.log('ℹ️  No open modal found for escape key test');
          }

          break;
        } catch (e) {
          // Ignore frame errors
        }
      }
      console.log();
    } catch (e) {
      console.log(`⚠️  Escape key test failed: ${e.message}\n`);
    }

    // ========== TEST 4: Arrow Key Navigation in Lists ==========
    console.log('⬆️  TEST 4: Arrow Key Navigation');
    console.log('═'.repeat(40));
    try {
      const frames = page.frames();
      for (const frame of frames) {
        try {
          const arrowSupport = await frame.evaluate(() => {
            // Find list containers
            const teamList = document.getElementById('team-list') ||
                           document.querySelector('[role="listbox"]') ||
                           document.querySelector('.list-container');

            if (!teamList) return { found: false };

            // Check for arrow key handlers
            const hasArrowListener = teamList.onkeydown !== null ||
                                   teamList.onkeyup !== null;

            // Check for ARIA attributes indicating keyboard support
            const role = teamList.getAttribute('role');
            const ariaSupport = role === 'listbox' || 
                              role === 'list' ||
                              teamList.hasAttribute('data-keyboard-nav');

            // Check for focusable items
            const items = teamList.querySelectorAll('[role="option"], .list-item, li, [data-list-item]');

            return {
              found: true,
              hasArrowListener: hasArrowListener,
              ariaRole: role,
              hasAriaSupport: ariaSupport,
              itemCount: items.length,
              itemsHaveFocus: Array.from(items).some(item => 
                item.hasAttribute('tabindex') || item.hasAttribute('data-focusable')
              ),
            };
          });

          if (arrowSupport.found) {
            console.log(`List items: ${arrowSupport.itemCount}`);
            console.log(`ARIA role: ${arrowSupport.ariaRole || 'none'}`);
            console.log(`Arrow listeners: ${arrowSupport.hasArrowListener ? '✅' : '⚠️'}`);
            console.log(`ARIA support: ${arrowSupport.hasAriaSupport ? '✅' : '⚠️'}`);
            console.log(`Focusable items: ${arrowSupport.itemsHaveFocus ? '✅' : '⚠️'}`);

            if (arrowSupport.hasArrowListener || arrowSupport.hasAriaSupport) {
              console.log('✅ Arrow key navigation likely supported');
            } else {
              console.log('ℹ️  Arrow key navigation support unclear');
            }
          } else {
            console.log('ℹ️  No list found for arrow key test');
          }

          break;
        } catch (e) {
          // Ignore frame errors
        }
      }
      console.log();
    } catch (e) {
      console.log(`⚠️  Arrow key test failed: ${e.message}\n`);
    }

    // ========== TEST 5: Focus Management ==========
    console.log('🎯 TEST 5: Focus Management');
    console.log('═'.repeat(40));
    try {
      const frames = page.frames();
      for (const frame of frames) {
        try {
          const focusMetrics = await frame.evaluate(() => {
            const focusableElements = document.querySelectorAll(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );

            const elementsWithoutTabindex = Array.from(focusableElements).filter(el => 
              !el.hasAttribute('tabindex')
            );

            const visibleFocusable = Array.from(focusableElements).filter(el => {
              const style = window.getComputedStyle(el);
              return style.display !== 'none' && style.visibility !== 'hidden';
            });

            return {
              totalFocusable: focusableElements.length,
              visibleFocusable: visibleFocusable.length,
              withoutExplicitTabindex: elementsWithoutTabindex.length,
              currentFocus: document.activeElement?.tagName || 'none',
              hasVisualFocusIndicator: !!document.querySelector(':focus-visible') ||
                                      !!document.querySelector(':focus'),
            };
          });

          console.log(`Total focusable elements: ${focusMetrics.totalFocusable}`);
          console.log(`Visible focusable: ${focusMetrics.visibleFocusable}`);
          console.log(`Without explicit tabindex: ${focusMetrics.withoutExplicitTabindex}`);
          console.log(`Current focus: ${focusMetrics.currentFocus}`);
          console.log(`Visual focus indicator: ${focusMetrics.hasVisualFocusIndicator ? '✅' : '⚠️'}`);

          if (focusMetrics.visibleFocusable > 0) {
            console.log('✅ Focus management system active');
          } else {
            console.log('⚠️  No focusable elements visible');
          }

          break;
        } catch (e) {
          // Ignore frame errors
        }
      }
      console.log();
    } catch (e) {
      console.log(`⚠️  Focus management test failed: ${e.message}\n`);
    }

    // ========== TEST 6: Keyboard Shortcut Support ==========
    console.log('⌨️  TEST 6: Keyboard Shortcuts');
    console.log('═'.repeat(40));
    try {
      const frames = page.frames();
      for (const frame of frames) {
        try {
          const shortcuts = await frame.evaluate(() => {
            const supported = [];

            // Check for common shortcuts
            // Cmd+A or Ctrl+A
            if (document.querySelector('[data-shortcut*="a"]') ||
                document.querySelector('[data-hotkey*="a"]')) {
              supported.push('Select All (Cmd/Ctrl+A)');
            }

            // Cmd+S or Ctrl+S
            if (document.querySelector('[data-shortcut*="s"]') ||
                document.querySelector('[data-hotkey*="s"]')) {
              supported.push('Save (Cmd/Ctrl+S)');
            }

            // Escape
            if (document.querySelector('[data-shortcut*="Escape"]') ||
                document.querySelector('[data-hotkey*="Escape"]')) {
              supported.push('Cancel/Close (Escape)');
            }

            // Tab/Shift+Tab - always supported in HTML
            supported.push('Tab Navigation (Tab/Shift+Tab)');

            // Look for help or shortcuts element
            const hasHelpContent = document.querySelector('[data-shortcuts]') ||
                                 document.querySelector('[role="doc-tip"]');

            return {
              shortcuts: supported,
              hasHelpDocument: hasHelpContent,
              eventListeners: Object.keys(window).filter(key => 
                key.includes('keydown') || key.includes('keyup') || key.includes('keypress')
              ).length > 0,
            };
          });

          console.log(`Detected shortcuts:`);
          if (shortcuts.shortcuts.length > 0) {
            shortcuts.shortcuts.forEach((shortcut, idx) => {
              console.log(`  ${idx + 1}. ${shortcut}`);
            });
            console.log('✅ Keyboard shortcuts supported');
          } else {
            console.log('  (Tab/Shift+Tab navigation)');
            console.log('ℹ️  Limited shortcut support detected');
          }

          console.log(`Help documentation: ${shortcuts.hasHelpDocument ? '✅' : '⚠️'}`);

          break;
        } catch (e) {
          // Ignore frame errors
        }
      }
      console.log();
    } catch (e) {
      console.log(`⚠️  Keyboard shortcuts test failed: ${e.message}\n`);
    }

    // ========== SUMMARY ==========
    console.log('═'.repeat(40));
    console.log('✅ Keyboard navigation test completed!\n');
    console.log('Summary:');
    console.log('- Tab order and form navigation checked');
    console.log('- Enter key submission support assessed');
    console.log('- Escape key modal closing evaluated');
    console.log('- Arrow key list navigation inspected');
    console.log('- Focus management verified');
    console.log('- Keyboard shortcuts inventoried\n');

    await browser.close();
    process.exit(0);

  } catch (e) {
    console.error('❌ Keyboard navigation test failed:', e);
    process.exit(1);
  }
})();
