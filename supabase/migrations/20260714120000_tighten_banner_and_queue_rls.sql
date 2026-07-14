-- 20260714120000_tighten_banner_and_queue_rls.sql
--
-- 목적: 과도하게 열린 RLS 정책을 최소권한(least privilege)으로 정정한다.
-- 상태: ⚠️ 리뷰/승인 후 적용(supabase db push). 이 파일 자체는 프로덕션을 바꾸지 않는다.
--
-- 배경(코드 감사에서 발견):
--   1) public.banners
--      기존 정책 "Allow admin all access on banners" 가 FOR ALL USING(true) WITH CHECK(true)
--      로 되어 있어 anon / authenticated 를 포함한 "누구나" banners 를 insert/update/delete
--      할 수 있었다(이름만 admin 일 뿐 역할 검증이 없음). 배너 변조·주입 위험(P1).
--      banners 는 현재 앱에서 읽기·쓰기 어디에도 사용되지 않으며, 향후 운영 쓰기는
--      service_role(admin-write Edge Function)로만 수행하면 된다. service_role 은 RLS 를
--      우회하므로, 공개 쓰기 정책을 제거해도 운영 쓰기에는 영향이 없다.
--
--   2) public.unmatched_ingredients
--      정책 unmatched_update 가 FOR UPDATE USING(true) 로 익명 사용자가 큐의 임의 행을
--      수정할 수 있었다(P2). 크라우드소싱 INSERT(제보)와 공개 SELECT 는 유지하고,
--      익명 UPDATE 만 제거한다. 큐 상태 갱신(검수)은 service_role 로 수행한다.
--      (앱 코드에서 unmatched_ingredients 에 대한 update 호출은 존재하지 않음)
--
-- 롤백: 이 마이그레이션은 "권한 축소"이므로, 되돌리려면 아래 원 정책을 다시 만들면 된다.
--   CREATE POLICY "Allow admin all access on banners" ON public.banners
--     FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY unmatched_update ON public.unmatched_ingredients
--     FOR UPDATE USING (true);
--   (원 정책은 위험하므로 롤백은 권장하지 않는다)

-- ── 1) banners: 공개 쓰기(ALL) 정책 제거 — 공개 SELECT 정책은 그대로 유지 ──
DROP POLICY IF EXISTS "Allow admin all access on banners" ON public.banners;

-- ── 2) unmatched_ingredients: 익명 UPDATE 정책 제거 — INSERT/SELECT 는 유지 ──
DROP POLICY IF EXISTS unmatched_update ON public.unmatched_ingredients;
