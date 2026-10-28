import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp, processDueNotifications } from './server'
import webpush from 'web-push'

describe('Backend Push Server & Scheduler API', () => {
  const mockVapidKeys = webpush.generateVAPIDKeys()

  let mockSupabase: any
  let app: any

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({ error: null }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [{ id: 'notif-123' }], error: null })
        }),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis()
      }))
    }

    app = createApp({ supabase: mockSupabase, vapidKeys: mockVapidKeys })
  })

  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })

  it('GET /api/push/vapid-public-key returns the public key', async () => {
    const res = await request(app).get('/api/push/vapid-public-key')
    expect(res.status).toBe(200)
    expect(res.body.publicKey).toBe(mockVapidKeys.publicKey)
  })

  it('POST /api/push/subscribe saves subscription to database', async () => {
    const payload = {
      userId: 'user-456',
      subscription: {
        endpoint: 'https://push.example.com/sub/1',
        keys: {
          p256dh: 'test-p256dh',
          auth: 'test-auth'
        }
      }
    }

    const res = await request(app).post('/api/push/subscribe').send(payload)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(mockSupabase.from).toHaveBeenCalledWith('push_subscriptions')
  })

  it('POST /api/push/schedule stores scheduled notification', async () => {
    const payload = {
      userId: 'user-456',
      targetTime: '2026-10-16T10:00:00.000Z',
      title: 'Game Changer: Body',
      body: 'Пора на тренировку! Подходы ждут.'
    }

    const res = await request(app).post('/api/push/schedule').send(payload)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(mockSupabase.from).toHaveBeenCalledWith('scheduled_notifications')
  })

  it('processDueNotifications sends web-push for due items and marks sent', async () => {
    const mockNotifications = [
      {
        id: 'notif-1',
        user_id: 'user-1',
        title: 'Тренировка',
        body: 'Пора отжиматься!',
        target_time: new Date().toISOString()
      }
    ]

    const mockSubscriptions = [
      {
        endpoint: 'https://fcm.googleapis.com/fcm/send/1',
        keys_p256dh: 'p256',
        keys_auth: 'auth'
      }
    ]

    const mockSend = vi.spyOn(webpush, 'sendNotification').mockResolvedValue({} as any)

    const customSupabase: any = {
      from: vi.fn((table: string) => {
        if (table === 'scheduled_notifications') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            lte: vi.fn().mockResolvedValue({ data: mockNotifications, error: null }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null })
            })
          }
        }
        if (table === 'push_subscriptions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: mockSubscriptions, error: null })
          }
        }
        return {}
      })
    }

    const sentCount = await processDueNotifications({
      supabase: customSupabase,
      vapidKeys: mockVapidKeys
    })

    expect(sentCount).toBe(1)
    expect(mockSend).toHaveBeenCalled()
    mockSend.mockRestore()
  })

  it('GET /api/disciplines/:userId returns mapped user disciplines', async () => {
    mockSupabase.from = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          {
            discipline: 'pullups',
            max_baseline: 10,
            weight_kg: null,
            total_workouts: 30,
            current_workout_index: 2,
            trail_data: [{ workoutIndex: 1 }]
          }
        ],
        error: null
      })
    }))

    const res = await request(app).get('/api/disciplines/user-123')
    expect(res.status).toBe(200)
    expect(res.body.disciplines.pullups).toBeDefined()
    expect(res.body.disciplines.pullups.max_baseline).toBe(10)
    expect(res.body.disciplines.pullups.current_workout_index).toBe(2)
  })

  it('POST /api/disciplines saves discipline data', async () => {
    mockSupabase.from = vi.fn(() => ({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [{ id: 'disc-1' }], error: null })
      })
    }))

    const payload = {
      userId: 'device-123',
      discipline: 'pushups',
      maxBaseline: 25,
      totalWorkouts: 45,
      currentWorkoutIndex: 1,
      trailData: [{ workoutIndex: 1 }]
    }

    const res = await request(app).post('/api/disciplines').send(payload)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('POST /api/disciplines/migrate transfers data from guest to user', async () => {
    const mockGuestDisciplines = [
      {
        discipline: 'pushups',
        max_baseline: 20,
        weight_kg: null,
        total_workouts: 30,
        current_workout_index: 3,
        trail_data: []
      }
    ]

    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'user_disciplines') {
        return {
          select: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: mockGuestDisciplines, error: null }),
          upsert: vi.fn().mockResolvedValue({ error: null })
        }
      }
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      }
    })

    const res = await request(app).post('/api/disciplines/migrate').send({
      fromUserId: 'guest-device-1',
      toUserId: 'auth-user-999'
    })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.migratedCount).toBe(1)
  })
})
