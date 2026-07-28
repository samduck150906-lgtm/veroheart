-- 20260728120000_feeding_log_photo_storage.sql
--
-- 목적: 식이 다이어리 기록 사진을 base64(pet_feeding_logs.image_url TEXT)가 아닌
--       Supabase Storage에 저장하기 위한 버킷·정책.
--   - 기존 base64 저장 방식은 모든 목록 조회(select *)에 사진 원본이 실려
--     한 달치 사진 기록 조회가 수십 MB payload가 되는 구조적 문제가 있었다.
--   - 클라이언트는 업로드 성공 시 공개 URL만 image_url에 저장한다.
--     (버킷이 없으면 기존 data URL 방식으로 폴백하므로 배포 순서 무관)
--   - 기존 base64 행 이전은 scripts/backfill-feeding-log-photos.mjs 로 수행.
--
-- 규칙: idempotent (ON CONFLICT / DROP POLICY IF EXISTS). 기존 스키마 비파괴.

-- ─── 버킷 ────────────────────────────────────────────────────────────────────
-- 공개 읽기 버킷: 사진 URL을 img src로 바로 쓴다. 경로 1단계가 소유자 uid라
-- URL 추측이 어렵고, 민감 정보가 아닌 급여 기록 사진이므로 공개 읽기를 허용.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'feeding-log-photos',
  'feeding-log-photos',
  true,
  1048576, -- 1MB (클라이언트 제한 900KB보다 약간 여유)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─── storage.objects RLS 정책 ────────────────────────────────────────────────
-- 경로 규칙: <auth.uid()>/<파일명> — 폴더 1단계가 소유자 검증 기준이다.

DROP POLICY IF EXISTS "feeding_log_photos_public_read" ON storage.objects;
CREATE POLICY "feeding_log_photos_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'feeding-log-photos');

DROP POLICY IF EXISTS "feeding_log_photos_owner_insert" ON storage.objects;
CREATE POLICY "feeding_log_photos_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'feeding-log-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "feeding_log_photos_owner_update" ON storage.objects;
CREATE POLICY "feeding_log_photos_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'feeding-log-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'feeding-log-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "feeding_log_photos_owner_delete" ON storage.objects;
CREATE POLICY "feeding_log_photos_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'feeding-log-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
