-- 사용자 제품 등록 요청
--
-- 지금까지 검색 결과가 없을 때의 "제품 등록 요청"은 mailto: 링크였다. 메일
-- 클라이언트가 없는 기기에서는 아무 일도 일어나지 않고, 열리더라도 기록이
-- 남지 않아 무엇이 얼마나 요청됐는지 아무도 알 수 없었다.
--
-- 요청을 데이터로 남겨 (1) 사용자가 무엇을 찾는지 파악하고 (2) 관리자가 그걸
-- 보고 제품을 등록할 수 있게 한다. 검색 로그가 없는 지금, 이 표가 "어떤 제품을
-- 먼저 채워야 하는가"에 대한 유일한 근거가 된다.

CREATE TABLE IF NOT EXISTS public.product_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 탈퇴해도 요청 내용은 남긴다(무엇이 필요한지는 계속 유효한 정보다).
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_name TEXT NOT NULL CHECK (BTRIM(requested_name) <> ''),
  -- 요청 당시 검색어. 요청명과 다를 수 있어 따로 남긴다.
  search_query TEXT,
  product_url TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'registered', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  -- 등록 완료 시 연결된 제품
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS product_requests_status_created_idx
  ON public.product_requests (status, created_at DESC);

-- 같은 사람이 같은 제품을 반복 요청하는 것만 막는다. 다른 사람이 같은 제품을
-- 요청하는 것은 막지 않는다 — 요청 수가 우선순위 판단의 근거이기 때문이다.
CREATE UNIQUE INDEX IF NOT EXISTS product_requests_pending_per_user_idx
  ON public.product_requests (user_id, LOWER(BTRIM(requested_name)))
  WHERE status = 'pending' AND user_id IS NOT NULL;

ALTER TABLE public.product_requests ENABLE ROW LEVEL SECURITY;

-- 로그인한 사용자는 본인 이름으로만 요청할 수 있다.
DROP POLICY IF EXISTS "Users can create own product requests" ON public.product_requests;
CREATE POLICY "Users can create own product requests"
  ON public.product_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 본인 요청만 조회한다. 다른 사람이 무엇을 요청했는지는 보이지 않는다.
DROP POLICY IF EXISTS "Users can view own product requests" ON public.product_requests;
CREATE POLICY "Users can view own product requests"
  ON public.product_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 관리자 조회·처리는 service_role(Edge Function)만 한다. anon 에는 아무 권한도
-- 주지 않는다 — 요청 목록에는 사용자가 무엇을 찾는지가 담겨 있다.
REVOKE ALL ON public.product_requests FROM anon;
GRANT SELECT, INSERT ON public.product_requests TO authenticated;
