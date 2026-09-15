/**
 * 바코드·보장성분 CSV 주고받기.
 *
 * 459개 제품의 바코드와 보장성분을 화면에서 한 줄씩 치는 것은 현실적이지 않다.
 * 내보내서 엑셀로 채우고 다시 올리는 경로가 있어야 여러 사람이 나눠 할 수 있다.
 *
 * 제품명에 쉼표가 들어 있는 경우가 많아(쿠팡 제목에서 온 이름) 큰따옴표 인용을
 * 제대로 다뤄야 한다. 인용을 무시하고 split(',') 하면 열이 밀려서 엉뚱한 제품에
 * 바코드가 붙는다.
 */
import { NUTRITION_KEYS, type NutritionKey, type ProductFactsRow } from '../lib/adminApi';
import { checkBarcode } from './barcode';

/** 엑셀이 한글을 깨뜨리지 않도록 BOM 을 붙인다. */
const BOM = '\uFEFF';

const HEADERS = [
  '제품ID', '제품명', '브랜드', '바코드', '100g당kcal',
  '조단백', '조지방', '조섬유', '조회분', '수분', '칼슘', '인',
] as const;

/** CSV 열 순서 → 보장성분 키. 헤더 다음 열부터 순서대로 대응한다. */
const NUTRITION_COLUMN_ORDER: NutritionKey[] = [
  'crude_protein', 'crude_fat', 'crude_fiber', 'crude_ash', 'moisture', 'calcium', 'phosphorus',
];

function quote(value: string): string {
  // 쉼표·큰따옴표·줄바꿈이 있으면 인용하고, 안의 큰따옴표는 두 번 쓴다(RFC 4180).
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return quote(String(value));
}

/**
 * 채워 넣을 CSV 를 만든다.
 *
 * 제품ID 를 첫 열에 둔다 — 다시 올릴 때 제품명으로 맞추면 이름이 바뀐 제품이
 * 엉뚱하게 매칭되거나 실패한다. ID 는 바뀌지 않는다.
 */
export function toProductFactsCsv(rows: ProductFactsRow[]): string {
  const lines = [HEADERS.join(',')];
  for (const row of rows) {
    lines.push([
      cell(row.id),
      cell(row.name),
      cell(row.brandName),
      // 바코드는 숫자로 보이면 엑셀이 지수 표기로 망가뜨린다. 앞에 = 를 붙이는 대신
      // 인용만 해 두고, 엑셀에서 텍스트 서식으로 열도록 안내한다.
      cell(row.barcode),
      cell(row.kcalPer100g),
      ...NUTRITION_COLUMN_ORDER.map((key) => cell(row.nutrition[key])),
    ].join(','));
  }
  return BOM + lines.join('\r\n');
}

/** RFC 4180 인용 규칙을 지키는 최소 파서. 한 줄이 아니라 파일 전체를 본다. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];

    if (inQuotes) {
      if (char === '"') {
        // 연속한 큰따옴표는 값 안의 큰따옴표 한 개다.
        if (clean[index + 1] === '"') { field += '"'; index += 1; }
        else inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') { inQuotes = true; continue; }
    if (char === ',') { row.push(field); field = ''; continue; }
    if (char === '\r') continue;
    if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += char;
  }

  // 마지막 줄에 줄바꿈이 없을 수 있다.
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((cells) => cells.some((value) => value.trim() !== ''));
}

export interface ParsedFactsRow {
  id: string;
  name: string;
  barcode: string | null;
  kcalPer100g: number | null;
  nutrition: Record<NutritionKey, number | null>;
}

export interface CsvParseResult {
  rows: ParsedFactsRow[];
  /** 줄 번호가 붙은 사람이 읽을 수 있는 오류. 한 줄이라도 있으면 저장하지 않는다. */
  errors: string[];
}

function parseNumber(raw: string, label: string, line: number, max: number, errors: string[]): number | null {
  const value = raw.trim();
  if (!value) return null;
  const parsed = Number(value.replace(/[%\s]/g, ''));
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > max) {
    errors.push(`${line}행 ${label}: "${value}" 는 0에서 ${max} 사이의 숫자여야 합니다.`);
    return null;
  }
  return parsed;
}

/**
 * 채워 온 CSV 를 읽는다.
 *
 * `knownIds` 를 주면 목록에 없는 제품ID 를 오류로 잡는다. 엉뚱한 파일을 올리거나
 * 행을 잘못 복사한 경우를 저장 전에 걸러 낸다.
 */
export function parseProductFactsCsv(text: string, knownIds?: Set<string>): CsvParseResult {
  const table = parseCsv(text);
  const errors: string[] = [];
  if (table.length === 0) return { rows: [], errors: ['빈 파일입니다.'] };

  const [header, ...body] = table;
  if ((header[0] ?? '').trim() !== HEADERS[0]) {
    return {
      rows: [],
      errors: [`첫 열이 "${HEADERS[0]}" 가 아닙니다. 내보내기로 받은 파일을 채워서 올려 주세요.`],
    };
  }
  if (body.length === 0) return { rows: [], errors: ['머리글만 있고 내용이 없습니다.'] };

  const rows: ParsedFactsRow[] = [];
  const seen = new Set<string>();

  body.forEach((cells, index) => {
    const line = index + 2; // 머리글이 1행
    const id = (cells[0] ?? '').trim();
    if (!id) { errors.push(`${line}행: 제품ID 가 비어 있습니다.`); return; }
    if (seen.has(id)) { errors.push(`${line}행: 제품ID 가 앞줄과 중복됩니다.`); return; }
    if (knownIds && !knownIds.has(id)) {
      errors.push(`${line}행: 목록에 없는 제품ID 입니다.`);
      return;
    }
    seen.add(id);

    const name = (cells[1] ?? '').trim();
    const rawBarcode = (cells[3] ?? '').trim();
    const check = checkBarcode(rawBarcode);
    if (!check.valid) {
      errors.push(`${line}행 ${name || id} 바코드: ${check.message}`);
      return;
    }

    const nutrition = Object.fromEntries(
      NUTRITION_KEYS.map((key) => [key, null]),
    ) as Record<NutritionKey, number | null>;
    NUTRITION_COLUMN_ORDER.forEach((key, offset) => {
      nutrition[key] = parseNumber(cells[5 + offset] ?? '', headerLabel(5 + offset), line, 100, errors);
    });

    rows.push({
      id,
      name,
      barcode: check.normalized || null,
      kcalPer100g: parseNumber(cells[4] ?? '', HEADERS[4], line, 1000, errors),
      nutrition,
    });
  });

  return { rows, errors };
}

function headerLabel(columnIndex: number): string {
  return HEADERS[columnIndex] ?? `${columnIndex + 1}열`;
}

export const PRODUCT_FACTS_HEADERS = HEADERS;
