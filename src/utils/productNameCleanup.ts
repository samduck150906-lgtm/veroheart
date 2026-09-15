/**
 * 쿠팡 판매 제목 → 제품명 정리 "제안" 생성기.
 *
 * `normalizeProductDisplayName` 은 화면에 그릴 때만 쓰는 표시용 정제이고, 이 모듈은
 * DB 의 products.name / brand_name 자체를 고치기 위한 제안을 만든다. 둘을 나눈 이유:
 *  - 표시용은 원본을 건드리지 않으므로 과감히 지워도 되돌릴 수 있다.
 *  - 데이터 정리는 되돌릴 수 없으므로 "확실히 판매 옵션·광고인 부분"만 제거하고,
 *    나머지는 운영자가 화면에서 보고 직접 판단하게 한다.
 *
 * 그래서 여기서는 없는 제품명을 만들어내지 않는다. 판매처가 붙인 꼬리만 자른다.
 */
import { isSourceLabelBrand } from './productDisplay';

/** 통째로 제거할 광고/배송 토큰 (공백 분리, 소문자 비교). */
const PROMO_TOKENS = new Set([
  '무료배송', '로켓배송', '로켓와우', '오늘출발', '당일발송', '당일출고', '내일도착', '새벽배송',
  '정품', '공식판매', '본사직영', '최저가', '특가', '초특가', '할인', '세일', 'sale',
  '사은품', '증정', '쿠폰', '이벤트', '한정', '베스트', 'best', '핫딜', '득템', '무배',
  '단독특가', '강력추천',
]);

/** 대괄호/괄호 블록이 광고·용량 홍보일 때 통째로 제거. */
const PROMO_BRACKET_RE =
  /[[(【「{][^\])】」}]*(?:무료|로켓|배송|정품|공식|할인|특가|사은품|증정|쿠폰|택배|당일|오늘출발|이벤트|한정|최저가|대용량|기획|세트)[^\])】」}]*[\])】」}]/g;

/** 순수 판매 단위 — 이 값이 나오면 그 뒤는 전부 쿠팡 옵션 문자열로 본다. */
const PURE_OPTION_RE =
  /^(?:\d+(?:\.\d+)?\s*(?:개|개입|매|팩|포|입|세트|박스|캔|봉|p|ea)|\d+(?:\.\d+)?\s*(?:g|kg|mg|ml|l|리터)|무료배송|단품|본품)$/i;

/**
 * 쿠팡 제목 끝에 붙는 옵션 문자열을 자른다.
 *
 * 형태는 언제나 `제품명, 옵션1, 옵션2, 옵션3` 이고 옵션 중 하나는 반드시 수량이나
 * 중량이다. 그 수량/중량이 처음 나오는 지점부터 끝까지를 옵션으로 보고 자른다.
 * (맛 이름은 수량 뒤에 오므로 함께 잘린다.)
 */
function stripTrailingOptions(value: string): string {
  const parts = value.split(',');
  if (parts.length < 2) return value;

  // 맨 앞 조각은 제품명이므로 후보에서 제외한다.
  for (let index = 1; index < parts.length; index += 1) {
    if (PURE_OPTION_RE.test(parts[index].trim())) {
      return parts.slice(0, index).join(',');
    }
  }
  return value;
}

/**
 * `_` 나 `|` 뒤에 붙는 판매자 홍보 문구를 자른다.
 *
 * 예: `... 강아지사료 _ 60%생육, 100%휴먼그레이드, 스팀공법` /
 *     `... 저알러지 간식 | 곤충단백질, 알러지, 눈물자국 개선`
 * 앞부분이 너무 짧아지면(제목 전체가 홍보였던 경우) 자르지 않는다.
 */
function stripMarketingTail(value: string): string {
  for (const separator of [' _ ', '_ ', ' | ', '|']) {
    const at = value.indexOf(separator);
    if (at > 0 && at >= Math.floor(value.length * 0.3)) {
      return value.slice(0, at);
    }
  }
  return value;
}

function stripToken(token: string): boolean {
  const value = token.trim().toLowerCase();
  if (!value) return true;
  return PROMO_TOKENS.has(value);
}

