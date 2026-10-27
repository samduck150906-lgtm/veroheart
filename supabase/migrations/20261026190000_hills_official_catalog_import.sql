BEGIN;

-- Keep the existing Royal Canin key/index stable while adding a distinct namespace.
CREATE UNIQUE INDEX IF NOT EXISTS products_hills_official_catalog_key
  ON public.products(canonical_product_key)
  WHERE canonical_product_key LIKE 'hills-kr:%';

CREATE OR REPLACE FUNCTION public.import_official_catalog_product(p_source JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_key TEXT;
  v_namespace TEXT;
  v_source_id TEXT;
  v_brand TEXT;
  v_name TEXT;
  v_species TEXT;
  v_url TEXT;
  v_identity TEXT;
  v_veterinary BOOLEAN;
  v_id UUID;
  v_matches UUID[];
  v_created BOOLEAN := FALSE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501'; END IF;
  v_name := btrim(p_source->>'name');
  v_species := p_source->>'species';
  v_url := p_source->>'sourceUrl';
  v_brand := p_source->>'brand';
  v_source_id := p_source->>'sourceProductId';

  IF v_brand = '로얄캐닌'
    AND COALESCE(v_source_id, '') ~ '^\d+$'
    AND COALESCE(v_url, '') ~ '^https://www\.royalcanin\.com/kr/(dogs|cats)/products/(retail-products|vet-products)/[^/?#]+(/v[0-9]+)?$'
  THEN
    v_namespace := 'royalcanin-kr';
    v_veterinary := v_url LIKE '%/vet-products/%';
  ELSIF v_brand = '힐스'
    AND COALESCE(v_url, '') ~ '^https://www\.hillspet\.co\.kr/(dog|cat)-food/(prescription|science)-diet-[a-z0-9-]+$'
    AND v_source_id = regexp_replace(v_url, '^.*/', '')
    AND (v_species = substring(v_url FROM '/(dog|cat)-food/')
      OR (v_species = 'all' AND v_source_id = 'prescription-diet-ad-urgent-care-canned'))
  THEN
    v_namespace := 'hills-kr';
    v_veterinary := v_source_id LIKE 'prescription-diet-%';
  ELSE
    RAISE EXCEPTION 'invalid_manufacturer_evidence' USING ERRCODE = '22023';
  END IF;

  IF v_name IS NULL OR length(v_name) NOT BETWEEN 1 AND 200 OR v_name ~ '인천 공개|제조회사|미취급 정보'
    OR (p_source->>'sourceType') IS DISTINCT FROM 'manufacturer'
    OR COALESCE(v_species, '') NOT IN ('dog','cat','all')
    OR COALESCE(p_source->>'productType', '') NOT IN ('food','snack')
    OR NULLIF(btrim(p_source->>'sourceCaveat'), '') IS NULL
    OR NULLIF(p_source->>'retrievedAt', '') IS NULL
  THEN RAISE EXCEPTION 'invalid_manufacturer_evidence' USING ERRCODE = '22023'; END IF;

  v_key := v_namespace || ':' || v_source_id || ':' || v_species;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_key, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('manufacturer-url:' || v_url, 0));
  v_identity := regexp_replace(replace(lower(v_name), lower(v_brand), ''), '[^0-9a-z가-힣]', '', 'g');
  PERFORM pg_advisory_xact_lock(hashtextextended(v_namespace || ':' || v_species || ':' || v_identity, 0));
  -- First imports may link to a manually managed row without replacing its key.
  -- Its manufacturer observation remains the identity anchor after a name edit.
  -- Check all anchors together so a conflicting canonical key cannot override it.
  SELECT array_agg(DISTINCT matched.product_id) INTO v_matches FROM (
    SELECT id AS product_id FROM public.products WHERE canonical_product_key = v_key
    UNION
    SELECT observation.product_id FROM public.product_observations AS observation
    JOIN public.products AS product ON product.id = observation.product_id
    WHERE observation.source_type = 'manufacturer'
      AND (observation.source_url = v_url OR (
        observation.extracted_data->>'sourceProductId' = v_source_id
        AND observation.extracted_data->>'species' = v_species
        AND observation.extracted_data->>'brand' = v_brand
        AND ((v_namespace = 'royalcanin-kr' AND observation.source_url ~ '^https://www\.royalcanin\.com/kr/')
          OR (v_namespace = 'hills-kr' AND observation.source_url ~ '^https://www\.hillspet\.co\.kr/(dog|cat)-food/'))
      ))
  ) AS matched;
  IF cardinality(v_matches) > 1 THEN RETURN jsonb_build_object('status','needs_review','reason','conflicting_source_identity'); END IF;
  IF cardinality(v_matches) = 1 THEN v_id := v_matches[1]; END IF;
  IF v_id IS NULL THEN
    SELECT array_agg(id) INTO v_matches FROM public.products
    WHERE brand_name = v_brand AND target_pet_type::TEXT = v_species
      AND regexp_replace(replace(lower(name), lower(v_brand), ''), '[^0-9a-z가-힣]', '', 'g') = v_identity;
    IF cardinality(v_matches) > 1 THEN RETURN jsonb_build_object('status','needs_review','reason','duplicate_identity'); END IF;
    IF cardinality(v_matches) = 1 THEN v_id := v_matches[1]; END IF;
  END IF;
  IF v_id IS NULL THEN
    -- Publish identity only; label facts require their own verified evidence.
    INSERT INTO public.products (name, display_name, brand_name, product_type, main_category,
      target_pet_type, catalog_source, analysis_status, verification_status, is_visible,
      canonical_product_key, slug, catalog_source_url, catalog_source_note, requires_veterinary_guidance)
    VALUES (v_name, v_name, v_brand, p_source->>'productType',
      CASE WHEN p_source->>'productType'='snack' THEN '간식' ELSE '사료' END,
      v_species, 'external', 'unavailable', 'pending', TRUE,
      v_key, v_namespace || '-' || v_source_id || '-' || v_species,
      v_url, p_source->>'sourceCaveat', v_veterinary)
    RETURNING id INTO v_id;
    v_created := TRUE;
  END IF;
  -- Existing products are never updated, even when hidden or already verified.
  IF NOT EXISTS (SELECT 1 FROM public.product_observations WHERE product_id=v_id AND source_type='manufacturer'
      AND source_url=v_url AND extracted_data->>'sourceHash' IS NOT DISTINCT FROM p_source->>'sourceHash') THEN
    INSERT INTO public.product_observations (product_id,source_type,source_url,source_title,retrieved_at,
      raw_name,raw_brand,raw_label_text,extracted_data,is_current)
    VALUES (v_id,'manufacturer',v_url,COALESCE(NULLIF(p_source->>'sourceTitle',''),v_name),(p_source->>'retrievedAt')::TIMESTAMPTZ,
      v_name,v_brand,p_source->>'ingredientsText',p_source,FALSE);
  END IF;
  RETURN jsonb_build_object('status',CASE WHEN v_created THEN 'created' ELSE 'linked' END,'productId',v_id);
END;
$$;
REVOKE ALL ON FUNCTION public.import_official_catalog_product(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_official_catalog_product(JSONB) TO service_role;

COMMIT;
