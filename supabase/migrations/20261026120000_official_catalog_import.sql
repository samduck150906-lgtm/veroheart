BEGIN;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS catalog_source_url TEXT,
  ADD COLUMN IF NOT EXISTS catalog_source_note TEXT,
  ADD COLUMN IF NOT EXISTS requires_veterinary_guidance BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS products_official_catalog_key
  ON public.products(canonical_product_key)
  WHERE canonical_product_key LIKE 'royalcanin-kr:%';

CREATE OR REPLACE FUNCTION public.import_official_catalog_product(p_source JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_key TEXT;
  v_name TEXT;
  v_species TEXT;
  v_url TEXT;
  v_identity TEXT;
  v_id UUID;
  v_matches UUID[];
  v_created BOOLEAN := FALSE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501'; END IF;
  v_name := btrim(p_source->>'name');
  v_species := p_source->>'species';
  v_url := p_source->>'sourceUrl';
  IF v_name IS NULL OR length(v_name) NOT BETWEEN 1 AND 200 OR v_name ~ '인천 공개|제조회사|미취급 정보'
    OR (p_source->>'brand') IS DISTINCT FROM '로얄캐닌'
    OR (p_source->>'sourceType') IS DISTINCT FROM 'manufacturer'
    OR COALESCE(p_source->>'sourceProductId', '') !~ '^\d+$'
    OR COALESCE(v_species, '') NOT IN ('dog','cat','all')
    OR COALESCE(p_source->>'productType', '') NOT IN ('food','snack')
    OR COALESCE(v_url, '') !~ '^https://www\.royalcanin\.com/kr/(dogs|cats)/products/(retail-products|vet-products)/[^/?#]+(/v[0-9]+)?$'
    OR NULLIF(btrim(p_source->>'sourceCaveat'), '') IS NULL
  THEN RAISE EXCEPTION 'invalid_manufacturer_evidence' USING ERRCODE = '22023'; END IF;
  v_key := 'royalcanin-kr:' || (p_source->>'sourceProductId') || ':' || v_species;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_key, 0));
  v_identity := regexp_replace(replace(lower(v_name), '로얄캐닌', ''), '[^0-9a-z가-힣]', '', 'g');
  PERFORM pg_advisory_xact_lock(hashtextextended('royalcanin:' || v_species || ':' || v_identity, 0));
  SELECT id INTO v_id FROM public.products WHERE canonical_product_key = v_key LIMIT 1;
  IF v_id IS NULL THEN
    SELECT array_agg(id) INTO v_matches FROM public.products
    WHERE brand_name = '로얄캐닌' AND target_pet_type::TEXT = v_species
      AND regexp_replace(replace(lower(name), '로얄캐닌', ''), '[^0-9a-z가-힣]', '', 'g') = v_identity;
    IF cardinality(v_matches) > 1 THEN RETURN jsonb_build_object('status','needs_review','reason','duplicate_identity'); END IF;
    IF cardinality(v_matches) = 1 THEN v_id := v_matches[1]; END IF;
  END IF;
  IF v_id IS NULL THEN
    -- Only identity is published. No invented risk scores, label claims,
    -- package-specific barcode, calories or verification status are seeded.
    INSERT INTO public.products (name, display_name, brand_name, product_type, main_category,
      target_pet_type, catalog_source, analysis_status, verification_status, is_visible,
      canonical_product_key, slug, catalog_source_url, catalog_source_note, requires_veterinary_guidance)
    VALUES (v_name, v_name, '로얄캐닌', p_source->>'productType',
      CASE WHEN p_source->>'productType'='snack' THEN '간식' ELSE '사료' END,
      v_species, 'external', 'unavailable', 'pending', TRUE,
      v_key, 'royalcanin-kr-' || (p_source->>'sourceProductId') || '-' || v_species,
      v_url, p_source->>'sourceCaveat', v_url LIKE '%/vet-products/%')
    RETURNING id INTO v_id;
    v_created := TRUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.product_observations WHERE product_id=v_id AND source_type='manufacturer'
      AND source_url=v_url AND extracted_data->>'sourceHash' IS NOT DISTINCT FROM p_source->>'sourceHash') THEN
    INSERT INTO public.product_observations (product_id,source_type,source_url,source_title,retrieved_at,
      raw_name,raw_brand,raw_label_text,extracted_data,is_current)
    VALUES (v_id,'manufacturer',v_url,v_name,(p_source->>'retrievedAt')::TIMESTAMPTZ,
      v_name,'로얄캐닌',p_source->>'ingredientsText',p_source,FALSE);
  END IF;
  RETURN jsonb_build_object('status',CASE WHEN v_created THEN 'created' ELSE 'linked' END,'productId',v_id);
END;
$$;
REVOKE ALL ON FUNCTION public.import_official_catalog_product(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_official_catalog_product(JSONB) TO service_role;

COMMIT;
