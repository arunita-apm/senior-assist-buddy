-- Add email and password columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password text;

-- Add unique constraint on email
ALTER TABLE public.users ADD CONSTRAINT users_email_unique UNIQUE (email);

-- Disable RLS on all tables since we no longer have supabase auth
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregiver_notifications DISABLE ROW LEVEL SECURITY;