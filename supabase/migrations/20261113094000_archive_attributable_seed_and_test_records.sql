BEGIN;
SET LOCAL statement_timeout='120s'; SET LOCAL lock_timeout='5s';
ALTER TABLE private.catalog_record_archive DROP CONSTRAINT catalog_record_archive_category_check;
ALTER TABLE private.catalog_record_archive ADD CONSTRAINT catalog_record_archive_category_check
 CHECK(category IN('historical_synthetic','manufacturer_directory_not_sku','application_seed_fixture','manual_test_record'));
COMMENT ON TABLE private.catalog_record_archive IS 'Original records and related evidence preserved separately from operational products under the user-requested archival policy. Archival is not evidence completion.';
DO $archive$
DECLARE r jsonb; p public.products%ROWTYPE; note text;
BEGIN
 FOR r IN SELECT value FROM jsonb_array_elements('[
  {"id":"00000000-0000-0000-0000-000000000001","name":"조인트 케어 무첨가 건강사료","brand":"베로밀","category":"application_seed_fixture","provenance":"veroheart_full_init.sql:148 seed"},
  {"id":"00000000-0000-0000-0000-000000000002","name":"데일리 치킨 스낵 밀","brand":"냠냠펫","category":"application_seed_fixture","provenance":"veroheart_full_init.sql:149 seed"},
  {"id":"00000000-0000-0000-0000-000000000003","name":"슈퍼 유산균 덴탈츄","brand":"퍼피본","category":"application_seed_fixture","provenance":"veroheart_full_init.sql:150 seed"},
  {"id":"00000000-0000-0000-0000-000000000101","name":"어덜트 치킨 위드 라이스","brand":"내추럴발란스","category":"application_seed_fixture","provenance":"commit 69de2f9 real_ingredients_data.sql:88, ADDITIONAL PRODUCTS FOR REALISTIC DATA, Unsplash animal photo"},
  {"id":"00000000-0000-0000-0000-000000000102","name":"고메 연어 스테이크","brand":"시저","category":"application_seed_fixture","provenance":"commit 69de2f9 real_ingredients_data.sql:89, ADDITIONAL PRODUCTS FOR REALISTIC DATA, Unsplash animal photo"},
  {"id":"00000000-0000-0000-0000-000000000103","name":"인도어 7+ 노령묘 사료","brand":"로얄캐닌","category":"application_seed_fixture","provenance":"commit 69de2f9 real_ingredients_data.sql:90, ADDITIONAL PRODUCTS FOR REALISTIC DATA, Unsplash animal photo"},
  {"id":"00000000-0000-0000-0000-000000000104","name":"동결건조 북어 트릿","brand":"펫프렌즈","category":"application_seed_fixture","provenance":"commit 69de2f9 real_ingredients_data.sql:91, ADDITIONAL PRODUCTS FOR REALISTIC DATA, Unsplash animal photo"},
  {"id":"00000000-0000-0000-0000-000000000105","name":"피부케어 힙앤조인트","brand":"웰츠","category":"application_seed_fixture","provenance":"commit 69de2f9 real_ingredients_data.sql:92, ADDITIONAL PRODUCTS FOR REALISTIC DATA, Unsplash animal photo"},
  {"id":"2b8d3f9a-99cd-4c53-8068-ac981725d603","name":"테스트","brand":"df","category":"manual_test_record","provenance":"manual test: name 테스트, brand/formulation df, all seven nutritional fields 34, price 712315, no official source"},
  {"id":"9c86f6e0-79af-4eb3-9c8a-5565ca314c9e","name":"테스트테스트","brand":"테스트테스트","category":"manual_test_record","provenance":"manual test: name and brand 테스트테스트, no product image or manufacturer source"}
 ]'::jsonb) LOOP
  SELECT * INTO p FROM public.products WHERE id=(r->>'id')::uuid FOR UPDATE;
  IF NOT FOUND THEN CONTINUE; END IF;
  IF p.name IS DISTINCT FROM r->>'name' OR p.brand_name IS DISTINCT FROM r->>'brand' OR p.is_visible IS DISTINCT FROM false OR p.catalog_source_url IS NOT NULL OR p.catalog_archived_at IS NOT NULL THEN
   RAISE EXCEPTION 'Seed/test archival identity changed: %',r->>'id';
  END IF;
  note:='초기 앱 시드·수동 테스트 원본 기록. 생성 근거: '||(r->>'provenance')||'. 공식 제품·규격의 근거로 사용할 수 없어 원본과 누락 항목을 보존해 별도 보관합니다. 정보 보완 완료가 아닙니다.';
  INSERT INTO private.catalog_record_archive(product_id,category,reason,before_product,before_queue,related_evidence)
   SELECT p.id,r->>'category',note,to_jsonb(p),(SELECT to_jsonb(q)FROM public.product_enrichment_queue q WHERE product_id=p.id),jsonb_build_object(
    'provenance',r->>'provenance','ingredient_links',(SELECT COALESCE(jsonb_agg(i),'[]')FROM public.product_ingredients i WHERE product_id=p.id),
    'nutrition',(SELECT COALESCE(jsonb_agg(n),'[]')FROM public.nutritional_profiles n WHERE product_id=p.id),
    'observations',(SELECT COALESCE(jsonb_agg(o),'[]')FROM public.product_observations o WHERE product_id=p.id),
    'barcodes',(SELECT COALESCE(jsonb_agg(b),'[]')FROM public.product_barcodes b WHERE product_id=p.id),
    'sources',(SELECT COALESCE(jsonb_agg(s),'[]')FROM public.product_data_sources s WHERE product_id=p.id),
    'label_sets',(SELECT COALESCE(jsonb_agg(s),'[]')FROM public.product_ingredient_label_sets s WHERE product_id=p.id),
    'label_items',(SELECT COALESCE(jsonb_agg(i),'[]')FROM public.product_ingredient_label_items i JOIN public.product_ingredient_label_sets s ON s.id=i.label_set_id WHERE s.product_id=p.id));
  UPDATE public.products SET catalog_archived_at=now(),catalog_archive_reason=note WHERE id=p.id;
 END LOOP;
END $archive$;
COMMIT;
