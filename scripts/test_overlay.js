const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    const APP_URL = 'https://script.google.com/macros/s/AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug/exec';

    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    console.log('Loading app...');
    await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for the page to fully load
    console.log('Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // Get the main content
    const pageContent = await page.content();
    console.log('Page title:', await page.title());
    console.log('Page HTML length:', pageContent.length);
    
    // Check for loading-overlay in page HTML
    if (pageContent.includes('loading-overlay')) {
      console.log('✅ loading-overlay found in page HTML');
    } else {
      console.log('❌ loading-overlay NOT found in page HTML');
    }
    
    // Check for the fixed-header-container
    if (pageContent.includes('fixed-header-container')) {
      console.log('✅ fixed-header-container found in page HTML');
    } else {
      console.log('❌ fixed-header-container NOT found in page HTML');
    }
    
    // Try to find the element via page.$ (works across frames)
    const overlay = await page.$('#loading-overlay');
    console.log('\nElement search via page.$:', overlay ? '✅ FOUND' : '❌ NOT FOUND');
    
    if (overlay) {
      const info = await page.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          display: computed.display,
          visibility: computed.visibility,
          classes: Array.from(el.classList)
        };
      }, overlay);
      console.log('Overlay info:', info);
    }
    
    await browser.close();
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
