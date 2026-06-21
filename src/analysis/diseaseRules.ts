/**
 * 13개 질환 카테고리 × (정량 규칙 + 취약 견종 + 보조 후보)
 * NRC 2006 기준 1000kcal당 함량으로 표준화.
 */

export type EvidenceLevel = 'high' | 'medium';
export type ThresholdDirection = 'min' | 'max' | 'range';
export type NutrientKey =
  | 'protein_dmb'              // 조단백 % DMB
  | 'fat_dmb'                  // 조지방 % DMB
  | 'fiber_dmb'                // 조섬유 % DMB
  | 'phosphorus_per1000kcal'   // mg/1000kcal (계산 가능)
  | 'calcium_phosphorus_ratio' // 비율 (계산 가능)
  | 'taurine_per1000kcal'      // mg/1000kcal (GA에 있으면 계산)
  | 'sodium_per1000kcal'       // mg/1000kcal (GA 미제공 → 성분 추정)
  | 'l_carnitine_per1000kcal'  // mg/1000kcal (성분 존재 여부)
  | 'glucosamine_per1000kcal'  // mg/1000kcal (성분 존재 여부)
  | 'chondroitin_per1000kcal'  // mg/1000kcal (성분 존재 여부)
  | 'msm_per1000kcal'          // mg/1000kcal (성분 존재 여부)
  | 'epa_dha_per1000kcal'      // mg/1000kcal (성분 존재 여부)
  | 'zinc_per1000kcal'         // mg/1000kcal (성분 존재 여부)
  | 'copper_per_kg';           // mg/kg (성분 존재 여부)

export interface NutrientRule {
  nutrientKey: NutrientKey;
  displayName: string;
  direction: ThresholdDirection;
  min?: number;
  max?: number;
  unit: string;
  evidenceLevel: EvidenceLevel;
  description: string;
}

export interface DiseaseCategory {
  id: string;
  name: string;
  emoji: string;
  shortName: string;
  hasQuantitativeRules: boolean;
  quantitativeRules: NutrientRule[];
  supplementCandidates: string[];
  clinicalNote?: string;
}

