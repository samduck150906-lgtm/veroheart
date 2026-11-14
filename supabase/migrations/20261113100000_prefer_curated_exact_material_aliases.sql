BEGIN;
SET LOCAL statement_timeout='120s'; SET LOCAL lock_timeout='5s';
CREATE TABLE private.preferred_material_alias_audit(run_id text PRIMARY KEY,before_aliases jsonb NOT NULL,after_aliases jsonb,before_items jsonb NOT NULL,after_items jsonb,source_note text NOT NULL,captured_at timestamptz NOT NULL DEFAULT now());
REVOKE ALL ON private.preferred_material_alias_audit FROM PUBLIC,anon,authenticated,service_role;
INSERT INTO private.preferred_material_alias_audit(run_id,before_aliases,before_items,source_note)
 SELECT 'official-label-aliases-20261113',COALESCE((SELECT jsonb_agg(a)FROM public.canonical_ingredient_aliases a),'[]'),COALESCE((SELECT jsonb_agg(i)FROM public.product_ingredient_label_items i JOIN public.product_ingredient_label_sets l ON l.id=i.label_set_id WHERE l.is_current),'[]'),
 'Whole-term English/Korean identity synonyms used in captured official Hill''s, Wealtz and Inaba labels. No processing words, quantities, species or medical approval inferred. Existing canonical definitions/risk classifications are preserved.';
CREATE OR REPLACE FUNCTION private.match_material_label_item() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE ids uuid[]; full_text text; base_text text;
BEGIN
 IF NEW.match_status='ignored' THEN RETURN NEW; END IF;
 -- Preserve explicit existing resolutions unless the label itself changed or
 -- its definition was retired. Never trust a caller-supplied normalized string.
 IF NEW.match_status='matched' AND (TG_OP='INSERT' OR NEW.raw_ingredient_text IS NOT DISTINCT FROM OLD.raw_ingredient_text)
   AND (EXISTS(SELECT 1 FROM public.canonical_ingredients WHERE id=NEW.canonical_ingredient_id AND status='active')
     OR (NEW.canonical_ingredient_id IS NULL AND EXISTS(SELECT 1 FROM public.ingredients
       WHERE id=NEW.legacy_ingredient_id AND risk_level::text IN ('safe','caution','warning','danger')))) THEN RETURN NEW; END IF;
 full_text:=regexp_replace(NEW.raw_ingredient_text,'[0-9]+(\.[0-9]+)?\s*%','','g');
 base_text:=private.material_base_text(NEW.raw_ingredient_text);
 -- An explicit preferred registry alias outranks duplicate generated English
 -- names. Only exact whole terms participate; processing words are not removed.
 SELECT array_agg(DISTINCT a.canonical_ingredient_id) INTO ids
 FROM public.canonical_ingredient_aliases a JOIN public.canonical_ingredients c ON c.id=a.canonical_ingredient_id
 WHERE a.is_preferred AND c.status='active' AND private.material_identity_strict_key(a.alias_text)=private.material_identity_strict_key(full_text);
 IF ids IS NULL THEN SELECT array_agg(canonical_id ORDER BY canonical_id) INTO ids FROM private.material_identity_terms
   WHERE term='strict:'||private.material_identity_strict_key(full_text); END IF;
 IF ids IS NULL THEN SELECT array_agg(canonical_id ORDER BY canonical_id) INTO ids FROM private.material_identity_terms
   WHERE term='loose:'||private.material_identity_key(full_text); END IF;
 IF ids IS NULL THEN SELECT array_agg(DISTINCT a.canonical_ingredient_id) INTO ids
 FROM public.canonical_ingredient_aliases a JOIN public.canonical_ingredients c ON c.id=a.canonical_ingredient_id
 WHERE a.is_preferred AND c.status='active' AND private.material_identity_strict_key(a.alias_text)=private.material_identity_strict_key(base_text); END IF;
 IF ids IS NULL THEN SELECT array_agg(canonical_id ORDER BY canonical_id) INTO ids FROM private.material_identity_terms
   WHERE term='strict:'||private.material_identity_strict_key(base_text); END IF;
 IF ids IS NULL THEN SELECT array_agg(canonical_id ORDER BY canonical_id) INTO ids FROM private.material_identity_terms
   WHERE term='loose:'||private.material_identity_key(base_text); END IF;
 NEW.normalized_ingredient_text:=private.material_identity_key(base_text);
 NEW.canonical_ingredient_id:=CASE WHEN cardinality(ids)=1 THEN ids[1] END;
 NEW.legacy_ingredient_id:=NULL;
 NEW.match_status:=CASE WHEN cardinality(ids)=1 THEN 'matched' WHEN cardinality(ids)>1 THEN 'ambiguous' ELSE 'unmatched' END;
 NEW.match_confidence:=CASE WHEN cardinality(ids)=1 THEN 1 END;
 NEW.parser_metadata:=coalesce(NEW.parser_metadata,'{}')||jsonb_build_object('identityEngine','exact-material-v1','candidateCanonicalIds',coalesce(to_jsonb(ids),'[]'));
 RETURN NEW;
