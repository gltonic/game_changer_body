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

    sentCount++
  }

  return sentCount
}
