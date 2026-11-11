-- READ ONLY; run only AFTER separately approved foundation deployment.
-- One aggregate JSON, no product text/IDs/source/reviewer output. Not executed here.
-- Stored ready is a source fact, NOT equivalent to score/recommendation eligibility.
WITH published AS (
 SELECT p.id,p.analysis_status,row_number() OVER(ORDER BY p.id) n
 FROM public.products p WHERE p.is_visible=TRUE
 AND p.verification_status IN ('reviewed','verified')
 AND (NOT private.hide_unverified_products_enabled() OR p.verification_status='verified')
), input_state AS (
 SELECT p.*,c.label_count,
  CASE WHEN c.label_count=1 THEN x.known_count WHEN c.label_count=0 THEN
   (SELECT count(*) FROM public.product_ingredients pi JOIN public.ingredients g ON g.id=pi.ingredient_id WHERE pi.product_id=p.id)
   ELSE 0 END known_count,
  CASE WHEN c.label_count=1 THEN x.unknown_count ELSE 0 END unknown_count
 FROM published p
 CROSS JOIN LATERAL(SELECT count(*) label_count,(array_agg(id ORDER BY id))[1] label_id FROM public.product_ingredient_label_sets WHERE product_id=p.id AND is_current) c
 CROSS JOIN LATERAL(
  SELECT count(*) FILTER(WHERE valid) known_count,
   count(DISTINCT btrim(raw_ingredient_text)) FILTER(WHERE match_status<>'ignored' AND NOT valid AND length(btrim(raw_ingredient_text))>0) unknown_count
  FROM (SELECT i.*,coalesce(i.match_status='matched' AND g.id IS NOT NULL
    AND (k.id IS NULL OR k.status='active') AND g.risk_level::text IN ('safe','caution','warning','danger'),false) valid
   FROM public.product_ingredient_label_items i LEFT JOIN public.canonical_ingredients k ON k.id=i.canonical_ingredient_id
   LEFT JOIN public.ingredients g ON g.id=coalesce(i.legacy_ingredient_id,k.legacy_ingredient_id)
   WHERE i.label_set_id=c.label_id) q
 ) x
), eligibility AS (
 SELECT *,label_count<=1 AND known_count>0 AND unknown_count=0
  AND coalesce(analysis_status,'') NOT IN ('unavailable','partial','blocked') baseline_ready
 FROM input_state
), batches AS (
 SELECT array_agg(id) ids FROM published GROUP BY ((n-1)/100)
), receipts AS (
 SELECT r->>'productId' id,r->>'state' state
 FROM batches b CROSS JOIN LATERAL jsonb_array_elements(public.get_public_label_comparison(b.ids)) r
)
SELECT jsonb_build_object('observed_at',statement_timestamp(),
 'public_products',count(*),
 'eligibility_scope','Main full-product readiness only; not personalized score/rank. Multiple-current rows require separate review.',
 'ambiguous_current_labels',count(*) FILTER(WHERE p.label_count>1),
 'baseline_ready_candidates',count(*) FILTER(WHERE p.baseline_ready),
 'baseline_ready_current_proof',count(*) FILTER(WHERE p.baseline_ready AND r.state='verified'),
 'baseline_ready_withheld',count(*) FILTER(WHERE p.baseline_ready AND r.state IS DISTINCT FROM 'verified'),
 'stored_ready',count(*) FILTER(WHERE p.analysis_status='ready'),
 'stored_ready_current_proof',count(*) FILTER(WHERE p.analysis_status='ready' AND r.state='verified'),
 'stored_ready_withheld',count(*) FILTER(WHERE p.analysis_status='ready' AND r.state IS DISTINCT FROM 'verified'),
 'no_approval',count(*) FILTER(WHERE r.state='absent'),
 'stale',count(*) FILTER(WHERE r.state='stale'),
 'blocked',count(*) FILTER(WHERE r.state='blocked'),
 'missing_receipt',count(*) FILTER(WHERE r.id IS NULL)) AS label_evidence_rollout_counts
FROM eligibility p LEFT JOIN receipts r ON r.id=p.id::text;
