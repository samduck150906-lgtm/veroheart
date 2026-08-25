/**
 * personalized-score — 서버측 맞춤 점수 산출 (현재 미연결).
 *
 * 상태: 이 함수는 앱·랜딩 어디에서도 호출하지 않는다. 적합도 점수는 전적으로
 *   클라이언트(`src/utils/score.ts`, `src/analysis/*`)에서 계산해 화면에 쓴다.
 *   따라서 지금 이 파일을 고쳐도 사용자에게 보이는 점수는 달라지지 않는다.
 *
 * 왜 남겨 두는가: 삭제 대상 죽은 코드가 아니라, 점수 계산을 서버로 옮길 때 쓸
 *   기준 구현이다. 클라이언트 계산은 (1) 정책을 바꾸면 앱 배포를 기다려야 하고
 *   (2) 정규화 사전 전체를 번들에 실어야 한다. 이 함수는 그 전환 지점을 잡아 둔다.
 *
 * 연결할 때 반드시 확인할 것:
 *   - 여기의 POLICY 상수와 `src/utils/score.ts` 의 가중치가 같은 값인지
 *     (지금은 두 곳이 각자 관리되고 있어 자동으로 일치하지 않는다)
 *   - 오프라인·요청 실패 시 클라이언트 계산으로 되돌아가는 경로
 *
 * 그때까지는 호출부를 새로 만들지 말 것 — 두 계산이 동시에 살아 있으면 같은
 * 제품에 다른 점수가 표시된다.
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { buildCorsHeaders } from '../_shared/cors.ts';

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
  const corsHeaders = buildCorsHeaders(req);
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '개인화 점수 계산 중 오류가 발생했습니다.';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
