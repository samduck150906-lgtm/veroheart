import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildCanonicalSeed,
  validateSourceRegistry,
  writeSeedOutputs,
} from './build-canonical-ingredient-seed.mjs';

const registry = {
  version: 1,
  sources: [{
    id: 'official-1', organization: 'Official', title: 'Definition',
    url: 'https://official.test/source', sourceType: 'regulation', jurisdiction: 'TEST',
    accessedAt: '2026-09-28', allowedUses: ['ingredient_identity'],
  }],
};

test('accounts for observed terms, reports collisions, and is deterministic', async () => {
  const input = {
    registry,
    generatedAt: '2026-09-28T00:00:00.000Z',
    legacyRows: [
      { id: '2', name_ko: '닭고기', aliases: ['치킨'], evidenceSourceIds: ['official-1'], status: 'active' },
      { id: '1', name_ko: ' 닭 고기 ', aliases: [], evidenceSourceIds: ['official-1'], status: 'active' },
      { id: '3', name_ko: '칠면조', aliases: ['가금육'], evidenceSourceIds: [], status: 'draft' },
      { id: '4', name_ko: '오리', aliases: ['가금육'], evidenceSourceIds: [], status: 'draft' },
    ],
    observedRows: [
      { term: '치킨', occurrenceCount: 3, productIds: ['p1'] },
      { term: '가금육', occurrenceCount: 2, productIds: ['p2'] },
      { term: '새 원료', occurrenceCount: 1, productIds: ['p3'] },
    ],
  };
  const first = buildCanonicalSeed(input);
  const second = buildCanonicalSeed(input);
  assert.deepEqual(first, second);
  assert.equal(first.seed.ingredients.length, 3);
  assert.equal(first.seed.ingredients.find((row) => row.normalizedKey === '닭고기').observedTerms[0], '치킨');
  assert.deepEqual(first.reviewQueue.map((row) => row.reason).sort(), ['alias_collision', 'unmatched']);
  assert.equal(first.report.collisions.length, 1);

  const output = await mkdtemp(path.join(tmpdir(), 'ingredient-seed-'));
  await writeSeedOutputs(output, first);
  const written = JSON.parse(await readFile(path.join(output, 'seed-report.json'), 'utf8'));
  assert.equal(written.checksum, first.report.checksum);
});

test('rejects duplicate sources, retailer risk evidence, source-less active rows, and long copied claims', () => {
  assert.throws(() => validateSourceRegistry({ version: 1, sources: [registry.sources[0], registry.sources[0]] }), /duplicate_source_id/);
  assert.throws(() => validateSourceRegistry({ version: 1, sources: [{ ...registry.sources[0], id: 'shop', sourceType: 'retailer', allowedUses: ['toxicity_rule'] }] }), /retailer_risk_evidence_forbidden/);
  assert.throws(() => buildCanonicalSeed({ registry, observedRows: [], legacyRows: [{ name_ko: '무근거', status: 'active' }] }), /active_without_evidence/);
  assert.throws(() => buildCanonicalSeed({ registry, observedRows: [], legacyRows: [{ name_ko: '원료', claimSummary: 'x'.repeat(401) }] }), /claim_summary_too_long/);
});

test('upgrades a merged duplicate to active when any evidenced source row is active', () => {
  const result = buildCanonicalSeed({
    registry,
    observedRows: [],
    legacyRows: [
      { id: 'draft', name_ko: '닭 고기', status: 'draft' },
      { id: 'active', name_ko: '닭고기', status: 'active', evidenceSourceIds: ['official-1'] },
    ],
  });

  assert.equal(result.seed.ingredients[0].status, 'active');
  assert.deepEqual(result.seed.ingredients[0].evidenceSourceIds, ['official-1']);
});
