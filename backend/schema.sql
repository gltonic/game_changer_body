-- Supabase SQL Schema for Game Changer: Body

-- 1. Push Subscriptions Table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    keys_p256dh TEXT NOT NULL,
    keys_auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- 2. Scheduled Notifications Table
CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    target_time TIMESTAMPTZ NOT NULL,
    title TEXT NOT NULL,
    body TEXT DEFAULT '',
    payload JSONB DEFAULT '{}'::jsonb,
    sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_pending 
ON public.scheduled_notifications (sent, target_time) 
WHERE sent = FALSE;

-- 3. User Disciplines (Parallel progress across 5 disciplines)
CREATE TABLE IF NOT EXISTS public.user_disciplines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    discipline TEXT NOT NULL,
    max_baseline NUMERIC NOT NULL,
    weight_kg NUMERIC,
    total_workouts INTEGER NOT NULL,
    current_workout_index INTEGER DEFAULT 0,
    trail_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, discipline)
);

-- 4. Workout History Log
CREATE TABLE IF NOT EXISTS public.workout_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    discipline TEXT NOT NULL,
    workout_index INTEGER NOT NULL,
    completed_sets JSONB NOT NULL,
    feedback TEXT NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) setup
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_disciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_history ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their own disciplines
CREATE POLICY "Users can manage their disciplines" 
ON public.user_disciplines FOR ALL 
USING (auth.uid()::text = user_id) 
WITH CHECK (auth.uid()::text = user_id);

-- Allow authenticated users to manage their history
CREATE POLICY "Users can manage workout history" 
ON public.workout_history FOR ALL 
USING (auth.uid()::text = user_id) 
WITH CHECK (auth.uid()::text = user_id);

-- Backend (service role) has full bypass access automatically.
