import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { buildCatalogBackfillCandidate } from '../src/lib/catalogBackfill.ts';

const args = process.argv.slice(2);
const mutationRequested = args.includes('--write') || args.includes('--apply');
if (mutationRequested) {
  console.error('오류: 이 스크립트는 읽기 전용입니다. --write/--apply 옵션을 사용할 수 없습니다.');
  process.exitCode = 2;
}

function argumentValue(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function redactId(value) {
  const id = String(value ?? '');
  return id.length <= 8 ? id : `${id.slice(0, 8)}…`;
}

function redactText(value) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length <= 80 ? text : `${text.slice(0, 79)}…`;
}

function collisionFingerprint(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

async function loadFixture(fixturePath) {
  const absolutePath = path.resolve(process.cwd(), fixturePath);
  const parsed = JSON.parse(await readFile(absolutePath, 'utf8'));
  const products = Array.isArray(parsed) ? parsed : parsed.products;
  if (!Array.isArray(products)) throw new Error('fixture는 제품 배열 또는 { "products": [] } 형식이어야 합니다.');
  return products;
}

async function queryProducts(baseUrl, anonKey, select) {
  const products = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const url = new URL('/rest/v1/products', baseUrl);
    url.searchParams.set('select', select);
    url.searchParams.set('is_visible', 'eq.true');
    url.searchParams.set('order', 'id.asc');
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('limit', String(pageSize));

    const response = await fetch(url, {
      method: 'GET',
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    if (!response.ok) {
      const error = new Error(`제품 조회 실패: HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }

    const page = await response.json();
    if (!Array.isArray(page)) throw new Error('제품 조회 응답이 배열이 아닙니다.');
    products.push(...page.map((product) => ({ ...product, category: product.main_category })));
    if (page.length < pageSize) break;
  }
  return products;
}

async function loadProductsFromSupabase() {
  const baseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!baseUrl || !anonKey) {
    throw new Error('fixture가 없으면 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY가 필요합니다.');
  }

  const legacyColumns = 'id,name,brand_name,manufacturer_name,target_pet_type,main_category';
  const cleanColumns = [
    legacyColumns,
    'display_name',
    'variant_name',
    'net_weight_text',
    'canonical_product_key',
    'slug',
    'last_observed_at',
  ].join(',');
  try {
    return {
      products: await queryProducts(baseUrl, anonKey, cleanColumns),
      schemaReady: true,
    };
  } catch (error) {
    if (error?.status !== 400) throw error;
    return {
      products: await queryProducts(baseUrl, anonKey, legacyColumns),
      schemaReady: false,
    };
  }
}

function validateIdPreservation(products, candidates) {
  const sourceIds = products.map((product) => String(product.id ?? '').trim());
  const resultIds = candidates.map((candidate) => candidate.productId);
  const uniqueSourceIds = new Set(sourceIds);
  const uniqueResultIds = new Set(resultIds);
  const missingIds = sourceIds.filter((id) => !id || !uniqueResultIds.has(id));
  return {
    valid:
      missingIds.length === 0 &&
      sourceIds.length === candidates.length &&
      uniqueSourceIds.size === sourceIds.length &&
      uniqueResultIds.size === resultIds.length,
    missingIds,
  };
}

function findCollisions(candidates, valueFor) {
  const grouped = new Map();
  for (const candidate of candidates) {
    const value = valueFor(candidate);
    if (!value) continue;
    const group = grouped.get(value) ?? [];
    group.push(candidate.productId);
    grouped.set(value, group);
  }
  return [...grouped.entries()].filter(([, ids]) => ids.length > 1);
}

async function writeArtifact(outputPath, artifact) {
  const absolutePath = path.resolve(process.cwd(), outputPath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  return absolutePath;
}

async function main() {
  const fixturePath = argumentValue('--fixture');
  const outputPath = argumentValue('--json');
  const loaded = fixturePath
    ? { products: await loadFixture(fixturePath), schemaReady: true }
    : await loadProductsFromSupabase();
  const { products, schemaReady } = loaded;
  const candidates = products.map((product) => ({
    ...buildCatalogBackfillCandidate(product),
    sourceName: String(product.name ?? ''),
    sourceBrandName: String(product.brand_name ?? ''),
    sourceLastObservedAt: product.last_observed_at ?? null,
    existingDisplayName: product.display_name ?? null,
    existingCanonicalProductKey: product.canonical_product_key ?? null,
    existingSlug: product.slug ?? null,
  }));
  const changed = candidates.filter((candidate) => candidate.displayName !== candidate.rawAlias);
  const brandCandidates = candidates.filter((candidate) => candidate.brandName !== candidate.sourceBrandName);
  const reviewRequired = candidates.filter((candidate) => candidate.needsReview);
  const emptyResults = candidates.filter((candidate) => !candidate.displayName || !candidate.slug);
  const canonicalCollisions = findCollisions(candidates, (candidate) => candidate.canonicalProductKey);
  const slugCollisions = findCollisions(candidates, (candidate) => candidate.slug);
  const preservation = validateIdPreservation(products, candidates);
  const generatedAt = new Date().toISOString();
  const artifact = {
    artifactVersion: 1,
    generatedAt,
    source: fixturePath ? 'fixture' : 'production-read-only',
    schemaReady,
    summary: {
      products: products.length,
      changedNames: changed.length,
      brandCandidates: brandCandidates.length,
      reviewRequired: reviewRequired.length,
      emptyResults: emptyResults.length,
      slugCollisionGroups: slugCollisions.length,
      canonicalKeyCollisionGroups: canonicalCollisions.length,
      idsPreserved: preservation.valid,
    },
    collisions: {
      slug: slugCollisions.map(([value, ids]) => ({ value, ids })),
      canonicalProductKey: canonicalCollisions.map(([value, ids]) => ({ value, ids })),
    },
    candidates,
  };

  console.log('카탈로그 정리 드라이런 (쓰기 없음)');
  console.log(`전체 제품: ${products.length}`);
  console.log(`제품명 변경 후보: ${changed.length}`);
  console.log(`브랜드 변경 후보: ${brandCandidates.length}`);
  console.log(`사람 확인 필요: ${reviewRequired.length}`);
  console.log(`빈 결과: ${emptyResults.length}`);
  console.log(`슬러그 충돌 그룹: ${slugCollisions.length}`);
  console.log(`정규 제품키 충돌 그룹: ${canonicalCollisions.length}`);
  console.log(`신규 스키마 조회: ${schemaReady ? '가능' : '아직 미배포'}`);
  console.log(`ID 보존: ${preservation.valid ? '정상' : '실패'}`);

  if (changed.length > 0) {
    console.log('\n변경 예시 (최대 25개, 축약 표시)');
    for (const candidate of changed.slice(0, 25)) {
      console.log(
        `- ${redactId(candidate.productId)} | ${redactText(candidate.rawAlias)} -> ${redactText(candidate.displayName)} | 브랜드: ${redactText(candidate.brandName)}${candidate.needsReview ? ' | 검토 필요' : ''}`,
      );
    }
  }

  if (canonicalCollisions.length > 0) {
    console.log('\n정규 제품키 충돌');
    for (const [key, ids] of canonicalCollisions) {
      console.log(`- ${collisionFingerprint(key)}: ${ids.map(redactId).join(', ')}`);
    }
  }

  if (outputPath) {
    const absolutePath = await writeArtifact(outputPath, artifact);
    console.log(`\nJSON 아티팩트: ${path.relative(process.cwd(), absolutePath)}`);
  }

  if (!preservation.valid) {
    console.error(`ID 보존 실패: ${preservation.missingIds.map(redactId).join(', ') || '중복 ID 감지'}`);
    process.exitCode = 1;
  }
}

if (!mutationRequested) {
  main().catch((error) => {
    console.error(`드라이런 실패: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
