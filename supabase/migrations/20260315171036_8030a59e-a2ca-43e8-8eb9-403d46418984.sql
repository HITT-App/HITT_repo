
ALTER TABLE public.routes ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.routes ALTER COLUMN user_id SET DEFAULT null;
