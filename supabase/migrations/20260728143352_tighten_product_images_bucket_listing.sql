-- product-images 버킷의 광범위한 SELECT 정책 제거 (권한 축소).
--
-- 배경: public = true 버킷은 /object/public/<bucket>/<path> 경로로 RLS 검사 없이
-- 객체를 서빙한다. 따라서 storage.objects 에 별도 SELECT 정책이 없어도
-- 사용자 앱의 <img src="...publicUrl"> 는 정상 동작한다.
-- 반면 이 정책이 있으면 클라이언트가 버킷 전체 파일 "목록"까지 조회할 수 있어
-- 의도보다 넓은 노출이 된다(Supabase security advisor 0025).
--
-- 업로드/삭제는 이전과 동일하게 정책이 없어 service_role(admin-write)만 가능하다.
DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;;
