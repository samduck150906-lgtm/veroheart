// src/analysis/nutrientClassification.ts

export type HealthPurpose =
  | '관절 관리'
  | '장 건강'
  | '피부·모질'
  | '심장 관리'
  | '면역 강화'
  | '눈 건강'
  | '뇌·신경'
  | '체중 관리'
  | '뼈·치아'
  | '항산화'
  | '비뇨기 건강';

export interface FunctionalIngredient {
  name: string;
  purposes: HealthPurpose[];
  description: string;
}

export type NutritionDisclosureLevel = '완전 공개' | '부분 공개' | '미공개';
export type ETFTrustGrade = 'C1' | 'C2' | 'C3' | 'D';

const FUNCTIONAL_MAP: Array<{ patterns: string[]; purposes: HealthPurpose[]; description: string }> = [
  {
    patterns: ['초록입홍합', '초록입 홍합', 'green-lipped mussel', 'green lipped mussel', 'glm'],
    purposes: ['관절 관리', '피부·모질'],
    description: '관절 염증 완화와 오메가-3 공급에 도움이 될 수 있어요.',
  },
  {
    patterns: ['글루코사민', 'glucosamine'],
    purposes: ['관절 관리'],
    description: '관절 연골 유지에 도움이 될 수 있어요.',
  },
  {
    patterns: ['콘드로이틴', 'chondroitin'],
    purposes: ['관절 관리'],
    description: '관절 연골의 수분 유지와 탄력에 도움이 될 수 있어요.',
  },
  {
    patterns: ['유산균', '프로바이오틱스', 'probiotics', 'lactobacillus', '발효물', '발효', 'fermented'],
    purposes: ['장 건강'],
    description: '장내 유익균 균형을 유지하는 데 도움이 될 수 있어요.',
  },
  {
    patterns: ['프락토올리고당', 'fos', '이눌린', 'inulin', 'prebiotic'],
    purposes: ['장 건강'],
    description: '유익균의 먹이가 되는 프리바이오틱스예요.',
  },
  {
    patterns: ['연어오일', '연어유', 'salmon oil', 'fish oil', '어유', '오메가3', 'omega3', 'omega-3'],
    purposes: ['피부·모질', '관절 관리', '심장 관리'],
    description: 'EPA·DHA가 풍부해 피부, 관절, 심장에 도움이 될 수 있어요.',
  },
  {
    patterns: ['dha', 'epa'],
    purposes: ['피부·모질', '관절 관리', '심장 관리', '뇌·신경'],
    description: '필수 오메가-3 지방산으로 다양한 건강 기능을 지원해요.',
  },
  {
    patterns: ['타우린', 'taurine'],
    purposes: ['심장 관리', '눈 건강'],
    description: '고양이에게 필수적인 아미노산으로 심장과 눈 건강에 중요해요.',
  },
  {
    patterns: ['l-카르니틴', 'l-carnitine', 'carnitine', '카르니틴'],
    purposes: ['심장 관리', '체중 관리'],
    description: '지방 대사와 심장 기능을 지원하는 아미노산 유도체예요.',
  },
  {
    patterns: ['비타민c', 'vitamin c', 'ascorbic acid', '아스코르브산'],
    purposes: ['면역 강화', '항산화'],
    description: '항산화 작용과 면역 지원에 도움이 될 수 있어요.',
  },
  {
    patterns: ['비타민e', 'vitamin e', '혼합토코페롤', '토코페롤', 'tocopherol'],
    purposes: ['항산화', '피부·모질'],
    description: '항산화 작용으로 세포를 보호하는 데 도움이 될 수 있어요.',
  },
  {
    patterns: ['아연', 'zinc'],
    purposes: ['면역 강화', '피부·모질'],
    description: '면역 기능과 피부·모질 유지에 도움이 될 수 있어요.',
  },
  {
    patterns: ['칼슘', 'calcium'],
    purposes: ['뼈·치아'],
    description: '뼈와 치아 형성에 필수적인 미네랄이에요.',
  },
  {
    patterns: ['크랜베리', 'cranberry'],
    purposes: ['비뇨기 건강'],
    description: '방광 건강을 지원하는 데 도움이 될 수 있어요.',
  },
  {
    patterns: ['루테인', 'lutein'],
    purposes: ['눈 건강', '항산화'],
    description: '눈 건강과 항산화 작용에 도움이 될 수 있어요.',
  },
];

