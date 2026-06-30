import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { productId, petProfile } = await req.json()
    const { allergies = [], healthConcerns = [], petName = '아이' } = petProfile

    // 1. Fetch Product and its mapped ingredients
    const { data: product, error } = await supabaseClient
      .from('products')
      .select(`
        id, 
        name, 
        brand_name,
        ingredients:product_ingredients(
          ingredient:ingredients(id, name_ko, risk_level, description, caution_conditions, allergy_triggers)
        )
      `)
      .eq('id', productId)
      .single()

    if (error) throw error

    const mappedIngredients = product.ingredients.map((pi: any) => pi.ingredient)
    
    // 2. Analyze
    let dangerCount = 0;
    let cautionCount = 0;
    let isCritical = false;
    let criticalReasons: string[] = [];
    
    const analyzedIngredients = mappedIngredients.map((ing: any) => {
      // EWG / AAFCO risk mapping
      let finalRisk = ing.risk_level;
      let reason = ing.description || '';

      // Check User Pet Allergies
      const hasAllergy = allergies.some((a: string) => ing.allergy_triggers?.includes(a) || ing.name_ko.includes(a));
      if (hasAllergy) {
        finalRisk = 'danger';
        isCritical = true;
        criticalReasons.push(`${ing.name_ko} (알레르기 유발)`);
        reason = `${petName}의 알레르기 유발 성분입니다. 절대 급여하지 마세요!`;
      }

      // Check Health Concerns
      const affectsCondition = healthConcerns.some((c: string) => ing.caution_conditions?.includes(c));
      if (affectsCondition) {
        if (finalRisk !== 'danger') finalRisk = 'caution';
        reason = `${petName}의 건강 상태(${healthConcerns.join(',')})에 부담을 줄 수 있는 성분입니다.`;
      }

      if (finalRisk === 'danger') dangerCount++;
      if (finalRisk === 'caution' && !hasAllergy) cautionCount++;

      return {
        id: ing.id,
        name: ing.name_ko,
        risk: finalRisk,
        reason: reason
      }
    });

    // 3. Generate Toss-style Headline & Nutrition Summary
    let headline = `${petName}가 안심하고 먹을 수 있어요!`;
    let headlineColor = 'text-gray-900';
    let isSafe = true;

    if (isCritical || dangerCount > 0) {
      headline = `치명적인 주의 성분이 ${dangerCount}개 발견됐어요`;
      headlineColor = 'text-red-500';
      isSafe = false;
    } else if (cautionCount > 0) {
      headline = `급여 전 확인해야 할 성분이 ${cautionCount}개 있어요`;
      headlineColor = 'text-yellow-600';
      isSafe = true;
    }

    // Mock Nutrition Summary (In a real app, calculate from crude protein/fat)
    const nutritionSummary = healthConcerns.includes('비만') 
      ? "다이어트가 필요한 아이에겐 지방 수치가 다소 높으니 급여량을 10% 줄여주세요." 
      : "조단백질이 풍부하여 근육 형성과 에너지 보충에 아주 좋습니다.";

    const responsePayload = {
      productId,
      petName,
      headline,
      headlineColor,
      isSafe,
      nutritionSummary,
      criticalReasons,
      ingredients: analyzedIngredients.sort((a, b) => {
        const riskScore = { 'danger': 3, 'caution': 2, 'safe': 1 };
        return riskScore[b.risk as keyof typeof riskScore] - riskScore[a.risk as keyof typeof riskScore];
      })
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
