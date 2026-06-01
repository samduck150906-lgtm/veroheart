/**
 * 베로로(Veroro) 수의학·영양학 기반 사료 성분 분석 및 등급화 알고리즘 엔진
 * 미국 AAFCO & 유럽 FEDIAF 기준 준수
 */

export interface GuaranteedAnalysis {
  crudeProtein: number; // 조단백 %
  crudeFat: number;    // 조지방 %
  crudeFiber: number;  // 조섬유 %
  crudeAsh: number;    // 조회분 %
  moisture: number;    // 수분 %
  calcium?: number;    // 칼슘 % (선택)
  phosphorus?: number; // 인 % (선택)
  zinc?: number;       // 아연 mg/kg (선택)
  vitaminA?: number;   // 비타민 A IU/kg (선택)
}

export interface PetProfile {
  name?: string;
  species: 'dog' | 'cat';
  allergies: string[];
  healthConcerns?: string[];
}

export interface ScoringBonus {
  reason: string;
  points: number;
}

export interface ScoringPenalty {
  reason: string;
  points: number;
}

export interface ScorerResult {
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  penalties: ScoringPenalty[];
  bonuses: ScoringBonus[];
  aafco_passed: boolean;
  fediaf_warnings: string[];
  allergy_warning: boolean;
  allergy_ingredients: string[];
  estimated_calories_kcal_kg: number;
  caloric_distribution: {
    protein: number;
    fat: number;
    carbs: number;
  };
}

export class PetFoodScorer {
  private ingredients: string[];
  private guaranteedAnalysis: GuaranteedAnalysis;
  private petProfile?: PetProfile;

  // 감점 및 가점 대상 성분 정의 사전
  private cautionPreservatives = [
    { name: 'bha', ko: 'BHA(부틸하이드록시아니솔)', deduction: 10 },
    { name: 'bht', ko: 'BHT(부틸하이드록시톨루엔)', deduction: 10 },
    { name: '에톡시퀸', ko: '에톡시퀸(Ethoxyquin)', deduction: 10 },
    { name: 'ethoxyquin', ko: '에톡시퀸(Ethoxyquin)', deduction: 10 },
    { name: '프로필렌 글리콜', ko: '프로필렌 글리콜', deduction: 10 },
    { name: 'propylene glycol', ko: '프로필렌 글리콜', deduction: 10 },
    { name: '카라기난', ko: '카라기난', deduction: 10 },
    { name: 'carrageenan', ko: '카라기난', deduction: 10 },
    { name: '멘아디온', ko: '멘아디온(합성 비타민 K3)', deduction: 10 },
    { name: 'menadione', ko: '멘아디온(합성 비타민 K3)', deduction: 10 }
  ];

  private cautionAllergenGrains = [
    { name: '옥수수', ko: '옥수수 계열 곡물', deduction: 5 },
    { name: '밀가루', ko: '밀/밀가루', deduction: 5 },
    { name: '밀 ', ko: '밀', deduction: 5 },
    { name: '대두', ko: '대두/소이빈', deduction: 5 },
    { name: 'soybean', ko: '대두', deduction: 5 },
    { name: 'wheat', ko: '밀', deduction: 5 },
    { name: 'corn', ko: '옥수수', deduction: 5 }
  ];

  private beneficialIngredients = [
    { name: '연어 오일', ko: '연어 오일 (오메가-3)', bonus: 3 },
    { name: '연어유', ko: '연어 오일 (오메가-3)', bonus: 3 },
    { name: '해바라기씨유', ko: '해바라기씨유', bonus: 2 },
    { name: '글루코사민', ko: '글루코사민 (관절)', bonus: 3 },
    { name: '콘드로이친', ko: '콘드로이친 (관절)', bonus: 3 },
    { name: '혼합 토코페롤', ko: '혼합 토코페롤 (천연 보존제)', bonus: 2 },
    { name: 'mixed tocopherols', ko: '혼합 토코페롤', bonus: 2 },
    { name: '로즈마리 추출물', ko: '로즈마리 추출물 (천연 방부)', bonus: 2 }
  ];

  constructor(ingredients: string[], guaranteedAnalysis: GuaranteedAnalysis, petProfile?: PetProfile) {
    this.ingredients = ingredients.map(i => i.trim());
    this.guaranteedAnalysis = guaranteedAnalysis;
    this.petProfile = petProfile;
  }

