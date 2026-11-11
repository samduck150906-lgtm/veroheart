-- UNAPPLIED follow-up draft. Separate operating approval required.
-- Supabase default sequence ACLs must not grant direct evidence sequence access.
DO $label_sequence_acl$
DECLARE evidence_sequence regclass;
BEGIN
 PERFORM pg_catalog.set_config('lock_timeout','3s',true);
 evidence_sequence := pg_catalog.pg_get_serial_sequence('public.ingredient_label_comparisons','sequence')::regclass;
 IF evidence_sequence IS NULL OR evidence_sequence IS DISTINCT FROM pg_catalog.to_regclass('public.ingredient_label_comparisons_sequence_seq') THEN
  RAISE EXCEPTION 'Unexpected or missing label evidence identity sequence';
 END IF;
 EXECUTE pg_catalog.format('REVOKE ALL ON SEQUENCE %s FROM PUBLIC, anon, authenticated, service_role',evidence_sequence);
END $label_sequence_acl$;
