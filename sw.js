// Service Worker for NetworkPulse - Fixed version that handles extension requests
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
    
    // Cache static assets
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Filter out invalid URLs
            const validUrls = urlsToCache.filter(url => {
                return url && typeof url === 'string' && 
                       !url.startsWith('chrome-extension://') && 
                       !url.startsWith('moz-extension://') &&
                       !url.startsWith('data:') &&
                       !url.startsWith('blob:');
            });
            
            if (validUrls.length > 0) {
                return cache.addAll(validUrls).catch(err => {
                    console.log('Cache addAll error (non-critical):', err.message);
                    return Promise.resolve();
                });
            }
            return Promise.resolve();
        }).catch(err => {
            console.log('Cache open error (non-critical):', err.message);
        })
    );
});

// Activate service worker
self.addEventListener('activate', (event) => {
    console.log('Service Worker activated');
    // Clean up old caches
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    event.waitUntil(clients.claim());
});

// Fetch event with comprehensive error handling
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const requestUrl = request.url;
    
    // Skip non-GET requests and non-http requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension, moz-extension, and other browser extension requests
    if (requestUrl.startsWith('chrome-extension://') || 
        requestUrl.startsWith('moz-extension://') ||
        requestUrl.startsWith('data:') ||
        requestUrl.startsWith('blob:') ||
        requestUrl.includes('chrome-extension')) {
        return;
    }
    
    event.respondWith(
        caches.match(request)
            .then((response) => {
                if (response) {
                    // Return cached response
                    return response;
                }
                
                // Fetch from network
                return fetch(request).then((response) => {
                    // Don't cache non-successful responses
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // Clone the response
                    const responseToCache = response.clone();
                    
                    // Cache the response (do this async without blocking)
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            // Only cache if URL is safe
                            if (requestUrl.startsWith('http') && 
                                !requestUrl.includes('chrome-extension')) {
                                cache.put(request, responseToCache).catch(err => {
                                    // Silently fail - not critical
                                    console.debug('Cache put failed for:', requestUrl);
                                });
                            }
                        })
                        .catch(err => {
                            console.debug('Cache open failed:', err.message);
                        });
                    
                    return response;
                }).catch((error) => {
                    console.debug('Fetch failed:', requestUrl, error.message);
                    // Return offline page for HTML requests
                    if (request.headers.get('accept').includes('text/html')) {
                        return caches.match('/index.html');
                    }
                    return new Response('Network error', { 
                        status: 408, 
                        statusText: 'Network Error',
                        headers: { 'Content-Type': 'text/plain' }
                    });
                });
            })
    );
});

// Handle push notifications (optional)
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'NetworkPulse Alert',
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        }
    };
    
    event.waitUntil(
        self.registration.showNotification('NetworkPulse', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});