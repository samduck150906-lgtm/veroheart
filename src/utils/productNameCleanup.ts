import { isSourceLabelBrand } from './productDisplay';

const PROMO_TOKENS = new Set([
  '무료배송', '로켓배송', '로켓와우', '오늘출발', '당일발송', '당일출고', '내일도착', '새벽배송',
  '정품', '공식판매', '본사직영', '최저가', '특가', '초특가', '할인', '세일', 'sale',
  '사은품', '증정', '쿠폰', '이벤트', '한정', '베스트', 'best', '핫딜', '득템', '무배',
  '단독특가', '강력추천', '빠른배송', '무료반품', '인기상품',
]);

const PROMO_WORD_RE =
  /(?:무료\s*배송|로켓(?:배송|와우)?|오늘\s*출발|당일(?:발송|출고)|정품|공식\s*판매|본사\s*직영|최저가|초?특가|할인|세일|사은품|증정|쿠폰|이벤트|한정|핫딜|무배|빠른\s*배송|무료\s*반품)/i;

const BRACKET_SEGMENT_RE = /[[(【「{]([^\])】」}]*)[\])】」}]/g;

/** 중량·포장 단위는 SKU 식별자일 수 있어 자동 삭제하지 않는다. */
const SKU_TOKEN_RE = /\d+(?:\.\d+)?\s*(?:kg|g|mg|ml|l|리터|개입|세트|박스|캔|팩|봉|개|매|포|입|p|ea)(?![\p{L}\p{N}])/giu;
const MIN_NAME_LENGTH = 6;
const MIN_NAME_TOKENS = 2;

export interface ProductCleanupSource {
  id: string;
  name: string;
  brandName: string;
}

export interface NameCleanupSuggestion {
  name: string;
  brandName: string;
  reasons: string[];
  risks: string[];
  changed: boolean;
  nameChanged: boolean;
  brandChanged: boolean;
  needsReview: boolean;
  nameNeedsReview: boolean;
  brandNeedsReview: boolean;
}

function compactSpaces(value: string): string {
  return value
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.])/g, '$1')
    .replace(/^[\s,·\-_|]+|[\s,·\-_|]+$/g, '')
    .trim();
}

function skuTokens(value: string): string[] {
  return [...value.matchAll(SKU_TOKEN_RE)].map((match) => match[0].replace(/\s+/g, '').toLowerCase());
}

/** 광고 토큰과 기호만 남는 문구인지 보수적으로 판단한다. */
function isPurelyPromotional(value: string): boolean {
  let rest = value.normalize('NFKC').toLowerCase();
  let previous = '';
  while (rest !== previous) {
    previous = rest;
    rest = rest.replace(PROMO_WORD_RE, ' ');
  }
  return rest.replace(/[\p{P}\p{S}\s]+/gu, '') === '';
}

function stripClearlyPromotionalTail(value: string): { value: string; riskyTail: boolean } {
  const match = /\s*(?:_|\|)\s*/.exec(value);
  if (!match?.index) return { value, riskyTail: false };
  const head = value.slice(0, match.index).trim();
  const tail = value.slice(match.index + match[0].length).trim();
  if (!tail) return { value: head, riskyTail: false };
  if (isPurelyPromotional(tail) && skuTokens(tail).length === 0) return { value: head, riskyTail: false };
  return { value, riskyTail: true };
}

function stripTrailingPromoSegments(value: string): string {
  const parts = value.split(',');
  while (parts.length > 1) {
    const tail = parts.at(-1)?.trim() ?? '';
    if (!tail || isPurelyPromotional(tail) || PROMO_TOKENS.has(tail.toLowerCase())) parts.pop();
    else break;
  }
  return parts.join(',');
}

function stripPromoToken(token: string): boolean {
  const value = token.trim().toLowerCase();
  return !value || PROMO_TOKENS.has(value);
}

function suggestBrand(currentBrand: string, cleanedName: string): {
  brand: string;
  reason: string | null;
  needsReview: boolean;
} {
  const brand = currentBrand.trim();
  if (!isSourceLabelBrand(brand)) return { brand, reason: null, needsReview: false };

  const firstToken = cleanedName.trim().split(/\s+/)[0]?.replace(/^[[(【「{]+|[\])】」},]+$/g, '') ?? '';
  if (firstToken.length < 2 || /^[\d]/.test(firstToken)) {
    return {
      brand,
      reason: `브랜드가 수집 출처('${brand}')이며 확정할 후보가 없음`,
      needsReview: true,
    };
  }
  return {
    brand: firstToken,
    reason: `브랜드가 수집 출처('${brand}')라 제품명 첫 단어를 검토 후보로 제안`,
    needsReview: true,
  };
}

