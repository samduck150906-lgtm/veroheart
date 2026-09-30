
DROP POLICY IF EXISTS "Anyone can view public profile" ON public.users;
CREATE POLICY "Anyone can view public profile" ON public.users
  FOR SELECT USING (true);
;