export const DISEASE_CATEGORIES: DiseaseCategory[] = [
  // ── 1. 관절 ────────────────────────────────────────────────────────
  {
    id: 'joint',
    name: '관절 건강',
    shortName: '관절',
    emoji: '🦴',
    hasQuantitativeRules: true,
    quantitativeRules: [
      {
        nutrientKey: 'glucosamine_per1000kcal',
        displayName: '글루코사민',
        direction: 'min', min: 70, unit: 'mg/1000kcal',
        evidenceLevel: 'medium',
        description: '관절 연골 유지에 도움. 70mg/1000kcal 이상 권장.',
      },
      {
        nutrientKey: 'chondroitin_per1000kcal',
        displayName: '콘드로이틴',
        direction: 'min', min: 50, unit: 'mg/1000kcal',
        evidenceLevel: 'medium',
        description: '연골 수분 탄력 보조. 50mg/1000kcal 이상 권장.',
      },
      {
        nutrientKey: 'msm_per1000kcal',
        displayName: 'MSM',
        direction: 'min', min: 30, unit: 'mg/1000kcal',
        evidenceLevel: 'medium',
        description: '관절 염증 완화 보조. 30mg/1000kcal 이상 권장.',
      },
      {
        nutrientKey: 'epa_dha_per1000kcal',
        displayName: 'EPA+DHA',
        direction: 'min', min: 150, unit: 'mg/1000kcal',
        evidenceLevel: 'high',
        description: '오메가-3 항염 작용. 150mg/1000kcal 이상 권장.',
      },
    ],
    supplementCandidates: ['글루코사민', '콘드로이틴', 'MSM', '초록입홍합', '연어오일'],
  },

  // ── 2. 심장 ────────────────────────────────────────────────────────
  {
    id: 'heart',
    name: '심장 건강',
    shortName: '심장',
    emoji: '❤️',
    hasQuantitativeRules: true,
    quantitativeRules: [
      {
        nutrientKey: 'sodium_per1000kcal',
        displayName: '나트륨',
        direction: 'max', max: 250, unit: 'mg/1000kcal',
        evidenceLevel: 'high',
        description: '심장병 시 나트륨 과다는 체액저류 악화. 250mg 이하 권장.',
      },
      {
        nutrientKey: 'taurine_per1000kcal',
        displayName: '타우린',
        direction: 'min', min: 100, unit: 'mg/1000kcal',
        evidenceLevel: 'high',
        description: '확장성 심근병증(DCM) 예방 핵심 아미노산. 100mg 이상 권장.',
      },
      {
        nutrientKey: 'l_carnitine_per1000kcal',
        displayName: 'L-카르니틴',
        direction: 'min', min: 20, unit: 'mg/1000kcal',
        evidenceLevel: 'medium',
        description: '심장 지방산 대사 지원. 20mg 이상 권장.',
      },
    ],
    supplementCandidates: ['타우린', 'L-카르니틴', '코엔자임Q10', '오메가3'],
  },

  // ── 3. 신장 ────────────────────────────────────────────────────────
  {
    id: 'kidney',
    name: '신장 건강',
    shortName: '신장',
    emoji: '💧',
    hasQuantitativeRules: true,
    quantitativeRules: [
      {
        nutrientKey: 'phosphorus_per1000kcal',
        displayName: '인(P)',
        direction: 'max', max: 500, unit: 'mg/1000kcal',
        evidenceLevel: 'high',
        description: '신장 기능 저하 시 인 축적이 진행을 가속. 500mg 이하 엄격 제한.',
      },
      {
        nutrientKey: 'sodium_per1000kcal',
        displayName: '나트륨',
        direction: 'max', max: 300, unit: 'mg/1000kcal',
        evidenceLevel: 'high',
        description: '신장 혈압 부담 경감. 300mg 이하 권장.',
      },
      {
        nutrientKey: 'calcium_phosphorus_ratio',
        displayName: '칼슘:인 비율',
        direction: 'range', min: 1.1, max: 1.3, unit: '',
        evidenceLevel: 'high',
        description: '신장 미네랄 균형. 1.1~1.3 범위 유지 권장.',
      },
    ],
    supplementCandidates: ['오메가3(신장 혈류)', '비타민B군'],
    clinicalNote: '신장 질환은 수의사 처방 식이 우선입니다. 이 결과는 참고용입니다.',
  },

  // ── 4. 체중 관리 ────────────────────────────────────────────────────
  {
    id: 'weight',
    name: '체중 관리',
    shortName: '체중',
    emoji: '⚖️',
    hasQuantitativeRules: true,
    quantitativeRules: [
      {
        nutrientKey: 'fat_dmb',
        displayName: '조지방(건물기준)',
        direction: 'max', max: 12, unit: '% DMB',
        evidenceLevel: 'high',
        description: '과체중 예방. 건물기준 지방 12% 이하 권장.',
      },
      {
        nutrientKey: 'protein_dmb',
        displayName: '조단백질(건물기준)',
        direction: 'min', min: 28, unit: '% DMB',
        evidenceLevel: 'high',
        description: '근육 유지하며 체중 감량. 건물기준 단백질 28% 이상 권장.',
      },
    ],
    supplementCandidates: ['L-카르니틴', '녹차추출물'],
  },

  // ── 5. 췌장 ─────────────────────────────────────────────────────────
  {
    id: 'pancreas',
    name: '췌장 건강',
    shortName: '췌장',
    emoji: '🔴',
    hasQuantitativeRules: true,
    quantitativeRules: [
      {
        nutrientKey: 'fat_dmb',
        displayName: '조지방(건물기준)',
        direction: 'max', max: 10, unit: '% DMB',
        evidenceLevel: 'high',
        description: '췌장염 재발 방지를 위한 가장 엄격한 지방 제한. 건물기준 10% 이하.',
      },
    ],
    supplementCandidates: ['소화효소', '프로바이오틱스'],
    clinicalNote: '급성 췌장염은 즉시 수의사 진료가 필요합니다.',
  },

  // ── 6. 장 건강 ──────────────────────────────────────────────────────
  {
    id: 'gut',
    name: '장 건강',
    shortName: '장',
    emoji: '🌿',
    hasQuantitativeRules: true,
    quantitativeRules: [
      {
        nutrientKey: 'fat_dmb',
        displayName: '조지방(건물기준)',
        direction: 'max', max: 15, unit: '% DMB',
        evidenceLevel: 'medium',
        description: '고지방은 장 자극. 건물기준 15% 이하 권장.',
      },
      {
        nutrientKey: 'fiber_dmb',
        displayName: '조섬유(건물기준)',
        direction: 'range', min: 3, max: 6, unit: '% DMB',
        evidenceLevel: 'medium',
        description: '장 운동성 정상화. 건물기준 섬유 3~6% 범위 권장.',
      },
    ],
    supplementCandidates: ['프로바이오틱스', '프리바이오틱스', '슬리퍼리 엘름'],
  },

  // ── 7. 당뇨 ─────────────────────────────────────────────────────────
  {
    id: 'diabetes',
    name: '혈당 관리',
    shortName: '당뇨',
    emoji: '🩸',
    hasQuantitativeRules: true,
    quantitativeRules: [
      {
        nutrientKey: 'fiber_dmb',
        displayName: '조섬유(건물기준)',
        direction: 'min', min: 8, unit: '% DMB',
        evidenceLevel: 'high',
        description: '식이섬유로 혈당 상승 완화. 건물기준 8% 이상 권장.',
      },
      {
        nutrientKey: 'fat_dmb',
        displayName: '조지방(건물기준)',
        direction: 'max', max: 12, unit: '% DMB',
        evidenceLevel: 'high',
        description: '인슐린 저항성 악화 방지. 건물기준 12% 이하 권장.',
      },
    ],
    supplementCandidates: ['크롬', '베르베린', '알파리포산'],
    clinicalNote: '인슐린 투여 중인 경우 식이 변경 전 반드시 수의사 상담 필요.',
  },

  // ── 8. 간 ────────────────────────────────────────────────────────────
  {
    id: 'liver',
    name: '간 건강',
    shortName: '간',
    emoji: '🟤',
    hasQuantitativeRules: true,
    quantitativeRules: [
      {
        nutrientKey: 'copper_per_kg',
        displayName: '구리(Cu)',
        direction: 'max', max: 3, unit: 'mg/kg',
        evidenceLevel: 'high',
        description: '구리 축적증(구리 저장 간 질환) 예방. 3mg/kg 이하 엄격 제한.',
      },
      {
        nutrientKey: 'zinc_per1000kcal',
        displayName: '아연(Zn)',
        direction: 'min', min: 40, unit: 'mg/1000kcal',
        evidenceLevel: 'medium',
        description: '아연이 구리 흡수를 경쟁적으로 억제. 40mg 이상 권장.',
      },
    ],
    supplementCandidates: ['SAMe(S-아데노실메티오닌)', '밀크씨슬', '아연'],
    clinicalNote: '구리 축적증은 특정 견종(달마시안, 베들링턴테리어 등)에서 유전적 위험이 높습니다.',
  },

  // ── 9. 피부 (정성 규칙만) ─────────────────────────────────────────
  {
    id: 'skin',
    name: '피부 건강',
    shortName: '피부',
    emoji: '✨',
    hasQuantitativeRules: false,
    quantitativeRules: [],
    supplementCandidates: ['오메가3(EPA+DHA)', '비타민A', '비타민E', '아연', '바이오틴'],
    clinicalNote: '피부 질환은 알레르기·기생충 감별이 우선입니다.',
  },

  // ── 10. 안과 (정성 규칙만) ────────────────────────────────────────
  {
    id: 'eye',
    name: '눈 건강',
    shortName: '안과',
    emoji: '👁️',
    hasQuantitativeRules: false,
    quantitativeRules: [],
    supplementCandidates: ['루테인', '제아잔틴', '비타민A', '타우린', '오메가3'],
  },

  // ── 11. 치아 (정성 규칙만) ────────────────────────────────────────
  {
    id: 'dental',
    name: '구강·치아',
    shortName: '치아',
    emoji: '🦷',
    hasQuantitativeRules: false,
    quantitativeRules: [],
    supplementCandidates: ['아스코필럼 노도섬(해조류)', '코코넛오일', '아연'],
  },

  // ── 12. 혈액 건강 (정성 규칙만) ──────────────────────────────────
  {
    id: 'blood',
    name: '혈액 건강',
    shortName: '혈액',
    emoji: '🔵',
    hasQuantitativeRules: false,
    quantitativeRules: [],
    supplementCandidates: ['철분', '비타민B12', '엽산', '비타민C'],
    clinicalNote: '빈혈 증상(잇몸 창백, 무기력)은 즉시 수의사 진료 필요.',
  },

  // ── 13. 종양·암 (정량 규칙 없음, 진료 우선) ──────────────────────
  {
    id: 'cancer',
    name: '종양·암',
    shortName: '종양',
    emoji: '⚠️',
    hasQuantitativeRules: false,
    quantitativeRules: [],
    supplementCandidates: [],
    clinicalNote: '종양·암은 영양 비교보다 수의사 종양 전문 진료를 최우선으로 해야 합니다. 이 앱의 점수가 암 예방·치료를 대체하지 않습니다.',
  },
];

