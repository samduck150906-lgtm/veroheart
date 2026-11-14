-- Quantitative material references use the same canonical identity and nutrient
-- master as qualitative constituent edges. They are never product guarantees.
CREATE TABLE public.material_nutrient_references (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 canonical_ingredient_id uuid NOT NULL REFERENCES public.canonical_ingredients(id) ON DELETE CASCADE,
 nutrient_code text NOT NULL REFERENCES public.nutrient_definitions(code),
 value numeric NOT NULL CHECK(value>=0 AND value::text NOT IN ('NaN','Infinity','-Infinity')),
 unit text NOT NULL CHECK(unit IN ('g/100g','mg/kg','Mcal/kg','1000IU/kg')),
 basis text NOT NULL CHECK(basis IN ('as_fed','dry_matter')),
 source_url text NOT NULL CHECK(source_url ~ '^https://'), source_version text NOT NULL,
 source_sha256 text NOT NULL CHECK(source_sha256 ~ '^[a-f0-9]{64}$'), source_locator text NOT NULL,
 quality text NOT NULL CHECK(quality IN ('reference','inconsistent')), quality_note text NOT NULL,
 UNIQUE(canonical_ingredient_id,nutrient_code,source_sha256,source_locator)
);
CREATE INDEX material_nutrient_references_nutrient ON public.material_nutrient_references(nutrient_code);
CREATE TRIGGER validate_nutrient_measurement_unit BEFORE INSERT OR UPDATE ON public.material_nutrient_references
 FOR EACH ROW EXECUTE FUNCTION private.validate_nutrient_measurement_unit();
ALTER TABLE public.material_nutrient_references ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.material_nutrient_references FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.material_nutrient_references TO anon,authenticated;
GRANT ALL ON public.material_nutrient_references TO service_role;
CREATE POLICY public_registry_read ON public.material_nutrient_references FOR SELECT TO anon,authenticated USING(true);
CREATE FUNCTION public.material_nutrient_profile(material public.canonical_ingredients) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('nutrientCode',n.code,'name',n.name_ko,'value',r.value,
   'unit',r.unit,'basis',r.basis,'sourceUrl',r.source_url,'sourceVersion',r.source_version,
   'sourceSha256',r.source_sha256,'sourceLocator',r.source_locator,'quality',r.quality,'qualityNote',r.quality_note) ORDER BY n.code),'[]')
 FROM public.material_nutrient_references r JOIN public.nutrient_definitions n ON n.code=r.nutrient_code
 WHERE r.canonical_ingredient_id=material.id
$$;
CREATE FUNCTION public.material_nutrient_profile(material public.ingredients) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT coalesce((SELECT public.material_nutrient_profile(c) FROM public.canonical_ingredients c
 WHERE c.legacy_ingredient_id=material.id AND c.status='active' ORDER BY c.id LIMIT 1),'[]')
$$;
REVOKE ALL ON FUNCTION public.material_nutrient_profile(public.canonical_ingredients),public.material_nutrient_profile(public.ingredients) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.material_nutrient_profile(public.canonical_ingredients),public.material_nutrient_profile(public.ingredients) TO anon,authenticated,service_role;
