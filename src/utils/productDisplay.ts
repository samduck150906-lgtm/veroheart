// 제품 표시명 정규화 단일 소스.
// 쿠팡 등 판매처 원문 제목에 붙는 광고·배송·수량 문구를 제거해 사람이 읽기 좋은
// 공식 제품명에 가깝게 정제한다. 단, 제품 구분에 필요한 정보(주원료·연령·기능·맛·
// 제형·용량)는 최대한 보존한다. 무리한 정규식으로 없는 제품명을 만들어내지 않는다.

interface NameSource {
  name?: string | null;
  /** 정제된 공식 제품명이 이미 있으면 최우선 사용 */
  displayName?: string | null;
  brand?: string | null;
}

/** 통째로 제거할 광고/배송/판매 홍보 토큰 (공백 분리 기준, 소문자 비교) */
const PROMO_TOKENS = new Set([
  '무료배송', '로켓배송', '로켓와우', '오늘출발', '당일발송', '당일출고', '내일도착', '새벽배송',
  '정품', '공식', '공식판매', '본사직영', '최저가', '특가', '초특가', '할인', '세일', 'sale',
  '사은품', '증정', '무료', '쿠폰', '이벤트', '한정', '베스트', 'best', '인기', '추천', '신상',
  '단독', '단독특가', '대박', '강력추천', '핫딜', '득템', '가성비', '무배',
]);

/** 수량/묶음 패턴 (제품 구분과 무관한 판매 단위) */
const QUANTITY_RE = /^(?:\d+개|\d+개입|\d+매|\d+팩|\d+포|\d+입|묶음\d*|x\d+|\d+x)$/i;

/** 괄호류 안이 광고/배송 문구일 때 통째 제거 */
const PROMO_BRACKET_RE =
  /[[(【「{][^\])】」}]*(?:무료|로켓|배송|정품|공식|할인|특가|사은품|증정|쿠폰|택배|당일|오늘출발|이벤트|한정|최저가)[^\])】」}]*[\])】」}]/g;

function stripToken(tokenRaw: string): boolean {
  const t = tokenRaw.trim();
  if (!t) return true;
  const low = t.toLowerCase();
  if (PROMO_TOKENS.has(low)) return true;
  if (QUANTITY_RE.test(low)) return true;
  return false;
}

/**
 * 표시용 제품명을 정제한다.
 * 우선순위: displayName → 정제한 name → 원본 name.
 * 정제 결과가 비면(과도 제거) 원본으로 안전 폴백한다.
 */
export function normalizeProductDisplayName(product: NameSource): string {
  const explicit = (product.displayName ?? '').trim();
  const raw = (product.name ?? '').trim();
  if (explicit) return explicit;
  if (!raw) return '';

  // 1) 광고성 괄호 블록 제거
  let s = raw.replace(PROMO_BRACKET_RE, ' ');

  // 2) 토큰 단위로 광고/수량 제거
  let tokens = s.split(/\s+/).filter((tok) => tok && !stripToken(tok));

  // 3) 선행 브랜드명 중복 제거 (브랜드는 별도 라인에 표시되므로)
  const brand = (product.brand ?? '').trim().toLowerCase();
  if (brand && tokens.length > 1 && tokens[0].toLowerCase() === brand) {
    tokens = tokens.slice(1);
  }

  s = tokens.join(' ').replace(/\s{2,}/g, ' ').replace(/^[\s,·-]+|[\s,·-]+$/g, '').trim();

  // 4) 과도 제거로 비었으면 원본 폴백
  return s.length >= 2 ? s : raw;
}

/** 카드 등에서 너무 긴 제목을 안전하게 자를 때 (CSS clamp 보조용, 말줄임 포함) */
export function truncateName(name: string, max = 60): string {
  const n = name.trim();
  return n.length <= max ? n : `${n.slice(0, max - 1).trimEnd()}…`;
}
