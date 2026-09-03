import { normalizeProductDisplayName } from './productDisplay';

/**
 * 제품명에서 브랜드를 뽑아낸다.
 *
 * 운영 DB 의 brand_name 은 458건 전부 '쿠팡검색'(438) / '쿠팡상품'(20) 이다. 대량 임포트가
 * 수집 출처를 브랜드 자리에 넣었기 때문이다. 진짜 브랜드는 판매처 원문 제품명 맨 앞에 있다.
 *   "탐사 클래식 진도 사료"            → 탐사
 *   "로얄캐닌 헤어볼 케어 고양이 사료"   → 로얄캐닌
 *
 * 다만 "첫 단어 = 브랜드" 는 늘 맞지는 않는다. 그래서 **여러 제품에서 반복되는 첫 단어만**
 * 브랜드로 인정한다. 한 번만 나오는 단어는 브랜드인지 그냥 수식어인지 알 수 없어서,
 * 지어내지 않고 '미확인' 으로 남긴다.
 *
 * 이 모듈은 값을 바로 DB 에 쓰기 위한 것이 아니라, 사람이 검토할 후보를 만들기 위한 것이다.
 */

/** 브랜드로 인정하려면 최소 몇 개 제품에서 같은 첫 단어가 나와야 하는가. */
export const MIN_BRAND_OCCURRENCES = 2;

/**
 * 제품명 앞에 붙는 대괄호 블록 — 원산지·판촉 태그이지 브랜드가 아니다.
 * 예: "[국내산 오리] 바삭하고 단백한 …"
 */
const LEADING_TAG_RE = /^\s*[[(【「{][^\])】」}]*[\])】」}]\s*/;

/** 법인 형태 표기 — 브랜드 이름 자체가 아니다. */
const COMPANY_FORM_RE = /^(주식회사|㈜|\(주\)|유한회사|합자회사)\s*/;

export interface BrandCandidate {
  /** 뽑아낸 브랜드 후보. 인정 기준에 못 미치면 빈 문자열. */
  brand: string;
  /** 브랜드를 떼어낸 뒤 남는, 화면에 쓸 제품명. */
  displayName: string;
  /** 같은 첫 단어를 쓰는 제품 수. 1이면 근거가 약하다. */
  occurrences: number;
  /** 사람이 확인해야 하는 이유. 없으면 빈 문자열. */
  needsReview: string;
}

/** 브랜드 후보로 볼 첫 단어를 뽑는다. 판단 근거가 없으면 빈 문자열. */
export function firstTokenOf(rawName: string): string {
  const withoutTag = (rawName ?? '').replace(LEADING_TAG_RE, '');
  const withoutForm = withoutTag.replace(COMPANY_FORM_RE, '');
  const token = withoutForm.trim().split(/[\s,]+/)[0] ?? '';
  // 숫자로 시작하면 용량·수량이지 브랜드가 아니다.
  if (!token || /^[0-9]/.test(token)) return '';
  return token;
}

/** 첫 단어별 제품 수 — 반복 여부가 브랜드라는 유일한 근거다. */
export function countFirstTokens(names: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const name of names) {
    const token = firstTokenOf(name);
    if (token) counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}

/**
 * 다른 브랜드 후보의 앞부분과 겹치는지 — "로얄" 과 "로얄캐닌" 처럼.
 *
 * 둘이 같은 브랜드인지 다른 브랜드인지는 데이터만 봐서는 알 수 없다(실제로 운영
 * 데이터에 "로얄 수피아캔" 과 "로얄캐닌 헤어볼" 이 함께 있다). 임의로 합치지 않고
 * 검토 대상으로 표시만 한다.
 */
function findPrefixConflict(token: string, counts: Map<string, number>): string {
  for (const other of counts.keys()) {
    if (other === token) continue;
    if (other.startsWith(token) || token.startsWith(other)) return other;
  }
  return '';
}

/**
 * 브랜드가 아닌 일반명사 — 첫 단어라도 브랜드로 쓰지 않는다.
 *
 * "강아지 오랄클리닉 덴탈껌 세트" 처럼 브랜드 없이 상품 설명으로 시작하는 제품이 있다.
 * 첫 단어만 보면 '강아지' 가 3번 반복돼 브랜드처럼 보이지만, 실제로는 브랜드가 없는
 * 제품들이다. 이런 값을 브랜드로 넣으면 없느니만 못하다.
 */
const NON_BRAND_TOKENS = new Set([
  '강아지', '강아지간식', '강아지화식', '고양이', '고양이간식',
  '반려동물', '애견', '애묘', '프로바이오틱', '유산균',
]);

/**
 * 앞부분이 겹쳐도 합치지 않을 브랜드 쌍.
 *
 * '로얄 수피아캔' 과 '로얄캐닌 헤어볼' 은 서로 다른 브랜드다. 운영자 확인을 거쳐
 * 분리하기로 했다. 여기에 없는 겹침은 같은 브랜드에 제품라인이 붙은 것으로 본다
 * (탐사 / 탐사6free강아지, 하림펫푸드 / 하림펫푸드밥이보약 …).
 */
