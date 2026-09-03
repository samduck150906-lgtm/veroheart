/**
 * 제품명에서 브랜드·표시명 후보를 뽑아 검토용 CSV 로 내보낸다.
 *
 *   npx vite-node scripts/extract-brands.ts                # 운영 DB 에서 읽기
 *   npx vite-node scripts/extract-brands.ts --file a.json  # 제품 목록 파일에서 읽기
 *
 * DB 에 아무것도 쓰지 않는다. 자동 추출은 반드시 틀린 건이 섞이므로, 사람이 CSV 를
 * 확인한 뒤 반영하는 순서를 강제하기 위해서다.
 *
 * 배경: 운영 DB 의 brand_name 은 458건 전부 '쿠팡검색'/'쿠팡상품' 이다. 대량 임포트가
 * 수집 출처를 브랜드 자리에 넣었다. 진짜 브랜드는 판매처 원문 제품명 맨 앞에 있다.
 *
 * 환경 변수 (.env)
 *   VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY  — 제품 목록 조회(읽기 전용)
 */
import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { countFirstTokens, extractBrandCandidates, firstTokenOf } from '../src/utils/brandExtraction';

interface ProductRow {
  id: string;
  name: string;
  brand_name: string | null;
}

/** CSV 한 칸 — 쉼표·따옴표·줄바꿈이 들어가도 깨지지 않게 감싼다. */
function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function loadFromDatabase(): Promise<ProductRow[]> {
  const url = process.env.VITE_SUPABASE_URL ?? '';
  const key = process.env.VITE_SUPABASE_ANON_KEY ?? '';
  if (!url || !key) {
    throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 필요합니다 (.env).');
  }
  const supabase = createClient(url, key);
  const { data, error } = await supabase.from('products').select('id, name, brand_name');
  if (error) throw new Error(`제품 조회 실패: ${error.message}`);
  return (data ?? []) as ProductRow[];
}

async function main() {
  const fileIndex = process.argv.indexOf('--file');
  const outIndex = process.argv.indexOf('--out');
  const outPath = outIndex >= 0 ? process.argv[outIndex + 1] : './data/brand_extraction_review.csv';

  let products: ProductRow[];
  if (fileIndex >= 0) {
    const raw = JSON.parse(await import('node:fs').then((fs) => fs.readFileSync(process.argv[fileIndex + 1], 'utf8')));
    // [id, name, brand, ...] 배열 형태와 {id,name,brand_name} 형태를 모두 받는다.
    products = raw.map((r: unknown) =>
      Array.isArray(r) ? { id: r[0], name: r[1], brand_name: r[2] } : (r as ProductRow),
    );
  } else {
    products = await loadFromDatabase();
  }

  const candidates = extractBrandCandidates(products.map((p) => p.name));

  const header = ['product_id', '원본_제품명', '기존_brand_name', '추출_브랜드', '표시명', '같은브랜드_제품수', '검토사유'];
  const lines = [header.join(',')];
  candidates.forEach((c, i) => {
    const p = products[i];
    lines.push([p.id, p.name, p.brand_name, c.brand, c.displayName, c.occurrences, c.needsReview].map(csvCell).join(','));
  });
  // 엑셀에서 한글이 깨지지 않도록 BOM 을 붙인다.
  writeFileSync(outPath, `﻿${lines.join('\n')}\n`, 'utf8');

  // 브랜드 단위 요약 — 458행을 훑는 대신 브랜드 목록만 확인하면 되도록.
  // 겹치는 후보(탐사 / 탐사6free강아지)는 한 줄에 모아 한 번만 판단하게 한다.
  const counts = countFirstTokens(products.map((p) => p.name));
  const tokens = [...counts.keys()].sort();
  const summary = tokens.map((token) => {
    const related = tokens.filter(
      (other) => other !== token && (other.startsWith(token) || token.startsWith(other)),
    );
    const examples = products
      .filter((p) => firstTokenOf(p.name) === token)
      .slice(0, 2)
      .map((p) => p.name);
    return {
      token,
      count: counts.get(token) ?? 0,
      related: related.join(' / '),
      examples: examples.join(' | '),
    };
  });
  summary.sort((a, b) => b.count - a.count || a.token.localeCompare(b.token));

  const summaryPath = outPath.replace(/\.csv$/, '_브랜드요약.csv');
  const summaryHeader = ['브랜드후보', '제품수', '근거', '겹치는후보', '예시제품명'];
  const summaryLines = [summaryHeader.join(',')];
  for (const row of summary) {
    summaryLines.push(
      [
        row.token,
        row.count,
        row.count >= 2 ? '2건 이상 반복' : '1건뿐 — 확인 필요',
        row.related,
        row.examples,
      ]
        .map(csvCell)
        .join(','),
    );
  }
  writeFileSync(summaryPath, `\ufeff${summaryLines.join('\n')}\n`, 'utf8');

  const withBrand = candidates.filter((c) => c.brand).length;
  const needsReview = candidates.filter((c) => c.needsReview).length;
  const brands = new Set(candidates.filter((c) => c.brand).map((c) => c.brand));

  console.log(`제품 ${products.length}건`);
  console.log(`  브랜드 추출 : ${withBrand}건 (${((withBrand / products.length) * 100).toFixed(1)}%) · 브랜드 ${brands.size}종`);
  console.log(`  검토 필요   : ${needsReview}건`);
  console.log(`  리포트      : ${outPath}`);
  console.log(`  브랜드 요약 : ${summaryPath}  (후보 ${summary.length}종 — 이것만 확인하면 됩니다)`);
  console.log('\nDB 에는 아무것도 쓰지 않았습니다. CSV 를 확인한 뒤 반영하세요.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