END $$;

INSERT INTO public.canonical_ingredient_aliases(canonical_ingredient_id,alias_text,normalized_alias,language_code,alias_type,is_preferred)
 SELECT c.id,r.alias,public.normalize_ingredient_identity(r.alias),r.language,'label',true
 FROM jsonb_to_recordset($aliases$[{"alias": "Water", "canonical": "물", "language": "en"}, {"alias": "Chicken Fat", "canonical": "닭지방", "language": "en"}, {"alias": "Chicken Meal", "canonical": "계육분", "language": "en"}, {"alias": "Chicken Broth", "canonical": "닭육수", "language": "en"}, {"alias": "Fish Oil", "canonical": "어유", "language": "en"}, {"alias": "Dicalcium Phosphate", "canonical": "인산이칼슘", "language": "en"}, {"alias": "Calcium Carbonate", "canonical": "탄산칼슘", "language": "en"}, {"alias": "Wheat Flour", "canonical": "밀가루", "language": "en"}, {"alias": "Flaxseed", "canonical": "아마씨", "language": "en"}, {"alias": "Brown Rice", "canonical": "현미", "language": "en"}, {"alias": "Minerals", "canonical": "미네랄", "language": "en"}, {"alias": "Mixed Tocopherols", "canonical": "혼합 토코페롤", "language": "en"}, {"alias": "L-Lysine", "canonical": "L-라이신", "language": "en"}, {"alias": "Fructooligosaccharides", "canonical": "프락토올리고당", "language": "en"}, {"alias": "Powdered Cellulose", "canonical": "셀룰로오스 분말", "language": "en"}, {"alias": "Carrots", "canonical": "당근", "language": "en"}, {"alias": "Potatoes", "canonical": "감자", "language": "en"}, {"alias": "Salt", "canonical": "소금", "language": "en"}, {"alias": "Dried Beet Pulp", "canonical": "건조 비트 펄프", "language": "en"}, {"alias": "Mixed Tocopherols for freshness", "canonical": "혼합 토코페롤", "language": "en"}, {"alias": "아마종실", "canonical": "아마씨", "language": "ko"}, {"alias": "미네랄류", "canonical": "미네랄", "language": "ko"}, {"alias": "천연 닭기름", "canonical": "닭지방", "language": "ko"}]$aliases$::jsonb)r(alias text,canonical text,language text)
 JOIN public.canonical_ingredients c ON c.canonical_name_ko=r.canonical AND c.status='active'
 ON CONFLICT(normalized_alias,language_code)DO UPDATE SET canonical_ingredient_id=EXCLUDED.canonical_ingredient_id,alias_text=EXCLUDED.alias_text,is_preferred=true;
SELECT private.reconcile_material_terms(ARRAY(SELECT DISTINCT 'strict:'||private.material_identity_strict_key(alias_text)FROM public.canonical_ingredient_aliases WHERE is_preferred));
UPDATE private.preferred_material_alias_audit SET after_aliases=(SELECT jsonb_agg(a)FROM public.canonical_ingredient_aliases a),after_items=(SELECT jsonb_agg(i)FROM public.product_ingredient_label_items i JOIN public.product_ingredient_label_sets l ON l.id=i.label_set_id WHERE l.is_current)WHERE run_id='official-label-aliases-20261113';
COMMIT;
