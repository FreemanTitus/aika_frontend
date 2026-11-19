// public/push-handler.js
// Handles incoming Web Push notifications and click routing alongside the generated Workbox SW

// 1. Incoming Web Push Notification Handler
self.addEventListener('push', (event) => {
  const NotificationAPI =
    typeof Notification !== 'undefined'
      ? Notification
      : self.Notification

  if (!(NotificationAPI && NotificationAPI.permission === 'granted')) {
    return
  }

  let data = {}
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
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// 2. Focus existing tab (normalized origin + path) or open target URL on tap
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const rawUrl = (event.notification.data && event.notification.data.url) || '/'
  const resolvedTargetUrl = new URL(rawUrl, self.location.origin).href

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
          if ('navigate' in client && typeof client.navigate === 'function') {
            client.navigate(resolvedTargetUrl)
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