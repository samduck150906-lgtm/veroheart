/**
 * 인천광역시 반려동물 사료(제조사) 공개 CSV → Supabase products 일괄 upsert
 *
 * 사용:
 *   node scripts/import-incheon-pet-food.mjs "C:/Users/USER/Downloads/인천광역시반려동물사료정보_20240425.csv"
 *   npm run import:incheon -- "경로/파일.csv"
 *
 * 환경: 프로젝트 루트의 .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 또는 SUPABASE_SERVICE_ROLE_KEY)
 * RLS로 insert가 막히면 service_role 키를 사용하세요.
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import iconv from 'iconv-lite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('프로젝트 루트에 .env 파일이 없습니다.');
    process.exit(1);
  }
  const env = {};
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach((line) => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const i = t.indexOf('=');
    if (i === -1) return;
    const k = t.slice(0, i).trim();
    env[k] = t.slice(i + 1).trim();
  });
  return env;
}

/** 따옴표·쉼표 처리 간단 CSV 파서 (한 줄 = 한 행) */
function parseCsv(content) {
  const rows = [];
  let i = 0;
  const len = content.length;

  function readRow() {
    const fields = [];
    let field = '';
    let inQ = false;
    while (i < len) {
      const c = content[i];
      if (inQ) {
        if (c === '"') {
          if (content[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQ = false;
          i++;
          continue;
        }
        field += c;
        i++;
        continue;
      }
      if (c === '"') {
        inQ = true;
        i++;
        continue;
      }
      if (c === ',') {
        fields.push(field);
        field = '';
        i++;
        continue;
      }
      if (c === '\n' || (c === '\r' && content[i + 1] === '\n')) {
        if (c === '\r') i++;
        i++;
        fields.push(field);
        return fields;
      }
      if (c === '\r') {
        i++;
        fields.push(field);
        return fields;
      }
      field += c;
      i++;
    }
    if (field.length || fields.length) fields.push(field);
    return fields.length ? fields : null;
  }

  while (i < len) {
    const row = readRow();
    if (row && row.some((c) => c !== undefined && c !== '')) rows.push(row);
  }
  return rows;
}

function deterministicUuid(seed) {
  const h = createHash('sha256').update(seed, 'utf8').digest();
  const buf = Buffer.from(h.slice(0, 16));
  buf[6] = (buf[6] & 0x0f) | 0x40;
  buf[8] = (buf[8] & 0x3f) | 0x80;
  const hex = buf.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/** DB enum pet_type_enum: dog | cat (all 없음) */
function parseTargetPet(s) {
  const t = (s || '').replace(/\s/g, '');
  if (/고양이/.test(t) && /개/.test(t)) return 'dog';
  if (/고양이/.test(t) && !/개/.test(t)) return 'cat';
  if (/개/.test(t) && !/고양이/.test(t)) return 'dog';
  return 'dog';
}

function mapFormulation(유형) {
  const u = (유형 || '').trim();
  if (!u || u === '미취급 정보') return '미상';
  return u.replace(/,/g, '·');
}

const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80';

function rowToProduct(cols, headerIndex) {
  const 연번 = cols[headerIndex['연번']]?.trim() || '';
  const 제조회사 = cols[headerIndex['제조회사']]?.trim() || '';
  const 유형 = cols[headerIndex['유형(단미_배합)']]?.trim() || '';
  const 중량 = cols[headerIndex['중량']]?.trim() || '';
  const 급여대상 = cols[headerIndex['급여대상']]?.trim() || '';
  const 원재료 = cols[headerIndex['원재료 및 함량']]?.trim() || '';
  const 함유 = cols[headerIndex['함유성분']]?.trim() || '';
  const 주의 = cols[headerIndex['주의사항']]?.trim() || '';
  const 제공량 = cols[headerIndex['1회제공량']]?.trim() || '';

  if (!제조회사) return null;

  const id = deterministicUuid(`incheon-pet-food-20240425-${연번 || 제조회사}`);
  const formulation = mapFormulation(유형);
  const name = `${제조회사} (${formulation} · 인천 공개 #${연번 || '—'})`;

  const notes = [
    중량 && 중량 !== '미취급 정보' ? `중량: ${중량}` : '',
    원재료 && 원재료 !== '비공개(영업정보)' ? `원재료: ${원재료}` : '',
    함유 && 함유 !== '비공개(영업정보)' ? `함유: ${함유}` : '',
    주의 && 주의 !== '미취급 정보' ? `주의: ${주의}` : '',
    제공량 && 제공량 !== '미취급 정보' ? `1회 제공: ${제공량}` : '',
  ]
    .filter(Boolean)
    .join(' | ');

  return {
    id,
    brand_name: 제조회사,
    name,
    product_type: 'food',
    main_category: '사료',
    sub_category: notes ? `공공데이터(인천) · ${notes.slice(0, 200)}` : '공공데이터(인천)',
    target_pet_type: parseTargetPet(급여대상),
    target_life_stage: ['성체'],
    formulation,
    min_price: 0,
    image_url: PLACEHOLDER_IMG,
    review_count: 0,
    avg_rating: 0,
    product_health_concerns: [],
    has_risk_factors: [],
  };
}

async function main() {
  const csvArg = process.argv[2];
  const csvPath = csvArg
    ? path.resolve(csvArg)
    : path.join(process.env.USERPROFILE || '', 'Downloads', '인천광역시반려동물사료정보_20240425.csv');

  if (!fs.existsSync(csvPath)) {
    console.error('CSV 파일을 찾을 수 없습니다:', csvPath);
    console.error('사용법: node scripts/import-incheon-pet-food.mjs "전체경로.csv"');
    process.exit(1);
  }

  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('.env에 VITE_SUPABASE_URL과(또는) SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY가 필요합니다.');
    process.exit(1);
  }

  const buf = fs.readFileSync(csvPath);
  let raw = buf.toString('utf8').replace(/^\uFEFF/, '');
  if (!raw.includes('연번') && !raw.includes('제조회사')) {
    raw = iconv.decode(buf, 'cp949').replace(/^\uFEFF/, '');
  }
  const rows = parseCsv(raw);
  if (rows.length < 2) {
    console.error('CSV에 데이터가 없습니다.');
    process.exit(1);
  }

  const headers = rows[0].map((h) => h.trim());
  const headerIndex = Object.fromEntries(headers.map((h, idx) => [h, idx]));
  const required = ['연번', '제조회사', '유형(단미_배합)', '급여대상'];
  for (const h of required) {
    if (headerIndex[h] === undefined) {
      console.error(`필수 열이 없습니다: ${h}. 실제 열: ${headers.join(', ')}`);
      process.exit(1);
    }
  }

  const seenBrand = new Set();
  const products = [];

  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    if (!cols || !cols.length) continue;
    const brand = cols[headerIndex['제조회사']]?.trim();
    if (!brand) continue;
    const norm = brand.toLowerCase().replace(/\s+/g, '');
    if (seenBrand.has(norm)) continue;
    seenBrand.add(norm);

    const p = rowToProduct(cols, headerIndex);
    if (p) products.push(p);
  }

  console.log(`총 ${rows.length - 1}행 중 제조사 기준 중복 제거 후 ${products.length}건 upsert합니다.`);

  const supabase = createClient(url, key);
  const batchSize = 30;
  for (let i = 0; i < products.length; i += batchSize) {
    const chunk = products.slice(i, i + batchSize);
    const { error } = await supabase.from('products').upsert(chunk, { onConflict: 'id' });
    if (error) {
      console.error('upsert 오류:', error.message);
      process.exit(1);
    }
    console.log(`  … ${Math.min(i + batchSize, products.length)} / ${products.length}`);
  }

  console.log('완료. 앱에서 main_category "사료"로 검색해 보세요.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