const KEEP_SEPARATE = new Set(['로얄', '로얄캐닌']);

/**
 * 겹치는 후보들을 대표 브랜드 하나로 모은다.
 *
 * 원칙은 '짧은 쪽이 브랜드 뿌리, 나머지는 제품라인' 이다(탐사6free강아지 → 탐사).
 * 다만 짧은 쪽이 일반명사면 그걸 브랜드로 쓸 수 없어 더 긴 쪽을 쓴다
 * (프로바이오틱 / 프로바이오틱라이브 → 프로바이오틱라이브. 실제로 "프로바이오틱 라이브"
 * 와 "프로바이오틱라이브" 는 띄어쓰기만 다른 같은 브랜드다).
 */
export function resolveCanonicalBrand(token: string, counts: Map<string, number>): string {
  if (NON_BRAND_TOKENS.has(token)) {
    // 일반명사라도, 그것으로 시작하는 진짜 브랜드가 딱 하나면 그 브랜드로 본다
    // ("프로바이오틱 라이브 …" → 프로바이오틱라이브). 후보가 여럿이면 고를 근거가
    // 없으므로 비워 둔다("강아지" → 강아지간식/강아지화식 둘 다 일반명사).
    const extensions = [...counts.keys()].filter(
      (other) => other !== token && other.startsWith(token) && !NON_BRAND_TOKENS.has(other),
    );
    return extensions.length === 1 ? extensions[0] : '';
  }
  if (KEEP_SEPARATE.has(token)) return token;

  let best = token;
  for (const other of counts.keys()) {
    if (other === token || KEEP_SEPARATE.has(other) || NON_BRAND_TOKENS.has(other)) continue;
    if (!other.startsWith(token) && !token.startsWith(other)) continue;
    if (other.length < best.length) best = other;
  }
  return best;
}

/**
 * 제품명에서 브랜드 부분을 떼어낸다.
 *
 * 띄어 쓴 브랜드("프로바이오틱 라이브 소형성견용")는 첫 단어만 떼면 "라이브 소형성견용"
 * 이 남는다. 뒤 단어까지 합쳐야 브랜드가 되는 경우에는 그 단어도 함께 뗀다.
 */
function stripBrandPrefix(rawName: string, token: string, canonical: string): string {
  const stripped = normalizeProductDisplayName({ name: rawName, brand: token });
  if (canonical === token) return stripped;
  const [next] = stripped.split(/[\s,]+/);
  if (next && token + next === canonical) {
    return normalizeProductDisplayName({ name: stripped, brand: next });
  }
  return stripped;
}

export function extractBrandCandidate(
  rawName: string,
  counts: Map<string, number>,
): BrandCandidate {
  const token = firstTokenOf(rawName);
  const occurrences = token ? (counts.get(token) ?? 0) : 0;

  if (!token) {
    return {
      brand: '',
      displayName: normalizeProductDisplayName({ name: rawName }),
      occurrences: 0,
      needsReview: '첫 단어에서 브랜드를 찾지 못함',
    };
  }

  // 한 번만 나오는 단어라도, 이미 인정된 브랜드에 흡수되면 그 브랜드로 본다
  // ('탐사6free강아지' 1건 → 탐사). 흡수되지 않으면 근거가 없어 비워 둔다.
  const absorbed = resolveCanonicalBrand(token, counts);
  if (occurrences < MIN_BRAND_OCCURRENCES && (!absorbed || absorbed === token)) {
    return {
      brand: '',
      displayName: normalizeProductDisplayName({ name: rawName }),
      occurrences,
      needsReview: `첫 단어 '${token}' 가 이 제품에서만 나옴`,
    };
  }

  const canonical = resolveCanonicalBrand(token, counts);
  if (!canonical) {
    // 브랜드가 아니라 상품 설명으로 시작하는 제품이다.
    return {
      brand: '',
      displayName: normalizeProductDisplayName({ name: rawName }),
      occurrences,
      needsReview: `'${token}' 는 브랜드가 아닌 일반명사`,
    };
  }

  const conflict = findPrefixConflict(token, counts);
  const merged = canonical !== token;
  return {
    brand: canonical,
    // 브랜드는 별도 칸에 두므로 제품명에서는 뗀다.
    displayName: stripBrandPrefix(rawName, token, canonical),
    occurrences,
    needsReview: merged
      ? `'${token}' 를 '${canonical}' 로 합침`
      : conflict && KEEP_SEPARATE.has(token)
        ? `'${conflict}' 와 앞부분이 겹치지만 다른 브랜드로 분리함`
        : '',
  };
}

/** 제품 목록 전체에 대해 후보를 만든다. */
export function extractBrandCandidates(names: string[]): BrandCandidate[] {
  const counts = countFirstTokens(names);
  return names.map((name) => extractBrandCandidate(name, counts));
}
