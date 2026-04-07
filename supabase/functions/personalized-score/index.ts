import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RiskLevel = 'safe' | 'caution' | 'danger' | 'warning';
type ProfileType = 'allergy' | 'avoidance';
type Severity = 'confirmed' | 'suspected';

interface ProductIngredient {
  id?: string;
  name_ko: string;
  name_en?: string | null;
  risk_level: RiskLevel;
  mapped_allergens?: string[];
}

interface PetProfileItem {
  allergen_code: string;
  allergen_label_ko?: string;
  profile_type: ProfileType;
  severity?: Severity;
}

interface RequestBody {
  product_ingredients: ProductIngredient[];
  pet_profile: PetProfileItem[];
}

const POLICY = {
  base: 35,
  dangerPenalty: 6,
  cautionPenalty: 3,
  maxDangerPenalty: 18,
  maxCautionPenalty: 9,
  confirmedAllergyPenalty: 20,
  suspectedAllergyPenalty: 12,
  avoidancePenalty: 6,
  maxPersonalPenalty: 30,
  policyVersion: 'safety-v1',
} as const;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as RequestBody;
    if (!Array.isArray(body.product_ingredients) || !Array.isArray(body.pet_profile)) {
      return new Response(JSON.stringify({ error: 'product_ingredients와 pet_profile 배열이 필요합니다.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const productIngredients = body.product_ingredients;
    const petProfile = body.pet_profile;

    const dangerCount = productIngredients.filter((ing) => ing.risk_level === 'danger').length;
    const cautionCount = productIngredients.filter((ing) => ing.risk_level === 'caution' || ing.risk_level === 'warning').length;

    const riskPenalty =
      Math.min(POLICY.maxDangerPenalty, dangerCount * POLICY.dangerPenalty) +
      Math.min(POLICY.maxCautionPenalty, cautionCount * POLICY.cautionPenalty);

    const matchedByAllergen = new Map<string, { label: string; ingredients: Set<string>; profile: PetProfileItem }>();
    const profileByCode = new Map(petProfile.map((p) => [p.allergen_code.toLowerCase(), p]));

    for (const ing of productIngredients) {
      const mapped = ing.mapped_allergens ?? [];
      for (const allergenCodeRaw of mapped) {
        const allergenCode = allergenCodeRaw.toLowerCase();
        const profileItem = profileByCode.get(allergenCode);
        if (!profileItem) continue;

        const existing = matchedByAllergen.get(allergenCode);
        if (existing) {
          existing.ingredients.add(ing.name_ko);
          continue;
        }

        matchedByAllergen.set(allergenCode, {
          label: profileItem.allergen_label_ko ?? profileItem.allergen_code,
          ingredients: new Set([ing.name_ko]),
          profile: profileItem,
        });
      }
    }

    let personalPenalty = 0;
    for (const matched of matchedByAllergen.values()) {
      if (matched.profile.profile_type === 'avoidance') {
        personalPenalty += POLICY.avoidancePenalty;
      } else if (matched.profile.severity === 'suspected') {
        personalPenalty += POLICY.suspectedAllergyPenalty;
      } else {
        personalPenalty += POLICY.confirmedAllergyPenalty;
      }
    }
    personalPenalty = Math.min(POLICY.maxPersonalPenalty, personalPenalty);

    const safetyScore = Math.max(0, POLICY.base - riskPenalty - personalPenalty);
    const hardWarning = Array.from(matchedByAllergen.values()).some(
      (m) => m.profile.profile_type === 'allergy' && (m.profile.severity ?? 'confirmed') === 'confirmed',
    );

    const hits = Array.from(matchedByAllergen.entries()).map(([code, item]) => ({
      allergen_code: code,
      allergen_label_ko: item.label,
      profile_type: item.profile.profile_type,
      severity: item.profile.severity ?? null,
      matched_ingredients: Array.from(item.ingredients),
    }));

    const warnings = hits.map((hit) => ({
      level: hit.profile_type === 'allergy' ? 'critical' : 'caution',
      code: hit.profile_type === 'allergy' ? 'ALLERGY_MATCH' : 'AVOIDANCE_MATCH',
      message:
        hit.profile_type === 'allergy'
          ? `주의! ${hit.allergen_label_ko} 알러지 유발 성분이 포함되어 있어요`
          : `참고: ${hit.allergen_label_ko} 기피 성분이 포함되어 있어요`,
    }));

    return new Response(
      JSON.stringify({
        policy_version: POLICY.policyVersion,
        scores: { safety: safetyScore, max: POLICY.base },
        safety_breakdown: {
          base: POLICY.base,
          risk_penalty: riskPenalty,
          personal_penalty: personalPenalty,
          hard_warning: hardWarning,
        },
        hits,
        warnings,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || '개인화 점수 계산 중 오류가 발생했습니다.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
