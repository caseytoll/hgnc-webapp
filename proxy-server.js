import express from 'express';
import https from 'https';

const app = express();
const PORT = 3002;

app.use((req, res) => {
  console.log(`[Proxy] ${req.method} ${req.url}`);

  // Construct the target URL
  const targetUrl = `https://script.google.com/macros/s/AKfycbx5g7fIW28ncXoI9SeHDKix7umBtqaTdOm1aM-JdgO2l7esQHxu8jViMRRSN7YGtMnd/exec${req.url}`;

  console.log(`[Proxy] Forwarding to: ${targetUrl}`);

  // Create the proxy request
  const proxyReq = https.request(targetUrl, {
    method: req.method,
    headers: {
      ...req.headers,
      host: 'script.google.com'
    }
  }, (proxyRes) => {
    console.log(`[Proxy] Response status: ${proxyRes.statusCode}`);
    
    // Handle redirects
    if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
      console.log(`[Proxy] Following redirect to: ${proxyRes.headers.location}`);
      const redirectReq = https.request(proxyRes.headers.location, {
        method: req.method,
        headers: {
          ...req.headers,
          host: new URL(proxyRes.headers.location).host
        }
      }, (redirectRes) => {
        console.log(`[Proxy] Redirect response status: ${redirectRes.statusCode}`);
        res.status(redirectRes.statusCode);
        Object.keys(redirectRes.headers).forEach(key => {
          res.setHeader(key, redirectRes.headers[key]);
        });
        redirectRes.pipe(res);
      });
      
      redirectReq.on('error', (err) => {
        console.error('[Proxy] Redirect error:', err.message);
        res.status(500).json({ error: 'Proxy redirect error', details: err.message });
      });
      
      req.pipe(redirectReq);
      return;
    }

    // Set response headers
    res.status(proxyRes.statusCode);
    Object.keys(proxyRes.headers).forEach(key => {
      res.setHeader(key, proxyRes.headers[key]);
    });

    // Pipe the response
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('[Proxy] Error:', err.message);
    res.status(500).json({ error: 'Proxy error', details: err.message });
  });

  // Pipe the request body if present
  req.pipe(proxyReq);
});

app.listen(PORT, () => {
  console.log(`API Proxy server running on http://localhost:${PORT}`);
});