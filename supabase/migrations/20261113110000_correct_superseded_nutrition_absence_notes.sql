BEGIN;
CREATE TABLE IF NOT EXISTS private.product_nutrition_note_corrections(
 product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE RESTRICT,
 before_note text NOT NULL,after_note text NOT NULL,captured_at timestamptz NOT NULL DEFAULT now());
REVOKE ALL ON private.product_nutrition_note_corrections FROM PUBLIC,anon,authenticated,service_role;
-- Preserve the historical absence statement in an audit row. Only products
-- with a captured official protein/fat pair qualify for this exact correction.
INSERT INTO private.product_nutrition_note_corrections(product_id,before_note,after_note)
 SELECT p.id,p.catalog_source_note,replace(p.catalog_source_note,
  '현재 제조사 공개 페이지에서 보장성분 수치가 확인되지 않아 영양 수치를 제공하지 않습니다.',
  '제조사 표시 영양 수치는 아래의 단위·기준·출처와 함께 제공합니다. 국내 포장의 최소·최대 보장조건과 다를 수 있습니다.')
 FROM public.products p WHERE p.catalog_archived_at IS NULL
 AND p.catalog_source_note LIKE '%현재 제조사 공개 페이지에서 보장성분 수치가 확인되지 않아 영양 수치를 제공하지 않습니다.%'
 AND EXISTS(SELECT 1 FROM public.product_nutrient_evidence e JOIN public.product_nutrient_evidence f
   ON f.product_id=e.product_id AND f.source_url=e.source_url AND f.source_version=e.source_version AND f.unit=e.unit AND f.basis=e.basis
   WHERE e.product_id=p.id AND e.nutrient_code='protein' AND f.nutrient_code='fat' AND e.source_version ~ '^official-(completion|supplement)-sha256:[a-f0-9]{64}$')
 ON CONFLICT(product_id)DO NOTHING;
UPDATE public.products p SET catalog_source_note=a.after_note FROM private.product_nutrition_note_corrections a
 WHERE p.id=a.product_id AND p.catalog_source_note=a.before_note;
COMMIT;
