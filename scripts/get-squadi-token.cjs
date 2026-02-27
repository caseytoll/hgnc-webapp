#!/usr/bin/env node
// headless script that logs into Squadi and prints the current API token
// usage: SQUADI_EMAIL=... SQUADI_PASSWORD=... node scripts/get-squadi-token.cjs

const puppeteer = require('puppeteer');

async function main() {
  const email = process.env.SQUADI_EMAIL;
  const password = process.env.SQUADI_PASSWORD;
  if (!email || !password) {
    console.error('SQUADI_EMAIL and SQUADI_PASSWORD must be set');
    process.exit(1);
  }

  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // navigate to the Netball Connect login page (Squadi-branded wrapper)
  await page.goto('https://registration.netballconnect.com/', { waitUntil: 'networkidle2' });

  // wait a bit more for SPA to fully render
  await new Promise(resolve => setTimeout(resolve, 2000));

  // try multiple possible selectors for email/password fields
  const emailSelector = await page.evaluate(() => {
    const candidates = ['#Email', 'input[type="email"]', 'input[name="email"]', 'input[placeholder*="email" i]'];
    for (const sel of candidates) {
      const el = document.querySelector(sel);
      if (el) return sel;
    }
    return null;
  });

  const passwordSelector = await page.evaluate(() => {
    const candidates = ['#Password', 'input[type="password"]', 'input[name="password"]'];
    for (const sel of candidates) {
      const el = document.querySelector(sel);
      if (el) return sel;
    }
    return null;
  });

  if (!emailSelector || !passwordSelector) {
    console.error('Could not find login form fields. Available inputs:');
    const inputs = await page.evaluate(() => 
      Array.from(document.querySelectorAll('input')).map(i => ({
        type: i.type,
        name: i.name,
        id: i.id,
        placeholder: i.placeholder
      }))
    );
    console.error(JSON.stringify(inputs, null, 2));
    await browser.close();
    process.exit(3);
  }

  // fill the form and submit
  await page.type(emailSelector, email);
  await page.type(passwordSelector, password);
  
  await Promise.all([
    page.click('button[type=submit]'),
    page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
  ]);

  // wait for post-login redirect
  await new Promise(resolve => setTimeout(resolve, 3000));

  // find the token from cookies on current domain
  const cookies = await page.cookies();
  
  const bwsa = cookies.find(c => c.name === 'BWSA');

  if (bwsa) {
    console.log(bwsa.value);
    await browser.close();
    return;
  }

  // try checking localStorage for token
  const localToken = await page.evaluate(() => {
    return localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('BWSA');
  });
  
  if (localToken) {
    console.log(localToken);
    await browser.close();
    return;
  }
  
  // Set up request interception BEFORE navigating
  const capturedHeaders = [];
  page.on('request', req => {
    const h = req.headers();
    if (h.authorization || h['x-auth-token']) {
      capturedHeaders.push({
        auth: h.authorization,
        xAuth: h['x-auth-token']
      });
    }
  });

  // after login we can hit a lightweight API to capture the Authorization header
  // the app stores token as BWSA cookie and also uses it in Bearer header for xhr

  // open a request to an endpoint that returns 200 when authenticated
  await page.goto('https://api-netball.squadi.com/v1/matches/periodScores', {
    waitUntil: 'networkidle2'
  }).catch(() => null);

  // Check if any requests captured the token
  if (capturedHeaders.length > 0) {
    const token = capturedHeaders[0].auth?.replace(/^Bearer\s+/i, '') || capturedHeaders[0].xAuth;
    if (token) {
      console.log(token);
      await browser.close();
      return;
    }
  }

  // find the token from cookies again (in case API endpoint set it)
  const apiCookies = await page.cookies();
  const apiBwsa = apiCookies.find(c => c.name === 'BWSA');

  if (apiBwsa) {
    console.log(apiBwsa.value);
  } else {
    console.error('Unable to locate token. Please check credentials or extract manually from browser DevTools.');
    process.exit(2);
  }

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});