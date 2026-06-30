-- ============================================================================
-- Phase 1 / 04 — engine_versions (데이터/규칙/스코어링 버전 스탬프, 비파괴, 멱등)
-- ----------------------------------------------------------------------------
-- UnifiedAnalysisResult 의 ingredientDbVersion/ruleVersion/scoringVersion 출처.
-- 브라우저·Edge 버전 일치 검증 및 캐시 무효화 기준.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.engine_versions (
  kind       text PRIMARY KEY,                  -- 'ingredient_db' | 'rule' | 'scoring'
  version    text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT engine_versions_kind_chk CHECK (kind IN ('ingredient_db','rule','scoring'))
);

-- 초기 버전 시드 (멱등: 있으면 유지)
INSERT INTO public.engine_versions (kind, version) VALUES
  ('ingredient_db', '2026-06-23.phase1'),
  ('rule',          '2026-06-23.phase1'),
  ('scoring',       '2026-06-23.phase1')
ON CONFLICT (kind) DO NOTHING;

ALTER TABLE public.engine_versions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='engine_versions' AND policyname='engine_versions_read') THEN
    CREATE POLICY engine_versions_read ON public.engine_versions FOR SELECT USING (true);
  END IF;
END $$;

COMMIT;
