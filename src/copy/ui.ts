/**
 * 베로로 UI 전체 UX 라이팅 단일 소스
 *
 * 브랜드 원칙
 * - 다정함: 보호자를 혼내지 않고 함께 찾아가는 톤
 * - 신뢰감: 과장 없이 사실에 근거
 * - 쉬움: 의학·전문 용어 최소화
 * - 고지 분리: 진단/처방 언급 없이, 참고 정보임을 명확히
 */

// ─── 1. 온보딩 ───────────────────────────────────────────────────────────────

export const ONBOARDING = {
  slide1: {
    title: '우리 아이 사료, 이제 베로로와 함께 읽어요',
    description: '성분표가 어렵게 느껴졌다면, 베로로가 쉽게 풀어드릴게요.',
    cta: '시작하기',
    hint: '3초면 확인할 수 있어요',
  },
  slide2: {
    title: '사진 한 장으로 성분을 확인해요',
    description: '사료 봉투를 카메라에 비추면, 우리 아이와 잘 맞는지 바로 알 수 있어요.',
    cta: '다음',
    hint: '스캔이 어려우면 직접 검색해도 돼요',
  },
  slide3: {
    title: '우리 아이에게 맞춰서 분석해드려요',
    description: '아이 정보를 등록하면, 알러지·나이·체중에 맞는 맞춤 분석을 받을 수 있어요.',
    cta: '우리 아이 등록하기',
    skip: '나중에 등록할게요',
  },
} as const;

// ─── 2. 로그인 ───────────────────────────────────────────────────────────────

export const LOGIN = {
  title: '다시 만났네요, 반가워요',
  description: '로그인하면 우리 아이 맞춤 분석을 이어서 볼 수 있어요.',
  ctaKakao: '카카오로 계속하기',
  ctaApple: 'Apple로 계속하기',
  ctaEmail: '이메일로 로그인',
  signupPrompt: '아직 계정이 없으신가요?',
  signupLink: '가입하기',
  errors: {
    invalidCredentials: '이메일 또는 비밀번호를 다시 확인해주세요.',
    network: '연결이 원활하지 않아요. 잠시 후 다시 시도해주세요.',
    emailRequired: '이메일을 입력해주세요.',
    emailInvalid: '올바른 이메일 형식을 입력해주세요.',
    passwordRequired: '비밀번호를 입력해주세요.',
    passwordMismatch: '비밀번호가 일치하지 않아요.',
  },
} as const;

// ─── 3. 홈 ──────────────────────────────────────────────────────────────────

/** 펫 미등록/이름 누락 시 사용하는 기본 호칭 */
export const DEFAULT_PET_LABEL = '우리 아이';

/** petName이 비어있거나 null이면 기본 호칭으로 폴백 ("null에게…" 노출 방지) */
const petOr = (petName?: string | null) => {
  const n = petName?.trim();
  return n ? n : DEFAULT_PET_LABEL;
};

export const HOME = {
  greeting: (name: string) => `안녕하세요, ${name}님`,
  petGreeting: (petName?: string | null) => `${petOr(petName)}에게 잘 맞는 사료를 찾아볼까요?`,
  ctaScan: '사료 스캔하기',
  searchPlaceholder: '브랜드명이나 제품명을 검색해보세요',
  sectionRecent: '최근에 확인한 사료',
  sectionRecommended: (petName?: string | null) => `${petOr(petName)}에게 잘 맞을 것 같아요`,
  lastScanned: (days: number) => `${days}일 전에 확인한 사료예요`,
  guestBanner: {
    title: '우리 아이 맞춤 분석을 받아보세요',
    description: '아이 정보를 등록하면 더 정확하게 알 수 있어요.',
    cta: '지금 등록하기',
  },
} as const;

// ─── 4. 마이펫 등록 ──────────────────────────────────────────────────────────

