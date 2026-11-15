-- Synthetic additions to the shared minimal label review schema, not production.
ALTER TABLE public.product_ingredient_label_items ADD COLUMN match_confidence NUMERIC;
CREATE TABLE public.canonical_ingredient_aliases(canonical_ingredient_id UUID,alias_text TEXT);
INSERT INTO public.canonical_ingredients(id,legacy_ingredient_id,canonical_name_ko,canonical_name_en,status) VALUES
 ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000003','닭고기 표준','chicken','active'),
 ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000004','초안 대두','soy','draft');
INSERT INTO public.canonical_ingredient_aliases VALUES('00000000-0000-4000-8000-000000000010','닭 별칭');
UPDATE public.product_ingredient_label_items SET match_status='unreviewed',legacy_ingredient_id=NULL,canonical_ingredient_id=NULL;
