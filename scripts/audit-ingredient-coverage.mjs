#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import 'dotenv/config';

const baseUrl = String(process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
const key = String(
  process.env.SUPABASE_SERVICE_ROLE_KEY
  ?? process.env.VITE_SUPABASE_ANON_KEY
  ?? process.env.SUPABASE_ANON_KEY
  ?? '',
);

if (!baseUrl || !key) {
  console.error('public_or_admin_read_credentials_required');
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' };

async function getAll(table, select, filters = '') {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const response = await fetch(
      `${baseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}${filters}`,
      { method: 'GET', headers: { ...headers, Range: `${from}-${from + 999}` } },
    );
    const body = await response.text();
    if (!response.ok) throw new Error(`${table}_read_failed:${response.status}`);
    const page = body ? JSON.parse(body) : [];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}

const [
  labelSets,
  labelItems,
  canonicals,
  aliases,
  evidence,
  rules,
  ruleEvidence,
] = await Promise.all([
  getAll('product_ingredient_label_sets', 'id,product_id,is_current'),
  getAll('product_ingredient_label_items', 'label_set_id,raw_ingredient_text,normalized_ingredient_text,match_status,canonical_ingredient_id'),
  getAll('canonical_ingredients', 'id,canonical_name_ko,status'),
  getAll('canonical_ingredient_aliases', 'canonical_ingredient_id,alias_text,normalized_alias'),
  getAll('canonical_ingredient_evidence', 'canonical_ingredient_id,source_id,reviewed_at'),
  getAll('canonical_analysis_rules', 'id,rule_key,is_active'),
  getAll('canonical_analysis_rule_evidence', 'rule_id,source_id'),
]);

let reviewQueue = [];
let queueReadable = true;
try {
  reviewQueue = await getAll(
    'canonical_ingredient_review_queue',
    'submitted_text,normalized_text,status,occurrence_count',
    '&status=in.(pending,in_review)',
  );
} catch {
  queueReadable = false;
}

const currentLabelSetIds = new Set(labelSets.filter((row) => row.is_current).map((row) => row.id));
const labelSetProductById = new Map(labelSets.map((row) => [row.id, row.product_id]));
const currentItems = labelItems.filter((row) => currentLabelSetIds.has(row.label_set_id));
const observedByKey = new Map();
for (const item of currentItems) {
  const keyValue = String(item.normalized_ingredient_text ?? item.raw_ingredient_text ?? '').trim();
  if (!keyValue) continue;
  const existing = observedByKey.get(keyValue) ?? { statuses: new Set(), count: 0, products: new Set() };
  existing.statuses.add(item.match_status);
  existing.count += 1;
  const productId = labelSetProductById.get(item.label_set_id);
  if (productId) existing.products.add(productId);
  observedByKey.set(keyValue, existing);
}

const statusCount = (status) => [...observedByKey.values()]
  .filter((entry) => entry.statuses.has(status)).length;
const evidenceCanonicalIds = new Set(
  evidence.filter((row) => row.reviewed_at).map((row) => row.canonical_ingredient_id),
);
const activeWithoutEvidence = canonicals
  .filter((row) => row.status === 'active' && !evidenceCanonicalIds.has(row.id))
  .map((row) => ({ id: row.id, name: row.canonical_name_ko }));
const ruleIdsWithEvidence = new Set(ruleEvidence.map((row) => row.rule_id));
const activeRulesWithoutEvidence = rules
  .filter((row) => row.is_active && !ruleIdsWithEvidence.has(row.id))
  .map((row) => ({ id: row.id, ruleKey: row.rule_key }));

const aliasOwners = new Map();
for (const alias of aliases) {
  const owners = aliasOwners.get(alias.normalized_alias) ?? new Set();
  owners.add(alias.canonical_ingredient_id);
  aliasOwners.set(alias.normalized_alias, owners);
}
const aliasCollisions = [...aliasOwners.entries()]
  .filter(([, owners]) => owners.size > 1)
  .map(([normalizedAlias, owners]) => ({ normalizedAlias, canonicalIngredientIds: [...owners].sort() }))
  .sort((a, b) => a.normalizedAlias.localeCompare(b.normalizedAlias, 'ko'));

const productsWithCurrentLabels = new Set(labelSets.filter((row) => row.is_current).map((row) => row.product_id));
const productsWithUnknown = new Set();
for (const item of currentItems) {
  if (!['unmatched', 'ambiguous', 'unreviewed'].includes(item.match_status)) continue;
  const productId = labelSetProductById.get(item.label_set_id);
  if (productId) productsWithUnknown.add(productId);
}

const registryRaw = await readFile(new URL('../data/ingredient-source-registry.json', import.meta.url));
const registryChecksum = createHash('sha256').update(registryRaw).digest('hex');
const topUnresolved = (queueReadable ? reviewQueue : currentItems
  .filter((row) => ['unmatched', 'ambiguous', 'unreviewed'].includes(row.match_status))
  .map((row) => ({
    submitted_text: row.raw_ingredient_text,
    normalized_text: row.normalized_ingredient_text,
    status: row.match_status,
    occurrence_count: 1,
  })))
  .sort((a, b) => Number(b.occurrence_count ?? 0) - Number(a.occurrence_count ?? 0))
  .slice(0, 25);

const report = {
  generatedAt: new Date().toISOString(),
  projectHost: new URL(baseUrl).host,
  sourceRegistryChecksum: registryChecksum,
  observed: {
    uniqueTerms: observedByKey.size,
    labelItems: currentItems.length,
    matchedUniqueTerms: statusCount('matched'),
    ambiguousUniqueTerms: statusCount('ambiguous'),
    unmatchedUniqueTerms: statusCount('unmatched'),
    unreviewedUniqueTerms: statusCount('unreviewed'),
  },
  productCoverage: {
    productsWithCurrentLabels: productsWithCurrentLabels.size,
    productsFullyMatched: productsWithCurrentLabels.size - productsWithUnknown.size,
    productsPartialOrBlocked: productsWithUnknown.size,
  },
  evidenceIntegrity: {
    activeCanonicalIngredients: canonicals.filter((row) => row.status === 'active').length,
    activeCanonicalIngredientsWithoutReviewedEvidence: activeWithoutEvidence,
    activeRules: rules.filter((row) => row.is_active).length,
    activeRulesWithoutEvidence,
    aliasCollisions,
  },
  reviewQueue: { readable: queueReadable, topUnresolved },
};

const outputIndex = process.argv.indexOf('--output');
if (outputIndex >= 0) {
  const outputPath = process.argv[outputIndex + 1];
  if (!outputPath) throw new Error('output_path_required');
  await writeFile(path.resolve(outputPath), `${JSON.stringify(report, null, 2)}\n`);
}
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

if (activeRulesWithoutEvidence.length > 0 || aliasCollisions.length > 0) process.exitCode = 2;
