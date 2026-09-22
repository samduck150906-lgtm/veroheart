/**
 * 제품 라벨 원문 → 원재료 목록 + 보증성분.
 *
 * 원재료가 비어 있는 제품이 145개, 보증성분이 비어 있는 제품이 455개다. 지금은
 * 관리자가 성분을 하나씩 검색해 붙이고 숫자 일곱 개를 따로 치는 구조라, 제품
 * 하나에 열 번 넘는 조작이 필요하다. 제조사 페이지의 표기를 그대로 붙여넣으면
 * 여기서 한 번에 뽑아낸다.
 *
 * 이 모듈은 값을 만들어내지 않는다. 붙여넣은 글에 있는 것만 꺼내고, 사전에
 * 없는 이름은 매칭하지 않은 채로 돌려준다. 사료 라벨은 반려동물이 먹는 것을
 * 판단하는 근거라, 비슷해 보인다고 추측해 채우면 안 된다.
 */

export const PARSED_NUTRITION_KEYS = [
  'crude_protein',
  'crude_fat',
  'crude_fiber',
  'crude_ash',
  'moisture',
  'calcium',
  'phosphorus',
] as const;

export type ParsedNutritionKey = (typeof PARSED_NUTRITION_KEYS)[number];

export interface ParsedLabel {
  /** 표기 순서 그대로. 분석 엔진의 '제1원료' 판정이 이 순서를 본다. */
  ingredients: string[];
  nutrition: Partial<Record<ParsedNutritionKey, number>>;
}

/** 원재료 구간의 시작을 알리는 표기. 제조사마다 조금씩 다르다. */
const INGREDIENT_HEADING = /(원재료\s*명?|원료\s*명?|ingredients?)\s*[:：]?/i;

/** 보증성분 구간의 시작. 이 앞이 원재료, 이 뒤가 숫자다. */
const NUTRITION_HEADING = /(보증\s*성분|보장\s*성분|등록\s*성분|영양\s*성분|guaranteed\s*analysis)\s*(?:량|치|표)?\s*[:：]?/i;

/**
 * 성분 이름에 쓰이는 한글이 앞뒤에 붙어 있지 않은 자리만 고른다.
 *
 * '탄산칼슘 1%' 같은 원재료 표기를 보증성분 칼슘으로 읽으면, 라벨에 없는
 * 숫자가 제품에 붙는다. '인' 은 특히 위험하다 — '인산칼슘', '인공' 이 모두
 * 걸린다.
 */
const bounded = (word: string) => `(?<![가-힣])${word}(?![가-힣])`;

const NUTRITION_PATTERNS: Record<ParsedNutritionKey, string> = {
  crude_protein: `${bounded('조단백질')}|${bounded('조단백')}|crude\\s*protein`,
  crude_fat: `${bounded('조지방')}|crude\\s*fat`,
  crude_fiber: `${bounded('조섬유')}|crude\\s*fib(?:er|re)`,
  crude_ash: `${bounded('조회분')}|${bounded('회분')}|crude\\s*ash`,
  moisture: `${bounded('수분')}|moisture`,
  calcium: `${bounded('칼슘')}|calcium|${bounded('Ca')}`,
  phosphorus: `${bounded('인')}|phosphorus|${bounded('P')}`,
};

/** 이름 사이에 쓰이는 구분자. 줄바꿈도 한 항목의 끝으로 본다. */
const SEPARATORS = /[,、·;/\n]+/;

/** 사람이 읽는 이름으로 보기 어려운 길이. 이보다 길면 설명 문장으로 본다. */
const MAX_INGREDIENT_LENGTH = 30;

function cleanIngredientName(raw: string): string {
  return raw
    // 괄호 안은 함량·부연 설명이라 이름에서 뺀다. '닭고기(생)' → '닭고기'
    .replace(/[([{［（【][^)\]}］）】]*[)\]}］）】]?/g, ' ')
    .replace(/\d+(?:\.\d+)?\s*%/g, ' ')
    // 목록 앞의 번호·불릿
    .replace(/^[\s\-–—•*]+/, '')
    .replace(/^\d+[.)]\s*/, '')
    // 끝에 붙는 '등', '외'
    .replace(/\s*(등|외)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitIngredientSection(section: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const piece of section.split(SEPARATORS)) {
    const name = cleanIngredientName(piece);
    if (!name) continue;
    if (name.length > MAX_INGREDIENT_LENGTH) continue;
    // 숫자·기호만 남은 조각
    if (!/[가-힣a-z]/i.test(name)) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }

  return names;
}

function parseNutritionSection(section: string): Partial<Record<ParsedNutritionKey, number>> {
  const nutrition: Partial<Record<ParsedNutritionKey, number>> = {};

  for (const key of PARSED_NUTRITION_KEYS) {
    // 이름과 숫자 사이에는 ':', '이상', 공백 정도만 끼어든다. 멀리 떨어진 숫자를
    // 끌어오면 옆 항목의 값을 가져온다.
    const pattern = new RegExp(
      `(?:${NUTRITION_PATTERNS[key]})[^0-9\\n]{0,8}(\\d+(?:\\.\\d+)?)`,
      'i',
    );
    const match = pattern.exec(section);
    if (!match) continue;
    const value = Number(match[1]);
    // 보증성분은 백분율이다. 범위를 벗어나면 다른 숫자를 잘못 집은 것이다.
    if (!Number.isFinite(value) || value < 0 || value > 100) continue;
    nutrition[key] = value;
  }

  return nutrition;
}

/**
 * 라벨 원문을 파싱한다.
 *
 * 구간 표기(원재료 / 보증성분)가 있으면 그 경계로 나누고, 없으면 글 전체를 본다.
 * 다만 표기가 없을 때 보증성분을 한두 개만 찾았다면 받아들이지 않는다 — 원재료
 * 목록에 섞인 '탄산칼슘 1%' 같은 표기를 보증성분으로 오독할 수 있어서다.
 */
export function parseProductLabel(text: string): ParsedLabel {
  const normalized = (text ?? '').replace(/\r\n?/g, '\n');
  if (!normalized.trim()) return { ingredients: [], nutrition: {} };

  const nutritionHeading = NUTRITION_HEADING.exec(normalized);
  const ingredientHeading = INGREDIENT_HEADING.exec(normalized);

  const nutritionStart = nutritionHeading
    ? nutritionHeading.index + nutritionHeading[0].length
    : -1;

  let ingredientSection: string;
  if (ingredientHeading) {
    const start = ingredientHeading.index + ingredientHeading[0].length;
    const end = nutritionHeading && nutritionHeading.index > start
      ? nutritionHeading.index
      : normalized.length;
    ingredientSection = normalized.slice(start, end);
  } else if (nutritionHeading) {
    ingredientSection = normalized.slice(0, nutritionHeading.index);
  } else {
    ingredientSection = normalized;
  }

  const nutritionSection = nutritionStart >= 0 ? normalized.slice(nutritionStart) : normalized;
  const nutrition = parseNutritionSection(nutritionSection);

  // 구간 표기 없이 글 전체를 훑었다면, 보증성분표라고 볼 만큼 항목이 모였을
  // 때만 인정한다.
  const trustNutrition = nutritionHeading !== null || Object.keys(nutrition).length >= 3;

  return {
    ingredients: splitIngredientSection(ingredientSection),
    nutrition: trustNutrition ? nutrition : {},
  };
}
