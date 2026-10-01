-- 과도하게 열린 RLS 정책을 최소권한으로 정정한다.
DROP POLICY IF EXISTS "Allow admin all access on banners" ON public.banners;
DROP POLICY IF EXISTS unmatched_update ON public.unmatched_ingredients;;
