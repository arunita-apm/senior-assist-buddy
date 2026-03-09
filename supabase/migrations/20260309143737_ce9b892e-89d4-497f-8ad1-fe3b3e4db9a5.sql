-- Create a security definer function to get current user's email
CREATE OR REPLACE FUNCTION public.get_auth_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email::text FROM auth.users WHERE id = auth.uid()
$$;

-- Recreate caregiver policies using the security definer function
DROP POLICY IF EXISTS "Caregiver can view patient medications" ON public.medications;
CREATE POLICY "Caregiver can view patient medications" ON public.medications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = medications.user_id AND users.caregiver_email = public.get_auth_email()));

DROP POLICY IF EXISTS "Caregiver can view patient reminders" ON public.reminders;
CREATE POLICY "Caregiver can view patient reminders" ON public.reminders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = reminders.user_id AND users.caregiver_email = public.get_auth_email()));

DROP POLICY IF EXISTS "Caregiver can view patient appointments" ON public.appointments;
CREATE POLICY "Caregiver can view patient appointments" ON public.appointments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = appointments.user_id AND users.caregiver_email = public.get_auth_email()));