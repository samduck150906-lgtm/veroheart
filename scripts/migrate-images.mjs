/**
 * migrate-images.mjs
 * 
 * DB products 테이블의 ads-partners.coupang.com 이미지들을
 * Supabase Storage (product-images 버킷)에 다운로드 후 업로드하고
 * image_url을 영구 Storage URL로 업데이트합니다.
 * 
 * 사용: node scripts/migrate-images.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nlutpmjloryqdomgbqrr.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME  = 'product-images';
const CONCURRENCY  = 5;  // 동시 업로드 수
const SKIP_ALREADY_MIGRATED = true; // 이미 supabase.co URL이면 건너뜀

if (!SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is missing from environment variables!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── Helper: download image to buffer ────────────────────────────────────────
async function downloadImage(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  const buffer = await res.arrayBuffer();
  return { buffer: Buffer.from(buffer), contentType };
}

// ── Helper: upload to Supabase Storage ──────────────────────────────────────
async function uploadToStorage(productId, buffer, contentType) {
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const path = `${productId}.${ext}`;

  // Check if already exists
  const { data: existData } = await supabase.storage.from(BUCKET_NAME).list('', { search: path });
  if (existData?.some(f => f.name === path)) {
    // Already uploaded — return public URL
    const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
    return publicUrl;
  }

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, buffer, {
    contentType,
    upsert: true,
    cacheControl: '31536000', // 1 year
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  return publicUrl;
}

// ── Helper: update DB ────────────────────────────────────────────────────────
async function updateProductImageUrl(productId, newUrl) {
  const { error } = await supabase
    .from('products')
    .update({ image_url: newUrl })
    .eq('id', productId);
  if (error) throw new Error(`DB update failed: ${error.message}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('📦 Supabase product image migration starting...\n');

  // 1. Ensure bucket exists (create if not)
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
  if (!bucketExists) {
    console.log(`Creating bucket: ${BUCKET_NAME}`);
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, { public: true });
    if (error) {
      console.error('Failed to create bucket:', error.message);
      process.exit(1);
    }
    console.log('✅ Bucket created\n');
  } else {
    console.log(`✅ Bucket "${BUCKET_NAME}" already exists\n`);
  }

  // 2. Fetch all products
  let allProducts = [];
  let from = 0;
  const pageSize = 200;
  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, image_url')
      .range(from, from + pageSize - 1);
    if (error) { console.error('Fetch error:', error); break; }
    allProducts = allProducts.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  console.log(`📊 Total products: ${allProducts.length}`);

  const toMigrate = SKIP_ALREADY_MIGRATED
    ? allProducts.filter(p => p.image_url && !p.image_url.includes('supabase.co'))
    : allProducts.filter(p => p.image_url);

  console.log(`🔄 To migrate: ${toMigrate.length}\n`);

  let success = 0, failed = 0, skipped = 0;

  // 3. Process in batches of CONCURRENCY
  for (let i = 0; i < toMigrate.length; i += CONCURRENCY) {
    const batch = toMigrate.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (product) => {
      const idx = i + batch.indexOf(product) + 1;
      const prefix = `[${idx}/${toMigrate.length}] ${product.name.slice(0, 40)}`;
      try {
        const { buffer, contentType } = await downloadImage(product.image_url);
        const newUrl = await uploadToStorage(product.id, buffer, contentType);
        await updateProductImageUrl(product.id, newUrl);
        console.log(`  ✅ ${prefix}`);
        console.log(`     → ${newUrl.slice(0, 80)}...`);
        success++;
      } catch (err) {
        console.error(`  ❌ ${prefix}: ${err.message}`);
        failed++;
      }
    }));
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`✅ Success: ${success}  ❌ Failed: ${failed}  ⏭️  Skipped: ${skipped}`);
  console.log('Migration complete!');
}

main().catch(console.error);
