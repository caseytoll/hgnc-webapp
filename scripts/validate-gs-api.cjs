#!/usr/bin/env node
// Validate GS_API_URL by calling the ping endpoint

const https = require('https');
const { URL } = require('url');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('Invalid JSON response: ' + e.message + '\n' + data.substring(0,200))); }
      });
    }).on('error', reject);
  });
}

async function main() {
  try {
    const url = process.env.GS_API_URL;
    if (!url) {
      console.error('[validate-gs-api] Environment variable GS_API_URL is not set');
      process.exit(2);
    }

    let pingUrl;
    try {
      const u = new URL(url);
      u.searchParams.set('api', 'true');
      u.searchParams.set('action', 'ping');
      pingUrl = u.toString();
    } catch (e) {
      console.error('[validate-gs-api] GS_API_URL is not a valid URL:', e.message);
      process.exit(2);
    }

    console.log('[validate-gs-api] Pinging', pingUrl);
    const resp = await fetchJson(pingUrl);
    if (!resp || resp.success !== true) {
      console.error('[validate-gs-api] Ping failed or returned unexpected result:', JSON.stringify(resp).slice(0,400));
      process.exit(3);
    }

    console.log('[validate-gs-api] Ping OK');
    process.exit(0);
  } catch (err) {
    console.error('[validate-gs-api] Error:', err && err.message ? err.message : err);
    process.exit(4);
  }
}

if (require.main === module) main();
