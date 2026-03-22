
-- Rename 'phone' column to 'phone_number' for clarity (patient's own number)
-- The users table already has: phone, caregiver_phone, caregiver_email, caregiver_name
-- We just need to ensure phone_number exists as an alias or rename

-- Add phone_number column if it doesn't exist (keep phone for backward compat)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_number text;

-- Copy existing phone data to phone_number
UPDATE public.users SET phone_number = phone WHERE phone IS NOT NULL AND phone_number IS NULL;

-- Create caregiver_links table
CREATE TABLE IF NOT EXISTS public.caregiver_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_phone text NOT NULL,
  patient_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  patient_name text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(caregiver_phone, patient_id)
);

-- Enable RLS on caregiver_links
ALTER TABLE public.caregiver_links ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read caregiver_links (needed for caregiver login check)
CREATE POLICY "Authenticated users can read caregiver_links"
ON public.caregiver_links
FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can insert caregiver_links (patients adding their caregiver)
CREATE POLICY "Authenticated users can insert caregiver_links"
ON public.caregiver_links
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Authenticated users can delete their own caregiver links
CREATE POLICY "Users can delete own caregiver links"
ON public.caregiver_links
FOR DELETE
TO authenticated
USING (patient_id = auth.uid());

-- Backfill caregiver_links from existing users data
INSERT INTO public.caregiver_links (caregiver_phone, patient_id, patient_name)
SELECT caregiver_phone, id, name
FROM public.users
WHERE caregiver_phone IS NOT NULL AND caregiver_phone != ''
ON CONFLICT (caregiver_phone, patient_id) DO NOTHING;
