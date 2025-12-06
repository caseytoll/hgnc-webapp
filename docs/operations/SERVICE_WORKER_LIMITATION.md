# Service Worker Limitation in Google Apps Script

## Problem

Google Apps Script applications run in a sandboxed iframe within the Google domain (e.g., `script.google.com`). Service workers require:

1. **HTTPS** ✅ (Google Apps Script is HTTPS)
2. **Same-origin registration** ❌ (Service worker must be on the same domain)
3. **Static file serving** ❌ (Google Apps Script doesn't serve static files at root paths)

When registering a service worker with `/service-worker.js` in a Google Apps Script application, the browser tries to fetch from `https://script.google.com/service-worker.js`, which doesn't exist and isn't a valid scope for the service worker.

## Error

```
ReferenceError: self is not defined (line 22, file "service-worker")
```

This error occurs because:
- Google Apps Script interprets the service worker code as regular server-side code
- The code references `self` (global scope for service workers), which doesn't exist in the Google Apps Script environment
- The registration fails because `/service-worker.js` can't be resolved

## Solution

We're using a **fallback approach** that leverages the Cache API directly without requiring a service worker:

### What's Implemented

```javascript
// In index.html
if ('caches' in window) {
  caches.open('hgnc-webapp-runtime').then(function(cache) {
    console.log('[PWA] Cache storage initialized');
  });
}
```

This provides:
- ✅ Cache storage for offline data
- ✅ Runtime caching capability
- ✅ Reduced bandwidth usage
- ✅ Improved load times for repeat visits

### What's Limited

- ❌ Automatic background caching (requires service worker)
- ❌ Push notifications
- ❌ Background sync
- ❌ Offline page serving without explicit code

## Alternative Solutions

### Option 1: Deploy Service Worker Separately (Recommended for future)
If you move away from Google Apps Script and host on a standard web server:

```bash
# Deploy service-worker.js to your web hosting
# It will work normally on standard HTTPS domains
```

### Option 2: Use a Proxy Domain
Deploy the app to a custom domain (not script.google.com) with:
- Your own server
- Netlify
- Vercel
- Google Cloud Run

This allows full service worker functionality.

### Option 3: Embedded Service Worker (Current Environment)
For Google Apps Script-hosted apps, use the Cache API directly in your application code to handle caching logic.

## Current Status

- **Version**: v834
- **Service Worker File**: Removed (incompatible with Google Apps Script)
- **Fallback**: Cache API initialization in index.html
- **Status**: ✅ Deployable, Cache API available for use

## Files Changed

- `index.html` - Updated service worker registration to cache API fallback
- `service-worker.js` - Removed (not deployable in this environment)

## Future Considerations

If you plan to:
1. **Keep using Google Apps Script**: Continue with Cache API approach
2. **Move to custom hosting**: Restore `service-worker.js` and use standard deployment
3. **Hybrid approach**: Use Google Apps Script API but host frontend separately

## Documentation

- See `docs/deployment/SERVICE_WORKER_DEPLOYMENT.md` for environment-specific deployment notes
- Current limitation is documented for future developers
