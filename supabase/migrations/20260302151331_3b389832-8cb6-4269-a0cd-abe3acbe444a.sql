
-- Server-side input validation constraints

-- Medications table constraints
ALTER TABLE public.medications ADD CONSTRAINT check_med_name_length CHECK (length(name) BETWEEN 1 AND 100);
ALTER TABLE public.medications ADD CONSTRAINT check_med_dosage_length CHECK (dosage IS NULL OR length(dosage) <= 50);
ALTER TABLE public.medications ADD CONSTRAINT check_med_notes_length CHECK (notes IS NULL OR length(notes) <= 500);
ALTER TABLE public.medications ADD CONSTRAINT check_med_color_length CHECK (color IS NULL OR length(color) <= 20);
ALTER TABLE public.medications ADD CONSTRAINT check_med_frequency_values CHECK (frequency IS NULL OR frequency IN ('once', 'daily', 'twice', 'thrice', 'custom'));

-- Users table constraints
ALTER TABLE public.users ADD CONSTRAINT check_user_name_length CHECK (name IS NULL OR length(name) BETWEEN 1 AND 100);
ALTER TABLE public.users ADD CONSTRAINT check_user_phone_length CHECK (phone IS NULL OR length(phone) <= 20);
ALTER TABLE public.users ADD CONSTRAINT check_user_age_range CHECK (age IS NULL OR (age > 0 AND age <= 150));
ALTER TABLE public.users ADD CONSTRAINT check_cg_name_length CHECK (caregiver_name IS NULL OR length(caregiver_name) <= 100);
ALTER TABLE public.users ADD CONSTRAINT check_cg_phone_length CHECK (caregiver_phone IS NULL OR length(caregiver_phone) <= 20);
ALTER TABLE public.users ADD CONSTRAINT check_cg_email_length CHECK (caregiver_email IS NULL OR length(caregiver_email) <= 255);

-- Appointments table constraints
ALTER TABLE public.appointments ADD CONSTRAINT check_apt_title_length CHECK (length(title) BETWEEN 1 AND 200);
ALTER TABLE public.appointments ADD CONSTRAINT check_apt_doctor_length CHECK (doctor_name IS NULL OR length(doctor_name) <= 100);
ALTER TABLE public.appointments ADD CONSTRAINT check_apt_notes_length CHECK (notes IS NULL OR length(notes) <= 500);
ALTER TABLE public.appointments ADD CONSTRAINT check_apt_location_length CHECK (location IS NULL OR length(location) <= 200);
ALTER TABLE public.appointments ADD CONSTRAINT check_apt_specialty_length CHECK (specialty IS NULL OR length(specialty) <= 100);

-- Reminder logs constraints
ALTER TABLE public.reminder_logs ADD CONSTRAINT check_log_notes_length CHECK (notes IS NULL OR length(notes) <= 500);
ALTER TABLE public.reminder_logs ADD CONSTRAINT check_log_action_length CHECK (length(action) BETWEEN 1 AND 50);

-- Caregiver notifications constraints
ALTER TABLE public.caregiver_notifications ADD CONSTRAINT check_notif_message_length CHECK (length(message) BETWEEN 1 AND 1000);
ALTER TABLE public.caregiver_notifications ADD CONSTRAINT check_notif_channel_length CHECK (length(channel) BETWEEN 1 AND 50);