export const PET_REGISTER = {
  title: '우리 아이를 소개해주세요',
  description: '이름과 기본 정보만 알면 돼요. 언제든 수정할 수 있어요.',
  fields: {
    nameLabel: '아이 이름',
    namePlaceholder: '예: 베로, 코코, 몽이',
    speciesLabel: '어떤 아이인가요?',
    speciesDog: '강아지',
    speciesCat: '고양이',
    breedLabel: '품종',
    breedPlaceholder: '모르면 건너뛰어도 괜찮아요',
    birthdayLabel: '생년월일',
    birthdayHint: '정확하지 않아도 괜찮아요, 대략적인 나이도 OK',
    weightLabel: '몸무게',
    weightUnit: 'kg',
  },
  allergySection: {
    title: '주의해야 할 성분이 있나요?',
    description: '알러지가 있거나 피하고 싶은 성분을 선택해주세요. 모르면 지금은 건너뛰어도 돼요.',
    multiHint: '여러 개 선택할 수 있어요',
    addCustom: '직접 입력하기',
    skip: '나중에 추가해도 돼요',
  },
  complete: {
    title: (petName: string) => `${petName} 등록 완료!`,
    description: (petName: string) => `이제 ${petName}에게 딱 맞는 사료를 찾아드릴게요.`,
    cta: '사료 찾아보기',
  },
  errors: {
    nameRequired: '아이 이름을 입력해주세요.',
  },
} as const;

// ─── 5. 검색 빈 화면 ─────────────────────────────────────────────────────────

export const SEARCH_EMPTY = {
  title: '어떤 사료가 궁금하세요?',
  description: '브랜드명이나 제품명으로 검색하거나, 카메라로 바로 스캔해보세요.',
  ctaScan: '카메라로 스캔하기',
  sectionPopular: '많이 찾는 사료',
  sectionRecent: '최근에 본 사료',
  clearHistory: '전체 삭제',
  hint: '정확한 이름을 몰라도 괜찮아요',
} as const;

// ─── 6. 검색 결과 없음 ───────────────────────────────────────────────────────

export const SEARCH_NO_RESULTS = {
  title: '딱 맞는 결과를 찾지 못했어요',
  description: (query: string) =>
    `'${query}'와(과) 정확히 일치하는 제품이 없어요. 다른 이름으로 검색하거나 직접 스캔해보세요.`,
  ctaScan: '사료 직접 스캔하기',
  ctaRetry: '다시 검색하기',
  hint: '브랜드명이나 제품 시리즈명으로 검색하면 더 잘 찾을 수 있어요.',
  errors: {
    network: '검색 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.',
  },
} as const;

// ─── 7. 스캐너 안내 ──────────────────────────────────────────────────────────

export const SCANNER_GUIDE = {
  title: '성분표를 화면 안에 맞춰주세요',
  description: '사료 봉투 뒷면의 성분 목록이 잘 보이도록 가까이 가져다 대주세요.',
  ctaScan: '지금 스캔하기',
  ctaSearch: '검색으로 찾기',
  hint1: '빛 반사가 심할 땐 각도를 살짝 바꿔보세요.',
  hint2: '잘 안 될 때는 제품명으로 검색해도 돼요.',
  permission: {
    title: '카메라 사용을 허용해주세요',
    description: '사료 성분표를 스캔하려면 카메라 접근이 필요해요.',
    cta: '허용하기',
    denied: '설정에서 언제든 바꿀 수 있어요.',
  },
} as const;

// ─── 8. 스캔 실패 ────────────────────────────────────────────────────────────

export const SCAN_FAIL = {
  title: '성분표를 잘 인식하지 못했어요',
  description: '조명이 어둡거나 흔들렸을 수 있어요. 다시 한 번 시도해볼게요.',
  ctaRetry: '다시 스캔하기',
  ctaSearch: '검색으로 찾기',
  hint: '글씨가 잘 보이는 곳에서 스캔하면 더 잘 돼요.',
  errors: {
    repeated: '계속 어렵다면 제품명으로 검색해보세요. 대부분의 제품을 찾을 수 있어요.',
    notIngredients: '성분표가 아닌 것 같아요. 봉투 뒷면의 성분 목록 부분을 비춰주세요.',
  },
} as const;

