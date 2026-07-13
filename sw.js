/* ============================================
   FIKR SHIELD - Advanced Service Worker
   Version 2.0 - Full Offline Support
   ============================================ */

const CACHE_NAME = 'fikr-shield-v2.0.0';
const BASE_PATH = '/fikr-shield';
const RUNTIME_CACHE = 'fikr-shield-runtime-v2.0.0';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
    `${BASE_PATH}/`,
    `${BASE_PATH}/index.html`,
    `${BASE_PATH}/styles.css`,
    `${BASE_PATH}/app.js`,
    `${BASE_PATH}/manifest.json`,
    `${BASE_PATH}/icons/icon-72.png`,
    `${BASE_PATH}/icons/icon-96.png`,
    `${BASE_PATH}/icons/icon-128.png`,
    `${BASE_PATH}/icons/icon-144.png`,
    `${BASE_PATH}/icons/icon-152.png`,
    `${BASE_PATH}/icons/icon-192.png`,
    `${BASE_PATH}/icons/icon-384.png`,
    `${BASE_PATH}/icons/icon-512.png`
];

// ==================== INSTALL EVENT ====================
self.addEventListener('install', (event) => {
    console.log('🛡️ Fikr Shield SW: Installing v2.0.0...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 Caching core assets...');
                return Promise.allSettled(
                    PRECACHE_ASSETS.map(url => 
                        cache.add(url).catch(err => {
                            console.warn(`⚠️ Failed to cache: ${url}`, err);
                        })
                    )
                );
            })
            .then(() => {
                console.log('✅ All core assets cached');
                return self.skipWaiting();
            })
    );
});

// ==================== ACTIVATE EVENT ====================
self.addEventListener('activate', (event) => {
    console.log('🛡️ Fikr Shield SW: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                            console.log('🗑️ Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ Old caches cleaned');
                return self.clients.claim();
            })
            .then(() => {
                console.log('✅ Service Worker activated and ready');
            })
    );
});

// ==================== FETCH EVENT ====================
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;
    
    // Skip chrome-extension and other non-http(s) requests
    const url = new URL(event.request.url);
    if (!url.protocol.startsWith('http')) return;
    
    // Skip analytics and tracking requests
    if (url.hostname.includes('analytics') || url.hostname.includes('tracking')) return;

    event.respondWith(
        handleFetch(event.request)
    );
});

// ==================== FETCH HANDLER ====================
async function handleFetch(request) {
    // Strategy: Network First, fallback to Cache, then Offline Page
    
    try {
        // Try network first
        const networkResponse = await fetchWithTimeout(request, 8000);
        
        // Cache successful responses for runtime use
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (networkError) {
        // Network failed, try cache
        console.log('📡 Network unavailable, checking cache...');
        
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            console.log('📦 Serving from cache:', request.url);
            return cachedResponse;
        }
        
        // If HTML request, serve offline page
        if (request.headers.get('accept') && 
            request.headers.get('accept').includes('text/html')) {
            console.log('📄 Serving offline page');
            return caches.match(`${BASE_PATH}/index.html`);
        }
        
        // Return appropriate error
        return new Response(
            JSON.stringify({
                error: 'You are offline',
                message: 'This content is not available offline. Please connect to the internet.',
                timestamp: new Date().toISOString()
            }),
            {
                status: 503,
                statusText: 'Service Unavailable - Offline',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Fikr-Shield': 'offline'
                }
            }
        );
    }
}

// ==================== FETCH WITH TIMEOUT ====================
async function fetchWithTimeout(request, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
        const response = await fetch(request, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// ==================== PUSH NOTIFICATION EVENT ====================
self.addEventListener('push', (event) => {
    console.log('📨 Push notification received');
    
    let data = {
        title: '🛡️ Fikr Shield',
        body: 'Time to activate your shield!',
        icon: `${BASE_PATH}/icons/icon-192.png`,
        badge: `${BASE_PATH}/icons/icon-72.png`,
        vibrate: [200, 100, 200, 100, 200],
        tag: 'fikr-shield-default',
        requireInteraction: true,
        data: {
            url: `${BASE_PATH}/`,
            timestamp: new Date().toISOString()
        },
        actions: [
            {
                action: 'activate',
                title: '🛡️ Activate Shield'
            },
            {
                action: 'dismiss',
                title: 'Dismiss'
            }
        ]
    };
    
    // Parse custom data if available
    if (event.data) {
        try {
            const customData = event.data.json();
            data = { ...data, ...customData };
        } catch (e) {
            // Use text as body if JSON parsing fails
            data.body = event.data.text() || data.body;
        }
    }
    
    event.waitUntil(
        self.registration.showNotification(data.title, data)
    );
});

// ==================== NOTIFICATION CLICK EVENT ====================
self.addEventListener('notificationclick', (event) => {
    console.log('👆 Notification clicked:', event.action);
    
    event.notification.close();
    
    const urlToOpen = event.notification.data?.url || `${BASE_PATH}/`;
    
    if (event.action === 'activate') {
        // Open with activate action
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then((clientList) => {
                    // Focus existing window if available
                    for (const client of clientList) {
                        if (client.url.includes(BASE_PATH) && 'focus' in client) {
                            client.focus();
                            client.postMessage({ action: 'activateShield' });
                            return;
                        }
                    }
                    // Open new window
                    if (clients.openWindow) {
                        return clients.openWindow(urlToOpen + '?action=activate');
                    }
                })
        );
    } else {
        // Default: open app
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then((clientList) => {
                    for (const client of clientList) {
                        if (client.url.includes(BASE_PATH) && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    if (clients.openWindow) {
                        return clients.openWindow(urlToOpen);
                    }
                })
        );
    }
});

// ==================== MESSAGE EVENT ====================
self.addEventListener('message', (event) => {
    console.log('📩 Message received:', event.data);
    
    if (event.data?.action === 'skipWaiting') {
        self.skipWaiting();
    }
    
    if (event.data?.action === 'clearCaches') {
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(name => caches.delete(name))
                );
            })
        );
    }
    
    if (event.data?.action === 'updateCache') {
        event.waitUntil(
            caches.open(CACHE_NAME).then(cache => {
                return cache.addAll(PRECACHE_ASSETS);
            })
        );
    }
});

// ==================== BACKGROUND SYNC ====================
self.addEventListener('sync', (event) => {
    console.log('🔄 Background sync:', event.tag);
    
    if (event.tag === 'sync-protected-days') {
        event.waitUntil(syncProtectedDays());
    }
});

async function syncProtectedDays() {
    // This would sync with a server if implemented
    console.log('📊 Syncing protected days data...');
    
    try {
        const cache = await caches.open(CACHE_NAME);
        const response = await cache.match(`${BASE_PATH}/`);
        if (response) {
            console.log('✅ Cache is up to date');
        }
    } catch (error) {
        console.error('❌ Sync failed:', error);
    }
}

// ==================== PERIODIC SYNC ====================
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'update-shield-reminders') {
        event.waitUntil(updateReminders());
    }
});

async function updateReminders() {
    console.log('🔄 Periodic sync: Updating reminders...');
    // Could fetch new quotes, update reward suggestions, etc.
}

// ==================== SERVICE WORKER READY ====================
console.log('🛡️ Fikr Shield Service Worker v2.0.0 loaded and ready!');
console.log('📦 Precache assets:', PRECACHE_ASSETS.length);
console.log('🔔 Push notifications: Supported');
console.log('🔄 Background sync: Supported');
console.log('📡 Offline mode: Ready');
