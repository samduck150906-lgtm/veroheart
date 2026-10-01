CREATE TABLE IF NOT EXISTS public.product_price_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  current_price INTEGER,
  proposed_price INTEGER NOT NULL CHECK (proposed_price >= 0),
  source TEXT NOT NULL DEFAULT 'coupang' CHECK (source IN ('coupang', 'manual')),
  source_url TEXT,
  source_product_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  note TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS product_price_proposals_pending_key
  ON public.product_price_proposals (product_id)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_product_price_proposals_status
  ON public.product_price_proposals (status, detected_at DESC);

COMMENT ON TABLE public.product_price_proposals IS
  '판매처에서 감지한 가격 변동 제안. 승인해야 products.min_price 에 반영된다.';

ALTER TABLE public.product_price_proposals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.product_price_proposals FROM anon, authenticated;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price_checked_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_products_price_checked
  ON public.products (price_checked_at NULLS FIRST)
  WHERE coupang_product_id IS NOT NULL;

COMMENT ON COLUMN public.products.price_checked_at IS
  '판매처 가격을 마지막으로 확인한 시각. NULL 이면 아직 확인한 적 없다.';

CREATE TABLE IF NOT EXISTS public.price_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  checked INTEGER NOT NULL DEFAULT 0,
  changed INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  triggered_by TEXT,
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_price_sync_runs_started
  ON public.price_sync_runs (started_at DESC);

ALTER TABLE public.price_sync_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.price_sync_runs FROM anon, authenticated;;
