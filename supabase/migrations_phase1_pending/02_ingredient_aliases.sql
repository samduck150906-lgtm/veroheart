-- ============================================================================
-- Phase 1 / 02 — ingredient_aliases (별칭·파생 관계 단일 테이블, 비파괴, 멱등)
-- ----------------------------------------------------------------------------
-- 기존 ingredient_synonyms(121행)는 "삭제하지 않고" 유지한다.
-- Phase 2(별도 승인)에서 synonyms → aliases 로 이관하며, relation_type 을 부여한다.
-- 이 파일은 테이블/제약/RLS만 만든다. 데이터 이관은 하지 않는다.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.ingredient_aliases (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id    uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  raw_alias        text NOT NULL,
  normalized_alias text NOT NULL,
  language         text NOT NULL DEFAULT 'ko',
  relation_type    text NOT NULL DEFAULT 'same_ingredient',
  match_priority   integer NOT NULL DEFAULT 100,   -- 낮을수록 우선
  review_status    text NOT NULL DEFAULT 'auto_suggested',
  source_synonym_id uuid,                           -- ingredient_synonyms 이관 추적용(있으면)
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ingredient_aliases_norm_uniq UNIQUE (normalized_alias),
  CONSTRAINT ingredient_aliases_relation_chk CHECK (relation_type IN (
    'same_ingredient','protein_derivative','meal','broth',
    'fat_derivative','oil','extract','flavor',
    'possible_trace','unknown_derivative'
  )),
  CONSTRAINT ingredient_aliases_review_chk CHECK (review_status IN (
    'auto_suggested','manually_reviewed','expert_reviewed','rejected'
  ))
);

CREATE INDEX IF NOT EXISTS idx_aliases_ingredient ON public.ingredient_aliases (ingredient_id);
CREATE INDEX IF NOT EXISTS idx_aliases_relation   ON public.ingredient_aliases (relation_type);
CREATE INDEX IF NOT EXISTS idx_aliases_review     ON public.ingredient_aliases (review_status);

ALTER TABLE public.ingredient_aliases ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
     WHERE schemaname='public' AND tablename='ingredient_aliases' AND policyname='aliases_read') THEN
    CREATE POLICY aliases_read ON public.ingredient_aliases FOR SELECT USING (true);
  END IF;
  -- 쓰기는 정책 없음 → anon/authenticated 차단, service_role(관리자)만 우회 가능
END $$;

COMMIT;
