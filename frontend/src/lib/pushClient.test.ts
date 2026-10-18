import { describe, it, expect, vi, beforeEach } from 'vitest'
import { urlBase64ToUint8Array, schedulePushNotification } from './pushClient'

describe('Web Push Client Utilities', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('correctly converts base64url string to Uint8Array', () => {
    // Standard test base64url string (8 chars = 2 quantum blocks)
    const base64Url = 'BMw_1234'
    const array = urlBase64ToUint8Array(base64Url)

    expect(array).toBeInstanceOf(Uint8Array)
    expect(array.length).toBeGreaterThan(0)
  })

  it('schedulePushNotification sends POST request to backend', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, notificationId: 'notif-999' })
    })
    globalThis.fetch = mockFetch

    const result = await schedulePushNotification('http://localhost:3001', {
      userId: 'user-1',
      targetTime: '2026-10-16T12:00:00.000Z',
      title: 'Game Changer: Body',
      body: 'Пора на тренировку!'
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/push/schedule',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    )
    expect(result.success).toBe(true)
    expect(result.notificationId).toBe('notif-999')
  })

  it('fetchScheduledNotifications returns list of scheduled notifications', async () => {
    const mockList = [{ id: '1', user_id: 'user-1', target_time: '2026-10-18T10:00:00Z', title: 'T', body: 'B', sent: false }]
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ notifications: mockList })
    })
    globalThis.fetch = mockFetch

    const res = await (await import('./pushClient')).fetchScheduledNotifications('http://localhost:3001', 'user-1')
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/push/scheduled/user-1')
    expect(res).toEqual(mockList)
  })

  it('deleteScheduledNotification calls DELETE endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    })
    globalThis.fetch = mockFetch

    const res = await (await import('./pushClient')).deleteScheduledNotification('http://localhost:3001', 'notif-123')
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/push/scheduled/notif-123', expect.objectContaining({ method: 'DELETE' }))
    expect(res).toBe(true)
  })
})