// ─── 9. 성분 분석 완료 ───────────────────────────────────────────────────────

export const ANALYSIS_COMPLETE = {
  title: '분석이 완료됐어요',
  description: (petName: string) => `${petName}에게 잘 맞는 사료인지 확인해봤어요.`,
  compatibilityGood: (petName: string) => `${petName}에게 잘 맞을 것 같아요`,
  compatibilityNeutral: '대체로 괜찮지만, 몇 가지 확인해보세요',
  compatibilityCaution: '한 번 더 살펴보면 좋을 것 같아요',
  ingredientCount: (n: number) => `총 ${n}가지 성분을 확인했어요`,
  ctaDetail: '성분 자세히 보기',
  ctaCompare: '다른 제품과 비교하기',
  ctaSave: '저장해두기',
  disclaimer: '이 분석은 성분 정보를 바탕으로 한 참고용 정보예요.',
} as const;

// ─── 10. 주의 성분 발견 ──────────────────────────────────────────────────────

export const CAUTION_INGREDIENT = {
  safe: {
    badge: '주의 성분 없음',
    title: '특별히 주의할 성분은 없어요',
    description: '등록된 주의 성분과 겹치는 내용이 없어요.',
    hint: '성분 하나하나가 궁금하다면 아래에서 확인해보세요.',
  },
  warning: {
    badge: '확인 권장',
    title: '몇 가지 성분을 확인해보면 좋겠어요',
    description: '일부 아이들이 민감하게 반응할 수 있는 성분이 포함돼 있어요.',
    ingredientNote: (name: string) => `${name} — 일부 반려동물에게 민감할 수 있어요`,
    cta: '어떤 성분인지 보기',
    hint: '민감도는 아이마다 달라요. 걱정된다면 수의사와 이야기 나눠보세요.',
  },
  danger: {
    badge: '주의 성분 포함',
    title: '주의가 필요한 성분이 들어 있어요',
    description: (name: string) => `${name}처럼 반려동물에게 맞지 않을 수 있는 성분이 포함돼 있어요.`,
    ingredientNote: (name: string) => `${name} — 반려동물에게 권장하지 않는 성분이에요`,
    cta: '자세히 보기',
    hint: '이미 먹었다면 이상 증상이 없는지 살펴봐주세요. 걱정이 크다면 수의사에게 연락해보세요.',
  },
} as const;

// ─── 11. 알러지 충돌 발견 ────────────────────────────────────────────────────

export const ALLERGY_CONFLICT = {
  safe: {
    badge: '알러지 성분 없음',
    title: (petName: string) => `${petName}의 알러지 성분이 없어요`,
    description: '등록된 알러지 성분과 겹치는 내용이 없었어요.',
    hint: '새로운 사료는 처음엔 조금씩 급여하며 반응을 살펴보는 게 좋아요.',
  },
  conflict: {
    badge: '알러지 성분 포함',
    title: (petName: string) => `${petName}의 알러지 성분이 들어 있어요`,
    description: (petName: string, ingredient: string) =>
      `${ingredient}이(가) 포함돼 있어요. ${petName}에게 알러지 반응이 있을 수 있어요.`,
    ingredientTag: (petName: string, ingredient: string) => `${ingredient} · ${petName} 알러지 성분`,
    ctaAlternative: '비슷한 사료 찾아보기',
    hint: '알러지 증상이 심하거나 처음 나타났다면 수의사와 상담하는 걸 권해요.',
  },
  multiConflict: {
    badge: '알러지 성분 다수 포함',
    title: (count: number) => `${count}가지 알러지 성분이 들어 있어요`,
    description: (petName: string, count: number) =>
      `${petName}에게 등록된 성분 중 ${count}가지가 이 사료에 포함돼 있어요.`,
    cta: '더 잘 맞는 사료 찾기',
    hint: '지금 이 제품보다 더 잘 맞는 사료를 찾아드릴 수 있어요.',
  },
} as const;

// ─── 13. 급여량 안내 ─────────────────────────────────────────────────────────

