
-- Recreate get_weekly_adherence with SECURITY DEFINER + auth.uid() validation + fixed search_path
CREATE OR REPLACE FUNCTION public.get_weekly_adherence(p_user_id uuid)
RETURNS TABLE(total_scheduled bigint, total_taken bigint, adherence_pct numeric, current_streak integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure caller can only query their own data
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(CASE WHEN status = 'taken' THEN 1 END)::BIGINT,
    CASE
      WHEN COUNT(*) = 0 THEN 0::NUMERIC
      ELSE ROUND(COUNT(CASE WHEN status = 'taken' THEN 1 END) * 100.0 / COUNT(*), 1)
    END,
    (SELECT streak FROM public.users WHERE id = p_user_id)::INTEGER
  FROM public.reminders
  WHERE user_id = p_user_id
    AND scheduled_date >= CURRENT_DATE - INTERVAL '7 days'
    AND scheduled_date <= CURRENT_DATE;
END;
$$;

-- Also fix handle_new_user search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'patient'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
