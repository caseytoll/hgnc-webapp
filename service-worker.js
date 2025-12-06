/**
 * Service Worker for HGNC WebApp
 * Provides offline support and performance optimization through caching
 */

const CACHE_NAME = 'hgnc-webapp-v1';
const RUNTIME_CACHE = 'hgnc-runtime';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  // Add CDN assets that are frequently used
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://cdn.jsdelivr.net/gh/caseytoll/hgnc-webapp@b58212b/assets/team-performance-icon-source.webp',
  'https://cdn.jsdelivr.net/gh/caseytoll/hgnc-webapp@b58212b/assets/Offensive-Leaders-Icon.webp',
  'https://cdn.jsdelivr.net/gh/caseytoll/hgnc-webapp@b58212b/assets/Defensive-Wall-Icon.webp',
  'https://cdn.jsdelivr.net/gh/caseytoll/hgnc-webapp@b58212b/assets/player-analysis-icon.webp'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Precaching assets');
        return cache.addAll(PRECACHE_ASSETS.map(url => new Request(url, { cache: 'reload' })));
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[Service Worker] Precaching failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE)
            .map((cacheName) => {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache when available, fall back to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Strategy: Network First for API calls, Cache First for assets
  if (url.pathname.includes('/exec') || url.pathname.includes('/macros/')) {
    // Network first for Google Apps Script endpoints (always get fresh data)
    event.respondWith(networkFirst(request));
  } else {
    // Cache first for static assets
    event.respondWith(cacheFirst(request));
  }
});

/**
 * Cache First strategy - serve from cache, fall back to network
 */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    console.log('[Service Worker] Serving from cache:', request.url);
    return cachedResponse;
  }
  
  try {
    console.log('[Service Worker] Fetching from network:', request.url);
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Fetch failed:', error);
    
    // Return offline page if available
    const offlineResponse = await cache.match('/offline.html');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    throw error;
  }
}

/**
 * Network First strategy - fetch from network, fall back to cache
 */
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network failed, trying cache:', request.url);
    
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      })
    );
  }
});

console.log('[Service Worker] Loaded and ready');