export const DISEASE_MAP: Record<string, DiseaseCategory> = Object.fromEntries(
  DISEASE_CATEGORIES.map(d => [d.id, d])
);

// ── 견종 → 질환 ID 매핑 ────────────────────────────────────────────────
// 한국어·영어 alias 혼용. 부분 일치로 매칭한다.
export interface BreedEntry {
  aliases: string[];   // 소문자 정규화
  diseaseIds: string[];
}

export const BREED_DISEASE_ENTRIES: BreedEntry[] = [
  // 대형견 — 관절·심장 중심
  {
    aliases: ['골든리트리버', 'golden retriever', 'golden'],
    diseaseIds: ['joint', 'heart', 'weight', 'skin', 'cancer'],
  },
  {
    aliases: ['래브라도', 'labrador', 'labrador retriever', '래브라도 리트리버'],
    diseaseIds: ['joint', 'weight', 'pancreas'],
  },
  {
    aliases: ['저먼셰퍼드', 'german shepherd', 'gsd', '저먼 셰퍼드', '독일 셰퍼드'],
    diseaseIds: ['joint', 'gut', 'skin'],
  },
  {
    aliases: ['그레이트피레니즈', 'great pyrenees', 'pyrenees', '그레이트 피레니즈'],
    diseaseIds: ['joint', 'eye'],
  },
  {
    aliases: ['레온베르거', 'leonberger'],
    diseaseIds: ['joint', 'heart'],
  },
  {
    aliases: ['세인트버나드', 'saint bernard', 'st bernard'],
    diseaseIds: ['heart', 'joint'],
  },
  {
    aliases: ['아이리시울프하운드', 'irish wolfhound'],
    diseaseIds: ['heart'],
  },
  {
    aliases: ['뉴펀들랜드', 'newfoundland'],
    diseaseIds: ['heart', 'kidney', 'joint'],
  },
  {
    aliases: ['그레이트데인', 'great dane'],
    diseaseIds: ['heart', 'joint', 'cancer'],
  },
  {
    aliases: ['도베르만', 'doberman', 'dobermann'],
    diseaseIds: ['heart', 'liver'],
  },
  {
    aliases: ['복서', 'boxer'],
    diseaseIds: ['heart', 'cancer'],
  },
  {
    aliases: ['로트와일러', 'rottweiler'],
    diseaseIds: ['joint', 'weight', 'cancer'],
  },
  {
    aliases: ['마스티프', 'mastiff'],
    diseaseIds: ['joint', 'eye', 'heart'],
  },
  {
    aliases: ['허스키', 'husky', 'siberian husky', '시베리안허스키', '시베리안 허스키'],
    diseaseIds: ['eye', 'skin'],
  },
  {
    aliases: ['사모예드', 'samoyed'],
    diseaseIds: ['diabetes', 'kidney'],
  },
  {
    aliases: ['바센지', 'basenji'],
    diseaseIds: ['kidney', 'eye', 'blood'],
  },
  {
    aliases: ['달마시안', 'dalmatian'],
    diseaseIds: ['liver', 'kidney'],
  },
  // 중형견
  {
    aliases: ['보더콜리', 'border collie'],
    diseaseIds: ['eye', 'joint'],
  },
  {
    aliases: ['비글', 'beagle'],
    diseaseIds: ['weight', 'gut'],
  },
  {
    aliases: ['코커스파니엘', 'cocker spaniel', '코커 스파니엘'],
    diseaseIds: ['eye', 'pancreas', 'liver', 'weight'],
  },
  {
    aliases: ['웰시코기', 'welsh corgi', 'corgi', '코기', 'pembroke'],
    diseaseIds: ['joint', 'weight'],
  },
  // 소형견 — 간·치아·심장 중심
  {
    aliases: ['요크셔테리어', 'yorkshire terrier', 'yorkie', '요키'],
    diseaseIds: ['liver', 'dental', 'joint'],
  },
  {
    aliases: ['말티즈', 'maltese'],
    diseaseIds: ['liver', 'dental', 'gut'],
  },
  {
    aliases: ['미니어처슈나우저', 'miniature schnauzer', '미니 슈나우저', '슈나우저'],
    diseaseIds: ['weight', 'pancreas', 'diabetes'],
  },
  {
    aliases: ['포메라니안', 'pomeranian', '포메'],
    diseaseIds: ['heart', 'dental', 'joint'],
  },
  {
    aliases: ['치와와', 'chihuahua'],
    diseaseIds: ['heart', 'dental'],
  },
  {
    aliases: ['닥스훈트', 'dachshund', 'dachshund'],
    diseaseIds: ['joint', 'weight', 'pancreas'],
  },
  {
    aliases: ['푸들', 'poodle', '토이푸들', 'toy poodle', '미니어처푸들', 'miniature poodle'],
    diseaseIds: ['joint', 'eye', 'diabetes', 'liver'],
  },
  {
    aliases: ['시추', 'shih tzu', 'shih-tzu', '시츄'],
    diseaseIds: ['eye', 'dental', 'kidney'],
  },
  {
    aliases: ['비숑프리제', 'bichon frise', '비숑'],
    diseaseIds: ['diabetes', 'skin'],
  },
  {
    aliases: ['퍼그', 'pug'],
    diseaseIds: ['weight', 'eye', 'gut'],
  },
  {
    aliases: ['프렌치불독', 'french bulldog', '프불', 'frenchie'],
    diseaseIds: ['skin', 'gut', 'joint'],
  },
  {
    aliases: ['잉글리시불독', 'english bulldog', 'bulldog', '불독'],
    diseaseIds: ['skin', 'joint', 'heart'],
  },
  {
    aliases: ['보스턴테리어', 'boston terrier'],
    diseaseIds: ['eye', 'heart'],
  },
  {
    aliases: ['카발리에킹찰스스파니엘', 'cavalier king charles spaniel', 'cavalier', 'ckcs'],
    diseaseIds: ['heart', 'eye'],
  },
  // 한국 견종
  {
    aliases: ['진돗개', 'jindo', 'korean jindo'],
    diseaseIds: ['joint', 'gut'],
  },
  {
    aliases: ['풍산개', 'pungsan'],
    diseaseIds: ['joint'],
  },
];
