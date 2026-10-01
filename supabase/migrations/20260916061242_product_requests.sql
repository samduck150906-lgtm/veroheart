CREATE TABLE IF NOT EXISTS public.product_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_name TEXT NOT NULL CHECK (BTRIM(requested_name) <> ''),
  search_query TEXT,
  product_url TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'registered', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS product_requests_status_created_idx
  ON public.product_requests (status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS product_requests_pending_per_user_idx
  ON public.product_requests (user_id, LOWER(BTRIM(requested_name)))
  WHERE status = 'pending' AND user_id IS NOT NULL;

ALTER TABLE public.product_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create own product requests" ON public.product_requests;
CREATE POLICY "Users can create own product requests"
  ON public.product_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own product requests" ON public.product_requests;
CREATE POLICY "Users can view own product requests"
  ON public.product_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON public.product_requests FROM anon;
GRANT SELECT, INSERT ON public.product_requests TO authenticated;;
