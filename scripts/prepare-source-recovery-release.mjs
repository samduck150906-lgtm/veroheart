// Offline only: no process spawning, CLI, database, environment or credential use.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { recoveryRequirements } from './source-recovery-preflight.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
export async function prepareRelease({ repo, evidence, output, version, projectRef, now = Date.now() }) {
  assert.match(projectRef, /^[a-z]{20}$/);
  assert.equal(evidence.project_ref, projectRef, 'Wrong project assertion');
  const age = now - Date.parse(evidence.observed_at);
  assert.ok(Number.isFinite(age) && age >= -300_000 && age <= 86_400_000, 'Evidence stale or invalid');
  assert.match(version, /^\d{14}$/);
  assert.ok(Array.isArray(evidence.ledger) && evidence.ledger.length > 0, 'Full ledger required');
  const ledger = evidence.ledger.map(row => row.version);
  for (const item of ledger) assert.match(item, /^\d{14}$/);
  assert.equal(new Set(ledger).size, ledger.length, 'Duplicate remote version');
  assert.ok(ledger.every(v => v < version), 'Recovery version must follow entire remote ledger');
  const permittedMissing = new Set(['catalog_source_url','catalog_source_note','requires_veterinary_guidance']);
  assert.ok(Array.isArray(evidence.columns) && evidence.columns.length > 0, 'Projection schema evidence required');
  assert.equal(evidence.product_rls?.anon_table_select, true, 'New columns would lack public SELECT; grants require separate review');
  for (const c of evidence.columns) {
    if (c.present === false && c.table_name === 'products' && permittedMissing.has(c.column_name)) continue;
    assert.ok(c.present === true && c.anon_select === true, `Unavailable public column ${c.table_name}.${c.column_name}`);
  }
  for (const name of permittedMissing) assert.ok(evidence.columns.some(c => c.table_name === 'products' && c.column_name === name), 'Source column evidence incomplete');
  assert.ok(Array.isArray(evidence.relationships) && evidence.relationships.length > 0, 'Relationship evidence required');
  assert.ok(evidence.relationships.every(r => r.present === true && r.candidate_count === 1), 'Missing or ambiguous relationship');
  const expected = await recoveryRequirements(repo);
  assert.deepEqual(evidence.columns.map(c => JSON.stringify([c.table_name,c.column_name])).sort(), [...expected.columns].sort(), 'Projection evidence incomplete or stale');
  assert.deepEqual(evidence.relationships.map(r => JSON.stringify([r.parent,r.child,r.hint])).sort(), [...expected.relationships].sort(), 'Relationship evidence incomplete or stale');
  assert.ok(Array.isArray(evidence.functions) && evidence.functions.length === 1
    && evidence.functions[0].signature === 'public.search_catalog_products(text,text,text,integer,integer)'
    && evidence.functions[0].present === true && evidence.functions[0].anon_execute === true, 'Public search function unavailable');
  const files = (await readdir(path.join(repo, 'supabase/migrations'))).filter(f => f.endsWith('.sql'));
  const local = new Map();
  for (const file of files) {
    assert.match(file, /^\d{14}_[a-zA-Z0-9_]+\.sql$/);
    const v = file.slice(0, 14);
    assert.ok(!local.has(v), 'Duplicate local migration version');
    local.set(v, file);
  }
  assert.ok(!local.has(version), 'Recovery version already local');
  const selected = [];
  for (const row of evidence.ledger) {
    assert.ok(local.has(row.version), `Unrestored remote migration ${row.version}`);
    const file = local.get(row.version);
    assert.equal(file, `${row.version}_${row.name}.sql`, 'Ledger/file name mismatch requires review');
    const bytes = await readFile(path.join(repo, 'supabase/migrations', file));
    selected.push({ file, bytes, sha256: sha(bytes) });
  }
  assert.equal(version, '20261103120000', 'Changing the pinned candidate version requires review');
  const draft = await readFile(path.join(repo, 'supabase/migration_drafts/20261103120000_restore_product_source_contract.sql'));
  assert.equal(sha(draft), '9b615b361e653145f12d83221a47edb775c0797b847de49fed18b03997a38f4b', 'Recovery SQL differs from reviewed candidate');
  assert.ok(!/^\s*(?:BEGIN|COMMIT|ROLLBACK|START TRANSACTION);\s*$/im.test(draft.toString()), 'CLI must own transaction boundary');
  const recoveryFile = `${version}_restore_product_source_contract.sql`;
  const manifest = {
    projectRef, evidenceObservedAt: evidence.observed_at, evidenceSHA256: sha(JSON.stringify(evidence)),
    historicalFiles: selected.map(({ file, sha256 }) => ({ file, sha256 })),
    excludedPendingFiles: files.filter(f => !ledger.includes(f.slice(0, 14))).sort(),
    recovery: { file: recoveryFile, sha256: sha(draft) },
    note: 'Offline candidate only. Ledger membership is not SQL equivalence. Human review and exact one-file CLI dry-run required. No apply/repair/seed/function deploy.',
  };
  // All checks precede output; never overwrite an old release or link/credential cache.
  await mkdir(output);
  await mkdir(path.join(output, 'supabase/migrations'), { recursive: true });
  await writeFile(path.join(output, 'supabase/config.toml'),
    'project_id = "source-recovery-release"\n[db]\nmajor_version = 17\n[db.seed]\nenabled = false\nsql_paths = []\n');
  for (const item of selected) await writeFile(path.join(output, 'supabase/migrations', item.file), item.bytes);
  await writeFile(path.join(output, 'supabase/migrations', recoveryFile), draft);
  await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  assert.equal(args.length, 8, 'Usage: node scripts/prepare-source-recovery-release.mjs --evidence private.json --output new-directory --version YYYYMMDDhhmmss --project-ref ref');
  const options = Object.fromEntries(Array.from({ length: 4 }, (_, i) => [args[i * 2], args[i * 2 + 1]]));
  assert.deepEqual(Object.keys(options).sort(), ['--evidence', '--output', '--project-ref', '--version']);
  const parsed = JSON.parse(await readFile(options['--evidence'], 'utf8'));
  // Dashboard array export wraps the single result row.
  const evidence = Array.isArray(parsed) ? parsed[0]?.recovery_preflight : parsed.recovery_preflight ?? parsed;
  const manifest = await prepareRelease({ repo: fileURLToPath(new URL('..', import.meta.url)),
    evidence, output: path.resolve(options['--output']), version: options['--version'], projectRef: options['--project-ref'] });
  console.log(JSON.stringify({ historicalCount: manifest.historicalFiles.length,
    excludedPendingCount: manifest.excludedPendingFiles.length, recovery: manifest.recovery }));
}