export interface NameCleanupSuggestion {
  /** 제안된 제품명. 바꿀 것이 없으면 원본과 같다. */
  name: string;
  /** 제안된 브랜드. 바꿀 것이 없으면 원본과 같다. */
  brandName: string;
  /** 무엇을 왜 잘랐는지 — 화면에서 운영자에게 보여 준다. */
  reasons: string[];
  /** 제안이 원본과 다른지. */
  changed: boolean;
  /**
   * 기계적으로 자르기엔 위험해 사람이 봐야 하는 경우.
   * (예: 너무 많이 잘렸거나, 남은 이름이 지나치게 짧다)
   */
  needsReview: boolean;
}

/**
 * 안전 기준은 "얼마나 줄었는가"가 아니라 "제품을 알아볼 수 있는 이름이 남았는가"다.
 *
 * 쿠팡 제목은 키워드 나열이 대부분이라 정상적으로 정리해도 70% 넘게 줄어든다.
 * 길이 비율로 막으면 정작 가장 지저분한 제목들이 전부 걸러진다. 그래서 남은
 * 이름이 사람이 읽을 수 있는 최소 형태(두 단어 이상, 여섯 글자 이상)인지만 본다.
 */
const MIN_NAME_LENGTH = 6;
const MIN_NAME_TOKENS = 2;

/**
 * 브랜드 제안.
 *
 * 대량 임포트가 brand_name 에 수집 출처('쿠팡검색')를 넣어 둔 제품이 많다.
 * 그런 경우에만 정리된 제품명의 첫 토큰을 브랜드 후보로 제안한다. 이미 실제
 * 브랜드가 들어 있으면 손대지 않는다.
 */
function suggestBrand(currentBrand: string, cleanedName: string): { brand: string; reason: string | null } {
  const brand = currentBrand.trim();
  if (!isSourceLabelBrand(brand)) return { brand, reason: null };

  const firstToken = cleanedName.trim().split(/\s+/)[0] ?? '';
  // 한 글자이거나 숫자로 시작하면 브랜드로 볼 수 없다.
  if (firstToken.length < 2 || /^[\d[(]/.test(firstToken)) return { brand, reason: null };
  return { brand: firstToken, reason: `브랜드가 수집 출처('${brand}')라 제품명 첫 단어를 제안` };
}

/**
 * 제품 한 건에 대한 정리 제안.
 *
 * 원본을 바꾸지 않는다. 호출부(관리자 화면)가 제안을 보여 주고, 운영자가 고른
 * 항목만 실제로 저장한다.
 */
export function suggestProductNameCleanup(input: {
  name: string;
  brandName: string;
}): NameCleanupSuggestion {
  const original = (input.name ?? '').trim();
  const originalBrand = (input.brandName ?? '').trim();
  const reasons: string[] = [];

  if (!original) {
    return { name: original, brandName: originalBrand, reasons: [], changed: false, needsReview: false };
  }

  let value = original;

  const withoutOptions = stripTrailingOptions(value);
  if (withoutOptions !== value) {
    reasons.push('판매 옵션(수량·중량·맛) 꼬리 제거');
    value = withoutOptions;
  }

  const withoutTail = stripMarketingTail(value);
  if (withoutTail !== value) {
    reasons.push('판매자 홍보 문구 제거');
    value = withoutTail;
  }

  const withoutBrackets = value.replace(PROMO_BRACKET_RE, ' ');
  if (withoutBrackets !== value) {
    reasons.push('광고성 괄호 문구 제거');
    value = withoutBrackets;
  }

  const tokens = value.split(/\s+/).filter((token) => token && !stripToken(token));
  const joined = tokens.join(' ');
  if (joined !== value.replace(/\s+/g, ' ').trim()) {
    reasons.push('배송·할인 문구 제거');
  }
  value = joined;

  // 정리 뒤 남는 구두점 정돈
  value = value
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.])/g, '$1')
    .replace(/^[\s,·\-_|]+|[\s,·\-_|]+$/g, '')
    .trim();

  const remainingTokens = value.split(/\s+/).filter(Boolean).length;
  const needsReview = value.length < MIN_NAME_LENGTH || remainingTokens < MIN_NAME_TOKENS;
  // 과도하게 잘렸으면 제안 자체를 원본으로 되돌리고, 사람이 보게 표시만 남긴다.
  const finalName = needsReview ? original : value;

  const { brand, reason: brandReason } = suggestBrand(originalBrand, finalName);
  if (brandReason) reasons.push(brandReason);

  return {
    name: finalName,
    brandName: brand,
    reasons,
    changed: finalName !== original || brand !== originalBrand,
    needsReview,
  };
}
