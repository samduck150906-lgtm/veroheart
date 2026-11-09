-- READ ONLY; run only AFTER separately approved foundation deployment.
-- One aggregate JSON, no product text/IDs/source/reviewer output. Not executed here.
-- Stored ready is a source fact, NOT equivalent to score/recommendation eligibility.
WITH published AS (
 SELECT p.id,p.analysis_status,row_number() OVER(ORDER BY p.id) n
 FROM public.products p WHERE p.is_visible=TRUE
 AND p.verification_status IN ('pending','reviewed','verified')
 AND (NOT private.hide_unverified_products_enabled() OR p.verification_status='verified')
), batches AS (
 SELECT array_agg(id) ids FROM published GROUP BY ((n-1)/100)
), receipts AS (
 SELECT r->>'productId' id,r->>'state' state
 FROM batches b CROSS JOIN LATERAL jsonb_array_elements(public.get_public_label_comparison(b.ids)) r
)
SELECT jsonb_build_object('observed_at',statement_timestamp(),
 'public_products',count(*),
 'stored_ready',count(*) FILTER(WHERE p.analysis_status='ready'),
 'stored_ready_current_proof',count(*) FILTER(WHERE p.analysis_status='ready' AND r.state='verified'),
 'stored_ready_withheld',count(*) FILTER(WHERE p.analysis_status='ready' AND r.state IS DISTINCT FROM 'verified'),
 'no_approval',count(*) FILTER(WHERE r.state='absent'),
 'stale',count(*) FILTER(WHERE r.state='stale'),
 'blocked',count(*) FILTER(WHERE r.state='blocked'),
 'missing_receipt',count(*) FILTER(WHERE r.id IS NULL)) AS label_evidence_rollout_counts
FROM published p LEFT JOIN receipts r ON r.id=p.id::text;
