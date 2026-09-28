BEGIN;

-- Canonical matching needs stable identity keys, but identity activation must not
-- be confused with a safety, allergen, toxicity, or efficacy claim.
CREATE OR REPLACE FUNCTION public.normalize_ingredient_identity(p_value TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
STRICT
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT NULLIF(
    REGEXP_REPLACE(
      TRANSLATE(
        LOWER(
          REPLACE(
            REPLACE(BTRIM(p_value), '가루', '분말'),
            '파우더', '분말'
          )
        ),
        '()（）[]{}*·•▪◦・,',
        ''
      ),
      '\s+',
      '',
      'g'
    ),
    ''
  );
$$;

REVOKE ALL ON FUNCTION public.normalize_ingredient_identity(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_ingredient_identity(TEXT) TO service_role;

-- Merge legacy rows that normalize to the same identity. The shortest readable
-- Korean label wins deterministically; every original legacy row remains intact.
WITH normalized_legacy AS (
  SELECT
    ingredient.*,
    public.normalize_ingredient_identity(ingredient.name_ko) AS normalized_key
  FROM public.ingredients AS ingredient
  WHERE BTRIM(COALESCE(ingredient.name_ko, '')) <> ''
),
ranked_legacy AS (
  SELECT
    normalized_legacy.*,
    ROW_NUMBER() OVER (
      PARTITION BY normalized_key
      ORDER BY CHAR_LENGTH(name_ko), name_ko, id
    ) AS identity_rank
  FROM normalized_legacy
  WHERE normalized_key IS NOT NULL
)
INSERT INTO public.canonical_ingredients (
  canonical_name_ko,
  canonical_name_en,
  normalized_key,
  category,
  description,
  status,
  legacy_ingredient_id,
  identity_key
)
SELECT
  ranked.name_ko,
  NULLIF(BTRIM(ranked.name_en), ''),
  ranked.normalized_key,
  ranked.category,
  'Exact-match identity migrated from the existing Veroro ingredient registry. Risk semantics require separate reviewed rules.',
  'active',
  ranked.id,
  'legacy:' || ranked.normalized_key
FROM ranked_legacy AS ranked
WHERE ranked.identity_rank = 1
ON CONFLICT (normalized_key) DO UPDATE SET
  canonical_name_en = COALESCE(
    public.canonical_ingredients.canonical_name_en,
    EXCLUDED.canonical_name_en
  ),
  legacy_ingredient_id = COALESCE(
    public.canonical_ingredients.legacy_ingredient_id,
    EXCLUDED.legacy_ingredient_id
  ),
  identity_key = COALESCE(
    public.canonical_ingredients.identity_key,
    EXCLUDED.identity_key
  ),
  status = 'active',
  updated_at = NOW();

-- Import English names and curated legacy aliases only when a normalized alias
-- has exactly one canonical owner. Ambiguous terms stay out of exact matching.
WITH candidate_terms AS (
  SELECT
    canonical.id AS canonical_ingredient_id,
    NULLIF(BTRIM(ingredient.name_en), '') AS alias_text,
    'english'::TEXT AS alias_type,
    public.normalize_ingredient_identity(ingredient.name_en) AS normalized_alias
  FROM public.ingredients AS ingredient
  JOIN public.canonical_ingredients AS canonical
    ON canonical.normalized_key = public.normalize_ingredient_identity(ingredient.name_ko)
  WHERE NULLIF(BTRIM(ingredient.name_en), '') IS NOT NULL

  UNION ALL

  SELECT
    canonical.id AS canonical_ingredient_id,
    NULLIF(BTRIM(alias_value), '') AS alias_text,
    'label'::TEXT AS alias_type,
    public.normalize_ingredient_identity(alias_value) AS normalized_alias
  FROM public.ingredients AS ingredient
  JOIN public.canonical_ingredients AS canonical
    ON canonical.normalized_key = public.normalize_ingredient_identity(ingredient.name_ko)
  CROSS JOIN LATERAL UNNEST(COALESCE(ingredient.aliases, '{}'::TEXT[])) AS alias_value
  WHERE NULLIF(BTRIM(alias_value), '') IS NOT NULL
),
alias_ownership AS (
  SELECT
    normalized_alias,
    COUNT(DISTINCT canonical_ingredient_id) AS owner_count
  FROM candidate_terms
  WHERE normalized_alias IS NOT NULL
  GROUP BY normalized_alias
),
unambiguous_aliases AS (
  SELECT DISTINCT ON (candidate.normalized_alias)
    candidate.canonical_ingredient_id,
    candidate.alias_text,
    candidate.normalized_alias,
    candidate.alias_type
  FROM candidate_terms AS candidate
  JOIN alias_ownership AS ownership
    ON ownership.normalized_alias = candidate.normalized_alias
  JOIN public.canonical_ingredients AS canonical
    ON canonical.id = candidate.canonical_ingredient_id
  WHERE ownership.owner_count = 1
    AND candidate.normalized_alias <> canonical.normalized_key
  ORDER BY candidate.normalized_alias, candidate.alias_type, candidate.alias_text
)
INSERT INTO public.canonical_ingredient_aliases (
  canonical_ingredient_id,
  alias_text,
  normalized_alias,
  language_code,
  alias_type,
  is_preferred
)
SELECT
  canonical_ingredient_id,
  alias_text,
  normalized_alias,
  'ko',
  alias_type,
  FALSE
FROM unambiguous_aliases
ON CONFLICT (normalized_alias, language_code) DO NOTHING;

-- This official source is attached only as label/identity provenance. It is not
-- evidence for safety or clinical claims, which remain governed by separate rules.
INSERT INTO public.ingredient_evidence_sources (
  source_type,
  title,
  organization,
  url,
  accessed_at,
  metadata
)
SELECT
  'regulation',
  '반려동물사료의 기타 표시사항(사료 등의 기준 및 규격 별표 15의2)',
  '농림축산식품부',
  'https://www.law.go.kr/LSW/flDownload.do?bylClsCd=200201&flNm=%5B%EB%B3%84%ED%91%9C+15%EC%9D%982%5D+%EB%B0%98%EB%A0%A4%EB%8F%99%EB%AC%BC%EC%82%AC%EB%A3%8C%EC%9D%98+%EA%B8%B0%ED%83%80+%ED%91%9C%EC%8B%9C%EC%82%AC%ED%95%AD%28%EC%A0%9C10%EC%A1%B0%EC%A0%9C1%ED%95%AD+%EA%B4%80%EB%A0%A8%29&flSeq=156118241',
  DATE '2026-09-28',
  jsonb_build_object(
    'scope', 'ingredient_identity',
    'jurisdiction', 'KR',
    'riskSemantics', FALSE
  )
WHERE NOT EXISTS (
  SELECT 1
  FROM public.ingredient_evidence_sources
  WHERE url = 'https://www.law.go.kr/LSW/flDownload.do?bylClsCd=200201&flNm=%5B%EB%B3%84%ED%91%9C+15%EC%9D%982%5D+%EB%B0%98%EB%A0%A4%EB%8F%99%EB%AC%BC%EC%82%AC%EB%A3%8C%EC%9D%98+%EA%B8%B0%ED%83%80+%ED%91%9C%EC%8B%9C%EC%82%AC%ED%95%AD%28%EC%A0%9C10%EC%A1%B0%EC%A0%9C1%ED%95%AD+%EA%B4%80%EB%A0%A8%29&flSeq=156118241'
);

WITH identity_source AS (
  SELECT id
  FROM public.ingredient_evidence_sources
  WHERE url = 'https://www.law.go.kr/LSW/flDownload.do?bylClsCd=200201&flNm=%5B%EB%B3%84%ED%91%9C+15%EC%9D%982%5D+%EB%B0%98%EB%A0%A4%EB%8F%99%EB%AC%BC%EC%82%AC%EB%A3%8C%EC%9D%98+%EA%B8%B0%ED%83%80+%ED%91%9C%EC%8B%9C%EC%82%AC%ED%95%AD%28%EC%A0%9C10%EC%A1%B0%EC%A0%9C1%ED%95%AD+%EA%B4%80%EB%A0%A8%29&flSeq=156118241'
  ORDER BY created_at, id
  LIMIT 1
)
INSERT INTO public.canonical_ingredient_evidence (
  canonical_ingredient_id,
  source_id,
  claim_type,
  species,
  evidence_level,
  claim_summary,
  locator,
  reviewed_at
)
SELECT
  canonical.id,
  identity_source.id,
  'ingredient_identity',
  'both',
  'identity_only',
  'Exact-match identity migrated from the existing ingredient registry. This does not establish safety, toxicity, allergenicity, or efficacy.',
  'Legacy registry identity activation; risk semantics explicitly excluded.',
  NOW()
FROM public.canonical_ingredients AS canonical
CROSS JOIN identity_source
WHERE canonical.status = 'active'
  AND canonical.legacy_ingredient_id IS NOT NULL
ON CONFLICT (canonical_ingredient_id, source_id, claim_type, species) DO UPDATE SET
  evidence_level = EXCLUDED.evidence_level,
  claim_summary = EXCLUDED.claim_summary,
  locator = EXCLUDED.locator,
  reviewed_at = COALESCE(public.canonical_ingredient_evidence.reviewed_at, EXCLUDED.reviewed_at);

COMMIT;
