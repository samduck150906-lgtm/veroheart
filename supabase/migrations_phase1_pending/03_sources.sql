-- ============================================================================
-- Phase 1 / 03 — 출처(근거) 추적 구조 (비파괴, 멱등)
-- ----------------------------------------------------------------------------
-- evidence_level(단일 라벨)만으로는 판정 근거를 추적할 수 없다.
-- sources(출처 마스터) + ingredient_sources / rule_sources(연결)로 추적 가능하게 한다.
-- 규칙: "출처가 없는 성분은 확정적 위험 판정에 사용하지 않는다" 를 엔진이 강제할 수 있도록
--       데이터 구조를 먼저 마련한다(엔진 로직은 별도 단계).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.sources (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization    text,                 -- 기관/저널/단체명 (예: AAFCO, FEDIAF, ASPCA)
  document_title  text,                 -- 문서/논문 제목
  url             text,                 -- URL
  doi             text,                 -- DOI (있으면)
  source_type     text,                 -- regulation/guideline/peer_reviewed/textbook/clinical/internal
  published_at    date,
  accessed_at     date,
  trust_grade     text,                 -- A/B/C (신뢰도 등급)
  applies_species text,                 -- dog/cat/both
  applies_conditions text[] DEFAULT '{}',
  review_status   text NOT NULL DEFAULT 'draft', -- draft/verified/rejected
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sources_type_chk CHECK (source_type IS NULL OR source_type IN
    ('regulation','guideline','peer_reviewed','textbook','clinical','internal')),
  CONSTRAINT sources_trust_chk CHECK (trust_grade IS NULL OR trust_grade IN ('A','B','C')),
  CONSTRAINT sources_species_chk CHECK (applies_species IS NULL OR applies_species IN ('dog','cat','both'))
);

CREATE TABLE IF NOT EXISTS public.ingredient_sources (
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  source_id     uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ingredient_id, source_id)
);

-- analysis_rules.id 는 text PK 이므로 rule_id 도 text
CREATE TABLE IF NOT EXISTS public.rule_sources (
  rule_id    text NOT NULL,
  source_id  uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (rule_id, source_id)
);
-- analysis_rules 가 존재하면 FK 부착(없으면 건너뜀 — 멱등)
DO $$ BEGIN
  IF to_regclass('public.analysis_rules') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='rule_sources_rule_fk') THEN
    ALTER TABLE public.rule_sources
      ADD CONSTRAINT rule_sources_rule_fk FOREIGN KEY (rule_id)
      REFERENCES public.analysis_rules(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ingredient_sources_source ON public.ingredient_sources (source_id);
CREATE INDEX IF NOT EXISTS idx_rule_sources_source       ON public.rule_sources (source_id);

ALTER TABLE public.sources             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_sources  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_sources        ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sources' AND policyname='sources_read') THEN
    CREATE POLICY sources_read ON public.sources FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ingredient_sources' AND policyname='ingredient_sources_read') THEN
    CREATE POLICY ingredient_sources_read ON public.ingredient_sources FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='rule_sources' AND policyname='rule_sources_read') THEN
    CREATE POLICY rule_sources_read ON public.rule_sources FOR SELECT USING (true);
  END IF;
END $$;

COMMIT;
