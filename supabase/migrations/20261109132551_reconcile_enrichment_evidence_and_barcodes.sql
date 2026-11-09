BEGIN;
CREATE OR REPLACE FUNCTION private.valid_gtin(value TEXT) RETURNS BOOLEAN
LANGUAGE SQL IMMUTABLE SET search_path='' AS $$
  SELECT CASE WHEN value ~ '^[0-9]+$' AND value !~ '^0+$' AND length(value) IN (8,13,14) THEN
    (SELECT mod(10-mod(sum(substr(value,i,1)::INT * CASE WHEN (length(value)-i)%2=1 THEN 3 ELSE 1 END),10),10)
     FROM generate_series(1,length(value)-1) i)=right(value,1)::INT ELSE FALSE END;
$$;
REVOKE ALL ON FUNCTION private.valid_gtin(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.valid_gtin(TEXT) TO service_role;
CREATE TABLE public.product_barcodes (
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  barcode TEXT NOT NULL CHECK (private.valid_gtin(barcode)),
  source_url TEXT,
  source_observation_id UUID REFERENCES public.product_observations(id) ON DELETE SET NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(product_id,barcode)
);
CREATE INDEX product_barcodes_lookup ON public.product_barcodes(barcode);
ALTER TABLE public.product_barcodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY product_barcodes_public_read ON public.product_barcodes FOR SELECT TO anon,authenticated
  USING(EXISTS(SELECT 1 FROM public.products p WHERE p.id=product_barcodes.product_id));
REVOKE ALL ON public.product_barcodes FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.product_barcodes TO anon,authenticated;
GRANT ALL ON public.product_barcodes TO service_role;

CREATE OR REPLACE FUNCTION private.sync_primary_product_barcode() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE normalized TEXT;
BEGIN
  DELETE FROM public.product_barcodes WHERE product_id=NEW.id AND is_primary AND source_url IS NULL;
  UPDATE public.product_barcodes SET is_primary=FALSE WHERE product_id=NEW.id AND is_primary;
  normalized:=CASE WHEN length(NEW.barcode)=12 THEN '0'||NEW.barcode ELSE NEW.barcode END;
  IF private.valid_gtin(normalized) THEN
    INSERT INTO public.product_barcodes(product_id,barcode,is_primary) VALUES(NEW.id,normalized,TRUE)
      ON CONFLICT(product_id,barcode) DO UPDATE SET is_primary=TRUE;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.sync_primary_product_barcode() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER products_sync_primary_barcode AFTER INSERT OR UPDATE OF barcode ON public.products
  FOR EACH ROW EXECUTE FUNCTION private.sync_primary_product_barcode();
INSERT INTO public.product_barcodes(product_id,barcode,is_primary)
  SELECT id,CASE WHEN length(barcode)=12 THEN '0'||barcode ELSE barcode END,TRUE FROM public.products
  WHERE private.valid_gtin(CASE WHEN length(barcode)=12 THEN '0'||barcode ELSE barcode END);

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
DROP TRIGGER nutritional_profiles_sync_enrichment_queue ON public.nutritional_profiles;
CREATE TRIGGER nutritional_profiles_sync_enrichment_queue AFTER INSERT OR UPDATE OR DELETE ON public.nutritional_profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_enrichment_queue();
CREATE TRIGGER product_barcodes_sync_enrichment_queue AFTER INSERT OR UPDATE OR DELETE ON public.product_barcodes
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_enrichment_queue();
CREATE TRIGGER label_sets_sync_enrichment_queue AFTER INSERT OR UPDATE OR DELETE ON public.product_ingredient_label_sets
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_enrichment_queue();
CREATE TRIGGER observations_sync_enrichment_queue AFTER INSERT OR UPDATE OR DELETE ON public.product_observations
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_enrichment_queue();
CREATE OR REPLACE FUNCTION private.sync_label_item_enrichment() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target UUID;
BEGIN
  SELECT product_id INTO target FROM public.product_ingredient_label_sets WHERE id=CASE WHEN TG_OP='DELETE' THEN OLD.label_set_id ELSE NEW.label_set_id END;
  PERFORM public.refresh_product_enrichment_queue(target);
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.sync_label_item_enrichment() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER label_items_sync_enrichment_queue AFTER INSERT OR UPDATE OR DELETE ON public.product_ingredient_label_items
  FOR EACH ROW EXECUTE FUNCTION private.sync_label_item_enrichment();
SELECT public.refresh_product_enrichment_queue(id) FROM public.products;
COMMIT;
