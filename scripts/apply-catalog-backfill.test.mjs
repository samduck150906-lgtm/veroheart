import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  planCandidateApplication,
  validateConfirmation,
} from './apply-catalog-backfill.mjs';

const candidate = {
  productId: '00000000-0000-4000-8000-000000000001',
  rawAlias: '쿠팡 판매 원문, 2kg, 1개',
  sourceName: '쿠팡 판매 원문, 2kg, 1개',
  sourceBrandName: '쿠팡검색',
  sourceLastObservedAt: '2026-09-20T00:00:00.000Z',
  displayName: '정돈된 제품명',
  brandName: '정돈된브랜드',
  canonicalProductKey: '제조사|정돈된브랜드|정돈된제품명|||dog',
  slug: '정돈된-제품명',
  needsReview: false,
};

const currentRow = {
  id: candidate.productId,
  name: candidate.sourceName,
  brand_name: candidate.sourceBrandName,
  last_observed_at: candidate.sourceLastObservedAt,
  display_name: null,
  normalized_name: null,
  normalized_brand_name: null,
  canonical_product_key: null,
  slug: null,
};

const context = {
  artifactGeneratedAt: '2026-09-25T00:00:00.000Z',
  collisionProductIds: new Set(),
};

test('checksum mismatch is rejected before any network work', () => {
  assert.throws(
    () => validateConfirmation('a'.repeat(64), 'b'.repeat(64)),
    /SHA-256 확인값이 일치하지 않습니다/,
  );
});

test('a row changed after the artifact is skipped as stale', () => {
  const result = planCandidateApplication(candidate, {
    ...currentRow,
    name: '운영에서 수정된 원문',
  }, context);

  assert.deepEqual(result, { action: 'skip', reason: 'stale-source' });
});

test('a candidate in any collision group is skipped', () => {
  const result = planCandidateApplication(candidate, currentRow, {
    ...context,
    collisionProductIds: new Set([candidate.productId]),
  });

  assert.deepEqual(result, { action: 'skip', reason: 'identity-collision' });
});

test('a row with an existing clean catalog field is skipped', () => {
  const result = planCandidateApplication(candidate, {
    ...currentRow,
    display_name: '운영에서 검수된 이름',
  }, context);

  assert.deepEqual(result, { action: 'skip', reason: 'clean-fields-present' });
});

test('the apply plan preserves the raw product name', () => {
  const result = planCandidateApplication(candidate, currentRow, context);

  assert.equal(result.action, 'apply');
  assert.equal(Object.hasOwn(result.patch, 'name'), false);
  assert.equal({ ...currentRow, ...result.patch }.name, currentRow.name);
  assert.deepEqual(result.alias, {
    aliasText: candidate.rawAlias,
    normalizedAlias: '쿠팡판매원문2kg1개',
  });
});

test('the database RPC applies one product atomically without updating products.name', async () => {
  const sql = await readFile(
    new URL('../supabase/migrations/20260925120000_catalog_backfill_apply_rpc.sql', import.meta.url),
    'utf8',
  );
  const updateClause = sql.match(/UPDATE public\.products[\s\S]*?WHERE id = p_product_id;/)?.[0] ?? '';

  assert.match(sql, /FOR UPDATE;/);
  assert.match(sql, /INSERT INTO public\.product_aliases/);
  assert.match(sql, /GRANT EXECUTE[\s\S]*TO service_role;/);
  assert.doesNotMatch(updateClause, /\n\s*name\s*=/);
});
