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
})
