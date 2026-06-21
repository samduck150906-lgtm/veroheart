-- 베로로 커뮤니티 테이블
-- community_posts, community_comments, post_likes

BEGIN;

-- ─── community_posts ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_posts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  category    TEXT NOT NULL DEFAULT '잡담',
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  like_count  INTEGER NOT NULL DEFAULT 0,
  view_count  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_posts' AND policyname='community_posts_read') THEN
    CREATE POLICY community_posts_read ON public.community_posts FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_posts' AND policyname='community_posts_insert') THEN
    CREATE POLICY community_posts_insert ON public.community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_posts' AND policyname='community_posts_delete') THEN
    CREATE POLICY community_posts_delete ON public.community_posts FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_community_posts_category ON public.community_posts(category);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON public.community_posts(created_at DESC);

-- ─── community_comments ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_comments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id     UUID REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_comments' AND policyname='comments_read') THEN
    CREATE POLICY comments_read ON public.community_comments FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_comments' AND policyname='comments_insert') THEN
    CREATE POLICY comments_insert ON public.community_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_comments' AND policyname='comments_delete') THEN
    CREATE POLICY comments_delete ON public.community_comments FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_comments_post ON public.community_comments(post_id);

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

COMMIT;