  /**
   * 건물 기준 (Dry Matter Basis, DMB) 변환 함수
   */
  public convertToDMB(value: number): number {
    const moisture = this.guaranteedAnalysis.moisture || 0;
    if (moisture >= 100) return 0;
    return (value / (100 - moisture)) * 100;
  }

  /**
   * Atwater 칼로리 계산기 (단백질 3.5, 지방 8.5, 탄수화물 3.5)
   */
  public calculateCalories(): { kcalKg: number; distribution: { protein: number; fat: number; carbs: number } } {
    const ga = this.guaranteedAnalysis;
    const protein = ga.crudeProtein || 0;
    const fat = ga.crudeFat || 0;
    const fiber = ga.crudeFiber || 0;
    const ash = ga.crudeAsh || 0;
    const moisture = ga.moisture || 0;

    // NFE (추정 탄수화물) = 100 - 단백 - 지방 - 섬유 - 회분 - 수분
    const nfe = Math.max(0, 100 - protein - fat - fiber - ash - moisture);

    // Modified Atwater
    const proteinKcal = protein * 3.5;
    const fatKcal = fat * 8.5;
    const carbKcal = nfe * 3.5;

    const totalKcal100g = proteinKcal + fatKcal + carbKcal;
    const kcalKg = totalKcal100g * 10; // 100g -> 1kg

    if (totalKcal100g === 0) {
      return { kcalKg: 0, distribution: { protein: 0, fat: 0, carbs: 0 } };
    }

    return {
      kcalKg: Math.round(kcalKg),
      distribution: {
        protein: Math.round((proteinKcal / totalKcal100g) * 100),
        fat: Math.round((fatKcal / totalKcal100g) * 100),
        carbs: Math.round((carbKcal / totalKcal100g) * 100)
      }
    };
  }

  /**
   * 출처 불분명 육류 필터 (정규식 검사)
   * 예: '동물성 지방', '가금류 부산물', '육분' 등 동물 기원이 명확하지 않은 성분
   */
  private detectAnonymousMeat(penalties: ScoringPenalty[]) {
    // 구체적인 동물 이름 제외용 리스트
    const specificAnimals = /닭|소|오리|양|칠면조|연어|참치|황태|명태|가다랑어|chicken|beef|duck|lamb|turkey|salmon|tuna/i;
    
    // 출처 불분명 결합어 매칭 패턴
    // 가금류, 동물성, 육, 고기 등 애매한 표현 + 부산물, 육분, 지방 등
    const anonymousPatterns = /(가금류|동물성|고기|동물|가금)\s*(부산물|육분|지방|유|분말|밀|meal|fat|by-product)/i;
    
    // '가금류 부산물', '동물성 지방', '기타 고기분말' 등 단독 또는 단어 내 매칭 검사
    for (const ing of this.ingredients) {
      const isAnonymous = anonymousPatterns.test(ing);
      const hasSpecific = specificAnimals.test(ing);
      
      // 구체적 종 없이 애매하게 결합된 경우
      if (isAnonymous && !hasSpecific) {
        penalties.push({
          reason: `출처 불분명 동물성 원료 검출: "${ing}" (-10점)`,
          points: 10
        });
      }
    }
  }

  /**
   * 곡물 분할 (Ingredient Splitting) 탐지기
   * 상위 5개 원료 중 쌀, 쌀가루, 현미 등 종류가 같은 성분이 2회 이상 나열되는지 체크
   */
  private detectIngredientSplitting(penalties: ScoringPenalty[]) {
    const top5 = this.ingredients.slice(0, 5);
    
    // 어원 카테고리 정의
    const grainsCategories = [
      { key: 'rice', words: ['쌀', '쌀가루', '현미', '미강', '싸라기', '백미', 'rice'], label: '쌀 계열' },
      { key: 'corn', words: ['옥수수', '옥수수가루', '옥수수글루텐', '콘글루텐', 'corn'], label: '옥수수 계열' },
      { key: 'wheat', words: ['밀', '밀가루', '소맥분', 'wheat'], label: '밀 계열' }
    ];

    for (const cat of grainsCategories) {
      const matched = top5.filter(ing => cat.words.some(word => ing.toLowerCase().includes(word)));
      if (matched.length >= 2) {
        penalties.push({
          reason: `곡물 분할(Ingredient Splitting) 꼼수 감지: 상위 5개 중 ${cat.label} ${matched.length}개 표기 [${matched.join(', ')}] (-5점)`,
          points: 5
        });
      }
    }
  }

