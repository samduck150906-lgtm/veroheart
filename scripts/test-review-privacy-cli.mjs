// Real CLI + disposable PostgreSQL; never an operating-project connection.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const cli = process.env.REVIEW_PRIVACY_TEST_CLI;
const admin = new URL(process.env.REVIEW_PRIVACY_PG_URL || '');
assert(cli, 'Set REVIEW_PRIVACY_TEST_CLI to the verified official 2.118.0 binary');
assert(['postgres:', 'postgresql:'].includes(admin.protocol));
assert(['127.0.0.1', 'localhost', '[::1]'].includes(admin.hostname), 'Loopback PostgreSQL only');
assert.equal(admin.username, 'postgres');
assert.equal(admin.password, '', 'Use a disposable trust-authenticated local service, no credentials');
assert.equal(admin.pathname, '/postgres');
admin.searchParams.set('sslmode', 'disable');
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('SUPABASE_') && !key.startsWith('PG')));
const resultsDir = resolve(process.env.REVIEW_PRIVACY_RESULTS || '.artifacts/review-privacy-cli');
await mkdir(resultsDir, { recursive: true });
const migrationName = '20261106090000_restrict_raw_review_reads.sql';
const version = '20261106090000';
const migration = await readFile(new URL('../supabase/migrations/' + migrationName, import.meta.url), 'utf8');
const hash = createHash('sha256').update(migration).digest('hex');
const run = (file, args, input = '') => spawnSync(file, args, { env, input, encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 });
const cliVersion = run(cli, ['--version']);
assert.equal(cliVersion.status, 0);
assert.equal(cliVersion.stdout.trim(), '2.118.0');
const psql = (uri, sql) => {
  const r = run('psql', ['-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '--dbname', uri, '-c', sql]);
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
};
const query = (uri, sql) => JSON.parse(psql(uri, sql));
const work = await mkdtemp(join(tmpdir(), 'review-privacy-cli-'));
const databases = [];
const records = [];

// Setup is a separate process/connection; NEVER wraps the CLI migration in BEGIN.
const setup = `
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
`;
const schema = `
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
CREATE TABLE public.products(id uuid PRIMARY KEY,is_visible boolean,verification_status text);
CREATE TABLE public.reviews(id uuid PRIMARY KEY,user_id uuid,product_id uuid,rating integer,content text,is_hidden boolean DEFAULT false,created_at timestamptz);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY legacy_read ON public.reviews FOR SELECT TO PUBLIC USING(true);
CREATE POLICY own_delete ON public.reviews FOR DELETE TO authenticated USING(auth.uid()=user_id);
GRANT SELECT,INSERT,DELETE ON public.reviews TO anon,authenticated;
GRANT ALL ON public.reviews TO service_role;
CREATE VIEW public.product_ratings WITH(security_barrier=true) AS SELECT r.id,r.product_id,r.rating,r.created_at,r.user_id=auth.uid() AS is_mine FROM public.reviews r JOIN public.products p ON p.id=r.product_id WHERE p.is_visible AND NOT r.is_hidden;
GRANT SELECT ON public.product_ratings TO anon,authenticated;
INSERT INTO public.products VALUES('11111111-1111-4111-8111-111111111111',true,'verified');
INSERT INTO public.reviews VALUES('22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111',5,'synthetic only',false,now());
CREATE SCHEMA supabase_migrations;
CREATE TABLE supabase_migrations.schema_migrations(version text PRIMARY KEY,name text,statements text[]);
CREATE TABLE fixture_events(event text,pid integer,txid bigint,lock_timeout text);
CREATE FUNCTION fixture_policy_trace() RETURNS event_trigger LANGUAGE plpgsql AS $$BEGIN INSERT INTO fixture_events VALUES('policy',pg_backend_pid(),txid_current(),current_setting('lock_timeout')); END$$;
CREATE EVENT TRIGGER fixture_policy_end ON ddl_command_end WHEN TAG IN ('CREATE POLICY') EXECUTE FUNCTION fixture_policy_trace();
CREATE FUNCTION fixture_ledger_trace() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN INSERT INTO fixture_events VALUES(TG_WHEN,pg_backend_pid(),txid_current(),current_setting('lock_timeout')); RETURN NEW; END$$;
CREATE TRIGGER fixture_ledger_before BEFORE INSERT ON supabase_migrations.schema_migrations FOR EACH ROW EXECUTE FUNCTION fixture_ledger_trace();
CREATE TRIGGER fixture_ledger_after AFTER INSERT ON supabase_migrations.schema_migrations FOR EACH ROW EXECUTE FUNCTION fixture_ledger_trace();
`;
const snapshot = uri => query(uri, `SELECT json_build_object(
 'rows', (SELECT md5(coalesce(jsonb_agg(to_jsonb(r) ORDER BY id)::text,'')) FROM reviews r),
 'acl',(SELECT relacl::text FROM pg_class WHERE oid='reviews'::regclass),
 'view',md5(pg_get_viewdef('product_ratings'::regclass,true)),
 'oldPolicies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY policyname) FROM pg_policies p WHERE tablename='reviews' AND policyname<>'reviews_owner_read_required'),
 'rls',(SELECT relrowsecurity FROM pg_class WHERE oid='reviews'::regclass))`);
const state = uri => query(uri, `SELECT json_build_object(
 'policyCount',(SELECT count(*) FROM pg_policy WHERE polrelid='reviews'::regclass AND polname='reviews_owner_read_required'),
 'ledgerCount',(SELECT count(*) FROM supabase_migrations.schema_migrations),
 'statementCount',(SELECT cardinality(statements) FROM supabase_migrations.schema_migrations WHERE version='${version}'),
 'events',(SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY event),'[]') FROM fixture_events e))`);
const fresh = async (label, text = migration) => {
  const db = `review_privacy_cli_${process.pid}_${databases.length}`;
  assert.match(db, /^review_privacy_cli_[0-9]+_[0-9]+$/);
  psql(admin.href, `CREATE DATABASE ${db}`);
  databases.push(db);
  const uri = new URL(admin); uri.pathname = '/' + db;
  psql(uri.href, schema);
  const dir = join(work, label);
  await mkdir(join(dir, 'supabase/migrations'), { recursive: true });
  await writeFile(join(dir, 'supabase/config.toml'), 'project_id = "review-privacy-cli-test"\n[db]\nmajor_version = 17\n');
  await writeFile(join(dir, 'supabase/migrations', migrationName), text);
  return { uri: uri.href, dir, label, before: snapshot(uri.href), candidateBytesUnchanged: text === migration };
};
const apply = async fixture => {
  // Same db push executor as release; only the target flag changes to disposable loopback.
  const start = Date.now();
  const r = run(cli, ['db', 'push', '--db-url', fixture.uri, '--workdir', fixture.dir], 'y\n');
  await writeFile(join(resultsDir, fixture.label + '-' + records.length + '.log'), r.stdout + '\n' + r.stderr);
  return { ...r, elapsedMs: Date.now() - start };
};
const unchangedFailure = (fixture, result, expectedCode) => {
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, new RegExp(expectedCode));
  const after = state(fixture.uri);
  assert.equal(after.policyCount, 0);
  assert.equal(after.ledgerCount, 0);
  assert.deepEqual(after.events, []);
  assert.deepEqual(snapshot(fixture.uri), fixture.before);
  records.push({ case: fixture.label, passed: true, expectedCode, candidateBytesUnchanged: fixture.candidateBytesUnchanged, partialApplication: false, elapsedMs: result.elapsedMs, observedState: after });
};

try {
  // Roles are cluster-wide but everything is restricted to this disposable service.
  const roles = psql(admin.href, "SELECT count(*) FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')");
  if (roles === '0') psql(admin.href, setup);
  assert.equal(psql(admin.href, "SELECT count(*) FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')"), '3');
  const success = await fresh('success');
  const ok = await apply(success);
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  const applied = state(success.uri);
  assert.equal(applied.policyCount, 1); assert.equal(applied.ledgerCount, 1);
  assert.equal(applied.statementCount, 1, 'Official splitter must keep DO as one statement');
  assert.equal(applied.events.length, 3);
  assert.equal(new Set(applied.events.map(e => e.pid)).size, 1);
  assert.equal(new Set(applied.events.map(e => e.txid)).size, 1, 'Policy DDL and ledger INSERT must share a transaction');
  assert(applied.events.every(e => e.lock_timeout === '5s'), 'Local timeout must remain active through the ledger INSERT');
  assert.deepEqual(snapshot(success.uri), success.before);
  records.push({ case: 'success', passed: true, candidateBytesUnchanged: true, onePolicy: true, oneLedger: true, oneSplitStatement: true, sameBackendAndTransaction: true, observedState: applied });
  const again = await apply(success);
  assert.equal(again.status, 0, again.stderr);
  assert.deepEqual(state(success.uri), applied);
  records.push({ case: 'successful-rerun', passed: true, noReapplication: true, candidateBytesUnchanged: true, observedState: state(success.uri) });

  for (const [label, timing] of [['before-policy', 'ddl_command_start'], ['after-policy', 'ddl_command_end']]) {
    const f = await fresh(label);
    psql(f.uri, `CREATE FUNCTION fixture_fail_policy() RETURNS event_trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='synthetic policy failure'; END$$; CREATE EVENT TRIGGER fixture_fail ON ${timing} WHEN TAG IN ('CREATE POLICY') EXECUTE FUNCTION fixture_fail_policy();`);
    unchangedFailure(f, await apply(f), 'P0001');
  }
  for (const timing of ['BEFORE', 'AFTER']) {
    const f = await fresh('ledger-' + timing.toLowerCase());
    psql(f.uri, `CREATE FUNCTION fixture_fail_ledger() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='synthetic ledger failure'; END$$; CREATE TRIGGER fixture_fail ${timing} INSERT ON supabase_migrations.schema_migrations FOR EACH ROW EXECUTE FUNCTION fixture_fail_ledger();`);
    unchangedFailure(f, await apply(f), 'P0001');
  }

  const locked = await fresh('lock-timeout');
  const holder = spawn('psql', ['-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '--dbname', locked.uri], { env, stdio: ['pipe', 'pipe', 'pipe'] });
  let messages = ''; holder.stdout.on('data', b => { messages += b; });
  holder.stderr.on('data', b => { messages += b; });
  holder.stdin.write("BEGIN; LOCK TABLE reviews IN ACCESS EXCLUSIVE MODE; SELECT 'LOCK_HELD';\n");
  try {
    const deadline = Date.now() + 15000;
    while (!messages.includes('LOCK_HELD')) { assert(Date.now() < deadline, messages); await new Promise(r => setTimeout(r, 50)); }
    const result = await apply(locked);
    assert(result.elapsedMs >= 4500, 'Must actually wait on the competing backend lock');
    // Release the competing session before snapshot checks (which also read reviews).
    holder.stdin.end('ROLLBACK;\n\\q\n');
    await new Promise(r => holder.once('close', r));
    unchangedFailure(locked, result, '55P03');
  } finally { if (holder.exitCode === null) holder.kill('SIGTERM'); }

  const naive = await fresh('rejected-authored-commit', 'BEGIN;\n' + migration + '\nCOMMIT;\n');
  psql(naive.uri, `CREATE FUNCTION fixture_fail_ledger() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='synthetic ledger failure'; END$$; CREATE TRIGGER fixture_fail BEFORE INSERT ON supabase_migrations.schema_migrations FOR EACH ROW EXECUTE FUNCTION fixture_fail_ledger();`);
  const naiveResult = await apply(naive);
  assert.notEqual(naiveResult.status, 0);
  assert.equal(state(naive.uri).policyCount, 1, 'Counterexample: authored COMMIT precedes CLI ledger INSERT');
  assert.equal(state(naive.uri).ledgerCount, 0);
  records.push({ case: 'rejected-authored-commit', passed: true, counterexample: true, policyCommittedBeforeFailedLedger: true, notReleaseCandidate: true, observedState: state(naive.uri) });

  const old = await fresh('rejected-top-level-lock', "SET LOCAL lock_timeout='5s';\nLOCK TABLE public.reviews IN ACCESS EXCLUSIVE MODE;\n" + migration);
  unchangedFailure(old, await apply(old), '25P01');
  await writeFile(join(resultsDir, 'results.json'), JSON.stringify({ passed: true, cliVersion: '2.118.0', postgresVersion: psql(admin.href, 'SHOW server_version'), migrationName, sha256: hash, noExternalBegin: true, target: 'disposable loopback PostgreSQL only; db push --db-url', hostedLinkedAuthAndPoolerNotTested: true, records }, null, 2));
  console.log(JSON.stringify({ passed: true, cliVersion: '2.118.0', cases: records.length, candidateSHA256: hash }));
} catch (error) {
  await writeFile(join(resultsDir, 'failure.txt'), String(error.stack));
  throw error;
} finally {
  for (const db of databases) psql(admin.href, `DROP DATABASE ${db} WITH (FORCE)`);
  await rm(work, { recursive: true, force: true });
}
