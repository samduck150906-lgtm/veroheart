-- 판매가 변동을 바로 반영하지 않고 "요청중 → 승인" 단계를 거치게 한다.
--
-- 지금 products.min_price 는 수동 입력값이라, 판매처에서 가격이 바뀌어도 아무도
-- 모른다. 그렇다고 외부 값을 자동으로 덮어쓰면 잘못된 값이 그대로 앱에 나간다.
-- 그래서 감지된 변동은 제안으로 쌓고, 관리자가 승인한 것만 products 에 반영한다.

BEGIN;

CREATE TABLE IF NOT EXISTS public.product_price_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  /** 감지 시점의 products.min_price — 승인 화면에서 무엇이 바뀌는지 보여 준다. */
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

-- 제품당 대기 중인 제안은 하나만 둔다. 같은 제품의 변동이 반복 감지되면
-- 기존 대기 행을 최신 값으로 갱신한다(제안이 쌓여 목록이 흐려지지 않게).
CREATE UNIQUE INDEX IF NOT EXISTS product_price_proposals_pending_key
  ON public.product_price_proposals (product_id)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_product_price_proposals_status
  ON public.product_price_proposals (status, detected_at DESC);

COMMENT ON TABLE public.product_price_proposals IS
  '판매처에서 감지한 가격 변동 제안. 승인해야 products.min_price 에 반영된다.';

ALTER TABLE public.product_price_proposals ENABLE ROW LEVEL SECURITY;
-- 의도적으로 정책 없음: service_role(admin-write / 동기화 함수)만 접근한다.
REVOKE ALL ON TABLE public.product_price_proposals FROM anon, authenticated;

-- 동기화가 어디까지 돌았는지 — 전체를 매번 조회하지 않고 오래된 것부터 이어서 본다.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price_checked_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_products_price_checked
  ON public.products (price_checked_at NULLS FIRST)
  WHERE coupang_product_id IS NOT NULL;

COMMENT ON COLUMN public.products.price_checked_at IS
  '판매처 가격을 마지막으로 확인한 시각. NULL 이면 아직 확인한 적 없다.';

-- 동기화 실행 기록 — "마지막으로 언제 돌았고 몇 건이 바뀌었나"를 화면에 보여 준다.
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
REVOKE ALL ON TABLE public.price_sync_runs FROM anon, authenticated;

COMMIT;