export const PURPOSE_STYLE: Record<HealthPurpose, { bg: string; text: string; border: string; emoji: string }> = {
  '관절 관리':    { bg: '#FFF7ED', text: '#9A3412', border: '#FDBA74', emoji: '🦴' },
  '장 건강':     { bg: '#F0FDF4', text: '#166534', border: '#86EFAC', emoji: '🌿' },
  '피부·모질':   { bg: '#FDF4FF', text: '#7E22CE', border: '#E9D5FF', emoji: '✨' },
  '심장 관리':   { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3', emoji: '❤️' },
  '면역 강화':   { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', emoji: '🛡️' },
  '눈 건강':     { bg: '#F0FDF4', text: '#065F46', border: '#6EE7B7', emoji: '👁️' },
  '뇌·신경':    { bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE', emoji: '🧠' },
  '체중 관리':   { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A', emoji: '⚖️' },
  '뼈·치아':    { bg: '#F0F9FF', text: '#0C4A6E', border: '#BAE6FD', emoji: '🦷' },
  '항산화':      { bg: '#FFF7ED', text: '#7C3AED', border: '#DDD6FE', emoji: '🌟' },
  '비뇨기 건강': { bg: '#F0FDF4', text: '#047857', border: '#6EE7B7', emoji: '💧' },
};

export function classifyFunctionalIngredients(
  ingredients: Array<{ nameKo: string; nameEn?: string }>
): FunctionalIngredient[] {
  const results: FunctionalIngredient[] = [];

  for (const ing of ingredients) {
    const searchText = (ing.nameKo + ' ' + (ing.nameEn ?? '')).toLowerCase();

    for (const entry of FUNCTIONAL_MAP) {
      if (entry.patterns.some(p => searchText.includes(p.toLowerCase()))) {
        const existing = results.find(r => r.name === ing.nameKo);
        if (existing) {
          for (const purpose of entry.purposes) {
            if (!existing.purposes.includes(purpose)) existing.purposes.push(purpose);
          }
        } else {
          results.push({ name: ing.nameKo, purposes: [...entry.purposes], description: entry.description });
        }
        break;
      }
    }
  }

  return results;
}

export function getNutritionDisclosure(ga: {
  crudeProtein?: number; crudeFat?: number; crudeFiber?: number;
  crudeAsh?: number; moisture?: number; calcium?: number; phosphorus?: number;
} | undefined | null): { level: NutritionDisclosureLevel; disclosedCount: number; totalBaseline: number } {
  const BASELINE = 7;
  if (!ga) return { level: '미공개', disclosedCount: 0, totalBaseline: BASELINE };
  const count = [ga.crudeProtein, ga.crudeFat, ga.crudeFiber, ga.crudeAsh, ga.moisture, ga.calcium, ga.phosphorus]
    .filter(v => v != null).length;
  const level: NutritionDisclosureLevel = count >= BASELINE ? '완전 공개' : count >= 3 ? '부분 공개' : '미공개';
  return { level, disclosedCount: count, totalBaseline: BASELINE };
}

export function getETFTrustGrade(params: {
  verificationStatus?: string;
  disclosureLevel: NutritionDisclosureLevel;
  ingredientGrade: string;
  dangerCount: number;
}): { grade: ETFTrustGrade; description: string } {
  const { verificationStatus, disclosureLevel, ingredientGrade, dangerCount } = params;
  if (dangerCount > 0) return { grade: 'D', description: '위험 성분 포함으로 신뢰도가 낮아요.' };
  const topGrade = ingredientGrade === 'A+' || ingredientGrade === 'A';
  const goodGrade = topGrade || ingredientGrade === 'B+';
  if (verificationStatus === 'verified' && disclosureLevel === '완전 공개' && topGrade)
    return { grade: 'C1', description: '공개 정보가 충분하고 공식 인증된 제품이에요.' };
  if (disclosureLevel !== '미공개' && goodGrade)
    return { grade: 'C2', description: '대부분의 정보가 공개된 신뢰 가능한 제품이에요.' };
  if (disclosureLevel !== '미공개')
    return { grade: 'C3', description: '일부 정보가 공개되어 있으나 완전한 판단에 한계가 있어요.' };
  return { grade: 'D', description: '영양 정보 미공개로 정확한 판단이 어려워요.' };
}
