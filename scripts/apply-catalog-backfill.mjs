import { createHash, randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const CLEAN_FIELDS = [
  'display_name',
  'normalized_name',
  'normalized_brand_name',
  'canonical_product_key',
  'slug',
];

function normalizeIdentityText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s·・,.'"`_\-/()[\]{}]/g, '');
}

function normalizedNullable(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

export function validateConfirmation(actualHash, confirmation) {
  const expected = String(actualHash ?? '').toLowerCase();
  const supplied = String(confirmation ?? '');
  if (!/^[a-f0-9]{64}$/.test(supplied) || supplied !== expected) {
    throw new Error('SHA-256 확인값이 일치하지 않습니다. 아티팩트를 다시 검토하세요.');
  }
}

function sourceChanged(candidate, currentRow, artifactGeneratedAt) {
  if (String(currentRow.name ?? '') !== String(candidate.sourceName ?? '')) return true;
  if (String(currentRow.brand_name ?? '') !== String(candidate.sourceBrandName ?? '')) return true;

  const currentObservedAt = currentRow.last_observed_at ?? null;
  const sourceObservedAt = candidate.sourceLastObservedAt ?? null;
  if (currentObservedAt !== sourceObservedAt) return true;

  if (currentObservedAt) {
    const observedTime = Date.parse(currentObservedAt);
    const artifactTime = Date.parse(artifactGeneratedAt);
    if (!Number.isFinite(observedTime) || !Number.isFinite(artifactTime) || observedTime > artifactTime) {
      return true;
    }
  }
  return false;
}

export function planCandidateApplication(candidate, currentRow, context) {
  if (candidate.needsReview) return { action: 'skip', reason: 'review-required' };
  if (context.collisionProductIds.has(candidate.productId)) {
    return { action: 'skip', reason: 'identity-collision' };
  }
  if (!currentRow || sourceChanged(candidate, currentRow, context.artifactGeneratedAt)) {
    return { action: 'skip', reason: 'stale-source' };
  }
  if (CLEAN_FIELDS.some((field) => normalizedNullable(currentRow[field]))) {
    return { action: 'skip', reason: 'clean-fields-present' };
  }

  const rawAlias = String(candidate.rawAlias ?? '').trim();
  const displayName = String(candidate.displayName ?? '').trim();
  const brandName = String(candidate.brandName ?? '').trim();
  const canonicalProductKey = normalizedNullable(candidate.canonicalProductKey);
  const slug = String(candidate.slug ?? '').trim();
  if (!rawAlias || !displayName || !brandName || !canonicalProductKey || !slug) {
    return { action: 'skip', reason: 'incomplete-candidate' };
  }

  return {
    action: 'apply',
    patch: {
      display_name: displayName,
      normalized_name: normalizeIdentityText(displayName),
      brand_name: brandName,
      normalized_brand_name: normalizeIdentityText(brandName),
      canonical_product_key: canonicalProductKey,
      slug,
    },
    alias: {
      aliasText: rawAlias,
      normalizedAlias: normalizeIdentityText(rawAlias),
    },
  };
}

function argumentValue(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function parseArguments(args) {
  const allowed = new Set(['--artifact', '--confirm']);
  for (let index = 0; index < args.length; index += 2) {
    if (!allowed.has(args[index]) || !args[index + 1]) {
      throw new Error('사용법: node scripts/apply-catalog-backfill.mjs --artifact <json> --confirm <sha256>');
    }
  }
  const artifactPath = argumentValue(args, '--artifact');
  const confirmation = argumentValue(args, '--confirm');
  if (!artifactPath || !confirmation) {
    throw new Error('사용법: node scripts/apply-catalog-backfill.mjs --artifact <json> --confirm <sha256>');
  }
  return { artifactPath, confirmation };
}

function collisionProductIds(artifact) {
  const ids = new Set();
  for (const group of artifact.collisions?.slug ?? []) {
    for (const id of group.ids ?? []) ids.add(String(id));
  }
  for (const group of artifact.collisions?.canonicalProductKey ?? []) {
    for (const id of group.ids ?? []) ids.add(String(id));
  }
  return ids;
}

async function fetchCurrentRows(baseUrl, serviceKey, productIds) {
  const rows = new Map();
  for (let offset = 0; offset < productIds.length; offset += 50) {
    const ids = productIds.slice(offset, offset + 50);
    const url = new URL('/rest/v1/products', baseUrl);
    url.searchParams.set('select', `id,name,brand_name,last_observed_at,${CLEAN_FIELDS.join(',')}`);
    url.searchParams.set('id', `in.(${ids.join(',')})`);
    const response = await fetch(url, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!response.ok) throw new Error(`운영 행 조회 실패: HTTP ${response.status}`);
    for (const row of await response.json()) rows.set(String(row.id), row);
  }
  return rows;
}

async function applyCandidate(baseUrl, serviceKey, artifact, candidate, plan) {
  const response = await fetch(new URL('/rest/v1/rpc/apply_catalog_backfill_candidate', baseUrl), {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_product_id: candidate.productId,
      p_source_name: candidate.sourceName,
      p_source_brand_name: candidate.sourceBrandName,
      p_source_last_observed_at: candidate.sourceLastObservedAt,
      p_artifact_generated_at: artifact.generatedAt,
      p_display_name: plan.patch.display_name,
      p_normalized_name: plan.patch.normalized_name,
      p_brand_name: plan.patch.brand_name,
      p_normalized_brand_name: plan.patch.normalized_brand_name,
      p_canonical_product_key: plan.patch.canonical_product_key,
      p_slug: plan.patch.slug,
      p_raw_alias: plan.alias.aliasText,
      p_normalized_alias: plan.alias.normalizedAlias,
    }),
  });
  if (!response.ok) throw new Error(`제품 단위 적용 실패: HTTP ${response.status}`);
  const result = await response.json();
  return Array.isArray(result) ? result[0] : result;
}