  /**
   * AAFCO 영양 충족 여부 검증 (Adult Maintenance 기준)
   */
  public validateAAFCO(): { passed: boolean; details: string[] } {
    const details: string[] = [];
    let passed = true;

    const proteinDMB = this.convertToDMB(this.guaranteedAnalysis.crudeProtein);
    const fatDMB = this.convertToDMB(this.guaranteedAnalysis.crudeFat);

    // 강아지 성견 기준: 조단백 18% 이상, 조지방 5.5% 이상
    // 고양이 성묘 기준: 조단백 26% 이상, 조지방 9% 이상
    const isCat = this.petProfile?.species === 'cat';
    const minProtein = isCat ? 26 : 18;
    const minFat = isCat ? 9 : 5.5;

    if (proteinDMB < minProtein) {
      passed = false;
      details.push(`AAFCO 조단백질 기준 미달: 기준 ${minProtein}% (현재 건물 기준 ${proteinDMB.toFixed(1)}%)`);
    }
    if (fatDMB < minFat) {
      passed = false;
      details.push(`AAFCO 조지방 기준 미달: 기준 ${minFat}% (현재 건물 기준 ${fatDMB.toFixed(1)}%)`);
    }

    // 칼슘 & 인 검증 (선택 항목)
    if (this.guaranteedAnalysis.calcium !== undefined) {
      const calciumDMB = this.convertToDMB(this.guaranteedAnalysis.calcium);
      const minCa = isCat ? 0.6 : 0.5;
      if (calciumDMB < minCa) {
        passed = false;
        details.push(`AAFCO 칼슘 기준 미달: 기준 ${minCa}% (현재 건물 기준 ${calciumDMB.toFixed(2)}%)`);
      }
    }
    if (this.guaranteedAnalysis.phosphorus !== undefined) {
      const phosDMB = this.convertToDMB(this.guaranteedAnalysis.phosphorus);
      const minPhos = isCat ? 0.5 : 0.4;
      if (phosDMB < minPhos) {
        passed = false;
        details.push(`AAFCO 인 기준 미달: 기준 ${minPhos}% (현재 건물 기준 ${phosDMB.toFixed(2)}%)`);
      }
    }

    return { passed, details };
  }

  /**
   * FEDIAF 상한선 교차검증 경고 시스템
   */
  public validateFEDIAF(): string[] {
    const warnings: string[] = [];

    // 1. Ca:P 비율 검증 (일반적으로 1:1 ~ 2:1 권장)
    if (this.guaranteedAnalysis.calcium && this.guaranteedAnalysis.phosphorus) {
      const ratio = this.guaranteedAnalysis.calcium / this.guaranteedAnalysis.phosphorus;
      if (ratio < 1.0 || ratio > 2.0) {
        warnings.push(`FEDIAF 경고: 칼슘과 인의 비율(Ca:P)이 부적절함 (현재 1:${ratio.toFixed(2)}, 권장범위 1:1 ~ 2:1)`);
      }
    }

    // 2. 비타민 A 상한선 (FEDIAF 최대치: 개 성견 기준 400,000 IU/kg DMB)
    if (this.guaranteedAnalysis.vitaminA !== undefined) {
      const vitADMB = this.convertToDMB(this.guaranteedAnalysis.vitaminA);
      if (vitADMB > 400000) {
        warnings.push(`FEDIAF 과잉 경고: 비타민 A가 과도함 (건물 기준 ${vitADMB.toLocaleString()} IU/kg, 안전 상한선 400,000 IU/kg)`);
      }
    }

    // 3. 아연 상한선 (FEDIAF 최대치: 개 성견 기준 250 mg/kg DMB)
    if (this.guaranteedAnalysis.zinc !== undefined) {
      const zincDMB = this.convertToDMB(this.guaranteedAnalysis.zinc);
      if (zincDMB > 250) {
        warnings.push(`FEDIAF 과잉 경고: 아연 함량이 과도함 (건물 기준 ${zincDMB.toFixed(1)} mg/kg, 안전 상한선 250 mg/kg)`);
      }
    }

    return warnings;
  }

