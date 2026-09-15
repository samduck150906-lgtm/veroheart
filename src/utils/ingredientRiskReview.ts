/**
 * 성분 위험도 검수 — 사전에 등록된 위험도가 맞는지 점검할 "후보"를 만든다.
 *
 * 운영 사전은 대량 임포트로 만들어져서 두 가지 문제가 있다.
 *  1. 같은 물질이 표기만 다르게 여러 번 등록되고, 그 사이에 위험도가 엇갈린다.
 *     (아질산나트륨=위험 / 소듐 나이트라이트=주의 — 같은 물질이다)
 *  2. 반려동물에게 위험하다고 널리 알려진 성분이 아예 빠져 있다.
 *     (자일리톨·양파·포도·BHA·에톡시퀸 등)
 *
 * 그래서 여기서는 자동으로 위험도를 바꾸지 않는다. "이건 다시 봐야 한다"는
 * 후보와 근거만 만들고, 판단은 운영자가 화면에서 한다. 위험도는 보호자가 급여
 * 여부를 정하는 근거라서, 기계가 조용히 바꿔서는 안 되는 값이다.
 */

export type RiskLevel = 'safe' | 'caution' | 'danger';

/** 위험도 비교용 순위. 높을수록 위험하다. */
const RISK_RANK: Record<RiskLevel, number> = { safe: 0, caution: 1, danger: 2 };

export function compareRisk(a: RiskLevel, b: RiskLevel): number {
  return RISK_RANK[a] - RISK_RANK[b];
}

export const RISK_LABEL: Record<RiskLevel, string> = {
  safe: '안전',
  caution: '주의',
  danger: '위험',
};

/**
 * 반려동물 사료·간식에서 문제가 되는 것으로 알려진 성분 기준표.
 *
 * `level` 은 "이 정도로는 봐야 한다"는 하한이다. 사전 값이 이보다 낮으면 검수
 * 후보가 된다. 반대로 사전이 더 엄격하게(더 위험하게) 잡아 둔 것은 건드리지
 * 않는다 — 보호자 안전 쪽으로 기운 판단까지 되돌릴 이유는 없다.
 *
 * `excludes` 는 이름이 겹치지만 전혀 다른 물질을 걸러 낸다. '포도'(위험)와
 * '포도당'(단순 당류)처럼 한 글자 차이로 뜻이 달라지는 경우가 많다.
 */
export interface RiskReference {
  /** 기준표 상의 대표 이름. 사전에 없을 때 이 이름으로 등록을 제안한다. */
  nameKo: string;
  nameEn: string;
  level: RiskLevel;
  /** 성분 분류(사전의 category 와 같은 값). */
  category: string;
  /** 왜 위험한지 — 화면에 그대로 보여 준다. */
  reason: string;
  /** 이름에 이 조각이 들어 있으면 이 기준을 적용한다(정규화 후 비교). */
  patterns: string[];
  /** 이름에 이 조각이 들어 있으면 기준을 적용하지 않는다. */
  excludes?: string[];
  /** 특정 종에서 특히 문제가 되는 경우. */
  species?: 'dog' | 'cat';
}