export function suggestProductNameCleanup(input: {
  name: string;
  brandName: string;
}): NameCleanupSuggestion {
  const original = String(input.name ?? '').trim();
  const originalBrand = String(input.brandName ?? '').trim();
  const reasons: string[] = [];
  const risks: string[] = [];

  if (!original) {
    return {
      name: original, brandName: originalBrand, reasons, risks, changed: false,
      nameChanged: false, brandChanged: false, needsReview: true,
      nameNeedsReview: true, brandNeedsReview: isSourceLabelBrand(originalBrand),
    };
  }

  let value = original;
  const withoutBrackets = value.replace(BRACKET_SEGMENT_RE, (whole, content: string) => (
    isPurelyPromotional(content) ? ' ' : whole
  ));
  if (withoutBrackets !== value) {
    reasons.push('광고성 괄호 문구 제거');
    value = withoutBrackets;
  }

  const tail = stripClearlyPromotionalTail(value);
  if (tail.value !== value) {
    reasons.push('구분자 뒤 광고 문구 제거');
    value = tail.value;
  } else if (tail.riskyTail) {
    risks.push('구분자 뒤 문구에 제품 식별 정보가 있을 수 있어 자동 제거하지 않음');
  }

  const withoutPromoSegments = stripTrailingPromoSegments(value);
  if (withoutPromoSegments !== value) {
    reasons.push('끝의 광고·배송 문구 제거');
    value = withoutPromoSegments;
  }

  const tokens = value.split(/\s+/).filter((token) => token && !stripPromoToken(token));
  const joined = tokens.join(' ');
  if (joined !== value.replace(/\s+/g, ' ').trim()) reasons.push('배송·할인 문구 제거');
  value = compactSpaces(joined);

  const originalSku = skuTokens(original);
  const proposedSku = skuTokens(value);
  const removedSku = originalSku.filter((token) => !proposedSku.includes(token));
  if (removedSku.length > 0) {
    risks.push(`SKU 식별 정보(${removedSku.join(', ')})가 사라질 수 있어 원본 유지`);
    value = original;
  }

  if (original.split(',').slice(1).some((part) => skuTokens(part).length > 0)) {
    risks.push('중량·수량·포장 구성이 포함되어 SKU 확인 필요');
  }

  const remainingTokens = value.split(/\s+/).filter(Boolean).length;
  if (value.length < MIN_NAME_LENGTH || remainingTokens < MIN_NAME_TOKENS) {
    risks.push('정리 결과가 너무 짧아 제품 식별력이 부족함');
    value = original;
  }

  const brand = suggestBrand(originalBrand, value);
  if (brand.reason) reasons.push(brand.reason);

  const nameChanged = value !== original;
  const brandChanged = brand.brand !== originalBrand;
  const nameNeedsReview = risks.length > 0;
  const brandNeedsReview = brand.needsReview;
  return {
    name: value,
    brandName: brand.brand,
    reasons,
    risks,
    changed: nameChanged || brandChanged || nameNeedsReview || brandNeedsReview,
    nameChanged,
    brandChanged,
    needsReview: nameNeedsReview || brandNeedsReview,
    nameNeedsReview,
    brandNeedsReview,
  };
}

export function normalizeCleanupIdentity(value: string): string {
  return String(value ?? '').normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}\s]+/gu, '');
}

function withoutSku(value: string): string {
  return normalizeCleanupIdentity(value.replace(SKU_TOKEN_RE, ' '));
}

export function buildProductCleanupSuggestions(
  rows: ProductCleanupSource[],
): Map<string, NameCleanupSuggestion> {
  const suggestions = new Map(rows.map((row) => [
    row.id,
    suggestProductNameCleanup({ name: row.name, brandName: row.brandName }),
  ]));

  for (const row of rows) {
    const suggestion = suggestions.get(row.id);
    if (!suggestion) continue;
    const targetName = normalizeCleanupIdentity(suggestion.name);
    const targetBrand = normalizeCleanupIdentity(suggestion.brandName);
    const baseName = withoutSku(suggestion.name);
    const targetSku = skuTokens(suggestion.name).join('|');
    const extraRisks: string[] = [];

    for (const other of rows) {
      if (other.id === row.id) continue;
      const otherName = normalizeCleanupIdentity(other.name);
      const otherBrand = normalizeCleanupIdentity(other.brandName);
      if (targetName && targetName === otherName && targetBrand === otherBrand) {
        extraRisks.push(`적용 후 다른 제품(${other.id})과 제품명·브랜드가 같아짐`);
        break;
      }
      if (targetName && targetName === otherName) {
        extraRisks.push(`공백·기호·대소문자를 제외하면 다른 제품(${other.id})과 이름이 같음`);
        break;
      }
      if (baseName && baseName === withoutSku(other.name) && targetBrand === otherBrand) {
        const otherSku = skuTokens(other.name).join('|');
        if (targetSku !== otherSku) {
          extraRisks.push(`다른 제품(${other.id})과 중량·포장 정보만 다를 수 있음`);
          break;
        }
      }
    }

    if (extraRisks.length > 0) {
      suggestion.risks = [...new Set([...suggestion.risks, ...extraRisks])];
      suggestion.nameNeedsReview = true;
      suggestion.brandNeedsReview = suggestion.brandNeedsReview || suggestion.brandChanged;
      suggestion.needsReview = true;
      suggestion.changed = true;
    }
  }
  return suggestions;
}
