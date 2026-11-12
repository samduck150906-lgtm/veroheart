-- Forward-only ACL hardening. Never reapply or edit migration 20261110100000.
DO $label_sequence_acl$
DECLARE
  evidence_sequence regclass;
  approval_function regprocedure := to_regprocedure('public.admin_approve_label_comparison(uuid,text,jsonb,jsonb,text)');
BEGIN
  PERFORM pg_catalog.set_config('lock_timeout', '3s', true);
  evidence_sequence := pg_catalog.pg_get_serial_sequence('public.ingredient_label_comparisons', 'sequence')::regclass;
  IF evidence_sequence IS NULL
     OR evidence_sequence IS DISTINCT FROM pg_catalog.to_regclass('public.ingredient_label_comparisons_sequence_seq')
     OR approval_function IS NULL
     OR NOT EXISTS (
       SELECT FROM pg_catalog.pg_class s
       JOIN pg_catalog.pg_sequence q ON q.seqrelid = s.oid
       JOIN pg_catalog.pg_depend d ON d.classid = 'pg_class'::regclass AND d.objid = s.oid
         AND d.objsubid = 0 AND d.refclassid = 'pg_class'::regclass AND d.deptype = 'i'
       JOIN pg_catalog.pg_class t ON t.oid = d.refobjid
       JOIN pg_catalog.pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
       JOIN pg_catalog.pg_proc p ON p.oid = approval_function
       WHERE s.oid = evidence_sequence AND s.relkind = 'S'
         AND t.oid = 'public.ingredient_label_comparisons'::regclass AND t.relkind = 'r'
         AND a.attname = 'sequence' AND a.attidentity = 'a' AND NOT a.attisdropped
         AND a.atttypid = 'bigint'::regtype AND a.attnotnull
         AND s.relowner = t.relowner AND s.relowner = p.proowner AND p.prosecdef
         AND q.seqtypid = 'bigint'::regtype AND q.seqstart = 1 AND q.seqincrement = 1
         AND q.seqmin = 1 AND q.seqmax = 9223372036854775807 AND q.seqcache = 1 AND NOT q.seqcycle
         AND (SELECT count(*) FROM pg_catalog.pg_depend x WHERE x.classid = 'pg_class'::regclass
           AND x.objid = s.oid AND x.refclassid = 'pg_class'::regclass AND x.refobjsubid > 0) = 1
     ) THEN
    RAISE EXCEPTION 'Unexpected label evidence identity sequence definition';
  END IF;
  EXECUTE pg_catalog.format('REVOKE ALL ON SEQUENCE %s FROM PUBLIC, anon, authenticated, service_role', evidence_sequence);
  IF EXISTS (
    SELECT FROM pg_catalog.pg_roles r
    WHERE r.rolname IN ('anon', 'authenticated', 'service_role')
      AND (pg_catalog.has_sequence_privilege(r.oid, evidence_sequence, 'SELECT')
        OR pg_catalog.has_sequence_privilege(r.oid, evidence_sequence, 'USAGE')
        OR pg_catalog.has_sequence_privilege(r.oid, evidence_sequence, 'UPDATE'))
  ) THEN
    RAISE EXCEPTION 'Unexpected inherited label evidence sequence privileges';
  END IF;
END $label_sequence_acl$;
