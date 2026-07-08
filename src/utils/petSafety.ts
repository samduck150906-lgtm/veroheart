/**
 * 반려동물 안전 성분 스캔 (순수 함수).
 *
 * 사용자가 최근 본 제품에서 (1) 프로필 알레르기와 매칭되는 성분,
 * (2) 위험(danger) 등급 성분을 찾아 홈 화면 경고 배너용 요약을 만든다.
 */
import { findIngredientByName } from '../analysis/ingredientDictionary';
import { toAllergenTags } from '../analysis/adapter';

export interface ScanIngredient {
  nameKo: string;
  riskLevel: string;
}

export interface ScanProduct {
  id: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  ingredients?: ScanIngredient[];
}

export interface FlaggedProduct {
  id: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  /** 이 제품에서 걸린 성분명(알레르기 + 위험) */
  hits: string[];
}

export interface PetSafetyScan {
  flaggedCount: number;
  /** 알레르기 매칭 성분명(중복 제거) */
  allergenNames: string[];
  /** 위험 등급 성분명(중복 제거) */
  dangerNames: string[];
  flagged: FlaggedProduct[];
}

export function scanIngredientRisks(
  products: ScanProduct[],
  profile: { allergies?: string[] },
): PetSafetyScan {
  const allergyTags = new Set(toAllergenTags(profile.allergies ?? []));
  const allergyLabels = (profile.allergies ?? []).map((a) => a.trim()).filter(Boolean);

  const flagged: FlaggedProduct[] = [];
  const allergenNames = new Set<string>();
  const dangerNames = new Set<string>();

  for (const p of products) {
    const hits = new Set<string>();
    for (const ing of p.ingredients ?? []) {
      if (ing.riskLevel === 'danger') {
        hits.add(ing.nameKo);
        dangerNames.add(ing.nameKo);
        continue;
      }
      const dict = findIngredientByName(ing.nameKo);
      const tagHit = (dict?.allergenTags ?? []).some((t) => allergyTags.has(t));
      const labelHit = allergyLabels.some((l) => ing.nameKo.includes(l) || l.includes(ing.nameKo));
      if (tagHit || labelHit) {
        hits.add(ing.nameKo);
        allergenNames.add(ing.nameKo);
      }
    }
    if (hits.size > 0) {
      flagged.push({ id: p.id, name: p.name, brand: p.brand, imageUrl: p.imageUrl, hits: [...hits] });
    }
  }

  return {
    flaggedCount: flagged.length,
    allergenNames: [...allergenNames],
    dangerNames: [...dangerNames],
    flagged,
  };
}
