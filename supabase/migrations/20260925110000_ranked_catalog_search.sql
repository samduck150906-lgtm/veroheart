BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS catalog_search_text TEXT
    GENERATED ALWAYS AS (
      LOWER(
        BTRIM(
          COALESCE(display_name, '') || ' ' ||
          COALESCE(name, '') || ' ' ||
          COALESCE(brand_name, '') || ' ' ||
          COALESCE(barcode, '')
        )
      )
    ) STORED,
  ADD COLUMN IF NOT EXISTS catalog_search_document TSVECTOR
    GENERATED ALWAYS AS (
      TO_TSVECTOR(
        'simple'::REGCONFIG,
        LOWER(
          COALESCE(display_name, '') || ' ' ||
          COALESCE(name, '') || ' ' ||
          COALESCE(brand_name, '') || ' ' ||
          COALESCE(barcode, '')
        )
      )
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_products_catalog_search_document
  ON public.products USING GIN (catalog_search_document);

CREATE INDEX IF NOT EXISTS idx_products_catalog_search_text_trgm
  ON public.products USING GIN (catalog_search_text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_product_aliases_searchable_trgm
  ON public.product_aliases USING GIN (normalized_alias gin_trgm_ops)
  WHERE is_searchable = TRUE;

CREATE INDEX IF NOT EXISTS idx_ingredients_name_ko_trgm
  ON public.ingredients USING GIN (name_ko gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_ingredients_name_en_trgm
  ON public.ingredients USING GIN (name_en gin_trgm_ops)
  WHERE name_en IS NOT NULL;

CREATE OR REPLACE FUNCTION public.search_catalog_products(
  p_query TEXT DEFAULT '',
  p_category TEXT DEFAULT NULL,
  p_pet_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  product_id UUID,
  rank DOUBLE PRECISION
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH normalized AS (
    SELECT
      BTRIM(REGEXP_REPLACE(LOWER(COALESCE(p_query, '')), '\s+', ' ', 'g')) AS query_text,
      BTRIM(COALESCE(p_category, '')) AS category,
      LOWER(BTRIM(COALESCE(p_pet_type, ''))) AS pet_type
  ),
  parsed AS (
    SELECT
      query_text,
      category,
      pet_type,
      CASE
        WHEN query_text = '' THEN NULL::TSQUERY
        ELSE WEBSEARCH_TO_TSQUERY('simple', query_text)
      END AS text_query
    FROM normalized
  ),
  scored AS (
    SELECT
      p.id AS product_id,
      (
        -- weight: barcode 1000
        CASE
          WHEN q.query_text ~ '^\d{8,14}$'
            AND REGEXP_REPLACE(COALESCE(p.barcode, ''), '\D', '', 'g') = q.query_text
            THEN 1000
          ELSE 0
        END +
        -- weight: name 800
        CASE
          WHEN q.query_text <> '' AND LOWER(COALESCE(NULLIF(p.display_name, ''), p.name)) = q.query_text THEN 800
          WHEN q.query_text <> '' AND LEFT(LOWER(COALESCE(NULLIF(p.display_name, ''), p.name)), LENGTH(q.query_text)) = q.query_text THEN 750
          WHEN q.query_text <> '' AND STRPOS(LOWER(COALESCE(NULLIF(p.display_name, ''), p.name)), q.query_text) > 0 THEN 700
          ELSE 0
        END +
        -- weight: brand 600
        CASE
          WHEN q.query_text <> '' AND LOWER(COALESCE(p.brand_name, '')) = q.query_text THEN 600
          WHEN q.query_text <> '' AND LEFT(LOWER(COALESCE(p.brand_name, '')), LENGTH(q.query_text)) = q.query_text THEN 550
          WHEN q.query_text <> '' AND STRPOS(LOWER(COALESCE(p.brand_name, '')), q.query_text) > 0 THEN 500
          ELSE 0
        END +
        -- weight: alias 400
        CASE WHEN q.query_text <> '' AND STRPOS(COALESCE(a.alias_text, ''), q.query_text) > 0 THEN 400 ELSE 0 END +
        -- weight: ingredient 300
        CASE WHEN q.query_text <> '' AND STRPOS(COALESCE(i.ingredient_text, ''), q.query_text) > 0 THEN 300 ELSE 0 END +
        CASE
          WHEN q.text_query IS NOT NULL
            THEN TS_RANK_CD(
              TO_TSVECTOR(
                'simple'::REGCONFIG,
                p.catalog_search_text || ' ' || COALESCE(a.alias_text, '') || ' ' || COALESCE(i.ingredient_text, '')
              ),
              q.text_query
            ) * 200
          ELSE 0
        END +
        -- weight: trigram 100
        GREATEST(
          public.SIMILARITY(p.catalog_search_text, q.query_text),
          public.SIMILARITY(COALESCE(a.alias_text, ''), q.query_text),
          public.SIMILARITY(COALESCE(i.ingredient_text, ''), q.query_text)
        ) * 100
      )::DOUBLE PRECISION AS score,
      p.is_pinned,
      p.pinned_order,
      p.has_ingredients
    FROM public.products AS p
    CROSS JOIN parsed AS q
    LEFT JOIN LATERAL (
      SELECT STRING_AGG(LOWER(pa.normalized_alias), ' ') AS alias_text
      FROM public.product_aliases AS pa
      WHERE pa.product_id = p.id
        AND pa.is_searchable = TRUE
    ) AS a ON TRUE
    LEFT JOIN LATERAL (
      SELECT STRING_AGG(
        LOWER(COALESCE(ingredient.name_ko, '') || ' ' || COALESCE(ingredient.name_en, '')),
        ' '
      ) AS ingredient_text
      FROM public.product_ingredients AS link
      JOIN public.ingredients AS ingredient ON ingredient.id = link.ingredient_id
      WHERE link.product_id = p.id
    ) AS i ON TRUE
    WHERE p.is_visible = TRUE
      AND (q.category = '' OR q.category = '전체' OR p.main_category = q.category)
      AND (
        q.pet_type = '' OR
        (q.pet_type IN ('dog', 'cat') AND p.target_pet_type IN (q.pet_type, 'all')) OR
        (q.pet_type = 'all' AND p.target_pet_type = 'all')
      )
      AND (
        q.query_text = '' OR
        p.catalog_search_document @@ q.text_query OR
        TO_TSVECTOR(
          'simple'::REGCONFIG,
          COALESCE(a.alias_text, '') || ' ' || COALESCE(i.ingredient_text, '')
        ) @@ q.text_query OR
        STRPOS(p.catalog_search_text, q.query_text) > 0 OR
        STRPOS(COALESCE(a.alias_text, ''), q.query_text) > 0 OR
        STRPOS(COALESCE(i.ingredient_text, ''), q.query_text) > 0 OR
        GREATEST(
          public.SIMILARITY(p.catalog_search_text, q.query_text),
          public.SIMILARITY(COALESCE(a.alias_text, ''), q.query_text),
          public.SIMILARITY(COALESCE(i.ingredient_text, ''), q.query_text)
        ) >= 0.2
      )
  )
  SELECT product_id, score AS rank
  FROM scored
  ORDER BY
    score DESC,
    is_pinned DESC NULLS LAST,
    pinned_order ASC NULLS LAST,
    has_ingredients DESC,
    product_id ASC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 100))
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.search_catalog_products(TEXT, TEXT, TEXT, INTEGER, INTEGER)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_catalog_products(TEXT, TEXT, TEXT, INTEGER, INTEGER)
  TO anon, authenticated;

COMMIT;
