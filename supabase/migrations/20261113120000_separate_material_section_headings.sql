BEGIN;
CREATE OR REPLACE FUNCTION private.material_base_text(v text) RETURNS text
LANGUAGE plpgsql IMMUTABLE STRICT SET search_path='' AS $$
DECLARE ch text; depth integer:=0; result text:='';
BEGIN
 FOREACH ch IN ARRAY regexp_split_to_array(normalize(v,NFKC),'') LOOP
   IF ch IN ('(','[','{','【') THEN depth:=depth+1;
   ELSIF ch IN (')',']','}','】') THEN depth:=greatest(0,depth-1);
   ELSIF depth=0 THEN result:=result||ch; END IF;
 END LOOP;
 -- A source section heading is metadata, never part of the first material.
 -- Require a colon and preserve every processing/species/part word after it.
 result:=regexp_replace(result,'^[[:space:]]*(composition|ingredients|원재료|사용원료|원료|zusammensetzung)[[:space:]]*[:：][[:space:]]*','','i');
 RETURN btrim(regexp_replace(regexp_replace(result,'[0-9]+(\.[0-9]+)?\s*%','','g'),'\s*(등|외)\s*$',''));
END $$;
CREATE TABLE private.material_section_heading_corrections(
 label_item_id uuid PRIMARY KEY,before_item jsonb NOT NULL,after_item jsonb,
 captured_at timestamptz NOT NULL DEFAULT now());
REVOKE ALL ON private.material_section_heading_corrections FROM PUBLIC,anon,authenticated,service_role;
INSERT INTO private.material_section_heading_corrections(label_item_id,before_item)
 SELECT i.id,to_jsonb(i) FROM public.product_ingredient_label_items i
 JOIN public.product_ingredient_label_sets l ON l.id=i.label_set_id AND l.is_current
 JOIN public.products p ON p.id=l.product_id AND p.catalog_archived_at IS NULL
 WHERE i.raw_ingredient_text ~* '^[[:space:]]*(composition|ingredients|원재료|사용원료|원료|zusammensetzung)[[:space:]]*[:：]'
 AND i.match_status<>'ignored' AND(i.match_status<>'matched' OR i.parser_metadata->>'identityEngine'='exact-material-v1');
UPDATE public.product_ingredient_label_items i SET match_status='unreviewed',canonical_ingredient_id=NULL,legacy_ingredient_id=NULL
 FROM private.material_section_heading_corrections a WHERE i.id=a.label_item_id AND to_jsonb(i)=a.before_item;
UPDATE private.material_section_heading_corrections a SET after_item=to_jsonb(i)
 FROM public.product_ingredient_label_items i WHERE i.id=a.label_item_id;
COMMIT;
