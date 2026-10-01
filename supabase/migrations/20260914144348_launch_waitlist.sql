CREATE TABLE IF NOT EXISTS public.launch_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  phone text,
  source text NOT NULL DEFAULT 'landing',
  marketing_consent boolean NOT NULL DEFAULT false,
  privacy_consent boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS launch_waitlist_email_key
  ON public.launch_waitlist (lower(email));

ALTER TABLE public.launch_waitlist ENABLE ROW LEVEL SECURITY;
-- 의도적으로 정책 없음: service_role만 접근 가능(RLS는 service_role에 적용되지 않음).;
