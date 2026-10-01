INSERT INTO public.app_settings (key, value, is_public, description) VALUES
  ('hide_unverified_products', 'false'::jsonb, TRUE,
   '켜면 검수 완료(verified) 제품만 사용자 앱에 노출한다. 검수가 끝나기 전에 켜면 목록이 비므로 기본은 false.')
ON CONFLICT (key) DO UPDATE SET is_public = TRUE;;
