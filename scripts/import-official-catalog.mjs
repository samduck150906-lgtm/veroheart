import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export function validateCandidate(candidate) {
  const url = new URL(candidate.sourceUrl);
  if (url.username || url.password || url.search || url.hash) throw new Error('Unsupported official source');
  const royalCanin = url.origin === 'https://www.royalcanin.com' && /^\/kr\/(dogs|cats)\/products\/(retail-products|vet-products)\/[^/]+(?:\/v[0-9]+)?$/.test(url.pathname);
  const hills = url.origin === 'https://www.hillspet.co.kr' && /^\/(dog|cat)-food\/(prescription|science)-diet-[a-z0-9-]+$/.test(url.pathname);
  if (!royalCanin && !hills) throw new Error('Unsupported official source');
  if (candidate.sourceType !== 'manufacturer' || (royalCanin && (candidate.brand !== '로얄캐닌' || !/^\d+$/.test(candidate.sourceProductId)))) throw new Error('Invalid source identity');
  if (hills && (candidate.brand !== '힐스' || candidate.sourceProductId !== url.pathname.split('/').at(-1) ||
    (candidate.species !== url.pathname.slice(1, 4) && !(candidate.species === 'all' && candidate.sourceProductId === 'prescription-diet-ad-urgent-care-canned')))) throw new Error('Invalid source identity');
  if (!candidate.name?.trim() || candidate.name.length > 200 || /인천 공개|제조회사|미취급 정보/.test(candidate.name)) throw new Error('A manufacturer/facility is not a product');
  if (!['dog', 'cat', 'all'].includes(candidate.species) || !['food', 'snack'].includes(candidate.productType)) throw new Error('Invalid product classification');
  if (!Number.isFinite(Date.parse(candidate.retrievedAt)) || !candidate.sourceCaveat?.trim()) throw new Error('Evidence date and limitations are required');
  return candidate;
}

function identity(name, brand) {
  return name.normalize('NFKC').toLowerCase().replaceAll(brand.toLowerCase(), '').replace(/[^0-9a-z가-힣]/g, '');
}

export function buildImportPreview(sources, existing) {
  const seen = new Set();
  const candidates = [];
  for (const source of sources) {
    validateCandidate(source);
    const key = `${new URL(source.sourceUrl).origin}:${source.sourceProductId}:${source.species}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const normalized = identity(source.name, source.brand);
    const possible = existing.filter(row => row.brand_name === source.brand && row.target_pet_type === source.species &&
      (identity(row.name, source.brand).includes(normalized) || normalized.includes(identity(row.name, source.brand))));
    const exact = possible.filter(row => identity(row.name, source.brand) === normalized);
    const action = exact.length === 1 ? 'link_observation' : possible.length ? 'needs_review' : 'create';
    candidates.push({ ...source, action, existingProductId: exact.length === 1 ? exact[0].id : null,
      possibleProductIds: possible.map(row => row.id), verificationStatus: 'pending', analysisStatus: 'unavailable' });
  }
  return { newProducts: candidates.filter(c => c.action === 'create').length,
    linkedProducts: candidates.filter(c => c.action === 'link_observation').length,
    reviewRequired: candidates.filter(c => c.action === 'needs_review').length, candidates };
}

async function readExisting(url, key) {
  const result = [];
  for (let offset = 0; ; offset += 1000) {
    const endpoint = new URL('/rest/v1/products', url);
    endpoint.searchParams.set('select', 'id,name,brand_name,target_pet_type,is_visible');
    endpoint.searchParams.set('order', 'id.asc'); endpoint.searchParams.set('offset', String(offset)); endpoint.searchParams.set('limit', '1000');
    const response = await fetch(endpoint, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!response.ok) throw new Error(`Catalog read failed: ${response.status}`);
    const rows = await response.json(); result.push(...rows); if (rows.length < 1000) return result;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const value = name => args[args.indexOf(name) + 1];
  const file = args.includes('--source') ? value('--source') : 'data/catalog/royal-canin-kr-2026-10-26.json';
  const raw = await readFile(file, 'utf8');
  const hash = createHash('sha256').update(raw).digest('hex');
  const sources = JSON.parse(raw).products;
  const apply = args.includes('--apply');
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (apply && (!url || !key || value('--confirm') !== hash)) throw new Error('Apply requires server credentials and --confirm matching the reviewed source SHA-256');
  const existing = args.includes('--existing')
    ? JSON.parse(await readFile(value('--existing'), 'utf8'))
    : url && key ? await readExisting(url, key) : [];
  const preview = { sourceHash: hash, existingCatalogChecked: args.includes('--existing') || Boolean(url && key), ...buildImportPreview(sources, existing) };
  if (args.includes('--out')) await writeFile(value('--out'), JSON.stringify(preview, null, 2));
  console.log(JSON.stringify({ sourceHash: hash, existingCatalogChecked: preview.existingCatalogChecked, newProducts: preview.newProducts, linkedProducts: preview.linkedProducts, reviewRequired: preview.reviewRequired, apply }));
  if (!apply) return;
  // Always re-read immediately before writes; an old preview is not authority
  // to overwrite a product which another operator has added in the meantime.
  const current = buildImportPreview(sources, await readExisting(url, key));
  const outcomes = [];
  for (const candidate of current.candidates.filter(c => c.action !== 'needs_review')) {
    const response = await fetch(new URL('/rest/v1/rpc/import_official_catalog_product', url), {
      method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_source: candidate }),
    });
    if (!response.ok) throw new Error(`Import failed (${response.status}) for ${candidate.sourceProductId}; completed ${outcomes.length}, retry is idempotent`);
    outcomes.push(await response.json());
  }
  console.log(JSON.stringify({ completed: outcomes.length, outcomes }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
