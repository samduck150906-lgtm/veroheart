/**
 * 라벨 파서 — 분석 파이프라인의 입력단.
 *
 *   라벨 텍스트(OCR/수기) → 섹션 분리 → 토큰화 → 함량% 분리 → 사전 매칭
 *
 * 한국 사료 표시에는 원료명·등록성분량·용도·주의사항 등이 포함되고,
 * 제품명에 원료명을 쓰면 함량 비율(배합기준/건물기준)을 표시한다.
 * 따라서 퍼센트가 있으면 반드시 따로 저장한다.
 */
import type { GuaranteedAnalysis, MatchedIngredient } from './types';
import { findIngredientByName } from './ingredientDictionary';

const INGREDIENT_START = ['원료명', '사용원료', '성분', 'Ingredients', 'ingredients'];
const INGREDIENT_END = [
  '등록성분량',
  '보증성분',
  '보장성분',
  'Guaranteed Analysis',
  '급여량',
  '급여방법',
  '주의사항',
  '유통기한',
];
const GA_START = ['등록성분량', '보증성분', '보장성분', 'Guaranteed Analysis'];
const GA_END = ['급여량', '급여방법', '주의사항', '유통기한', '원산지'];

/**
 * 텍스트에서 start 키워드 이후 ~ end 키워드 이전 구간을 잘라낸다.
 */
export function extractSection(
  text: string,
  startKeywords: string[],
  endKeywords: string[],
): string {
  const normalized = text.replace(/\r/g, '\n');

  const starts = startKeywords
    .map((k) => normalized.indexOf(k))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);
  if (starts.length === 0) return '';

  // start 키워드와 그 뒤의 구분자(: 등)는 건너뛴다.
  const startKw = startKeywords.find((k) => normalized.indexOf(k) === starts[0])!;
  let from = starts[0] + startKw.length;
  while (from < normalized.length && /[:：\s]/.test(normalized[from])) from++;

  const afterStart = normalized.slice(from);

  const ends = endKeywords
    .map((k) => afterStart.indexOf(k))
    .filter((i) => i > 0)
    .sort((a, b) => a - b);

  return (ends.length ? afterStart.slice(0, ends[0]) : afterStart).trim();
}

/**
 * 성분 구간을 개별 토큰으로 분리한다. 괄호 안의 쉼표는 분할하지 않는다.
 * 예: "닭고기(닭, 닭간), 쌀" → ["닭고기(닭, 닭간)", "쌀"]
 */
export function splitIngredients(section: string): string[] {
  const result: string[] = [];
  let current = '';
  let depth = 0;

  for (const ch of section) {
    if (ch === '(' || ch === '（' || ch === '[') depth++;
    else if (ch === ')' || ch === '）' || ch === ']') depth = Math.max(0, depth - 1);

    const isDelimiter = [',', '，', ';', '；', 'ㆍ', '·', '/', '\n'].includes(ch);
    if (isDelimiter && depth === 0) {
      if (current.trim()) result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) result.push(current.trim());

  return result
    .map((x) => x.replace(/^(원료명|성분)[:：]?\s*/g, '').trim())
    .filter((x) => x.length > 0);
}

/**
 * 토큰에서 원료명과 함량%(있으면)를 분리한다.
 * 예: "닭고기(배합기준 30%)" → { originalName: "닭고기", percent: 30, percentBasis: "배합기준" }
 */
export function parseIngredientToken(token: string): {
  originalName: string;
  percent: number | null;
  percentBasis: string | null;
} {
  const re = /[(（]?\s*(배합기준|건물기준|건조기준)?\s*(\d+(?:\.\d+)?)\s*%\s*[)）]?/;
  const m = token.match(re);

  if (m) {
    const name = token.slice(0, m.index).replace(/[(（]\s*$/, '').trim() || token.replace(re, '').trim();
    return {
      originalName: name,
      percent: Number(m[2]),
      percentBasis: m[1] ?? 'unknown',
    };
  }

  return { originalName: token.trim(), percent: null, percentBasis: null };
}

/** 등록성분량(보증성분) 구간에서 수치를 파싱한다. */
export function parseGuaranteedAnalysis(text: string): GuaranteedAnalysis {
  const section = extractSection(text, GA_START, GA_END) || text;
  const ga: GuaranteedAnalysis = {};

  const grab = (labels: string[]): number | undefined => {
    for (const label of labels) {
      const re = new RegExp(`${label}\\s*[:：]?\\s*(\\d+(?:\\.\\d+)?)\\s*%`);
      const m = section.match(re);
      if (m) return Number(m[1]);
    }
    return undefined;
  };

  ga.crudeProtein = grab(['조단백질', '조단백', '粗蛋白', 'crude protein']);
  ga.crudeFat = grab(['조지방', 'crude fat']);
  ga.crudeFiber = grab(['조섬유', 'crude fiber']);
  ga.crudeAsh = grab(['조회분', 'crude ash']);
  ga.moisture = grab(['수분', 'moisture']);
  ga.calcium = grab(['칼슘', 'calcium']);
  ga.phosphorus = grab(['인', 'phosphorus']);

  // undefined 키 제거
  (Object.keys(ga) as (keyof GuaranteedAnalysis)[]).forEach((k) => {
    if (ga[k] === undefined) delete ga[k];
  });
  return ga;
}

export interface ParsedLabel {
  ingredients: MatchedIngredient[];
  guaranteedAnalysis: GuaranteedAnalysis;
  /** 사전 미매칭 원료명 */
  unknowns: string[];
}

/**
 * 라벨 전체 텍스트를 구조화 데이터로 변환한다.
 * 원료명 섹션이 명시되지 않으면 입력 전체를 성분 목록으로 간주한다(폴백).
 */
export function parseLabel(rawText: string): ParsedLabel {
  const section =
    extractSection(rawText, INGREDIENT_START, INGREDIENT_END) || rawText;
  const tokens = splitIngredients(section);

  const ingredients: MatchedIngredient[] = tokens.map((tok, idx) => {
    const { originalName, percent, percentBasis } = parseIngredientToken(tok);
    const dict = findIngredientByName(originalName);
    return {
      originalName,
      position: idx + 1,
      percent,
      percentBasis,
      ingredient: dict,
      confidence: dict ? 0.9 : 0.2,
    };
  });

  return {
    ingredients,
    guaranteedAnalysis: parseGuaranteedAnalysis(rawText),
    unknowns: ingredients.filter((i) => !i.ingredient).map((i) => i.originalName),
  };
}
