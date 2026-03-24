ALTER TABLE public.users ADD COLUMN IF NOT EXISTS firebase_uid text;
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON public.users(firebase_uid);