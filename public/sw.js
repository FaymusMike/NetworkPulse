// sw.js - Complete fixed version
const CACHE_NAME = 'networkpulse-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/style.css',
    '/css/dark-mode.css',
    '/libs/d3.min.js',
    '/libs/chart.min.js',
    '/libs/gsap.min.js',
    '/libs/jspdf.min.js'
];

// Install service worker
self.addEventListener('install', (event) => {
    console.log('Service Worker installing');
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Filter out any chrome-extension or invalid URLs
            const validUrls = urlsToCache.filter(url => {
                return url && 
                       typeof url === 'string' && 
                       !url.startsWith('chrome-extension://') && 
                       !url.startsWith('moz-extension://') &&
                       !url.startsWith('data:') &&
                       !url.startsWith('blob:');
            });
            
            if (validUrls.length > 0) {
                return cache.addAll(validUrls).catch(err => {
                    console.log('Cache addAll error:', err);
                    return Promise.resolve();
                });
            }
            return Promise.resolve();
        })
    );
});

// Activate service worker
self.addEventListener('activate', (event) => {
    console.log('Service Worker activated');
    event.waitUntil(clients.claim());
});

// Fetch event with comprehensive error handling
self.addEventListener('fetch', (event) => {
    const requestUrl = event.request.url;
    
    // Skip non-http requests and extension requests
    if (!requestUrl.startsWith('http') || 
        requestUrl.startsWith('chrome-extension://') || 
        requestUrl.startsWith('moz-extension://') ||
        requestUrl.startsWith('data:') ||
        requestUrl.startsWith('blob:')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request)
                    .then((response) => {
                        // Don't cache non-successful responses or non-GET requests
                        if (!response || response.status !== 200 || response.type !== 'basic' || event.request.method !== 'GET') {
                            return response;
                        }
                        
                        // Cache the response
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache).catch(err => {
                                    // Silently fail - not critical
                                    console.debug('Cache put failed for:', event.request.url);
                                });
                            })
                            .catch(err => console.debug('Cache open failed'));
                        
                        return response;
                    })
                    .catch(err => {
                        console.debug('Fetch failed:', event.request.url);
                        return new Response('Network error', { status: 408, statusText: 'Network Error' });
                    });
            })
    );
});