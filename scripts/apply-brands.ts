/**
 * 검토를 마친 브랜드 추출 결과를 products.brand_name 에 반영한다.
 *
 *   npx vite-node scripts/apply-brands.ts                      # 미리보기(기본) — 아무것도 쓰지 않음
 *   npx vite-node scripts/apply-brands.ts -- --sql out.sql     # 적용할 SQL 만 만들어 둔다
 *   npx vite-node scripts/apply-brands.ts -- --apply           # 실제 반영 (서비스 키 필요)
 *
 * 안전장치
 *   - 기본이 미리보기다. --apply 없이는 DB 에 쓰지 않는다.
 *   - 수집 출처가 들어가 있는 자리('쿠팡검색'/'쿠팡상품')만 덮어쓴다. 이미 진짜 브랜드가
 *     들어 있는 행은 건드리지 않는다.
 *   - 근거가 약해 브랜드를 비워 둔 제품은 반영하지 않는다. 지어내는 것보다 낫다.
 *   - 무엇을 바꿨는지 항상 CSV 로 남긴다.
 *
 * 되돌리기: 출처 값은 brand_name 말고도 남아 있다(coupang_product_id 가 있으면 '쿠팡검색',
 * 없으면 '쿠팡상품'). 그래서 이 반영으로 잃는 정보는 없다.
 *
 * 환경 변수 (.env)
 *   VITE_SUPABASE_URL                      — 제품 목록 조회
 *   VITE_SUPABASE_ANON_KEY                 — 조회용
 *   SUPABASE_SERVICE_ROLE_KEY              — --apply 에만 필요(쓰기)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { planChanges, type BrandChange, type ProductRow } from '../src/utils/brandApplyPlan';

function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** SQL 문자열 리터럴 — 작은따옴표를 두 번 써서 감싼다. */
function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function loadFromFile(path: string): ProductRow[] {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  return raw.map((r: unknown) =>
    Array.isArray(r) ? { id: r[0], name: r[1], brand_name: r[2] } : (r as ProductRow),
  );
}

async function loadFromDatabase(url: string, key: string): Promise<ProductRow[]> {
  const supabase = createClient(url, key);
  const { data, error } = await supabase.from('products').select('id, name, brand_name');
  if (error) throw new Error(`제품 조회 실패: ${error.message}`);
  return (data ?? []) as ProductRow[];
}

function writeReport(path: string, changes: BrandChange[]): void {
  const header = ['product_id', '제품명', '기존_brand_name', '반영_brand_name'];
  const lines = [header.join(',')];
  for (const c of changes) {
    lines.push([c.id, c.name, c.before, c.after].map(csvCell).join(','));
  }
  writeFileSync(path, `﻿${lines.join('\n')}\n`, 'utf8');
}

/** 브랜드별로 한 문장씩 — 458건을 458번 UPDATE 하지 않는다. */
function buildSql(changes: BrandChange[]): string {
  const byBrand = new Map<string, string[]>();
  for (const c of changes) {
    const ids = byBrand.get(c.after) ?? [];
    ids.push(c.id);
    byBrand.set(c.after, ids);
  }
  const statements = [...byBrand.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([brand, ids]) => {
      const list = ids.map((id) => sqlLiteral(id)).join(', ');
      return `update products set brand_name = ${sqlLiteral(brand)} where id in (${list});`;
    });
  return `-- scripts/apply-brands.ts 가 만든 SQL — 제품 ${changes.length}건, 브랜드 ${byBrand.size}종\nbegin;\n${statements.join('\n')}\ncommit;\n`;
}

async function applyChanges(url: string, changes: BrandChange[]): Promise<void> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!serviceKey) {
    throw new Error('--apply 에는 SUPABASE_SERVICE_ROLE_KEY 가 필요합니다 (.env).');
  }
  const supabase = createClient(url, serviceKey);
  let done = 0;
  for (const c of changes) {
    const { error } = await supabase.from('products').update({ brand_name: c.after }).eq('id', c.id);
    if (error) throw new Error(`${c.id} 반영 실패: ${error.message}`);
    done += 1;
  }
  console.log(`  반영 완료  : ${done}건`);
}

async function main() {
  const apply = process.argv.includes('--apply');
  const filePath = argValue('--file');
  const sqlPath = argValue('--sql');
  const reportPath = argValue('--report') ?? './data/brand_apply_report.csv';

  const url = process.env.VITE_SUPABASE_URL ?? '';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? '';

  let products: ProductRow[];
  if (filePath) {
    products = loadFromFile(filePath);
  } else {
    if (!url || !anonKey) {
      throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 필요합니다 (.env). 또는 --file 로 제품 목록을 주세요.');
    }
    products = await loadFromDatabase(url, anonKey);
  }

  const { changes, skipped } = planChanges(products);
  const brands = new Set(changes.map((c) => c.after));

  writeReport(reportPath, changes);
  if (sqlPath) writeFileSync(sqlPath, buildSql(changes), 'utf8');

  console.log(`제품 ${products.length}건`);
  console.log(`  반영 대상  : ${changes.length}건 · 브랜드 ${brands.size}종`);
  console.log(`  그대로 둠  : ${skipped}건 (브랜드 근거 없음 또는 이미 반영됨)`);
  console.log(`  변경 목록  : ${reportPath}`);
  if (sqlPath) console.log(`  SQL        : ${sqlPath}`);

  if (!apply) {
    console.log('\n미리보기입니다. DB 에는 아무것도 쓰지 않았습니다. 반영하려면 --apply 를 붙이세요.');
    return;
  }
  await applyChanges(url, changes);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
