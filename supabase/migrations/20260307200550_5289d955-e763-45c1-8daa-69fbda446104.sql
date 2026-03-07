
-- Fix medications policies to PERMISSIVE
DROP POLICY IF EXISTS "Users can view own medications" ON public.medications;
DROP POLICY IF EXISTS "Caregiver can view patient medications" ON public.medications;
DROP POLICY IF EXISTS "Users can insert own medications" ON public.medications;
DROP POLICY IF EXISTS "Users can update own medications" ON public.medications;
DROP POLICY IF EXISTS "Users can delete own medications" ON public.medications;

CREATE POLICY "Users can view own medications" ON public.medications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Caregiver can view patient medications" ON public.medications FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = medications.user_id AND users.caregiver_email = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid())::text));
CREATE POLICY "Users can insert own medications" ON public.medications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own medications" ON public.medications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own medications" ON public.medications FOR DELETE USING (auth.uid() = user_id);

-- Fix reminders policies
DROP POLICY IF EXISTS "Users can view own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Caregiver can view patient reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can insert own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can update own reminders" ON public.reminders;

CREATE POLICY "Users can view own reminders" ON public.reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Caregiver can view patient reminders" ON public.reminders FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = reminders.user_id AND users.caregiver_email = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid())::text));
CREATE POLICY "Users can insert own reminders" ON public.reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reminders" ON public.reminders FOR UPDATE USING (auth.uid() = user_id);

-- Fix appointments policies
DROP POLICY IF EXISTS "Users can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Caregiver can view patient appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can insert own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete own appointments" ON public.appointments;

CREATE POLICY "Users can view own appointments" ON public.appointments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Caregiver can view patient appointments" ON public.appointments FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = appointments.user_id AND users.caregiver_email = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid())::text));
CREATE POLICY "Users can insert own appointments" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own appointments" ON public.appointments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own appointments" ON public.appointments FOR DELETE USING (auth.uid() = user_id);

-- Fix users policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.users;

CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can delete own profile" ON public.users FOR DELETE USING (auth.uid() = id);

-- Fix reminder_logs policies
DROP POLICY IF EXISTS "Users can view own reminder logs" ON public.reminder_logs;
DROP POLICY IF EXISTS "Users can insert own reminder logs" ON public.reminder_logs;

CREATE POLICY "Users can view own reminder logs" ON public.reminder_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reminder logs" ON public.reminder_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fix caregiver_notifications policies
DROP POLICY IF EXISTS "Users can view own caregiver notifications" ON public.caregiver_notifications;
DROP POLICY IF EXISTS "Users can insert own caregiver notifications" ON public.caregiver_notifications;

CREATE POLICY "Users can view own caregiver notifications" ON public.caregiver_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own caregiver notifications" ON public.caregiver_notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