  /**
   * 개인화 알레르기 유발원 분석
   */
  private checkAllergies(): { warning: boolean; ingredients: string[] } {
    if (!this.petProfile || !this.petProfile.allergies || this.petProfile.allergies.length === 0) {
      return { warning: false, ingredients: [] };
    }

    const matched: string[] = [];
    const allergies = this.petProfile.allergies.map(a => a.toLowerCase().trim());

    for (const ing of this.ingredients) {
      const ingLower = ing.toLowerCase();
      for (const allergy of allergies) {
        // 단어 일부 매칭 (예: '닭' -> '닭고기', '닭가슴살', '닭고기분말')
        if (ingLower.includes(allergy)) {
          matched.push(ing);
          break;
        }
      }
    }

    return {
      warning: matched.length > 0,
      ingredients: Array.from(new Set(matched))
    };
  }

  /**
   * 메인 채점 실행 파이프라인
   */
  public execute(): ScorerResult {
    let score = 100;
    const penalties: ScoringPenalty[] = [];
    const bonuses: ScoringBonus[] = [];

    // 1. 유해 화학 보존제 및 원재료 감점
    for (const pres of this.cautionPreservatives) {
      const count = this.ingredients.filter(ing => ing.toLowerCase().includes(pres.name)).length;
      if (count > 0) {
        const cost = pres.deduction;
        penalties.push({
          reason: `주의 성분 검출: "${pres.ko}" (-${cost}점)`,
          points: cost
        });
        score -= cost;
      }
    }

    // 2. 알레르기 유발 곡물 감점
    for (const grain of this.cautionAllergenGrains) {
      const count = this.ingredients.filter(ing => ing.toLowerCase().includes(grain.name)).length;
      if (count > 0) {
        const cost = grain.deduction;
        penalties.push({
          reason: `주의 곡물 성분 검출: "${grain.ko}" (-${cost}점)`,
          points: cost
        });
        score -= cost;
      }
    }

    // 3. 출처 불분명 동물성 단백질 감점
    this.detectAnonymousMeat(penalties);
    for (const penalty of penalties) {
      if (penalty.reason.startsWith('출처 불분명')) {
        score -= penalty.points;
      }
    }

    // 4. 곡물 분할 탐지 감점
    this.detectIngredientSplitting(penalties);
    const splitPenalty = penalties.find(p => p.reason.startsWith('곡물 분할'));
    if (splitPenalty) {
      score -= splitPenalty.points;
    }

    // 5. 가산(보너스) 요소 적용
    // 5-1. 첫 번째 원재료가 고품질 생육인지 판별 (예: 생닭고기, 연어, 양고기 등)
    if (this.ingredients.length > 0) {
      const firstIng = this.ingredients[0];
      const meatRegex = /닭고기|생육|양고기|소고기|오리고기|칠면조|연어|참치|대구|chicken|lamb|beef|duck|turkey|salmon/i;
      // 육분이나 부산물 형태는 보너스 제외
      const excludeRaw = /육분|부산물|meal|by-product/i;
      
      if (meatRegex.test(firstIng) && !excludeRaw.test(firstIng)) {
        bonuses.push({
          reason: `제1원료로 양질의 생육/생선 사용: "${firstIng}" (+5점)`,
          points: 5
        });
        score += 5;
      }
    }

    // 5-2. 유익한 첨가제 가산점
    let beneficialCount = 0;
    for (const ben of this.beneficialIngredients) {
      if (this.ingredients.some(ing => ing.toLowerCase().includes(ben.name))) {
        bonuses.push({
          reason: `유익한 성분 검출: "${ben.ko}" (+${ben.bonus}점)`,
          points: ben.bonus
        });
        score += ben.bonus;
        beneficialCount++;
      }
    }

    // 최종 점수 0 ~ 100 범위 바인딩
    score = Math.max(0, Math.min(100, score));

    // 등급 환산
    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
    if (score >= 95) grade = 'A+';
    else if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';

    // AAFCO 검증
    const aafco = this.validateAAFCO();
    
    // FEDIAF 교차 경고
    const fediaf_warnings = this.validateFEDIAF();

    // 알레르기 연동
    const allergy = this.checkAllergies();

    // 칼로리 계산
    const caloriesInfo = this.calculateCalories();

    return {
      score,
      grade,
      penalties,
      bonuses,
      aafco_passed: aafco.passed,
      fediaf_warnings: [...aafco.details, ...fediaf_warnings],
      allergy_warning: allergy.warning,
      allergy_ingredients: allergy.ingredients,
      estimated_calories_kcal_kg: caloriesInfo.kcalKg,
      caloric_distribution: caloriesInfo.distribution
    };
  }
}