export const FEEDING_GUIDE = {
  sectionTitle: '하루 급여량 참고',
  description: '아이의 체중 기준으로 제조사 권장 급여량을 정리했어요.',
  weightLabel: (weight: number) => `${weight}kg 기준`,
  amountRange: (min: number, max: number) => `하루 약 ${min}g ~ ${max}g`,
  hint1: '활동량과 건강 상태에 따라 양을 조절해주세요.',
  hint2: '이미 먹고 있는 사료가 있다면 갑자기 바꾸지 않고 조금씩 섞어주는 게 좋아요.',
  noWeight: {
    message: '체중을 등록하면 맞춤 급여량을 알 수 있어요.',
    cta: '체중 등록하기',
  },
  disclaimer: '급여량은 제품 정보를 기반으로 한 참고 안내예요. 특별한 건강 상태가 있다면 수의사에게 확인해주세요.',
} as const;

// ─── 14. 비교함 빈 화면 ──────────────────────────────────────────────────────

export const COMPARE_EMPTY = {
  title: '비교할 사료를 담아보세요',
  description: '마음에 드는 사료를 2~4개 골라 성분을 나란히 비교할 수 있어요.',
  cta: '사료 찾아보기',
  hint: "검색하거나 스캔한 사료에서 '비교에 담기'를 눌러보세요.",
  capacityNote: '최대 4개까지 담을 수 있어요',
  full: '비교함이 가득 찼어요. 하나를 빼고 추가해주세요.',
} as const;

// ─── 15. 찜 빈 화면 ──────────────────────────────────────────────────────────

export const FAVORITES_EMPTY = {
  title: '마음에 든 사료를 저장해두세요',
  description: '분석한 사료 중 나중에 다시 보고 싶은 건 찜해두면 여기서 한눈에 볼 수 있어요.',
  cta: '사료 둘러보기',
  hint: '사료 분석 결과에서 하트를 누르면 저장돼요.',
  loginRequired: {
    title: '로그인하면 찜 목록을 저장할 수 있어요',
    cta: '로그인하기',
  },
} as const;

// ─── 16. 커뮤니티 글쓰기 ─────────────────────────────────────────────────────

export const COMMUNITY_WRITE = {
  screenTitle: '이야기 나눠요',
  titlePlaceholder: '어떤 이야기를 나눠볼까요?',
  bodyPlaceholder: '우리 아이의 사료 이야기, 궁금한 것, 추천하고 싶은 것 뭐든 좋아요.',
  tagLabel: '태그 추가',
  tagPlaceholder: '예: 소화, 피부, 노령견, 다이어트',
  addPhoto: '사진 추가',
  linkProductLabel: '분석한 사료 연결하기',
  linkProductHint: '분석 결과를 글에 붙이면 다른 보호자들도 참고할 수 있어요.',
  submit: '공유하기',
  saveDraft: '임시저장',
  notice: '다른 보호자를 존중하는 따뜻한 글을 남겨주세요.',
  errors: {
    titleRequired: '제목을 입력해주세요.',
    bodyRequired: '내용을 입력해주세요.',
    uploadFailed: '사진 업로드에 실패했어요. 다시 시도해주세요.',
  },
} as const;

// ─── 17. 성분사전 설명 ───────────────────────────────────────────────────────

export const INGREDIENT_DICT = {
  screenTitle: '성분 사전',
  description: '사료에 자주 등장하는 성분들을 쉽게 정리했어요.',
  searchPlaceholder: '성분명을 검색해보세요',
  categories: {
    protein: '단백질 원료',
    carb: '탄수화물 원료',
    additive: '첨가물',
    preservative: '보존제',
  },
  detailLabels: {
    role: '어떤 역할을 하나요?',
    caution: '알아두면 좋아요',
    source: '어디서 얻나요?',
  },
  hint: '성분 하나하나를 너무 어렵게 생각하지 않아도 돼요. 전체적인 균형이 중요해요.',
  notFound: '아직 등록되지 않은 성분이에요. 계속 업데이트할게요.',
} as const;

