-- 베로로 출시 전 랜딩페이지 "출시 알림 받기" 신청 저장 테이블.
--
-- anon/authenticated 키로는 쓰기/읽기가 전혀 불가능하도록 RLS만 켜고 정책은
-- 추가하지 않는다. 삽입은 waitlist-signup Edge Function이 service_role 키로만 수행한다.
--
-- ⚠️ 이 마이그레이션은 자동 적용되지 않았습니다. 운영 DB에 적용하려면
--    관리자가 검토 후 `supabase db push` 등으로 명시적으로 실행해 주세요.

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
-- 의도적으로 정책 없음: service_role만 접근 가능(RLS는 service_role에 적용되지 않음).
