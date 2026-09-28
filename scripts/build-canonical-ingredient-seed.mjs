import 'dotenv/config';

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const CLAIM_SUMMARY_LIMIT = 400;
const RISK_USES = new Set(['toxicity_rule', 'allergen_rule', 'risk_claim']);

export function normalizeIngredient(value) {
  return String(value ?? '')
    .toLowerCase().normalize('NFKC')
    .replace(/[()（）[\]{}]/g, '')
    .replace(/가루|파우더/g, '분말')
    .replace(/[*·•▪◦・,]/g, '')
    .replace(/\s+/g, '').trim();
}

export function validateSourceRegistry(registry) {
  if (!registry || registry.version !== 1 || !Array.isArray(registry.sources)) {
    throw new Error('invalid_source_registry');
  }
  const ids = new Set();
  for (const source of registry.sources) {
    for (const field of ['id', 'organization', 'title', 'url', 'sourceType', 'jurisdiction', 'accessedAt']) {
      if (typeof source[field] !== 'string' || !source[field].trim()) throw new Error(`source_${field}_required`);
    }
    if (ids.has(source.id)) throw new Error(`duplicate_source_id:${source.id}`);
    ids.add(source.id);
    if (!Array.isArray(source.allowedUses) || source.allowedUses.length === 0) {
      throw new Error(`source_allowed_uses_required:${source.id}`);
    }
    if (source.sourceType === 'retailer' && source.allowedUses.some((use) => RISK_USES.has(use))) {
      throw new Error(`retailer_risk_evidence_forbidden:${source.id}`);
    }
  }
  return ids;
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'ko'));
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function checksum(value) {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

export function buildCanonicalSeed({ legacyRows, observedRows, registry, generatedAt = '1970-01-01T00:00:00.000Z' }) {
  const sourceIds = validateSourceRegistry(registry);
  const merged = new Map();
  for (const row of legacyRows) {
    const canonicalNameKo = String(row.name_ko ?? row.canonicalNameKo ?? '').trim();
    const normalizedKey = normalizeIngredient(canonicalNameKo);
    if (!normalizedKey) continue;
    const evidenceSourceIds = uniqueSorted(row.evidenceSourceIds ?? []);
    for (const id of evidenceSourceIds) if (!sourceIds.has(id)) throw new Error(`unknown_source_id:${id}`);
    if (row.status === 'active' && evidenceSourceIds.length === 0) throw new Error(`active_without_evidence:${canonicalNameKo}`);
    if (row.claimSummary && String(row.claimSummary).length > CLAIM_SUMMARY_LIMIT) {
      throw new Error(`claim_summary_too_long:${canonicalNameKo}`);
    }
    const existing = merged.get(normalizedKey);
    const aliases = uniqueSorted([
      ...(row.aliases ?? []),
      row.name_en,
      ...(existing?.aliases ?? []),
      ...(existing ? [canonicalNameKo] : []),
    ]);
    merged.set(normalizedKey, existing ? {
      ...existing,
      aliases,
      evidenceSourceIds: uniqueSorted([...existing.evidenceSourceIds, ...evidenceSourceIds]),
      legacyIds: uniqueSorted([...existing.legacyIds, row.id]),
    } : {
      canonicalNameKo,
      normalizedKey,
      dimensions: {
        sourceFamily: row.sourceFamily ?? null,
        sourceSpecies: row.sourceSpecies ?? null,
        sourcePart: row.sourcePart ?? null,
        processingForm: row.processingForm ?? null,
        identityKey: row.identityKey ?? null,
      },
      aliases,
      evidenceSourceIds,
      requestedStatus: row.status ?? 'draft',
      legacyIds: row.id ? [row.id] : [],
      observedTerms: [],
    });
  }

  const aliasOwners = new Map();
  for (const item of merged.values()) {
    for (const alias of [item.canonicalNameKo, ...item.aliases]) {
      const key = normalizeIngredient(alias);
      if (!key) continue;
      const owners = aliasOwners.get(key) ?? new Set();
      owners.add(item.normalizedKey);
      aliasOwners.set(key, owners);
    }
  }
  const collisions = [...aliasOwners.entries()]
    .filter(([, owners]) => owners.size > 1)
    .map(([normalizedAlias, owners]) => ({ normalizedAlias, canonicalKeys: [...owners].sort() }))
    .sort((a, b) => a.normalizedAlias.localeCompare(b.normalizedAlias, 'ko'));
  const collisionKeys = new Set(collisions.flatMap((entry) => entry.canonicalKeys));

  const reviewQueue = [];
  for (const observed of observedRows) {
    const term = String(observed.term ?? observed.raw_name ?? observed.raw_ingredient_text ?? '').trim();
    const normalizedText = normalizeIngredient(term);
    if (!normalizedText) continue;
    const owners = aliasOwners.get(normalizedText) ?? new Set();
    if (owners.size === 1) {
      const owner = merged.get([...owners][0]);
      owner.observedTerms = uniqueSorted([...owner.observedTerms, term]);
    } else {
      reviewQueue.push({
        submittedText: term,
        normalizedText,
        occurrenceCount: Number(observed.occurrenceCount ?? observed.occurrences ?? 1),
        affectedProductIds: uniqueSorted(observed.productIds ?? (observed.sample_product_id ? [observed.sample_product_id] : [])),
        candidateCanonicalKeys: [...owners].sort(),
        reason: owners.size > 1 ? 'alias_collision' : 'unmatched',
      });
    }
  }

  const ingredients = [...merged.values()].map((item) => ({
    canonicalNameKo: item.canonicalNameKo,
    normalizedKey: item.normalizedKey,
    dimensions: item.dimensions,
    aliases: item.aliases,
    evidenceSourceIds: item.evidenceSourceIds,
    status: collisionKeys.has(item.normalizedKey)
      ? 'needs_review'
      : item.requestedStatus === 'active' && item.evidenceSourceIds.length > 0 ? 'active' : 'draft',
    legacyId: item.legacyIds[0] ?? null,
    observedTerms: uniqueSorted(item.observedTerms),
  })).sort((a, b) => a.normalizedKey.localeCompare(b.normalizedKey, 'ko'));
  reviewQueue.sort((a, b) => a.normalizedText.localeCompare(b.normalizedText, 'ko'));
  const payload = { ingredients, reviewQueue, collisions };
  const seedChecksum = checksum(payload);
  return {
    seed: { version: 1, generatedAt, ingredients, checksum: seedChecksum },
    reviewQueue,
    report: {
      generatedAt,
      checksum: seedChecksum,
      legacyRows: legacyRows.length,
      canonicalRows: ingredients.length,
      observedRows: observedRows.length,
      matchedObservedTerms: ingredients.reduce((sum, item) => sum + item.observedTerms.length, 0),
      unresolvedObservedTerms: reviewQueue.length,
      collisions,
    },
  };
}

async function fetchJson(url, key) {
  const response = await fetch(url, { headers: { apikey: key, authorization: `Bearer ${key}` } });
  if (!response.ok) return [];
  return response.json();
}

async function productionInputs() {
  const base = (process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
  const key = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
  if (!base || !key) throw new Error('public_supabase_credentials_required');
  const api = `${base}/rest/v1`;
  const [legacyRows, unmatched, labelItems] = await Promise.all([
    fetchJson(`${api}/ingredients?select=id,name_ko,name_en&order=name_ko.asc`, key),
    fetchJson(`${api}/unmatched_ingredients?select=raw_name,occurrences,sample_product_id&limit=5000`, key),
    fetchJson(`${api}/product_ingredient_label_items?select=raw_ingredient_text&limit=10000`, key),
  ]);
  const counts = new Map();
  for (const row of labelItems) {
    const term = row.raw_ingredient_text;
    if (term) counts.set(term, (counts.get(term) ?? 0) + 1);
  }
  return {
    legacyRows,
    observedRows: [
      ...unmatched.map((row) => ({ term: row.raw_name, occurrenceCount: row.occurrences, productIds: row.sample_product_id ? [row.sample_product_id] : [] })),
      ...[...counts].map(([term, occurrenceCount]) => ({ term, occurrenceCount, productIds: [] })),
    ],
  };
}

export async function writeSeedOutputs(outputDir, result) {
  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeFile(path.join(outputDir, 'canonical-seed.json'), `${JSON.stringify(result.seed, null, 2)}\n`),
    writeFile(path.join(outputDir, 'review-queue.json'), `${JSON.stringify(result.reviewQueue, null, 2)}\n`),
    writeFile(path.join(outputDir, 'seed-report.json'), `${JSON.stringify(result.report, null, 2)}\n`),
  ]);
}

async function main() {
  const outputFlag = process.argv.indexOf('--output');
  const outputDir = outputFlag >= 0 ? process.argv[outputFlag + 1] : null;
  if (!outputDir) throw new Error('--output is required');
  const registry = JSON.parse(await readFile(new URL('../data/ingredient-source-registry.json', import.meta.url), 'utf8'));
  const input = await productionInputs();
  const generatedAt = new Date().toISOString();
  const result = buildCanonicalSeed({ ...input, registry, generatedAt });
  await writeSeedOutputs(outputDir, result);
  process.stdout.write(`${JSON.stringify(result.report)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
