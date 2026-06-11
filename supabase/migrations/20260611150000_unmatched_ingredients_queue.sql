-- Veroro 분석 엔진 — 관리자 검수 큐 (Stage: admin)
-- 사전에 매칭되지 않은 원료명을 모아 관리자가 검수/사전 등록할 수 있게 한다.
-- 멱등하게 작성됨.

BEGIN;

CREATE TABLE IF NOT EXISTS public.unmatched_ingredients (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_name text NOT NULL UNIQUE,
  raw_name        text NOT NULL,
  occurrences     integer NOT NULL DEFAULT 1,
  status          text NOT NULL DEFAULT 'pending', -- pending | resolved | ignored
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.unmatched_ingredients ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='unmatched_ingredients' AND policyname='unmatched_select') THEN
    CREATE POLICY unmatched_select ON public.unmatched_ingredients FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='unmatched_ingredients' AND policyname='unmatched_insert') THEN
    CREATE POLICY unmatched_insert ON public.unmatched_ingredients FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='unmatched_ingredients' AND policyname='unmatched_update') THEN
    CREATE POLICY unmatched_update ON public.unmatched_ingredients FOR UPDATE USING (true);
  END IF;
END $$;

-- 미매칭 원료 1건을 기록(있으면 카운트 증가). 클라이언트에서 호출.
CREATE OR REPLACE FUNCTION public.log_unmatched_ingredient(p_raw text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm text;
BEGIN
  v_norm := lower(regexp_replace(coalesce(p_raw, ''), '\s+', '', 'g'));
  IF v_norm = '' THEN RETURN; END IF;
  INSERT INTO public.unmatched_ingredients (normalized_name, raw_name)
  VALUES (v_norm, p_raw)
  ON CONFLICT (normalized_name) DO UPDATE
    SET occurrences = public.unmatched_ingredients.occurrences + 1,
        last_seen_at = now();
END;
$$;

COMMIT;