export const RISK_REFERENCES: RiskReference[] = [
  // ── 급성 독성 ────────────────────────────────────────────────────────────
  {
    nameKo: '자일리톨',
    nameEn: 'Xylitol',
    level: 'danger',
    category: '첨가물·기호성',
    reason: '개에서 급격한 저혈당과 간부전을 일으킨다. 소량으로도 응급 상황이 된다.',
    patterns: ['자일리톨', '자일리트', 'xylitol'],
    species: 'dog',
  },
  {
    nameKo: '양파',
    nameEn: 'Onion',
    level: 'danger',
    category: '과일·채소·식이섬유',
    reason: '적혈구를 파괴해 용혈성 빈혈을 일으킨다. 분말·건조 형태가 더 위험하다.',
    patterns: ['양파', 'onion'],
  },
  {
    nameKo: '마늘',
    nameEn: 'Garlic',
    level: 'danger',
    category: '과일·채소·식이섬유',
    reason: '양파와 같은 계열로 용혈성 빈혈을 일으킨다. 고양이가 특히 민감하다.',
    patterns: ['마늘', 'garlic'],
    excludes: ['마늘종'],
    species: 'cat',
  },
  {
    nameKo: '포도·건포도',
    nameEn: 'Grape / Raisin',
    level: 'danger',
    category: '과일·채소·식이섬유',
    reason: '개에서 급성 신부전을 일으킨다. 중독량이 개체마다 달라 안전한 양이 없다.',
    // '포도당'(글루코스)·'포도씨유'는 전혀 다른 물질이라 제외한다.
    patterns: ['포도', '건포도', 'grape', 'raisin'],
    excludes: ['포도당', '포도씨', 'grapeseed', 'grape seed'],
    species: 'dog',
  },
  {
    nameKo: '초콜릿·카카오',
    nameEn: 'Chocolate / Cocoa',
    level: 'danger',
    category: '첨가물·기호성',
    reason: '테오브로민과 카페인이 심장과 신경계를 자극한다. 반려동물은 이를 분해하지 못한다.',
    patterns: ['초콜릿', '초콜렛', '카카오', '코코아', 'chocolate', 'cocoa', 'cacao', 'theobromine'],
  },
  {
    nameKo: '마카다미아',
    nameEn: 'Macadamia',
    level: 'danger',
    category: '기타',
    reason: '개에서 구토·고열·뒷다리 무력을 일으킨다.',
    patterns: ['마카다미아', 'macadamia'],
    species: 'dog',
  },
  {
    nameKo: '카페인',
    nameEn: 'Caffeine',
    level: 'danger',
    category: '첨가물·기호성',
    reason: '심박 이상과 발작을 일으킨다. 녹차·커피 추출물 형태로 들어가는 경우가 있다.',
    patterns: ['카페인', 'caffeine'],
    excludes: ['디카페인', '무카페인', 'decaf'],
  },

  // ── 논란 있는 합성 보존제·산화방지제 ─────────────────────────────────────
  {
    nameKo: '에톡시퀸',
    nameEn: 'Ethoxyquin',
    level: 'danger',
    category: '보존료·산화방지제',
    reason: 'EU 는 사료 첨가물 승인을 철회했다. 어분(생선분)에 표기 없이 들어가는 경우가 있다.',
    patterns: ['에톡시퀸', '에톡시퀴논', 'ethoxyquin'],
  },
  {
    nameKo: 'BHA (부틸히드록시아니솔)',
    nameEn: 'BHA (Butylated Hydroxyanisole)',
    level: 'danger',
    category: '보존료·산화방지제',
    reason: '국제암연구소가 발암 가능 물질로 분류한 합성 산화방지제다.',
    patterns: ['bha', '부틸히드록시아니솔', '부틸하이드록시아니솔', 'butylated hydroxyanisole'],
  },
  {
    nameKo: 'BHT (부틸히드록시톨루엔)',
    nameEn: 'BHT (Butylated Hydroxytoluene)',
    level: 'danger',
    category: '보존료·산화방지제',
    reason: 'BHA 와 함께 쓰이는 합성 산화방지제로, 장기 급여 시 간·신장 영향이 보고됐다.',
    patterns: ['bht', '부틸히드록시톨루엔', '부틸하이드록시톨루엔', 'butylated hydroxytoluene'],
  },
  {
    nameKo: '프로필갈레이트',
    nameEn: 'Propyl Gallate',
    level: 'danger',
    category: '보존료·산화방지제',
    reason: 'BHA·BHT 와 함께 쓰이는 합성 산화방지제로 내분비계 영향이 지적된다.',
    patterns: ['프로필갈레이트', '갈산프로필', '몰식자산프로필', 'propyl gallate'],
  },
  {
    nameKo: '아질산나트륨',
    nameEn: 'Sodium Nitrite',
    level: 'danger',
    category: '보존료·산화방지제',
    reason: '육류 발색·보존제. 가열 시 니트로사민을 만들 수 있어 반려동물 간식에서 특히 문제가 된다.',
    patterns: ['아질산나트륨', '아질산', '소듐나이트라이트', 'sodium nitrite'],
  },
  {
    nameKo: '프로필렌글리콜',
    nameEn: 'Propylene Glycol',
    level: 'danger',
    category: '첨가물·기호성',
    reason: '반습식 사료의 보습제. 고양이 사료에는 사용이 금지돼 있다(하인츠 소체 빈혈).',
    patterns: ['프로필렌글리콜', '프로필렌 글리콜', 'propylene glycol'],
    species: 'cat',
  },
  {
    nameKo: '인공 색소',
    nameEn: 'Artificial Colors',
    level: 'danger',
    category: '첨가물·기호성',
    reason: '영양적 이유가 없고 보호자 눈을 위한 첨가물이다. 타르 색소는 과민 반응이 보고됐다.',
    patterns: [
      '인공색소', '합성착색료', '타르색소', '적색40', '적색3', '황색5', '황색4', '청색1', '청색2',
      'artificial color', 'red 40', 'red 3', 'yellow 5', 'yellow 6', 'blue 1', 'blue 2', 'tartrazine',
    ],
  },

  // ── 조건부 주의 ──────────────────────────────────────────────────────────
  {
    nameKo: '메나디온 (비타민 K3)',
    nameEn: 'Menadione (Vitamin K3)',
    level: 'caution',
    category: '비타민·미네랄',
    reason: '합성 비타민 K. 천연형(K1)과 달리 고용량에서 간 독성·용혈이 보고돼 논란이 있다.',
    patterns: ['메나디온', '비타민k3', '비타민 k3', 'menadione', 'vitamin k3'],
  },
  {
    nameKo: '카라기난',
    nameEn: 'Carrageenan',
    level: 'caution',
    category: '첨가물·기호성',
    reason: '습식 사료의 점증제. 장 염증을 유발한다는 보고가 있어 장이 약한 아이에게 주의가 필요하다.',
    patterns: ['카라기난', 'carrageenan'],
  },
  {
    nameKo: '이산화티타늄',
    nameEn: 'Titanium Dioxide',
    level: 'caution',
    category: '첨가물·기호성',
    reason: 'EU 가 식품 첨가물 사용을 금지한 백색 착색료다.',
    patterns: ['이산화티타늄', '이산화티탄', 'titanium dioxide'],
  },
  {
    nameKo: '아보카도',
    nameEn: 'Avocado',
    level: 'caution',
    category: '과일·채소·식이섬유',
    reason: '페르신 성분이 들어 있다. 개·고양이에서는 경미하지만 과육 외 부위는 피하는 것이 좋다.',
    patterns: ['아보카도', 'avocado'],
  },
  {
    nameKo: '글루탐산나트륨 (MSG)',
    nameEn: 'Monosodium Glutamate (MSG)',
    level: 'caution',
    category: '첨가물·기호성',
    reason: '기호성을 올리기 위한 향미증진제로, 영양적 필요가 없고 나트륨 부담을 더한다.',
    patterns: ['글루탐산나트륨', 'msg', 'monosodium glutamate', 'l-글루탐산'],
  },
  {
    nameKo: '아황산염류',
    nameEn: 'Sulfites',
    level: 'caution',
    category: '보존료·산화방지제',
    reason: '티아민(비타민 B1)을 파괴해 결핍을 일으킬 수 있다.',
    patterns: ['아황산', '메타중아황산', '이산화황', 'sulfite', 'sulphite', 'sulfur dioxide'],
  },
  {
    nameKo: '액상과당·콘시럽',
    nameEn: 'High Fructose Corn Syrup',
    level: 'caution',
    category: '기타',
    reason: '기호성만을 위한 당분이다. 비만과 치아 문제를 키운다.',
    patterns: ['액상과당', '콘시럽', '옥수수시럽', '물엿', 'corn syrup', 'fructose syrup'],
  },
  {
    nameKo: '육류 부산물 (출처 불명)',
    nameEn: 'Meat By-Products (unspecified)',
    level: 'caution',
    category: '동물성 단백질',
    reason: '어떤 동물의 어느 부위인지 알 수 없다. 품질 편차가 크고 알레르기 원인을 좁히기 어렵다.',
    patterns: ['육류부산물', '동물성부산물', '가금부산물', '계육부산물', 'meat by-product', 'animal by-product', 'poultry by-product'],
  },
  {
    nameKo: '동물성 지방 (출처 불명)',
    nameEn: 'Animal Fat (unspecified)',
    level: 'caution',
    category: '지방·오일',
    reason: '어떤 동물의 지방인지 표기되지 않았다. 산패 방지제가 함께 들어가는 경우가 많다.',
    patterns: ['동물성지방', '동물성유지', 'animal fat'],
    excludes: ['닭지방', '오리지방', '연어유', 'chicken fat', 'duck fat'],
  },
];

