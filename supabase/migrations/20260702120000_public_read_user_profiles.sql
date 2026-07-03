-- 리뷰 작성자 닉네임 노출을 위한 공개 프로필 읽기 정책.
--
-- reviews 는 "Anyone can read reviews" 로 공개되어 있으나, users 의 SELECT 정책이
-- 본인 프로필(auth.uid() = id)로만 제한돼 있어 reviews.users(nickname) 임베딩이
-- 타인 리뷰에서는 null 로 반환되었다. 리뷰 목록에 작성자 닉네임을 표시하려면
-- public.users 의 공개 읽기가 필요하다. (email 등 민감정보는 public.users 에 없음)
DROP POLICY IF EXISTS "Anyone can view public profile" ON public.users;
CREATE POLICY "Anyone can view public profile" ON public.users
  FOR SELECT USING (true);
