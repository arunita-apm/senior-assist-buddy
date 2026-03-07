
-- Drop ALL existing restrictive policies and recreate as PERMISSIVE

-- ============ USERS ============
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.users;

CREATE POLICY "Users can view own profile" ON public.users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can delete own profile" ON public.users FOR DELETE TO authenticated USING (auth.uid() = id);

-- ============ MEDICATIONS ============
DROP POLICY IF EXISTS "Users can view own medications" ON public.medications;
DROP POLICY IF EXISTS "Caregiver can view patient medications" ON public.medications;
DROP POLICY IF EXISTS "Users can insert own medications" ON public.medications;
DROP POLICY IF EXISTS "Users can update own medications" ON public.medications;
DROP POLICY IF EXISTS "Users can delete own medications" ON public.medications;

CREATE POLICY "Users can view own medications" ON public.medications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Caregiver can view patient medications" ON public.medications FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = medications.user_id AND users.caregiver_email = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid())::text)
);
CREATE POLICY "Users can insert own medications" ON public.medications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own medications" ON public.medications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own medications" ON public.medications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ REMINDERS ============
DROP POLICY IF EXISTS "Users can view own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Caregiver can view patient reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can insert own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can update own reminders" ON public.reminders;

CREATE POLICY "Users can view own reminders" ON public.reminders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Caregiver can view patient reminders" ON public.reminders FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = reminders.user_id AND users.caregiver_email = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid())::text)
);
CREATE POLICY "Users can insert own reminders" ON public.reminders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reminders" ON public.reminders FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ============ APPOINTMENTS ============
DROP POLICY IF EXISTS "Users can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Caregiver can view patient appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can insert own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete own appointments" ON public.appointments;

CREATE POLICY "Users can view own appointments" ON public.appointments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Caregiver can view patient appointments" ON public.appointments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = appointments.user_id AND users.caregiver_email = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid())::text)
);
CREATE POLICY "Users can insert own appointments" ON public.appointments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own appointments" ON public.appointments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own appointments" ON public.appointments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ REMINDER_LOGS ============
DROP POLICY IF EXISTS "Users can view own reminder logs" ON public.reminder_logs;
DROP POLICY IF EXISTS "Users can insert own reminder logs" ON public.reminder_logs;

CREATE POLICY "Users can view own reminder logs" ON public.reminder_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reminder logs" ON public.reminder_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ CAREGIVER_NOTIFICATIONS ============
DROP POLICY IF EXISTS "Users can view own caregiver notifications" ON public.caregiver_notifications;
DROP POLICY IF EXISTS "Users can insert own caregiver notifications" ON public.caregiver_notifications;

CREATE POLICY "Users can view own caregiver notifications" ON public.caregiver_notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own caregiver notifications" ON public.caregiver_notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
