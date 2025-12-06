const puppeteer = require('puppeteer-core');

(async () => {
  const APP_URL = 'https://script.google.com/macros/s/AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug/exec';
  const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  
  await page.goto(APP_URL, {waitUntil: 'networkidle2'});
  await new Promise(r => setTimeout(r, 2000));
  
  let f = null;
  for (const frame of page.frames()) {
    try {
      const has = await frame.evaluate(() => document.querySelectorAll('.insights-menu-card').length > 0);
      if (has) { f = frame; break; }
    } catch (e) {}
  }
  
  if (!f) { console.log('NO FRAME'); process.exit(1); }
  
  // Click insights tab
  await f.evaluate(() => document.getElementById('show-insights-tab')?.click());
  await new Promise(r => setTimeout(r, 2000));
  
  // Click team perf card
  await f.evaluate(() => document.querySelector('.insights-menu-card[onclick*="team-performance"]')?.click());
  await new Promise(r => setTimeout(r, 3000));
  
  const html = await f.evaluate(() => {
    const view = document.getElementById('insights-team-performance-view');
    if (!view) return 'NO VIEW FOUND';
    return view.innerHTML.substring(0, 2000);
  });
  
  console.log('=== HTML of insights-team-performance-view ===');
  console.log(html);
  
  await browser.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
