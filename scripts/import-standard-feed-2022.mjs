/**
 * 한국표준사료성분표 2022(국립축산과학원) 원본 엑셀 → 번들 데이터셋 변환.
 *
 *   node scripts/import-standard-feed-2022.mjs
 *   → src/data/standard_feed_2022.json
 *
 * 원본은 data/korean_standard_feed_table_2022.xlsx 에 그대로 둔다. 수치를 손으로
 * 옮기면 어디서 틀어졌는지 되짚을 수 없어, 변환은 항상 이 스크립트로만 한다.
 *
 * 시트 구조(홈페이지 시트 1장):
 *   1행 = 영양소 이름(5칸마다 하나), 2행 = 원물/건물/표준편차/분석점수/출처,
 *   3행부터 181개 원료. A열 국문명(줄바꿈 포함), B열 영문명.
 *
 * 값은 원물(as-fed) 기준을 쓴다. 제품 라벨의 보증성분치와 같은 기준이라 그대로
 * 비교할 수 있다. 다만 소화율·분해율처럼 원물 칸이 늘 비어 있고 건물 칸에만 값이
 * 있는 영양소가 있어, 그런 영양소는 건물 기준값을 쓰고 묶음 정보에 기준을 적어 둔다.
 * 표준편차는 화면에서 쓰이지 않아 담지 않는다(필요해지면 이 스크립트를 고쳐 다시 뽑는다).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { join } from 'node:path';

const ROOT = process.cwd();
const XLSX_PATH = join(ROOT, 'data/korean_standard_feed_table_2022.xlsx');
const OUT_PATH = join(ROOT, 'src/data/standard_feed_2022.json');
const LEGACY_PATH = join(ROOT, 'src/data/standard_feed_data.json');

/* ── 최소 ZIP 리더 ────────────────────────────────────────────────────
 * xlsx 는 zip 이다. 이 스크립트 하나 때문에 엑셀 파서를 의존성으로 들이지 않는다.
 * 중앙 디렉터리만 훑어 필요한 XML 세 개를 꺼낸다. */
