ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid();