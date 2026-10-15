// Service Worker for Game Changer: Body PWA

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Listen for incoming Web Push events
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data = {}
  try {
    data = event.data.json()
  } catch (e) {
    data = { title: 'Game Changer: Body', body: event.data.text() }
  }

  const title = data.title || 'Game Changer: Body 🎯'
  const options = {
    body: data.body || 'Время для микротренировки! Твоя тропа ждет.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      { action: 'open', title: 'Начать тренировку' }
    ]
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Handle notification click to bring app to focus
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/')
      }
    })
  )
})