/**
 * 이름 비교용 정규화.
 *
 * 사전에는 '프로필렌 글리콜'과 '프로필렌글리콜'이 따로 있고, 'BHA'와 'B.H.A'가
 * 섞인다. 공백·구두점을 지우고 소문자로 맞춰야 같은 물질로 묶인다.
 */
export function normalizeIngredientName(value: string): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[\s·・.,'"`()[\]{}\-_/]/g, '')
    .trim();
}

function matchesReference(nameKo: string, nameEn: string | null, reference: RiskReference): boolean {
  const haystack = `${normalizeIngredientName(nameKo)}|${normalizeIngredientName(nameEn ?? '')}`;
  const excluded = (reference.excludes ?? []).some(
    (pattern) => haystack.includes(normalizeIngredientName(pattern)),
  );
  if (excluded) return false;
  return reference.patterns.some((pattern) => {
    const needle = normalizeIngredientName(pattern);
    return needle.length > 0 && haystack.includes(needle);
  });
}

export interface ReviewedIngredient {
  id: string;
  name_ko: string;
  name_en: string | null;
  risk_level: RiskLevel;
  category: string | null;
  /** 이 성분을 쓰는 제품 수 — 높을수록 먼저 봐야 한다. */
  productCount?: number;
}

export type FindingKind = 'conflict' | 'upgrade' | 'missing';

