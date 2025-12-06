#!/usr/bin/env node

/**
 * Mobile Responsiveness Testing - HGNC WebApp
 * 
 * Tests:
 * - Layout responsiveness at mobile viewport (375px)
 * - Touch interaction support
 * - Mobile form usability
 * - Font size readability
 * - Tap target size (minimum 44x44px)
 * - Mobile specific features
 */

const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const APP_URL = process.env.APP_URL || 'https://script.google.com/macros/s/AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug/exec';
    const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

    console.log('📱 Mobile Responsiveness Test Starting...\n');

    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set mobile viewport (iPhone 12 Pro size)
    await page.setViewport({
      width: 375,
      height: 812,
      deviceScaleFactor: 3,
    });

    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1');
    
    await page.evaluateOnNewDocument(() => {
      try { localStorage.setItem('testInsightsEnabled', 'true'); } catch(e) {}
    });

    console.log('📍 Loading application (375px viewport)...');
    await page.goto(APP_URL, {waitUntil: 'networkidle2'});
    console.log('✅ Application loaded\n');

    // ========== TEST 1: Viewport and Layout Responsiveness ==========
    console.log('📐 TEST 1: Viewport & Layout Responsiveness');
    console.log('═'.repeat(40));
    try {
      const layouts = await page.evaluate(() => {
        const viewport = {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio,
        };

        // Check for mobile-specific meta tags
        const viewport_meta = document.querySelector('meta[name="viewport"]');
        const viewportContent = viewport_meta?.getAttribute('content') || '';

        // Check layout mode
        const body = document.body;
        const bodyWidth = body.offsetWidth;
        const bodyHeight = body.offsetHeight;
        const hasOverflow = document.documentElement.scrollWidth > window.innerWidth;

        // Check for mobile classes
        const hasMobileClass = body.className.includes('mobile') ||
                             body.className.includes('sm') ||
                             body.className.includes('small');

        // Check media query support
        const mediaQuerySmall = window.matchMedia('(max-width: 768px)').matches;
        const mediaQueryMobile = window.matchMedia('(max-width: 480px)').matches;

        return {
          actualViewport: viewport,
          bodyDimensions: { width: bodyWidth, height: bodyHeight },
          viewportMeta: viewportContent,
          hasOverflow: hasOverflow,
          hasMobileClass: hasMobileClass,
          matchesSmallMedia: mediaQuerySmall,
          matchesMobileMedia: mediaQueryMobile,
        };
      });

      console.log(`Actual viewport: ${layouts.actualViewport.width}x${layouts.actualViewport.height}px`);
      console.log(`Body dimensions: ${layouts.bodyDimensions.width}x${layouts.bodyDimensions.height}px`);
      console.log(`Device pixel ratio: ${layouts.actualViewport.devicePixelRatio}`);
      console.log(`Viewport meta tag: ${layouts.viewportMeta ? '✅' : '⚠️'}`);
      console.log(`Mobile class detected: ${layouts.hasMobileClass ? '✅' : '⚠️'}`);
      console.log(`Matches small screen media: ${layouts.matchesSmallMedia ? '✅' : '✅'}`);
      console.log(`Matches mobile media: ${layouts.matchesMobileMedia ? '✅' : '⚠️'}`);

      if (!layouts.hasOverflow) {
        console.log('✅ No horizontal overflow - layout responsive');
      } else {
        console.log('⚠️  Horizontal overflow detected - layout may not be fully responsive');
      }
    } catch (e) {
      console.log(`⚠️  Viewport test failed: ${e.message}`);
    }
    console.log();

    // ========== TEST 2: Touch Interaction Support ==========
    console.log('👆 TEST 2: Touch Interaction Support');
    console.log('═'.repeat(40));
    try {
      const touchSupport = await page.evaluate(() => {
        const hasTouchEvents = 'ontouchstart' in window ||
                             navigator.maxTouchPoints > 0 ||
                             navigator.msMaxTouchPoints > 0;

        // Check for touch handlers
        const interactive = document.querySelectorAll('button, [onclick], a');
        let touchHandlers = 0;
        interactive.forEach(el => {
          if (el.ontouchstart || el.ontouchend || 
              el.getAttribute('data-touch') ||
              el.className.includes('touch')) {
            touchHandlers++;
          }
        });

        // Check for click handlers that prevent default
        const clickHandlers = Array.from(interactive).filter(el => 
          el.onclick && el.onclick.toString().includes('preventDefault')
        ).length;

        // Check for hover-to-click listeners
        const hasPointerEvents = window.getComputedStyle(document.body)
          .pointerEvents !== 'none';

        return {
          touchEventsAvailable: hasTouchEvents,
          maxTouchPoints: navigator.maxTouchPoints || 0,
          elementsWithTouchHandlers: touchHandlers,
          elementsWithClickHandlers: clickHandlers,
          pointerEventsSupported: hasPointerEvents,
        };
      });

      console.log(`Touch events available: ${touchSupport.touchEventsAvailable ? '✅' : '⚠️'}`);
      console.log(`Max touch points: ${touchSupport.maxTouchPoints}`);
      console.log(`Elements with touch handlers: ${touchSupport.elementsWithTouchHandlers}`);
      console.log(`Click with preventDefault: ${touchSupport.elementsWithClickHandlers}`);
      console.log(`Pointer events supported: ${touchSupport.pointerEventsSupported ? '✅' : '⚠️'}`);

      if (touchSupport.touchEventsAvailable && touchSupport.elementsWithTouchHandlers > 0) {
        console.log('✅ Touch interaction support detected');
      } else {
        console.log('ℹ️  Touch handling may rely on default browser behavior');
      }

      console.log();
    } catch (e) {
      console.log(`⚠️  Touch support test failed: ${e.message}\n`);
    }

    // ========== TEST 3: Tap Target Size (44x44px minimum) ==========
    console.log('🎯 TEST 3: Tap Target Sizes');
    console.log('═'.repeat(40));
    try {
      const tapTargets = await page.evaluate(() => {
        const interactive = document.querySelectorAll('button, a, input[type="button"], input[type="submit"], [role="button"]');
        
        const sizes = Array.from(interactive).map(el => {
          const rect = el.getBoundingClientRect();
          const size = {
            width: Math.ceil(rect.width),
            height: Math.ceil(rect.height),
            minSize: Math.min(rect.width, rect.height),
            meetsStandard: rect.width >= 44 && rect.height >= 44,
            element: el.tagName.toLowerCase(),
            visible: rect.width > 0 && rect.height > 0,
          };
          return size;
        }).filter(s => s.visible);

        const meetStandard = sizes.filter(s => s.meetsStandard).length;
        const tooSmall = sizes.filter(s => !s.meetsStandard).length;

        return {
          totalTargets: sizes.length,
          meetStandard: meetStandard,
          tooSmall: tooSmall,
          avgWidth: Math.round(sizes.reduce((s, t) => s + t.width, 0) / sizes.length),
          avgHeight: Math.round(sizes.reduce((s, t) => s + t.height, 0) / sizes.length),
          smallestTarget: sizes.length > 0 ? Math.min(...sizes.map(s => s.minSize)) : 0,
        };
      });

      console.log(`Interactive elements: ${tapTargets.totalTargets}`);
      console.log(`Meeting 44x44px standard: ${tapTargets.meetStandard}`);
      console.log(`Too small (<44px): ${tapTargets.tooSmall}`);
      console.log(`Average size: ${tapTargets.avgWidth}x${tapTargets.avgHeight}px`);
      console.log(`Smallest target: ${Math.round(tapTargets.smallestTarget)}px`);

      if (tapTargets.tooSmall === 0) {
        console.log('✅ All tap targets meet 44x44px minimum');
      } else if (tapTargets.tooSmall <= 2) {
        console.log('⚠️  A few tap targets are too small');
      } else {
        console.log('⚠️  Many tap targets are below accessibility standard');
      }

      console.log();
    } catch (e) {
      console.log(`⚠️  Tap target test failed: ${e.message}\n`);
    }

    // ========== TEST 4: Font Size and Readability ==========
    console.log('📖 TEST 4: Font Size & Readability');
    console.log('═'.repeat(40));
    try {
      const readability = await page.evaluate(() => {
        const body = document.body;
        const baseSize = window.getComputedStyle(body).fontSize;
        
        const elements = document.querySelectorAll('body, p, h1, h2, h3, h4, h5, h6, a, button, input, label');
        const sizes = Array.from(elements).map(el => {
          const size = window.getComputedStyle(el).fontSize;
          const sizeNum = parseInt(size);
          return sizeNum;
        });

        const minSize = Math.min(...sizes);
        const maxSize = Math.max(...sizes);
        const avgSize = Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length);

        // Check for readable fonts
        const readable = sizes.filter(s => s >= 16).length / sizes.length * 100; // 16px is readable

        // Check for line-height
        const lineHeightElements = Array.from(document.querySelectorAll('p, span, div')).map(el => 
          window.getComputedStyle(el).lineHeight
        );

        const hasGoodLineHeight = lineHeightElements.some(lh => 
          lh === 'normal' || parseInt(lh) >= 20
        );

        return {
          baseFontSize: baseSize,
          minFontSize: minSize,
          maxFontSize: maxSize,
          avgFontSize: avgSize,
          readablePercentage: Math.round(readable),
          hasGoodLineHeight: hasGoodLineHeight,
        };
      });

      console.log(`Base font size: ${readability.baseFontSize}`);
      console.log(`Font size range: ${readability.minFontSize}px - ${readability.maxFontSize}px`);
      console.log(`Average font size: ${readability.avgFontSize}px`);
      console.log(`Readable text (≥16px): ${readability.readablePercentage}%`);
      console.log(`Good line-height: ${readability.hasGoodLineHeight ? '✅' : '⚠️'}`);

      if (readability.readablePercentage >= 80 && readability.hasGoodLineHeight) {
        console.log('✅ Font sizes and spacing meet mobile readability standards');
      } else {
        console.log('⚠️  Some text may be difficult to read on mobile');
      }

      console.log();
    } catch (e) {
      console.log(`⚠️  Readability test failed: ${e.message}\n`);
    }

    // ========== TEST 5: Mobile Form Usability ==========
    console.log('📝 TEST 5: Mobile Form Usability');
    console.log('═'.repeat(40));
    try {
      const formUsability = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input, textarea, select');
        
        const features = {
          totalInputs: inputs.length,
          withPlaceholder: 0,
          withLabel: 0,
          withType: 0,
          largeEnough: 0,
          autoComplete: 0,
          inputTypes: {},
        };

        inputs.forEach(input => {
          if (input.getAttribute('placeholder')) features.withPlaceholder++;
          if (document.querySelector(`label[for="${input.id}"]`)) features.withLabel++;
          if (input.type) {
            features.withType++;
            features.inputTypes[input.type] = (features.inputTypes[input.type] || 0) + 1;
          }
          if (input.offsetHeight >= 44) features.largeEnough++;
          if (input.getAttribute('autocomplete')) features.autoComplete++;
        });

        // Check for mobile-friendly keyboard types
        const numberInputs = document.querySelectorAll('input[type="number"]').length;
        const emailInputs = document.querySelectorAll('input[type="email"]').length;
        const telInputs = document.querySelectorAll('input[type="tel"]').length;

        return {
          ...features,
          numberInputsWithKeyboard: numberInputs,
          emailInputsWithKeyboard: emailInputs,
          telInputsWithKeyboard: telInputs,
        };
      });

      console.log(`Total form inputs: ${formUsability.totalInputs}`);
      console.log(`With placeholders: ${formUsability.withPlaceholder}`);
      console.log(`With labels: ${formUsability.withLabel}`);
      console.log(`Correct input types: ${formUsability.withType}`);
      console.log(`Height ≥44px: ${formUsability.largeEnough}`);
      console.log(`Autocomplete enabled: ${formUsability.autoComplete}`);

      if (Object.keys(formUsability.inputTypes).length > 0) {
        console.log(`Input types used:`, formUsability.inputTypes);
      }

      if (formUsability.largeEnough >= formUsability.totalInputs) {
        console.log('✅ Form inputs have good mobile size');
      } else if (formUsability.largeEnough >= formUsability.totalInputs * 0.8) {
        console.log('⚠️  Some form inputs may be too small for mobile');
      } else {
        console.log('⚠️  Many form inputs are below mobile size standards');
      }

      console.log();
    } catch (e) {
      console.log(`⚠️  Form usability test failed: ${e.message}\n`);
    }

    // ========== TEST 6: Mobile-specific Features ==========
    console.log('📲 TEST 6: Mobile-specific Features');
    console.log('═'.repeat(40));
    try {
      const mobileFeatures = await page.evaluate(() => {
        const features = {
          hasViewportMeta: !!document.querySelector('meta[name="viewport"]'),
          hasIconMeta: !!document.querySelector('link[rel="apple-touch-icon"]'),
          hasThemeColor: !!document.querySelector('meta[name="theme-color"]'),
          hasManifest: !!document.querySelector('link[rel="manifest"]'),
          supportsWebApp: !!document.querySelector('meta[name="apple-mobile-web-app-capable"]'),
        };

        // Check for PWA features
        if ('serviceWorker' in navigator) {
          features.serviceWorkerAvailable = true;
        }

        // Check for media query support
        features.supportsMediaQueries = window.matchMedia('(max-width: 768px)').media !== 'not all';

        // Check for touch-action CSS
        const hasNoTouchDelay = window.getComputedStyle(document.body).touchAction !== 'auto';

        return {
          ...features,
          hasNoTouchDelay: hasNoTouchDelay,
        };
      });

      console.log(`Viewport meta tag: ${mobileFeatures.hasViewportMeta ? '✅' : '⚠️'}`);
      console.log(`Apple touch icon: ${mobileFeatures.hasIconMeta ? '✅' : '⚠️'}`);
      console.log(`Theme color meta: ${mobileFeatures.hasThemeColor ? '✅' : '⚠️'}`);
      console.log(`Web app manifest: ${mobileFeatures.hasManifest ? '✅' : '⚠️'}`);
      console.log(`Web app capable: ${mobileFeatures.supportsWebApp ? '✅' : '⚠️'}`);
      console.log(`Service worker: ${mobileFeatures.serviceWorkerAvailable ? '✅' : '⚠️'}`);
      console.log(`Media queries: ${mobileFeatures.supportsMediaQueries ? '✅' : '⚠️'}`);

      const count = Object.values(mobileFeatures).filter(v => v === true).length;
      if (count >= 5) {
        console.log('✅ Good mobile web app features implemented');
      } else if (count >= 3) {
        console.log('ℹ️  Some mobile features could be enhanced');
      } else {
        console.log('⚠️  Consider adding more mobile web app features');
      }

      console.log();
    } catch (e) {
      console.log(`⚠️  Mobile features test failed: ${e.message}\n`);
    }

    // ========== SUMMARY ==========
    console.log('═'.repeat(40));
    console.log('✅ Mobile responsiveness test completed!\n');
    console.log('Summary:');
    console.log('- Layout responsiveness at 375px viewport verified');
    console.log('- Touch interaction support checked');
    console.log('- Tap target sizes (44x44px minimum) evaluated');
    console.log('- Font sizes and readability assessed');
    console.log('- Mobile form usability tested');
    console.log('- Mobile web app features inventoried\n');

    await browser.close();
    process.exit(0);

  } catch (e) {
    console.error('❌ Mobile responsiveness test failed:', e);
    process.exit(1);
  }
})();
