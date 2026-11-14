BEGIN;
-- A volume label does not imply a mass percentage. Keep liquid and powder
-- evidence visible without copying it into ordinary feed percentage profiles.
ALTER TABLE public.product_nutrient_evidence DROP CONSTRAINT product_nutrient_evidence_unit_check;
ALTER TABLE public.product_nutrient_evidence ADD CONSTRAINT product_nutrient_evidence_unit_check CHECK(unit IN('g/100g','mg/kg','kcal/100g','kcal/kg','g/100mL','kcal/100mL'));
ALTER TABLE public.product_nutrient_evidence DROP CONSTRAINT product_nutrient_evidence_basis_check;
ALTER TABLE public.product_nutrient_evidence ADD CONSTRAINT product_nutrient_evidence_basis_check CHECK(basis IN('as_fed','as_sold','dry_matter','per_energy','unspecified'));
ALTER TABLE public.product_nutrient_evidence ADD CONSTRAINT product_nutrient_evidence_volume_basis_check CHECK(unit NOT IN('g/100mL','kcal/100mL') OR basis='as_fed');
ALTER TABLE public.product_nutrient_evidence ADD CONSTRAINT product_nutrient_evidence_powder_unit_check CHECK(basis<>'as_sold' OR unit='g/100g');
ALTER TABLE public.product_nutrient_evidence ADD CONSTRAINT product_nutrient_evidence_volume_bound_check CHECK(unit<>'g/100mL' OR value<=1000);
CREATE OR REPLACE FUNCTION private.validate_nutrient_measurement_unit() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE dimension text; product_evidence boolean := TG_TABLE_NAME='product_nutrient_evidence';
BEGIN
 SELECT n.dimension INTO dimension FROM public.nutrient_definitions n WHERE n.code=NEW.nutrient_code;
 IF (dimension='mass' AND NEW.unit NOT IN ('g/100g','mg/kg') AND NOT(product_evidence AND NEW.unit='g/100mL'))
   OR (dimension='energy' AND NEW.unit NOT IN ('Mcal/kg','kcal/100g','kcal/kg') AND NOT(product_evidence AND NEW.unit='kcal/100mL'))
   OR (dimension='activity' AND NEW.unit<>'1000IU/kg') OR NEW.basis='per_energy'
   OR (NEW.basis='as_sold' AND NOT product_evidence) THEN
   RAISE EXCEPTION 'nutrient_unit_basis_mismatch' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.refresh_product_enrichment_queue(p_product_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE missing TEXT[];
BEGIN
  SELECT array_remove(ARRAY[
    CASE WHEN NOT (CASE WHEN EXISTS(SELECT 1 FROM public.product_ingredient_label_sets s WHERE s.product_id=p.id AND s.is_current)
      THEN EXISTS(SELECT 1 FROM public.product_ingredient_label_sets s JOIN public.product_ingredient_label_items i ON i.label_set_id=s.id
        WHERE s.product_id=p.id AND s.is_current AND i.match_status<>'ignored' AND btrim(i.raw_ingredient_text)<>'')
      ELSE EXISTS(SELECT 1 FROM public.product_ingredients i WHERE i.product_id=p.id) END) THEN 'ingredients' END,
    CASE WHEN NOT EXISTS(SELECT 1 FROM public.nutritional_profiles n WHERE n.product_id=p.id AND n.crude_protein IS NOT NULL AND n.crude_fat IS NOT NULL)
      AND NOT EXISTS(SELECT 1 FROM public.product_nutrient_evidence e JOIN public.product_nutrient_evidence f ON f.product_id=e.product_id AND f.source_url=e.source_url AND f.source_version=e.source_version AND f.unit=e.unit AND f.basis=e.basis
        WHERE e.product_id=p.id AND e.nutrient_code='protein' AND f.nutrient_code='fat' AND ((e.unit='g/100mL' AND e.basis='as_fed') OR (e.unit='g/100g' AND e.basis='as_sold')))
      AND NOT EXISTS(SELECT 1 FROM (SELECT o.extracted_data FROM public.product_observations o WHERE o.product_id=p.id AND o.source_type='manufacturer'
        ORDER BY o.retrieved_at DESC,o.created_at DESC LIMIT 1) latest
        WHERE NULLIF(btrim(latest.extracted_data->>'dryMatterText'),'') IS NOT NULL) THEN 'nutrition' END,
    CASE WHEN NOT EXISTS(SELECT 1 FROM public.product_barcodes b WHERE b.product_id=p.id) THEN 'barcode' END,
    CASE WHEN NULLIF(btrim(p.image_url),'') IS NULL THEN 'image' END
  ]::TEXT[],NULL) INTO missing FROM public.products p WHERE p.id=p_product_id;
  IF NOT FOUND THEN RETURN; END IF;
  INSERT INTO public.product_enrichment_queue(product_id,status,missing_fields)
    VALUES(p_product_id,CASE WHEN cardinality(missing)=0 THEN 'ready_for_review' ELSE 'pending' END,missing)
    ON CONFLICT(product_id) DO UPDATE SET missing_fields=EXCLUDED.missing_fields,status=CASE
      WHEN cardinality(EXCLUDED.missing_fields)=0 AND product_enrichment_queue.status IN ('pending','in_progress') THEN 'ready_for_review'
      WHEN cardinality(EXCLUDED.missing_fields)>0 AND product_enrichment_queue.status IN ('ready_for_review','completed') THEN 'pending'
      ELSE product_enrichment_queue.status END,updated_at=now();
END;
$$;
REVOKE ALL ON FUNCTION public.refresh_product_enrichment_queue(UUID) FROM PUBLIC,anon,authenticated;
CREATE TRIGGER nutrient_evidence_sync_enrichment_queue AFTER INSERT OR UPDATE OR DELETE ON public.product_nutrient_evidence
 FOR EACH ROW EXECUTE FUNCTION public.sync_product_enrichment_queue();
-- A profile is an operational projection, not a new manufacturer's measurement.
-- Do not attribute a foreign official value to the product's Korean PDP URL.
CREATE OR REPLACE FUNCTION private.sync_product_nutrient_evidence() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE pid uuid; source text; profile jsonb;
BEGIN
 pid:=CASE WHEN TG_OP='DELETE' THEN OLD.product_id ELSE NEW.product_id END;
 DELETE FROM public.product_nutrient_evidence WHERE product_id=pid AND source_version='profile-projection-v1';
 IF TG_OP='DELETE' THEN RETURN NULL; END IF;
 SELECT catalog_source_url INTO source FROM public.products WHERE id=pid;
 IF source IS NULL OR source !~ '^https://' THEN RETURN NULL; END IF;
 profile:=to_jsonb(NEW);
 INSERT INTO public.product_nutrient_evidence(product_id,nutrient_code,value,unit,basis,qualifier,source_url,source_version,source_locator)
 SELECT pid,m.code,(profile->>m.field)::numeric,'g/100g','as_fed','unspecified',source,'profile-projection-v1','nutritional_profiles.'||m.field
 FROM (VALUES('protein','crude_protein'),('fat','crude_fat'),('crude_fiber','crude_fiber'),('ash','crude_ash'),
   ('moisture','moisture'),('calcium','calcium'),('phosphorus','phosphorus'))m(code,field)
 WHERE profile->>m.field IS NOT NULL AND (profile->>m.field)::numeric BETWEEN 0 AND 100
 AND NOT EXISTS(SELECT 1 FROM public.product_nutrient_evidence e WHERE e.product_id=pid AND e.nutrient_code=m.code
   AND e.value=(profile->>m.field)::numeric AND e.unit='g/100g' AND e.basis='as_fed' AND e.source_version<>'profile-projection-v1');
 RETURN NULL;
END $$;
CREATE FUNCTION private.discard_duplicate_profile_projection() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.source_version<>'profile-projection-v1' THEN
  DELETE FROM public.product_nutrient_evidence e WHERE e.product_id=NEW.product_id AND e.source_version='profile-projection-v1'
   AND e.nutrient_code=NEW.nutrient_code AND e.value=NEW.value AND e.unit=NEW.unit AND e.basis=NEW.basis;
 END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION private.discard_duplicate_profile_projection() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER discard_duplicate_profile_projection AFTER INSERT OR UPDATE ON public.product_nutrient_evidence
 FOR EACH ROW EXECUTE FUNCTION private.discard_duplicate_profile_projection();
COMMIT;