export interface RiskFinding {
  kind: FindingKind;
  /** 사전에 이미 있는 성분이면 그 행. 'missing' 이면 없다. */
  ingredient?: ReviewedIngredient;
  /** 기준표 근거. 'conflict' 는 사전 내부 모순이라 없을 수 있다. */
  reference?: RiskReference;
  currentLevel: RiskLevel | null;
  suggestedLevel: RiskLevel;
  reason: string;
  /** 'conflict' 에서 같은 물질로 묶인 다른 표기들. */
  siblings?: ReviewedIngredient[];
  /** 영향 범위 — 정렬에 쓴다. */
  productCount: number;
}

/**
 * 같은 물질이 표기만 다르게 등록되고 위험도가 엇갈리는 경우를 찾는다.
 *
 * 영문명이 같으면 같은 물질로 본다(임포트가 영문명을 기준으로 붙여 넣었다).
 * 영문명이 없으면 정규화한 한글명으로 묶는다. 제안 값은 그룹에서 가장 높은
 * 위험도다 — 한쪽이 위험이라고 판단했다면 보호자 쪽에 안전하게 맞춘다.
 */
export function findRiskConflicts(ingredients: ReviewedIngredient[]): RiskFinding[] {
  const groups = new Map<string, ReviewedIngredient[]>();
  for (const item of ingredients) {
    const key = normalizeIngredientName(item.name_en || '') || normalizeIngredientName(item.name_ko);
    if (!key) continue;
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }

  const findings: RiskFinding[] = [];
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    const levels = new Set(members.map((item) => item.risk_level));
    if (levels.size < 2) continue;

    const highest = members.reduce(
      (worst, item) => (compareRisk(item.risk_level, worst) > 0 ? item.risk_level : worst),
      'safe' as RiskLevel,
    );
    const label = members.map((item) => `${item.name_ko}(${RISK_LABEL[item.risk_level]})`).join(', ');

    for (const item of members) {
      if (item.risk_level === highest) continue;
      findings.push({
        kind: 'conflict',
        ingredient: item,
        currentLevel: item.risk_level,
        suggestedLevel: highest,
        reason: `같은 물질이 표기별로 다르게 분류돼 있습니다 — ${label}. 가장 높은 위험도에 맞추는 것을 제안합니다.`,
        siblings: members.filter((other) => other.id !== item.id),
        productCount: item.productCount ?? 0,
      });
    }
  }
  return findings;
}

