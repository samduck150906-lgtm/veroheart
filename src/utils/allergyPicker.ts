/**
 * 회피 성분(알레르기) 선택 도우미.
 *
 * 선택지는 서비스가 가진 성분 사전에서 온다. 자유 입력을 앞세우지 않는 이유는
 * 분석 엔진이 성분명을 정규화해 매칭하기 때문이다 — 사전에 없는 임의 문자열이
 * 쌓이면 어느 제품에도 걸리지 않는 값만 늘어난다.
 */

/**
 * 검색 전에 보여 줄 흔한 알레르겐.
 *
 * 보호자가 실제로 자주 찾는 이름들이라 검색어를 떠올리지 못해도 바로 고를 수 있다.
 * 성분 사전에 같은 이름이 있으면 검색 결과와 자연스럽게 이어진다.
 */
export const COMMON_ALLERGY_SUGGESTIONS = [
  '닭고기',
  '소고기',
  '오리',
  '칠면조',
  '돼지고기',
  '양고기',
  '연어',
  '참치',
  '달걀',
  '우유',
  '밀',
  '옥수수',
  '대두',
  '감자',
  '효모',
  '인공색소',
] as const;

function normalize(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
}

/**
 * 검색어에 맞는 성분 후보를 고른다.
 *
 * - 이미 고른 항목은 제외한다.
 * - 앞에서부터 일치하는 이름을 부분 일치보다 앞에 둔다.
 * - 목록이 길어지면 고르기 어려우므로 상한을 둔다.
 */
export function rankAllergyCandidates(
  query: string,
  ingredientNames: string[],
  selected: string[] = [],
  limit = 12,
): string[] {
  const q = normalize(query);
  if (!q) return [];

  const taken = new Set(selected.map(normalize));
  const seen = new Set<string>();
  const matched: string[] = [];

  for (const name of ingredientNames) {
    const key = normalize(name);
    if (!key || taken.has(key) || seen.has(key)) continue;
    if (!key.includes(q)) continue;
    seen.add(key);
    matched.push(name);
  }

  return matched
    .sort((a, b) => {
      const aPrefix = normalize(a).startsWith(q) ? 0 : 1;
      const bPrefix = normalize(b).startsWith(q) ? 0 : 1;
      return aPrefix - bPrefix || a.length - b.length || a.localeCompare(b);
    })
    .slice(0, limit);
}

/** 강아지/고양이 생애 단계 — 표시는 실제 나이를 앞세우고 단계는 보조로 붙인다. */
export type LifeStageLabel = '퍼피' | '키튼' | '청년기' | '중년기' | '시니어';

/**
 * 나이(년) → 생애 단계.
 *
 * 개와 고양이는 나이 드는 속도가 달라 종별로 나눈다. 예전에는 종 구분 없이
 * 아기/성인/시니어 세 칸으로만 나눴고, 실제 나이는 화면 어디에도 없었다.
 */
export function lifeStageLabel(age: number, species: 'Dog' | 'Cat'): LifeStageLabel {
  const years = Number.isFinite(age) ? Math.max(0, age) : 0;
  if (species === 'Cat') {
    if (years < 1) return '키튼';
    if (years < 7) return '청년기';
    if (years < 11) return '중년기';
    return '시니어';
  }
  if (years < 1) return '퍼피';
  if (years < 7) return '청년기';
  if (years < 10) return '중년기';
  return '시니어';
}

/**
 * 화면에 쓸 나이 표기 — "2살 · 청년기".
 *
 * 실제 나이가 앞이고 단계는 보조다. 저장·분석에는 정규화된 숫자 나이만 쓴다.
 */
export function petAgeDisplay(age: number, species: 'Dog' | 'Cat'): string {
  const years = Number.isFinite(age) ? Math.max(0, Math.round(age)) : 0;
  const stage = lifeStageLabel(age, species);
  if (years < 1) return `1살 미만 · ${stage}`;
  return `${years}살 · ${stage}`;
}

/**
 * '없음' 선택지.
 *
 * 선택지를 하나도 고르지 않은 상태가 곧 "알레르기 없음"이다. 따로 저장하는
 * 값이 아니라 빈 목록 자체를 그렇게 읽는다.
 *
 * 이렇게 두면 "'없음'과 다른 항목을 동시에 선택할 수 없다"가 규칙이 아니라
 * 구조가 된다 — 항목이 하나라도 있으면 '없음'이 아니고, '없음'을 고르면 목록이
 * 비워진다. 별도 표식을 목록에 섞어 넣으면 그 값이 분석 엔진까지 흘러가
 * 어느 제품에도 걸리지 않는 회피 성분으로 남는다.
 */
export const NO_ALLERGY_LABEL = '없음';

/** 지금 상태가 '없음'인지. */
export function isNoAllergySelected(selected: string[]): boolean {
  return selected.length === 0;
}

/** '없음'을 고른다 — 고른 항목을 모두 비운다. */
export function selectNoAllergy(): string[] {
  return [];
}

/**
 * 회피 성분을 추가한다.
 *
 * 이미 있으면 그대로 둔다. '없음'이라는 이름 자체는 성분이 아니므로 받지 않는다
 * (사전에 그런 이름이 들어와도 선택지로 새어 나가지 않게 한다).
 */
export function addAllergen(selected: string[], name: string): string[] {
  const value = name.trim();
  if (!value || value === NO_ALLERGY_LABEL) return selected;
  if (selected.some((item) => normalize(item) === normalize(value))) return selected;
  return [...selected, value];
}

/** 회피 성분을 뺀다. 마지막 하나를 빼면 자연스럽게 '없음' 상태가 된다. */
export function removeAllergen(selected: string[], name: string): string[] {
  return selected.filter((item) => normalize(item) !== normalize(name));
}
