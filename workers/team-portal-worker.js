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
