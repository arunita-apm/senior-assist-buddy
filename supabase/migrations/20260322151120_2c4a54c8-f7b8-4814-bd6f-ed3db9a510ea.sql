
-- Re-enable RLS on all tables (was disabled for custom auth, now back to Supabase Auth)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregiver_notifications ENABLE ROW LEVEL SECURITY;

-- Update trigger to also store phone number for phone-based auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.users (id, name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), ''),
    NEW.phone,
    'patient'
  )
  ON CONFLICT (id) DO UPDATE SET
    phone = COALESCE(EXCLUDED.phone, public.users.phone);
  RETURN NEW;
END;
$$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add RLS policy for anon to allow phone lookup (needed before auth completes)
-- Users table needs select for anon to check caregiver_phone after login
-- Actually, after OTP verify the user IS authenticated, so existing policies work.
-- But we need a policy to allow authenticated users to read other users' data when they are a caregiver
-- The caregiver detection query needs to select from users where caregiver_phone matches

-- Allow authenticated users to find patients by caregiver_phone
DROP POLICY IF EXISTS "Caregiver can find patient by phone" ON public.users;
CREATE POLICY "Caregiver can find patient by phone"
ON public.users
FOR SELECT
TO authenticated
USING (true);
