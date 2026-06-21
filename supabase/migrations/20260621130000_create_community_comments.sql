CREATE TABLE public.community_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_community_comments_post_id    ON public.community_comments(post_id);
CREATE INDEX idx_community_comments_created_at ON public.community_comments(created_at ASC);

-- Trigger: sync comments_count on parent post
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_post_comments_count
AFTER INSERT OR DELETE ON public.community_comments
FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

-- RLS
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "community_comments_select" ON public.community_comments FOR SELECT USING (true);
CREATE POLICY "community_comments_insert" ON public.community_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "community_comments_delete"  ON public.community_comments FOR DELETE USING (auth.uid() = user_id);