/**
 * 기준표보다 낮게 분류된 성분을 찾는다.
 *
 * 기준표보다 높게(더 위험하게) 잡아 둔 것은 후보로 만들지 않는다. 운영자가
 * 의도적으로 엄격하게 둔 판단을 기계가 되돌리게 하지 않는다.
 */
export function findRiskUpgrades(ingredients: ReviewedIngredient[]): RiskFinding[] {
  const findings: RiskFinding[] = [];
  for (const item of ingredients) {
    for (const reference of RISK_REFERENCES) {
      if (!matchesReference(item.name_ko, item.name_en, reference)) continue;
      if (compareRisk(item.risk_level, reference.level) >= 0) continue;
      findings.push({
        kind: 'upgrade',
        ingredient: item,
        reference,
        currentLevel: item.risk_level,
        suggestedLevel: reference.level,
        reason: reference.reason,
        productCount: item.productCount ?? 0,
      });
      break; // 한 성분에 대해 가장 먼저 걸린 기준 하나만 제안한다.
    }
  }
  return findings;
}

/**
 * 기준표에는 있는데 사전에 전혀 없는 성분을 찾는다.
 *
 * 사전에 없으면 제품 원재료에 그 이름이 있어도 위험으로 잡히지 않는다.
 * 분류 오류보다 이쪽이 더 조용히 위험하다.
 */
export function findMissingRiskIngredients(ingredients: ReviewedIngredient[]): RiskFinding[] {
  return RISK_REFERENCES.filter(
    (reference) => !ingredients.some((item) => matchesReference(item.name_ko, item.name_en, reference)),
  ).map((reference) => ({
    kind: 'missing' as const,
    reference,
    currentLevel: null,
    suggestedLevel: reference.level,
    reason: reference.reason,
    productCount: 0,
  }));
}

/** 세 가지 점검을 모두 돌린다. 영향이 큰(제품 수가 많은) 것부터 보여 준다. */
export function reviewIngredientRisks(ingredients: ReviewedIngredient[]): RiskFinding[] {
  return [
    ...findRiskConflicts(ingredients),
    ...findRiskUpgrades(ingredients),
    ...findMissingRiskIngredients(ingredients),
  ].sort((a, b) => {
    if (a.kind !== b.kind) {
      const order: FindingKind[] = ['conflict', 'upgrade', 'missing'];
      return order.indexOf(a.kind) - order.indexOf(b.kind);
    }
    if (b.productCount !== a.productCount) return b.productCount - a.productCount;
    return compareRisk(b.suggestedLevel, a.suggestedLevel);
  });
}
