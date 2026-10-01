-- ============================================================
-- 수익화 인프라: 스폰서 슬롯 + 구독 멤버십
-- ============================================================

-- 1. products 테이블에 스폰서 필드 추가
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_sponsored  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sponsor_label text    DEFAULT '광고',
  ADD COLUMN IF NOT EXISTS sponsor_order integer DEFAULT 0;

-- 스폰서 상품 빠른 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_products_is_sponsored
  ON products(is_sponsored)
  WHERE is_sponsored = true;

-- 2. users 테이블에 멤버십 캐시 필드 추가
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS membership_tier       text      DEFAULT 'free'
    CHECK (membership_tier IN ('free', 'plus', 'pro')),
  ADD COLUMN IF NOT EXISTS membership_expires_at timestamptz;

-- 3. subscriptions 테이블 (구독 이력)
CREATE TABLE IF NOT EXISTS subscriptions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier        text        NOT NULL DEFAULT 'plus'
    CHECK (tier IN ('plus', 'pro')),
  status      text        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'cancelled', 'expired')),
  amount      integer     NOT NULL,
  payment_key text,
  started_at  timestamptz DEFAULT now(),
  expires_at  timestamptz,
  created_at  timestamptz DEFAULT now()
);

-- 4. Row Level Security
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
;
