import express, { type Request, type Response } from 'express'
import cors from 'cors'
import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface VapidKeys {
  publicKey: string
  privateKey: string
  subject?: string
}

export interface ServerConfig {
  supabase: SupabaseClient
  vapidKeys: VapidKeys
  clientUrl?: string
}

export function createApp(config: ServerConfig) {
  const { supabase, vapidKeys, clientUrl } = config
  const app = express()

  app.use(
    cors({
      origin: clientUrl || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    })
  )
  app.use(express.json())

  // Configure web-push
  if (vapidKeys?.publicKey && vapidKeys?.privateKey) {
    webpush.setVapidDetails(
      vapidKeys.subject || 'mailto:support@gamechangerbody.app',
      vapidKeys.publicKey,
      vapidKeys.privateKey
    )
  }

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' })
  })

  // Return public VAPID key for client push subscription
  app.get('/api/push/vapid-public-key', (_req: Request, res: Response) => {
    res.json({ publicKey: vapidKeys.publicKey })
  })

  // Subscribe user's browser to push notifications
  app.post('/api/push/subscribe', async (req: Request, res: Response) => {
    try {
      const { userId, subscription } = req.body
      if (!userId || !subscription || !subscription.endpoint) {
        res.status(400).json({ error: 'Missing userId or subscription endpoint' })
        return
      }

      const { endpoint, keys } = subscription
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: userId,
          endpoint,
          keys_p256dh: keys?.p256dh || '',
          keys_auth: keys?.auth || '',
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id,endpoint' }
      )

      if (error) {
        console.error('Error saving push subscription:', error)
        res.status(500).json({ error: error.message })
        return
      }

      res.json({ success: true })
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  // Schedule a personal push notification for a specific user and timestamp
  app.post('/api/push/schedule', async (req: Request, res: Response) => {
    try {
      const { userId, targetTime, title, body, payload } = req.body

      if (!userId || !targetTime || !title) {
        res.status(400).json({ error: 'Missing required schedule parameters' })
        return
      }

      const { data, error } = await supabase
        .from('scheduled_notifications')
        .insert({
          user_id: userId,
          target_time: targetTime,
          title,
          body: body || '',
          payload: payload || {},
          sent: false
        })
        .select()

      if (error) {
        console.error('Error saving scheduled notification:', error)
        res.status(500).json({ error: error.message })
        return
      }

      res.json({ success: true, notificationId: data?.[0]?.id })
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  // Send an immediate test push notification
  app.post('/api/push/test', async (req: Request, res: Response) => {
    try {
      const { userId } = req.body
      if (!userId) {
        res.status(400).json({ error: 'Missing userId' })
        return
      }

      const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)

      if (error) {
        res.status(500).json({ error: error.message })
        return
      }

      if (!subscriptions || subscriptions.length === 0) {
        res.status(404).json({ error: 'No active push subscriptions found for user' })
        return
      }

      const payload = JSON.stringify({
        title: 'Game Changer: Body 🎯',
        body: 'Тестовое уведомление: Push работает идеально! Готов к тренировке?',
        icon: '/favicon.svg',
        data: { test: true }
      })

      let successCount = 0
      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.keys_p256dh,
                auth: sub.keys_auth
              }
            },
            payload
          )
          successCount++
        } catch (err: any) {
          console.error('Error sending test push:', err?.message)
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          }
        }
      }

      res.json({ success: true, sent: successCount })
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  // Get active scheduled notifications for a user
  app.get('/api/push/scheduled/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params
      const { data, error } = await supabase
        .from('scheduled_notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('sent', false)
        .order('target_time', { ascending: true })

      if (error) {
        res.status(500).json({ error: error.message })
        return
      }

      res.json({ notifications: data || [] })
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  // Cancel / delete a scheduled notification
  app.delete('/api/push/scheduled/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const { error } = await supabase
        .from('scheduled_notifications')
        .delete()
        .eq('id', id)

      if (error) {
        res.status(500).json({ error: error.message })
        return
      }

      res.json({ success: true })
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  // ================= DISCIPLINES & CLOUD SYNC =================

  // Get user disciplines (works for both auth users and device IDs)
  app.get('/api/disciplines/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params
      const { data, error } = await supabase
        .from('user_disciplines')
        .select('*')
        .eq('user_id', userId)

      if (error) {
        res.status(500).json({ error: error.message })
        return
      }

      const mapped: Record<string, any> = {}
      if (data) {
        for (const item of data) {
          mapped[item.discipline] = {
            max_baseline: Number(item.max_baseline),
            weight_kg: item.weight_kg != null ? Number(item.weight_kg) : undefined,
            total_workouts: item.total_workouts,
            current_workout_index: item.current_workout_index,
            trail_data: item.trail_data
          }
        }
      }

      res.json({ disciplines: mapped })
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  // Upsert user discipline
  app.post('/api/disciplines', async (req: Request, res: Response) => {
    try {
      const {
        userId,
        discipline,
        maxBaseline,
        weightKg,
        totalWorkouts,
        currentWorkoutIndex,
        trailData
      } = req.body

      if (!userId || !discipline || maxBaseline == null || totalWorkouts == null || !trailData) {
        res.status(400).json({ error: 'Missing required discipline parameters' })
        return
      }

      const { data, error } = await supabase
        .from('user_disciplines')
        .upsert(
          {
            user_id: userId,
            discipline,
            max_baseline: maxBaseline,
            weight_kg: weightKg != null ? weightKg : null,
            total_workouts: totalWorkouts,
            current_workout_index: currentWorkoutIndex || 0,
            trail_data: trailData,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id,discipline' }
        )
        .select()

      if (error) {
        res.status(500).json({ error: error.message })
        return
      }

      res.json({ success: true, record: data?.[0] })
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  // Delete a discipline
  app.delete('/api/disciplines/:userId/:discipline', async (req: Request, res: Response) => {
    try {
      const { userId, discipline } = req.params
      const { error } = await supabase
        .from('user_disciplines')
        .delete()
        .eq('user_id', userId)
        .eq('discipline', discipline)

      if (error) {
        res.status(500).json({ error: error.message })
        return
      }

      res.json({ success: true })
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  // Migrate guest/device disciplines and history to authenticated user
  app.post('/api/disciplines/migrate', async (req: Request, res: Response) => {
    try {
      const { fromUserId, toUserId } = req.body
      if (!fromUserId || !toUserId || fromUserId === toUserId) {
        res.status(400).json({ error: 'Valid fromUserId and toUserId required' })
        return
      }

      // 1. Fetch source disciplines
      const { data: sourceDisciplines } = await supabase
        .from('user_disciplines')
        .select('*')
        .eq('user_id', fromUserId)

      if (sourceDisciplines && sourceDisciplines.length > 0) {
        // Fetch existing target disciplines so we never downgrade user progress
        const { data: targetDisciplines } = await supabase
          .from('user_disciplines')
          .select('discipline, current_workout_index')
          .eq('user_id', toUserId)

        const targetMap = new Map(
          (targetDisciplines || []).map((d: any) => [d.discipline, d.current_workout_index])
        )

        for (const item of sourceDisciplines) {
          const currentTargetIndex = targetMap.get(item.discipline)
          if (currentTargetIndex === undefined || item.current_workout_index > currentTargetIndex) {
            await supabase.from('user_disciplines').upsert(
              {
                user_id: toUserId,
                discipline: item.discipline,
                max_baseline: item.max_baseline,
                weight_kg: item.weight_kg,
                total_workouts: item.total_workouts,
                current_workout_index: item.current_workout_index,
                trail_data: item.trail_data,
                updated_at: new Date().toISOString()
              },
              { onConflict: 'user_id,discipline' }
            )
          }
        }

        // Clean up source guest disciplines so they can never overwrite user progress again
        await supabase
          .from('user_disciplines')
          .delete()
          .eq('user_id', fromUserId)
      }

      // 2. Migrate workout history
      await supabase
        .from('workout_history')
        .update({ user_id: toUserId })
        .eq('user_id', fromUserId)

      // 3. Migrate push subscriptions
      await supabase
        .from('push_subscriptions')
        .update({ user_id: toUserId })
        .eq('user_id', fromUserId)

      res.json({ success: true, migratedCount: sourceDisciplines?.length || 0 })
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  // ================= WORKOUT HISTORY =================

  app.get('/api/history/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params
      const { data, error } = await supabase
        .from('workout_history')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(50)

      if (error) {
        res.status(500).json({ error: error.message })
        return
      }

      res.json({ history: data || [] })
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  app.post('/api/history', async (req: Request, res: Response) => {
    try {
      const { userId, discipline, workoutIndex, completedSets, feedback, completedAt } = req.body
      if (!userId || !discipline || workoutIndex == null || !completedSets || !feedback) {
        res.status(400).json({ error: 'Missing required history parameters' })
        return
      }

      const { data, error } = await supabase
        .from('workout_history')
        .insert({
          user_id: userId,
          discipline,
          workout_index: workoutIndex,
          completed_sets: completedSets,
          feedback,
          completed_at: completedAt || new Date().toISOString()
        })
        .select()

      if (error) {
        res.status(500).json({ error: error.message })
        return
      }

      res.json({ success: true, item: data?.[0] })
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  return app
}

export async function processDueNotifications(config: ServerConfig): Promise<number> {
  const { supabase, vapidKeys } = config
  const now = new Date().toISOString()

  // Configure web-push
  if (vapidKeys?.publicKey && vapidKeys?.privateKey) {
    webpush.setVapidDetails(
      vapidKeys.subject || 'mailto:support@gamechangerbody.app',
      vapidKeys.publicKey,
      vapidKeys.privateKey
    )
  }

  // 1. Fetch unsent notifications that are due
  const { data: dueNotifications, error } = await supabase
    .from('scheduled_notifications')
    .select('*')
    .eq('sent', false)
    .lte('target_time', now)

  if (error || !dueNotifications || dueNotifications.length === 0) {
    return 0
  }

  let sentCount = 0

  for (const notif of dueNotifications) {
    // 2. Fetch user's subscriptions
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', notif.user_id)

    if (subscriptions && subscriptions.length > 0) {
      const notificationPayload = JSON.stringify({
        title: notif.title,
        body: notif.body,
        icon: '/favicon.svg',
        data: notif.payload || {}
      })

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.keys_p256dh,
                auth: sub.keys_auth
              }
            },
            notificationPayload
          )
        } catch (pushErr: any) {
          console.error(`Error sending push to ${sub.endpoint}:`, pushErr?.message)
          // If subscription expired or invalid (404/410), we can clean it up
          if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          }
        }
      }
    }

    // 3. Mark notification as sent
    await supabase
      .from('scheduled_notifications')
      .update({ sent: true, sent_at: new Date().toISOString() })
      .eq('id', notif.id)

    // 4. If recurring daily reminder, queue next occurrence for tomorrow at the same time
    if (notif.payload && notif.payload.recurring && notif.payload.time) {
      try {
        const [hours, minutes] = notif.payload.time.split(':').map(Number)
        const nextTarget = new Date()
        nextTarget.setDate(nextTarget.getDate() + 1)
        nextTarget.setHours(hours, minutes, 0, 0)

        await supabase.from('scheduled_notifications').insert({
          user_id: notif.user_id,
          target_time: nextTarget.toISOString(),
          title: notif.title,
          body: notif.body,
          payload: notif.payload,
          sent: false
        })
      } catch (recurErr) {
        console.error('Error queuing next recurring notification:', recurErr)
      }
    }

    sentCount++
  }

  return sentCount
}
