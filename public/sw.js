// sw.js - Fixed service worker that ignores extension requests
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
    
    // Only cache if we have valid URLs
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Filter out chrome-extension URLs
            const validUrls = urlsToCache.filter(url => 
                !url.startsWith('chrome-extension://') && 
                !url.startsWith('moz-extension://')
            );
            return cache.addAll(validUrls).catch(err => {
                console.log('Cache addAll error:', err);
                // Continue even if caching fails - not critical
            });
        })
    );
});

// Activate service worker
self.addEventListener('activate', (event) => {
    console.log('Service Worker activated');
    event.waitUntil(clients.claim());
});

// Fetch event with error handling for chrome extensions
self.addEventListener('fetch', (event) => {
    const requestUrl = event.request.url;
    
    // Skip chrome-extension and moz-extension requests
    if (requestUrl.startsWith('chrome-extension://') || 
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
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Cache the response
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache).catch(err => {
                                    // Ignore caching errors for extensions
                                    if (!requestUrl.includes('chrome-extension')) {
                                        console.log('Cache put error:', err);
                                    }
                                });
                            })
                            .catch(err => console.log('Cache open error:', err));
                        
                        return response;
                    });
            })
    );
});