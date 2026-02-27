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

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // navigate to the Netball Connect login page (Squadi-branded wrapper)
  await page.goto('https://registration.netballconnect.com/', { waitUntil: 'networkidle2' });

  // fill the form and submit
  await page.type('#Email', email);
  await page.type('#Password', password);
  await Promise.all([
    page.click('button[type=submit]'),
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
  ]);

  // after login we can hit a lightweight API to capture the Authorization header
  // the app stores token as BWSA cookie and also uses it in Bearer header for xhr

  // open a request to an endpoint that returns 200 when authenticated
  const resp = await page.goto('https://api-netball.squadi.com/v1/matches/periodScores', {
    waitUntil: 'networkidle2'
  });

  // find the token from internal network requests or cookies
  const cookies = await page.cookies();
  const bwsa = cookies.find(c => c.name === 'BWSA');

  if (bwsa) {
    console.log(bwsa.value);
  } else {
    // fallback: intercept request headers
    const requests = [];
    page.on('request', req => requests.push(req));
    // reload and check
    await page.reload({ waitUntil: 'networkidle2' });
    let bearer;
    for (const r of requests) {
      const h = r.headers();
      if (h.authorization) {
        bearer = h.authorization.replace(/^Bearer\s+/i, '');
        break;
      }
    }
    if (bearer) {
      console.log(bearer);
    } else {
      console.error('unable to locate token');
      process.exit(2);
    }
  }

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});