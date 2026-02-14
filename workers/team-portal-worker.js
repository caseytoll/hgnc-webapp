addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  try {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+/g, '/');

    // /p/<slug>/ -> redirect to /teams/<slug>/ on same origin
    const pMatch = pathname.match(/^\/p\/(?<slug>[a-z0-9\-]+)(?:\/.*)?$/i);
    if (pMatch) {
      const slug = pMatch.groups.slug;
      return Response.redirect(`${url.origin}/teams/${slug}/`, 302);
    }

    // Proxy API calls sent to /api/* to the Apps Script endpoint and inject CORS headers
    const apiMatch = pathname.match(/^\/api(?:\/.*)?$/i);
    if (apiMatch) {
      // Map incoming request to Apps Script endpoint, preserve query string and ensure api=true
      const targetBase = 'https://script.google.com/macros/s/AKfycbwss2trWP44QVCxMdvNzk89sXQaCnhyFbUty22s_dXIg0NOA94Heqagt_bndZYR1NWo/exec';
      const targetUrl = new URL(targetBase);
      // Copy original query params
      for (const [k, v] of url.searchParams.entries()) targetUrl.searchParams.append(k, v);
      // Ensure api flag is set so Apps Script returns JSON rather than HTML
      if (!targetUrl.searchParams.has('api')) targetUrl.searchParams.set('api', 'true');
      const target = targetUrl.toString();

      // Handle preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(request) });
      }

      try {
        const init = { method: request.method, headers: stripHopByHopHeaders(request.headers), redirect: 'manual' };
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          init.body = await request.arrayBuffer();
        }
        // First attempt: fetch the Apps Script endpoint. Some Apps Script endpoints redirect to a googleusercontent URL.
        const resp = await fetch(target, init);

        // If Apps Script returns a redirect, follow it explicitly to avoid edge-case blocking.
        if (resp.status >= 300 && resp.status < 400 && resp.headers.has('location')) {
          try {
            const loc = resp.headers.get('location');
            const followResp = await fetch(loc, { method: 'GET', headers: stripHopByHopHeaders(request.headers), redirect: 'follow' });
            const body2 = await followResp.arrayBuffer();
            const headers2 = new Headers(followResp.headers);
            const ch2 = corsHeaders(request);
            Object.entries(ch2).forEach(([k, v]) => headers2.set(k, v));
            return new Response(body2, { status: followResp.status, headers: headers2 });
          } catch (e) {
            // fallthrough to return original redirect error below
            return new Response(JSON.stringify({ error: 'proxy_follow_failed', message: String(e) }), {
              status: 502,
              headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders(request))
            });
          }
        }

        // No redirect — return original response body
        const body = await resp.arrayBuffer();
        const headers = new Headers(resp.headers);
        const ch = corsHeaders(request);
        Object.entries(ch).forEach(([k, v]) => headers.set(k, v));
        return new Response(body, { status: resp.status, headers });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'proxy_failed', message: String(err) }), {
          status: 502,
          headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders(request))
        });
      }
    }

    // /teams/<slug>/ -> proxy static HTML from CDN and return it under same origin
    const tMatch = pathname.match(/^\/teams\/(?<slug>[a-z0-9\-]+)(?:\/.*)?$/i);
    if (tMatch) {
      const slug = tMatch.groups.slug;

      // Optional token gating via environment variable WORKER_PORTAL_TOKEN
      try {
        const token = WORKER_PORTAL_TOKEN || null; // bound at deployment time if set
        if (token) {
          const q = url.searchParams.get('k');
          const h = request.headers.get('x-portal-token');
          if (!q && !h) return new Response('Access token required', { status: 403 });
          if ((q && q !== token) || (h && h !== token)) return new Response('Invalid token', { status: 403 });
        }
      } catch (e) {
        // ignore if env not set
      }

      // Fetch static HTML from CDN (fast and reliable)
      const cdnUrl = `https://cdn.jsdelivr.net/gh/caseytoll/hgnc-webapp@master/viewer/public/teams/${slug}/index.html`;
      const resp = await fetch(cdnUrl, { cf: { cacheTtl: 300 } });
      if (resp.status === 200) {
        let body = await resp.text();
        // Rewrite canonical to this origin to avoid exposing CDN URL
        body = body.replace(/<link rel="canonical" href="[^"]*">/i, `<link rel="canonical" href="${url.origin}/teams/${slug}/">`);
        return new Response(body, {
          status: 200,
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'public, max-age=300'
          }
        });
      }

      return new Response('Team page not found', { status: 404 });
    }

    // Not a portal route - passthrough to origin
    return fetch(request);
  } catch (err) {
    return new Response('Worker error: ' + String(err.message), { status: 500 });
  }
}

function corsHeaders(request) {
  const origin = request.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin === 'null' ? '*' : origin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, X-Requested-With',
    'Vary': 'Origin'
  };
}

function stripHopByHopHeaders(headers) {
  const out = new Headers();
  headers.forEach((val, key) => {
    const k = key.toLowerCase();
    if (
      k === 'connection' || k === 'keep-alive' || k === 'proxy-authenticate' || k === 'proxy-authorization' ||
      k === 'te' || k === 'trailer' || k === 'transfer-encoding' || k === 'upgrade'
    ) return;
    out.set(key, val);
  });
  return out;
}