function readZipEntries(buffer) {
  const EOCD_SIG = 0x06054b50;
  let eocd = -1;
  for (let i = buffer.length - 22; i >= 0; i -= 1) {
    if (buffer.readUInt32LE(i) === EOCD_SIG) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('xlsx 가 zip 형식이 아닙니다(EOCD 없음).');

  const total = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = new Map();

  for (let n = 0; n < total; n += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('중앙 디렉터리가 손상됐습니다.');
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);

    // 로컬 헤더의 이름·확장 필드 길이는 중앙 디렉터리와 다를 수 있어 다시 읽는다.
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const raw = buffer.subarray(dataStart, dataStart + compressedSize);
    entries.set(name, method === 8 ? inflateRawSync(raw) : Buffer.from(raw));

    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

const decodeXml = (text) => text
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&amp;/g, '&');

function readSharedStrings(xml) {
  const strings = [];
  for (const si of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    let text = '';
    for (const t of si[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) text += t[1];
    strings.push(decodeXml(text));
  }
  return strings;
}

/** 시트를 { 행번호 → { 열이름 → 값 } } 으로 읽는다. 빈 칸은 담지 않는다. */
function readSheet(xml, shared) {
  const rows = new Map();
  for (const rowMatch of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = {};
    // 값이 없는 칸은 <c .../> 로 닫혀 오기도 한다. 둘 다 받는다.
    for (const cell of rowMatch[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const [, column, attributes, inner = ''] = cell;
      const type = /t="([^"]+)"/.exec(attributes)?.[1];
      const value = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
      let parsed = null;
      if (type === 's' && value != null) parsed = shared[Number(value)];
      else if (type === 'inlineStr') parsed = decodeXml(/<t[^>]*>([\s\S]*?)<\/t>/.exec(inner)?.[1] ?? '');
      else if (value != null) parsed = decodeXml(value);
      if (parsed !== null && parsed !== '') cells[column] = parsed;
    }
    rows.set(Number(rowMatch[1]), cells);
  }
  return rows;
}

const columnIndex = (name) => [...name].reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
function columnName(index) {
  let n = index + 1;
  let name = '';
  while (n > 0) {
    const remainder = (n - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

/** 원본은 줄바꿈으로 이름을 두 줄에 나눠 적는다. 공백 하나로 펴서 쓴다. */
const cleanName = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

/**
 * 유효숫자를 남기면서 자리수를 줄인다.
 *
 * 원본은 12.166736842105264 처럼 평균 계산 결과를 그대로 담고 있다. 표시에 쓰지도
 * 않는 자리까지 번들에 넣으면 파일만 두 배가 된다. 값의 크기에 따라 자리수를 달리해
 * 미량 미네랄(0.0001 단위)도 뭉개지지 않게 한다.
 */
function round(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const magnitude = Math.abs(n);
  const digits = magnitude >= 1 ? 2 : magnitude >= 0.01 ? 3 : 5;
  return Number(n.toFixed(digits));
}

/**
 * 영양소 묶음.
 *
 * 1행 이름만으로는 조단백질·대사에너지가 축종별로 네 번씩 겹쳐 키를 만들 수 없다.
 * 원본의 열 순서가 곧 묶음 순서라 시작 열로 경계를 잡는다.
 */
const GROUPS = [
  { key: 'composition', label: '일반성분', unit: '%', from: 'C', to: 'BF' },
  { key: 'energy', label: '에너지', unit: 'Mcal/kg', from: 'BK', to: 'BK' },
  { key: 'ruminant', label: '반추가축 이용성', unit: '%·Mcal/kg', from: 'BP', to: 'CT' },
  { key: 'swine', label: '돼지 이용성', unit: '%·Mcal/kg', from: 'CY', to: 'EC' },
  { key: 'poultry', label: '가금 이용성', unit: '%·Mcal/kg', from: 'EH', to: 'FL' },
  { key: 'aminoAcids', label: '아미노산', unit: '%', from: 'FQ', to: 'IX' },
  { key: 'minerals', label: '미네랄', unit: '% (철·망간·아연·구리는 mg/kg)', from: 'JC', to: 'KQ' },
  { key: 'vitamins', label: '비타민', unit: 'A·D: 1,000IU/kg, E: mg/kg', from: 'KV', to: 'LF' },
  { key: 'rumen', label: '반추위 분해·인 이용률', unit: '%', from: 'LK', to: 'ND' },
];

const groupOf = (column) => GROUPS.find(
  (group) => columnIndex(column) >= columnIndex(group.from) && columnIndex(column) <= columnIndex(group.to),
);

function main() {
  const entries = readZipEntries(readFileSync(XLSX_PATH));
  const shared = readSharedStrings(entries.get('xl/sharedStrings.xml').toString('utf8'));
  const rows = readSheet(entries.get('xl/worksheets/sheet1.xml').toString('utf8'), shared);

  const header = rows.get(1);
  if (!header) throw new Error('1행(영양소 이름)을 찾지 못했습니다.');

  const dataRows = [...rows.entries()].filter(([number]) => number >= 3).map(([, cells]) => cells);
  const filled = (column) => dataRows.filter((cells) => Number(cells[column] ?? 0) !== 0).length;

  // 블록 = 영양소 하나. 다섯 칸이 원물/건물/표준편차/분석점수/출처 순이다.
  const blocks = Object.keys(header)
    .sort((a, b) => columnIndex(a) - columnIndex(b))
    .map((column) => {
      const group = groupOf(column);
      if (!group) throw new Error(`${column}1 (${header[column]}) 이 어느 묶음에도 들지 않습니다.`);
      const start = columnIndex(column);
      const asFedColumn = columnName(start);
      const dryMatterColumn = columnName(start + 1);

      // 어느 칸이 값을 담고 있는지는 원본이 알려 준다. 소화율·반추위 분해율은 건물
      // 기준으로만 재는 값이라 원물 칸이 통째로 비어 있다. 채워진 칸이 한쪽으로
      // 크게 쏠리면(3배 이상) 그쪽을 값으로 삼는다.
      const asFedCount = filled(asFedColumn);
      const dryMatterCount = filled(dryMatterColumn);
      const useDryMatter = dryMatterCount > 0 && dryMatterCount >= asFedCount * 3;

      return {
        group: group.key,
        name: cleanName(header[column]),
        valueColumn: useDryMatter ? dryMatterColumn : asFedColumn,
        countColumn: columnName(start + 3),
        sourceColumn: columnName(start + 4),
        // 건물 함량 자체는 건물 칸에 적혀 있지만 원물 기준 백분율(100 - 수분)이다.
        basis: useDryMatter && cleanName(header[column]) !== '건물' ? 'dry_matter' : 'as_fed',
      };
    });

  // 축종별 블록은 이름이 겹친다(조단백질·대사에너지). 묶음 안에서 순번을 붙여 구분한다.
  for (const group of GROUPS) {
    const inGroup = blocks.filter((block) => block.group === group.key);
    const seen = new Map();
    for (const block of inGroup) {
      const count = (seen.get(block.name) ?? 0) + 1;
      seen.set(block.name, count);
      block.key = count > 1 ? `${block.name} ${count}` : block.name;
    }
  }

  const items = [];
  for (const [rowNumber, cells] of [...rows.entries()].sort((a, b) => a[0] - b[0])) {
    if (rowNumber < 3) continue;
    const nameKo = cleanName(cells.A);
    if (!nameKo) continue;

    const values = {};
    for (const block of blocks) {
      const value = round(cells[block.valueColumn]);
      if (value === null) continue;
      // 0 은 "분석 결과 0" 일 수도, "분석한 적 없음" 일 수도 있다. 분석점수나 출처가
      // 남아 있으면 실제 값으로 보고, 둘 다 비어 있으면 미분석으로 보고 빼 둔다.
      // (기름의 수분 0%처럼 진짜 0 인 값은 분석점수가 붙어 있어 살아남는다.)
      const analysed = Number(cells[block.countColumn] ?? 0) > 0;
      const cited = cleanName(cells[block.sourceColumn]) !== '' && cells[block.sourceColumn] !== '0';
      if (value === 0 && !analysed && !cited) continue;
      (values[block.group] ??= {})[block.key] = value;
    }

    items.push({
      // 번들에 이미 있는 standard_feed_data.json 과 같은 번호를 쓴다(3행 = 2번).
      id: rowNumber - 1,
      name_ko: nameKo,
      name_en: cleanName(cells.B),
      values,
    });
  }

  // 기존 번들 데이터와 어긋나면 멈춘다. 같은 원본에서 뽑은 두 파일이 서로 다른
  // 원료를 가리키면, 화면에서 성분과 수치가 엇갈린 채로 나간다.
  const legacy = JSON.parse(readFileSync(LEGACY_PATH, 'utf8'));
  if (legacy.length !== items.length) {
    throw new Error(`원료 수가 다릅니다: 기존 ${legacy.length}개, 이번 ${items.length}개`);
  }
  const mismatched = legacy.filter((row, index) => cleanName(row.name_ko) !== items[index].name_ko
    || row.id !== items[index].id);
  if (mismatched.length > 0) {
    throw new Error(`기존 데이터와 이름·번호가 어긋납니다: ${mismatched.slice(0, 3).map((r) => r.name_ko).join(', ')}`);
  }

  const payload = {
    source: '한국표준사료성분표 2022 (농촌진흥청 국립축산과학원)',
    basis: 'as_fed',
    basis_label: '원물(급여 상태) 기준',
    generated_from: 'data/korean_standard_feed_table_2022.xlsx',
    groups: GROUPS.map(({ key, label, unit }) => ({
      key,
      label,
      unit,
      nutrients: blocks
        .filter((block) => block.group === key)
        .map((block) => ({ key: block.key, basis: block.basis })),
    })),
    items,
  };

  writeFileSync(OUT_PATH, `${JSON.stringify(payload, null, 0)}\n`);
  const size = (readFileSync(OUT_PATH).length / 1024).toFixed(0);
  console.log(`원료 ${items.length}개 · 영양소 ${blocks.length}개 → ${OUT_PATH} (${size}kB)`);
}

main();
