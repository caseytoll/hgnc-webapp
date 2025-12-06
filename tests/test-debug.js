const puppeteer = require('puppeteer-core');

(async () => {
  const APP_URL = 'https://script.google.com/macros/s/AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug/exec';
  const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  
  let logs = [];
  page.on('console', m => { 
    const text = m.text();
    logs.push(text);
    if (text.includes('error') || text.includes('ERROR') || text.includes('Error')) {
      console.log('ERROR LOG:', text);
    }
  });
  
  await page.goto(APP_URL, {waitUntil: 'networkidle2'});
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Total console logs:', logs.length);
  console.log('Last 10 logs:');
  logs.slice(-10).forEach(l => console.log('  ', l));
  
  const frames = page.frames();
  console.log('Total frames:', frames.length);
  for (let i = 0; i < frames.length; i++) {
    try {
      const info = await frames[i].evaluate(() => ({
        hasDom: !!document.body,
        hasCards: document.querySelectorAll('.insights-menu-card').length,
        hasBtn: !!document.getElementById('show-insights-tab'),
      }));
      console.log(`Frame ${i}:`, info);
    } catch (e) {
      console.log(`Frame ${i}: Error -`, e.message.substring(0, 50));
    }
  }
  
  await browser.close();
})().catch(e => { console.error('CRITICAL ERROR:', e.message); process.exit(1); });
