#!/usr/bin/env node

/**
 * VERORO production data-quality audit.
 *
 * Read-only by construction: this script only issues GET requests with the public anon key.
 * It never prints the key or row-level member data. Run with:
 *   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... node scripts/audit-production-data.mjs
 */

const baseUrl = String(process.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
const anonKey = String(process.env.VITE_SUPABASE_ANON_KEY ?? '');

if (!baseUrl || !anonKey) {
  console.error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.');
  process.exit(1);
}

const headers = {
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
  Prefer: 'count=exact',
};

async function getPage(table, select, from, to, filters = '') {
  const url = `${baseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}${filters}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { ...headers, Range: `${from}-${to}` },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`${table} read failed (${response.status}): ${body.slice(0, 240)}`);
  return {
    rows: body ? JSON.parse(body) : [],
    count: Number(response.headers.get('content-range')?.split('/')[1] ?? 0),
    bytes: Buffer.byteLength(body),
  };
}

async function getAll(table, select, filters = '') {
  const rows = [];
  let from = 0;
  let total = null;
  while (total === null || from < total) {
    const page = await getPage(table, select, from, from + 999, filters);
    rows.push(...page.rows);
    total = page.count || rows.length;
    if (page.rows.length < 1000) break;
    from += 1000;
  }
  return rows;
}

function emptyArray(value) {
  return !Array.isArray(value) || value.length === 0;
}

function normalizedProductKey(product) {
  return `${String(product.brand_name ?? '').trim().toLowerCase()}|${String(product.name ?? '').trim().toLowerCase()}`;
}

const productAuditColumns =
  'id,name,brand_name,target_pet_type,main_category,image_url,verification_status,barcode,kcal_per_100g,product_health_concerns,has_risk_factors,avg_rating,review_count';
let productVisibilityAvailable = true;
let products;
try {
  products = await getAll('products', `${productAuditColumns},is_visible`);
} catch (error) {
  if (!String(error).includes('products.is_visible does not exist')) throw error;
  productVisibilityAvailable = false;
  products = (await getAll('products', productAuditColumns)).map((row) => ({ ...row, is_visible: true }));
}
const links = await getAll('product_ingredients', 'product_id,ingredient_id,sort_order');
const ingredients = await getAll('ingredients', 'id,name_ko,risk_level');
const reviews = await getAll('reviews', 'product_id,rating');
const nutrition = await getAll('nutritional_profiles', 'product_id');

const linkedProductIds = new Set(links.map((row) => row.product_id));
const nutritionProductIds = new Set(nutrition.map((row) => row.product_id));
const riskByIngredientId = new Map(ingredients.map((row) => [row.id, row.risk_level]));
const dangerousProductIds = new Set(
  links
    .filter((row) => riskByIngredientId.get(row.ingredient_id) === 'danger')
    .map((row) => row.product_id),
);
const reviewsByProduct = new Map();
for (const review of reviews) {
  const values = reviewsByProduct.get(review.product_id) ?? [];
  values.push(Number(review.rating));
  reviewsByProduct.set(review.product_id, values);
}

const duplicateGroups = new Map();
for (const product of products) {
  const key = normalizedProductKey(product);
  const ids = duplicateGroups.get(key) ?? [];
  ids.push(product.id);
  duplicateGroups.set(key, ids);
}

const reviewMismatches = products.filter((product) => {
  const values = reviewsByProduct.get(product.id) ?? [];
  const count = values.length;
  const average = count === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / count;
  return Number(product.review_count ?? 0) !== count || Math.abs(Number(product.avg_rating ?? 0) - average) > 0.005;
});
const riskMismatches = products.filter((product) => {
  const stored = !emptyArray(product.has_risk_factors);
  return stored !== dangerousProductIds.has(product.id);
});

let publicUsers = { readable: false, count: 0, status: null };
try {
  const response = await getPage('users', 'id,nickname,membership_tier,created_at', 0, 0);
  publicUsers = { readable: true, count: response.count, status: 200 };
} catch (error) {
  publicUsers = {
    readable: false,
    count: 0,
    status: Number(String(error).match(/\((\d{3})\)/)?.[1] ?? 0) || null,
  };
}

let listPayload = { currentBytes: null, lightBytes: null, rows: null };
async function measureListPayload(filters) {
  const current = await getPage(
    'products',
    'id,name,brand_name,manufacturer_name,product_type,main_category,sub_category,target_pet_type,target_life_stage,formulation,product_health_concerns,has_risk_factors,verification_status,verified_at,barcode,kcal_per_100g,image_url,review_count,avg_rating,product_ingredients(ingredients(id,name_ko,name_en,risk_level,description))',
    0,
    999,
    filters,
  );
  const light = await getPage(
    'products',
    'id,name,brand_name,main_category,sub_category,target_pet_type,target_life_stage,verification_status,barcode,kcal_per_100g,image_url,review_count,avg_rating',
    0,
    49,
    `${filters}&order=created_at.desc`,
  );
  return { currentBytes: current.bytes, lightBytes: light.bytes, rows: current.rows.length };
}

try {
  listPayload = await measureListPayload(productVisibilityAvailable ? '&is_visible=eq.true' : '');
} catch {
  // The core integrity report remains useful when a deployment is between schema versions.
}

const report = {
  generatedAt: new Date().toISOString(),
  projectHost: new URL(baseUrl).host,
  products: {
    total: products.length,
    visible: products.filter((row) => row.is_visible !== false).length,
    hidden: products.filter((row) => row.is_visible === false).length,
    pending: products.filter((row) => row.verification_status === 'pending').length,
    reviewed: products.filter((row) => row.verification_status === 'reviewed').length,
    verified: products.filter((row) => row.verification_status === 'verified').length,
    withoutIngredients: products.filter((row) => !linkedProductIds.has(row.id)).length,
    withoutNutrition: products.filter((row) => !nutritionProductIds.has(row.id)).length,
    withoutBarcode: products.filter((row) => !String(row.barcode ?? '').trim()).length,
    withoutHealthConcerns: products.filter((row) => emptyArray(row.product_health_concerns)).length,
    withoutImage: products.filter((row) => !String(row.image_url ?? '').trim()).length,
    externalCoupangImages: products.filter((row) => /coupang/i.test(String(row.image_url ?? ''))).length,
    duplicateNameBrandGroups: [...duplicateGroups.values()].filter((ids) => ids.length > 1).length,
    visibilityColumnAvailable: productVisibilityAvailable,
  },
  integrity: {
    productIngredientLinks: links.length,
    orphanProductIngredientLinks: links.filter((row) => !products.some((product) => product.id === row.product_id) || !riskByIngredientId.has(row.ingredient_id)).length,
    nullSortOrder: links.filter((row) => row.sort_order === null || row.sort_order === undefined).length,
    duplicateProductIngredientPairs: links.length - new Set(links.map((row) => `${row.product_id}|${row.ingredient_id}`)).size,
    reviewRows: reviews.length,
    reviewAggregateMismatches: reviewMismatches.length,
    dangerIngredientProducts: dangerousProductIds.size,
    storedRiskMismatches: riskMismatches.length,
  },
  security: {
    publicUsers,
  },
  performance: {
    listPayload,
  },
  enrichmentCandidates: products
    .filter((product) => !linkedProductIds.has(product.id))
    .slice(0, 25)
    .map((product) => ({
      id: product.id,
      name: product.name,
      brand: product.brand_name,
      petType: product.target_pet_type,
      category: product.main_category,
    })),
};

console.log(JSON.stringify(report, null, 2));
