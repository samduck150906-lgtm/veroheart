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
 * 제품명 앞에 붙은 브랜드를 뗀다. 브랜드는 별도 라인에 표시되므로 두 번 보일 필요가 없다.
 *
 * 판매처 원문은 브랜드를 세 가지 모양으로 쓴다.
 *   "탐사 클래식 진도 사료"                  — 그대로 한 단어
 *   "하림펫푸드밥이보약 강아지 기능성 사료"   — 브랜드에 제품라인이 붙어 한 단어
 *   "프로바이오틱 라이브 소형성견용 …"        — 브랜드를 띄어 씀
 * 셋 다 브랜드 부분만 떼고 나머지는 남긴다. 남는 게 없으면 원본을 지킨다.
 */
function stripLeadingBrand(tokens: string[], brand: string): string[] {
  if (!brand || tokens.length === 0) return tokens;
  const first = tokens[0].toLowerCase();

  if (tokens.length > 1 && first === brand) return tokens.slice(1);

  // 브랜드에 제품라인이 붙어 한 단어가 된 경우 — 제품라인은 제품명에 남긴다.
  if (first.startsWith(brand)) {
    const rest = tokens[0].slice(brand.length);
    if (rest.length >= 2) return [rest, ...tokens.slice(1)];
    if (tokens.length > 1) return tokens.slice(1);
  }

  // 브랜드를 띄어 쓴 경우 — 두 단어를 함께 뗀다.
  if (tokens.length > 2 && first + tokens[1].toLowerCase() === brand) return tokens.slice(2);

  return tokens;
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
  tokens = stripLeadingBrand(tokens, (product.brand ?? '').trim().toLowerCase());

  s = tokens.join(' ').replace(/\s{2,}/g, ' ').replace(/^[\s,·-]+|[\s,·-]+$/g, '').trim();

  // 4) 과도 제거로 비었으면 원본 폴백
  return s.length >= 2 ? s : raw;
}

/**
 * 브랜드 자리에 들어온 '수집 출처' 라벨.
 *
 * 대량 임포트가 판매처 이름을 brand_name 에 그대로 넣어서, 운영 DB 의 제품 458개가
 * 전부 '쿠팡검색'(438) 또는 '쿠팡상품'(20) 을 브랜드로 갖고 있다. 이건 브랜드가 아니라
 * 데이터를 어디서 가져왔는지를 뜻하는 내부 값이라 사용자에게 보여줄 것이 아니다.
 *
 * 진짜 브랜드는 긴 제품명 안에 섞여 있어 추출이 필요하다 — 그건 데이터 작업이고,
 * 여기서는 내부 라벨을 화면에 내보내지 않는 것까지만 한다.
 */
const SOURCE_LABEL_BRANDS = new Set(['쿠팡검색', '쿠팡상품', '쿠팡', 'coupang']);

/**
 * 화면에 쓸 브랜드명. 수집 출처 라벨이면 빈 문자열을 돌려주고, 호출부는 브랜드 줄을 숨긴다.
 */
export function resolveBrandLabel(product: NameSource): string {
  const brand = (product.brand ?? '').trim();
  if (!brand) return '';
  return SOURCE_LABEL_BRANDS.has(brand.toLowerCase()) ? '' : brand;
}

/** 브랜드로 쓸 수 없는 수집 출처 라벨인지 — 브랜드 목록·자동완성에서 걸러낸다. */
export function isSourceLabelBrand(brand: string | null | undefined): boolean {
  const value = (brand ?? '').trim().toLowerCase();
  return value.length > 0 && SOURCE_LABEL_BRANDS.has(value);
}

/** 카드 등에서 너무 긴 제목을 안전하게 자를 때 (CSS clamp 보조용, 말줄임 포함) */
export function truncateName(name: string, max = 60): string {
  const n = name.trim();
  return n.length <= max ? n : `${n.slice(0, max - 1).trimEnd()}…`;
}
