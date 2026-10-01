
-- ─── post_likes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_likes (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, post_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_likes' AND policyname='post_likes_read') THEN
    CREATE POLICY post_likes_read ON public.post_likes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_likes' AND policyname='post_likes_write') THEN
    CREATE POLICY post_likes_write ON public.post_likes FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ─── like_count 자동 업데이트 트리거 ─────────────────────────
CREATE OR REPLACE FUNCTION public.sync_post_like_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_like_count ON public.post_likes;
CREATE TRIGGER trg_post_like_count
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_like_count();

-- ─── 댓글 수 집계 뷰 ─────────────────────────────────────────
CREATE OR REPLACE VIEW public.community_posts_with_counts AS
SELECT
  p.*,
  u.nickname AS author_nickname,
  COUNT(c.id) AS comment_count
FROM public.community_posts p
JOIN public.users u ON u.id = p.user_id
LEFT JOIN public.community_comments c ON c.post_id = p.id
GROUP BY p.id, u.nickname;
;
