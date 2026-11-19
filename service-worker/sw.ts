/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst, NetworkOnly, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare let self: ServiceWorkerGlobalScope

// 1. Precache static build assets injected by @vite-pwa/nuxt
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// 2. Immediate activation on deploy so users don't get stuck on stale SW versions
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Allow the app UI to trigger an immediate SW update if needed
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// 3. NEVER cache live API, Auth, Admin, WebPush, or WebSocket endpoints
registerRoute(
  ({ url }) =>
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/adminPanel/') ||
    url.pathname.startsWith('/webpush/') ||
    url.pathname.startsWith('/ws/'),
  new NetworkOnly()
)

// 4. Runtime cache for images, icons, and audio chimes (fast repeat loads)
registerRoute(
  ({ request }) => request.destination === 'image' || request.destination === 'audio',
  new CacheFirst({
    cacheName: 'aika-media-cache-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
      }),
    ],
  })
)

// 5. Runtime cache for external CDN assets (Leaflet CSS/JS, Google Fonts)
registerRoute(
  ({ url }) =>
    url.origin.includes('cdnjs.cloudflare.com') ||
    url.origin.includes('fonts.googleapis.com') ||
    url.origin.includes('fonts.gstatic.com'),
    url.pathname.startsWith('/media/'),
  new StaleWhileRevalidate({
    cacheName: 'aika-cdn-assets-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 24 * 60 * 60, // 60 Days
      }),
    ],
  })
)

// 6. Network-First strategy for page navigations (keeps SSR fresh, survives brief drops)
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: 'aika-pages-cache-v1',
      networkTimeoutSeconds: 4,
      plugins: [
        new CacheableResponsePlugin({ statuses: [200] }),
      ],
    }),
    {
      // Never intercept backend paths as frontend HTML pages
      denylist: [/^\/api\//, /^\/adminPanel\//, /^\/webpush\//, /^\/ws\//],
    }
  )
)

// 7. Incoming Web Push Notification Handler
self.addEventListener('push', (event) => {
  const NotificationAPI =
    typeof Notification !== 'undefined'
      ? Notification
      : (self as unknown as { Notification?: typeof Notification }).Notification

  if (!(NotificationAPI && NotificationAPI.permission === 'granted')) {
    return
  }

  let data: Record<string, any> = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {
      head: 'Aika System Notification',
      body: event.data ? event.data.text() : 'New update received.',
    }
  }

  const title = data.head || data.title || 'Aika Notification'
  const isUrgent = Boolean(data.urgent || data.tag === 'new_order' || data.tag === 'new_job')

  const options = {
    body: data.body || data.message || '',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/favicon-96x96.png',
    tag: data.tag || 'aika-general',
    renotify: true,
    requireInteraction: isUrgent,
    vibrate: isUrgent ? [200, 100, 200, 100, 200] : [150, 75, 150],
    data: {
      url: data.url || '/',
    },
  } as NotificationOptions

  event.waitUntil(self.registration.showNotification(title, options))
})

// 8. Focus existing tab (normalized origin + path) or open target URL on tap
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const rawUrl = event.notification.data?.url || '/'
  let target = new URL('/', self.location.origin)
  try {
    const candidate = new URL(rawUrl, self.location.origin)
    if (candidate.origin === self.location.origin) target = candidate
  } catch { /* keep the home page */ }

  const resolvedTargetUrl = target

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. Exact URL match
      for (const client of windowClients) {
        if (client.url === resolvedTargetUrl && 'focus' in client) {
          return client.focus()
        }
      }

      // 2. Fallback: focus any open Aika tab and navigate it to the target route
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && typeof (client as WindowClient).navigate === 'function') {
            ;(client as WindowClient).navigate(resolvedTargetUrl)
          }
          return client.focus()
        }
      }

      // 3. Otherwise open a brand-new standalone PWA window
      if (self.clients.openWindow) {
        return self.clients.openWindow(resolvedTargetUrl)
      }
    })
  )
})