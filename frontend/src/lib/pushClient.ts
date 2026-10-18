export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export interface SchedulePushOptions {
  userId: string
  targetTime: string // ISO string
  title: string
  body: string
  payload?: any
}

export interface ScheduledNotificationItem {
  id: string
  user_id: string
  target_time: string
  title: string
  body: string
  payload?: {
    recurring?: boolean
    time?: string
    [key: string]: any
  }
  sent: boolean
  created_at?: string
}

export async function schedulePushNotification(
  backendUrl: string,
  options: SchedulePushOptions
) {
  const res = await fetch(`${backendUrl}/api/push/schedule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(options)
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP error ${res.status}`)
  }

  return res.json()
}

export async function fetchScheduledNotifications(
  backendUrl: string,
  userId: string
): Promise<ScheduledNotificationItem[]> {
  try {
    const res = await fetch(`${backendUrl}/api/push/scheduled/${encodeURIComponent(userId)}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.notifications || []
  } catch (e) {
    console.error('Failed to fetch scheduled notifications', e)
    return []
  }
}

export async function deleteScheduledNotification(
  backendUrl: string,
  id: string
): Promise<boolean> {
  try {
    const res = await fetch(`${backendUrl}/api/push/scheduled/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    })
    return res.ok
  } catch (e) {
    console.error('Failed to delete scheduled notification', e)
    return false
  }
}

export async function scheduleRecurringPushNotification(
  backendUrl: string,
  userId: string,
  timeStr: string,
  title = 'Game Changer: Body 🎯',
  body = 'Время для твоей микротренировки! Сохраняй стрик.'
) {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const targetDate = new Date()
  targetDate.setHours(hours, minutes, 0, 0)
  if (targetDate.getTime() <= Date.now()) {
    targetDate.setDate(targetDate.getDate() + 1)
  }

  return schedulePushNotification(backendUrl, {
    userId,
    targetTime: targetDate.toISOString(),
    title,
    body,
    payload: {
      recurring: true,
      time: timeStr
    }
  })
}

export async function subscribeToPush(backendUrl: string, userId: string): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications are not supported in this browser environment.')
    return false
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    console.warn('Notification permission denied by user.')
    return false
  }

  // 1. Fetch public VAPID key
  const keyRes = await fetch(`${backendUrl}/api/push/vapid-public-key`)
  if (!keyRes.ok) {
    throw new Error('Failed to retrieve VAPID public key from backend')
  }
  const { publicKey } = await keyRes.json()

  // 2. Get active service worker registration
  const registration = await navigator.serviceWorker.ready
  const convertedVapidKey = urlBase64ToUint8Array(publicKey)

  // 3. Subscribe to push manager
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedVapidKey as unknown as BufferSource
  })

  // 4. Send subscription to backend
  const subRes = await fetch(`${backendUrl}/api/push/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId,
      subscription: subscription.toJSON()
    })
  })

  return subRes.ok
}

export async function sendTestPush(backendUrl: string, userId: string): Promise<boolean> {
  // If browser notification permission is granted, also show local fallback
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready
        reg.showNotification('Game Changer: Body 🎯', {
          body: 'Тестовое уведомление: Push работает! Готов к тренировке?',
          icon: '/favicon.svg',
          badge: '/favicon.svg'
        })
      } catch (e) {
        // Fallback to standard Notification
        new Notification('Game Changer: Body 🎯', {
          body: 'Тестовое уведомление: Push работает! Готов к тренировке?'
        })
      }
    }
  }

  // Also call backend to trigger full VAPID push cycle
  try {
    const res = await fetch(`${backendUrl}/api/push/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    })
    return res.ok
  } catch (e) {
    return true
  }
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission
}