// ─── 18. 의료 진단 아님 고지 ─────────────────────────────────────────────────

export const MEDICAL_DISCLAIMER = {
  short: '이 분석은 성분 정보를 바탕으로 한 참고 정보예요. 수의학적 진단이나 처방을 대신하지 않아요.',
  modal: {
    title: '베로로 분석은 이런 정보예요',
    lines: [
      '베로로는 사료의 성분 정보를 쉽게 이해할 수 있도록 도와드려요.',
      '분석 결과는 제품에 표기된 성분을 바탕으로 한 참고 정보예요. 아이의 건강 상태나 질병을 진단하거나 평가하지 않아요.',
      '아이의 건강, 질병, 식이 치료와 관련된 결정은 꼭 수의사와 상담해주세요.',
    ],
    cta: '확인했어요',
  },
  allergyNote: '알러지 충돌 표시는 등록된 정보를 기준으로 해요. 새로운 증상이 나타나면 수의사에게 확인해주세요.',
  feedingNote: '급여량은 제조사 기준을 참고한 안내예요. 아이의 상태에 따라 달라질 수 있어요.',
} as const;

// ─── 19. 회원가입 유도 ───────────────────────────────────────────────────────

export const SIGNUP_PROMPT = {
  analysisGate: {
    title: '더 정확한 분석을 받아보세요',
    description: '우리 아이 정보를 등록하면 알러지와 나이에 맞는 맞춤 분석을 받을 수 있어요.',
    cta: '무료로 시작하기',
    skip: '지금은 괜찮아요',
    hint: '30초면 등록할 수 있어요',
  },
  saveTrigger: {
    title: '로그인하면 저장할 수 있어요',
    description: '마음에 드는 사료를 저장하고 나중에 다시 볼 수 있어요.',
    cta: '로그인 / 가입하기',
    hint: '소셜 계정으로 빠르게 시작할 수 있어요.',
  },
  communityTrigger: {
    title: '함께 이야기 나눠요',
    description: '글을 쓰거나 댓글을 달려면 로그인이 필요해요.',
    cta: '로그인하기',
    hint: '게시글은 로그인 없이도 읽을 수 있어요.',
  },
} as const;

// ─── 20. 구매 전 확인 안내 ───────────────────────────────────────────────────

export const PRE_PURCHASE = {
  sectionTitle: '구매 전에 확인해보세요',
  checklist: [
    '우리 아이의 알러지 성분이 없는지 확인했나요?',
    '나이와 체중에 맞는 제품인가요?',
    '새로운 사료는 기존 사료와 섞어 천천히 바꿔주세요.',
    '처음 먹는 사료라면 소량부터 시작하는 게 좋아요.',
  ],
  ctaBuy: '구매 페이지로 이동',
  ctaCompare: '다른 사료와 비교하기',
  hint: '이미 잘 맞는 사료를 찾았다면, 변경은 신중하게 해주세요.',
  disclaimer: '베로로는 특정 제품을 추천하거나 판매하지 않아요. 구매 결정은 보호자님의 선택이에요.',
} as const;

// ─── 공통 상태 뱃지 ──────────────────────────────────────────────────────────

export const STATUS_BADGE = {
  good: '잘 맞아요',
  caution: '확인 권장',
  warning: '주의 성분 포함',
  danger: '알러지 성분 포함',
  info: '참고 정보',
} as const;

export type StatusBadgeKey = keyof typeof STATUS_BADGE;

// ─── 공통 에러 메시지 ────────────────────────────────────────────────────────

export const COMMON_ERRORS = {
  network: '연결이 원활하지 않아요. 잠시 후 다시 시도해주세요.',
  server: '일시적인 문제가 생겼어요. 잠시 후 다시 시도해주세요.',
  sessionExpired: '오랫동안 자리를 비우셨네요. 다시 로그인해주세요.',
  updateRequired: '더 나은 경험을 위해 앱을 업데이트해주세요.',
  noData: '아직 정보가 없어요. 조금 기다려주세요.',
} as const;
