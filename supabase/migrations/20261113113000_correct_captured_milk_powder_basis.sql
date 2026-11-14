BEGIN;
CREATE TABLE IF NOT EXISTS private.milk_powder_basis_corrections(
 evidence_id uuid PRIMARY KEY,before_evidence jsonb NOT NULL,after_evidence jsonb,
 reason text NOT NULL,captured_at timestamptz NOT NULL DEFAULT now());
REVOKE ALL ON private.milk_powder_basis_corrections FROM PUBLIC,anon,authenticated,service_role;
-- This exact manufacturer's page is the milk powder, not prepared liquid.
-- Correct the old default only when a freshly verified, identical measurement
-- on the same URL explicitly records the as-sold powder basis. No conversion.
INSERT INTO private.milk_powder_basis_corrections(evidence_id,before_evidence,reason)
 SELECT e.id,to_jsonb(e),'BabyDog Milk 2300: original powder label, verified against the fresh matching manufacturer measurement. Preserve value/unit/qualifier/source; correct the historical default basis only.'
 FROM public.product_nutrient_evidence e
 WHERE e.product_id='6eb21c72-f612-446f-bba6-3de481f847f5'
 AND e.source_url='https://www.royalcanin.com/kr/dogs/products/retail-products/babydog-milk-2300'
 AND e.source_version ~ '^official-completion-sha256:[a-f0-9]{64}$' AND e.unit='g/100g' AND e.basis='as_fed'
 AND EXISTS(SELECT 1 FROM public.product_nutrient_evidence f WHERE f.product_id=e.product_id AND f.nutrient_code=e.nutrient_code
   AND f.source_url=e.source_url AND f.value=e.value AND f.unit=e.unit AND f.qualifier=e.qualifier
   AND f.basis='as_sold' AND f.source_version ~ '^official-supplement-sha256:[a-f0-9]{64}$')
 ON CONFLICT(evidence_id)DO NOTHING;
UPDATE public.product_nutrient_evidence e SET basis='as_sold'
 FROM private.milk_powder_basis_corrections a WHERE e.id=a.evidence_id AND to_jsonb(e)=a.before_evidence;
UPDATE private.milk_powder_basis_corrections a SET after_evidence=to_jsonb(e)
 FROM public.product_nutrient_evidence e WHERE e.id=a.evidence_id AND a.after_evidence IS NULL;
COMMIT;
