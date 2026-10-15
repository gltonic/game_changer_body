import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { createApp, processDueNotifications, type VapidKeys } from './server'

dotenv.config()

const port = process.env.PORT || 3001
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const clientUrl = process.env.CLIENT_URL || '*'

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

let vapidPublicKey = process.env.VAPID_PUBLIC_KEY
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@gamechangerbody.app'

// Auto-generate VAPID keys if not present
if (!vapidPublicKey || !vapidPrivateKey) {
  console.log('No VAPID keys found in .env, generating new keys...')
  const generated = webpush.generateVAPIDKeys()
  vapidPublicKey = generated.publicKey
  vapidPrivateKey = generated.privateKey
  console.log('========================================')
  console.log('SAVE THESE VAPID KEYS TO YOUR .env FILE:')
  console.log(`VAPID_PUBLIC_KEY=${vapidPublicKey}`)
  console.log(`VAPID_PRIVATE_KEY=${vapidPrivateKey}`)
  console.log('========================================')
}

const vapidKeys: VapidKeys = {
  publicKey: vapidPublicKey,
  privateKey: vapidPrivateKey,
  subject: vapidSubject
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const app = createApp({
  supabase,
  vapidKeys,
  clientUrl
})

app.listen(port, () => {
  console.log(`Game Changer: Body backend running on port ${port}`)
})

// Notification scheduler worker: runs every 30 seconds
const schedulerInterval = setInterval(async () => {
  try {
    const sent = await processDueNotifications({ supabase, vapidKeys })
    if (sent > 0) {
      console.log(`[Scheduler] Dispatched ${sent} due push notifications.`)
    }
  } catch (err) {
    console.error('[Scheduler] Error checking due notifications:', err)
  }
}, 30000)

process.on('SIGINT', () => {
  clearInterval(schedulerInterval)
  process.exit(0)
})

process.on('SIGTERM', () => {
  clearInterval(schedulerInterval)
  process.exit(0)
})
