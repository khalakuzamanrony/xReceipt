const CACHE_NAME = `xreceipt-v${new Date().toISOString().slice(0,10).replace(/-/g,'')}`
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
]

// Install event
self.addEventListener('install', (event) => {
  self.skipWaiting() // Activate new service worker immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache)
    })
  )
})

// Fetch event
// Network-first for HTML (always fetch fresh, fallback to cache)
const isHTML = (url) => url.pathname === '/' || url.pathname.endsWith('.html')

self.addEventListener('fetch', (event) => {
  try {
    if (event.request.method !== 'GET') return
    const url = new URL(event.request.url)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return

    // Network-first for HTML files
    if (isHTML(url)) {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200) {
              return caches.match(event.request).then((cached) => cached || response)
            }
            // Update cache with fresh version
            const responseToCache = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache)
            })
            return response
          })
          .catch(() => {
            return caches.match(event.request).then((cached) => {
              return cached || caches.match('/index.html')
            })
          })
      )
      return
    }

    // Cache-first for static assets (JS, CSS, images)
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          // Check if cache is stale (> 1 hour), refresh in background
          const cacheDate = new Date(response.headers.get('sw-fetched-date') || 0)
          const isStale = Date.now() - cacheDate.getTime() > 60 * 60 * 1000
          if (isStale) {
            fetch(event.request).then((fresh) => {
              if (fresh && fresh.status === 200) {
                const toCache = fresh.clone()
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache))
              }
            }).catch(() => {})
          }
          return response
        }
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }
          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })
          return response
        })
      }).catch(() => {
        return caches.match('/index.html')
      })
    )
  } catch {
    return
  }
})

// Activate event
self.addEventListener('activate', (event) => {
  self.clients.claim() // Take control of pages immediately
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})