async function appendJournal(journalPath, entry) {
  await mkdir(path.dirname(journalPath), { recursive: true });
  await appendFile(journalPath, `${JSON.stringify(entry)}\n`, 'utf8');
}

async function main() {
  const { artifactPath, confirmation } = parseArguments(process.argv.slice(2));
  const absoluteArtifactPath = path.resolve(process.cwd(), artifactPath);
  const artifactBytes = await readFile(absoluteArtifactPath);
  const artifactHash = createHash('sha256').update(artifactBytes).digest('hex');

  // This check intentionally happens before credentials are read or any request is made.
  validateConfirmation(artifactHash, confirmation);

  const artifact = JSON.parse(artifactBytes.toString('utf8'));
  if (artifact.artifactVersion !== 1 || artifact.source !== 'production-read-only') {
    throw new Error('지원하지 않는 드라이런 아티팩트입니다.');
  }
  if (!Array.isArray(artifact.candidates) || !artifact.generatedAt) {
    throw new Error('드라이런 아티팩트에 후보 또는 생성 시각이 없습니다.');
  }

  const baseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceKey) {
    throw new Error('SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.');
  }

  const runId = randomUUID();
  const journalPath = path.resolve(process.cwd(), '.artifacts', 'catalog-backfill-apply.jsonl');
  await appendJournal(journalPath, {
    timestamp: new Date().toISOString(),
    runId,
    artifactHash,
    action: 'run-started',
    candidateCount: artifact.candidates.length,
  });
  const currentRows = await fetchCurrentRows(
    baseUrl,
    serviceKey,
    artifact.candidates.map((candidate) => candidate.productId),
  );
  const context = {
    artifactGeneratedAt: artifact.generatedAt,
    collisionProductIds: collisionProductIds(artifact),
  };
  const totals = { applied: 0, skipped: 0 };

  for (const candidate of artifact.candidates) {
    const plan = planCandidateApplication(candidate, currentRows.get(candidate.productId), context);
    let outcome = plan;
    if (plan.action === 'apply') {
      const databaseResult = await applyCandidate(baseUrl, serviceKey, artifact, candidate, plan);
      outcome = databaseResult?.applied
        ? { action: 'applied', reason: databaseResult.reason ?? 'applied' }
        : { action: 'skip', reason: databaseResult?.reason ?? 'database-guard' };
    }
    const applied = outcome.action === 'applied';
    totals[applied ? 'applied' : 'skipped'] += 1;
    await appendJournal(journalPath, {
      timestamp: new Date().toISOString(),
      runId,
      artifactHash,
      productId: candidate.productId,
      action: outcome.action,
      reason: outcome.reason,
    });
  }

  console.log(`적용 완료: ${totals.applied}개`);
  console.log(`건너뜀: ${totals.skipped}개`);
  console.log(`결과 저널: ${path.relative(process.cwd(), journalPath)}`);
}

const isDirectRun = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isDirectRun) {
  main().catch((error) => {
    console.error(`적용 실패: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
