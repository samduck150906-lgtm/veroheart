import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ──────────────── Helper Types & Dictionaries ────────────────

type RiskLevel = "safe" | "caution" | "danger";
type HealthCondition = "kidney" | "urinary" | "joint" | "obesity" | "allergy" | "dental" | "none";

interface IngredientAnalysisItem {
  name: string;
  category: string;
  risk: RiskLevel;
  reason: string;
}

interface AnalysisResponse {
  summary: string;
  risk_level: RiskLevel;
  scores: {
    safety: number;
    nutrition: number;
    final: number;
  };
  ingredient_analysis: IngredientAnalysisItem[];
  alerts: string[];
  combination_analysis: {
    protein_quality: string;
    additive_level: string;
    risk_comment: string;
  };
  recommended_for: HealthCondition[];
  not_recommended_for: HealthCondition[];
}

// 독성 성분 사전
const TOXIC_INGREDIENTS = [
  { name: '자일리톨', reason: '반려동물에게 급격한 인슐린 분비와 저혈당, 간부전을 유발하는 치명적인 독성 물질입니다.' },
  { name: 'xylitol', reason: '반려동물에게 급격한 인슐린 분비와 저혈당, 간부전을 유발하는 치명적인 독성 물질입니다.' },
  { name: '초콜릿', reason: '테오브로민 성분이 함유되어 있어 심장마비, 경련, 구토 및 사망에 이르게 할 수 있습니다.' },
  { name: 'chocolate', reason: '테오브로민 성분이 함유되어 있어 심장마비, 경련, 구토 및 사망에 이르게 할 수 있습니다.' },
  { name: '포도', reason: '강아지와 고양이에게 급성 신부전을 일으키는 매우 위험한 성분입니다. 극소량으로도 치명적입니다.' },
  { name: 'grape', reason: '강아지와 고양이에게 급성 신부전을 일으키는 매우 위험한 성분입니다. 극소량으로도 치명적입니다.' },
  { name: '건포도', reason: '포도와 마찬가지로 급성 신부전을 일으켜 소량 섭취 시에도 신장이 망가집니다.' },
  { name: 'raisin', reason: '포도와 마찬가지로 급성 신부전을 일으켜 소량 섭취 시에도 신장이 망가집니다.' },
  { name: '마늘', reason: '알리움 계열 성분으로 반려동물의 적혈구를 파괴하여 혈뇨와 빈혈을 유발합니다.' },
  { name: 'garlic', reason: '알리움 계열 성분으로 반려동물의 적혈구를 파괴하여 혈뇨와 빈혈을 유발합니다.' },
  { name: '양파', reason: '적혈구 파괴 및 용혈성 빈혈을 일으켜 치명적인 독성을 나타냅니다.' },
  { name: 'onion', reason: '적혈구 파괴 및 용혈성 빈혈을 일으켜 치명적인 독성을 나타냅니다.' }
];

// 화학 보존제 사전
const CAUTION_PRESERVATIVES = [
  { name: 'bha', ko: 'BHA(부틸하이드록시아니솔)', deduction: 10, reason: '장기 섭취 시 알레르기와 암을 유발할 수 있는 논란이 있는 합성 방부제입니다.' },
  { name: 'bht', ko: 'BHT(부틸하이드록시톨루엔)', deduction: 10, reason: '장기 급여 시 알레르기 및 간 비대증을 유발할 위험이 있는 합성 산화방지제입니다.' },
  { name: '에톡시퀸', ko: '에톡시퀸(Ethoxyquin)', deduction: 10, reason: '원래 살충제로 개발된 합성 산화방지제로 신장 손상 및 불임을 유발할 수 있습니다.' },
  { name: 'ethoxyquin', ko: '에톡시퀸(Ethoxyquin)', deduction: 10, reason: '원래 살충제로 개발된 합성 산화방지제로 신장 손상 및 불임을 유발할 수 있습니다.' },
  { name: '프로필렌 글리콜', ko: '프로필렌 글리콜', deduction: 10, reason: '고양이에게 하인츠 소체 빈혈을 유발하여 고양이 사료에는 법적으로 금지된 방부제입니다.' },
  { name: 'propylene glycol', ko: '프로필렌 글리콜', deduction: 10, reason: '고양이에게 하인츠 소체 빈혈을 유발하여 고양이 사료에는 법적으로 금지된 방부제입니다.' },
  { name: '카라기난', ko: '카라기난', deduction: 10, reason: '증점제로 쓰이나 장내 염증 및 위장관 궤양, 종양을 유발할 수 있어 기피 성분입니다.' },
  { name: 'carrageenan', ko: '카라기난', deduction: 10, reason: '증점제로 쓰이나 장내 염증 및 위장관 궤양, 종양을 유발할 수 있어 기피 성분입니다.' },
  { name: '멘아디온', ko: '멘아디온(합성 비타민 K3)', deduction: 10, reason: '합성 비타민 K3로 다량 복용 시 세포 독성과 면역 약화 논란이 있습니다.' },
  { name: 'menadione', ko: '멘아디온(합성 비타민 K3)', deduction: 10, reason: '합성 비타민 K3로 다량 복용 시 세포 독성과 면역 약화 논란이 있습니다.' }
];

// 알레르기 유발 곡물 사전
const CAUTION_GRAINS = [
  { name: '옥수수', ko: '옥수수', deduction: 5, reason: '혈당을 빠르게 올리고 알레르기를 유발할 가능성이 큰 저가 충전재 곡물입니다.' },
  { name: '밀가루', ko: '밀가루', deduction: 5, reason: '글루텐이 다량 함유되어 소화 불량과 아토피 등 알레르기 피부염을 유발하기 쉽습니다.' },
  { name: '밀 ', ko: '밀', deduction: 5, reason: '소화 흡수율이 낮고 피부 알레르기와 눈물을 유발하는 대표적인 충전용 밀 원료입니다.' },
  { name: '대두', ko: '대두', deduction: 5, reason: '소화가 잘 되지 않고 가스를 유발할 수 있으며 알레르기 가능성이 높습니다.' }
];

// 유익 성분 사전
const BENEFICIAL_INGREDIENTS = [
  { name: '연어 오일', ko: '연어 오일', bonus: 3, category: 'fat', reason: '피부 피모 개선과 염증 완화, 두뇌 발달에 좋은 오메가-3 지방산이 풍부합니다.' },
  { name: '연어유', ko: '연어 오일', bonus: 3, category: 'fat', reason: '피부 피모 개선과 염증 완화, 두뇌 발달에 좋은 오메가-3 지방산이 풍부합니다.' },
  { name: '해바라기씨유', ko: '해바라기씨유', bonus: 2, category: 'fat', reason: '피부 장벽 유지와 모질 개선에 도움을 주는 리놀레산이 함유되어 있습니다.' },
  { name: '글루코사민', ko: '글루코사민', bonus: 3, category: 'functional', reason: '관절 연골 재생을 돕고 관절 통증을 예방하는 훌륭한 기능성 원료입니다.' },
  { name: '콘드로이친', ko: '콘드로이친', bonus: 3, category: 'functional', reason: '관절 연골에 수분을 공급하고 뼈 건강을 보호하는 활성 성분입니다.' },
  { name: '혼합 토코페롤', ko: '혼합 토코페롤', bonus: 2, category: 'preservative', reason: '비타민 E 계열의 훌륭한 천연 항산화 보존제입니다. 안심하고 급여할 수 있습니다.' },
  { name: 'mixed tocopherols', ko: '혼합 토코페롤', bonus: 2, category: 'preservative', reason: '비타민 E 계열의 훌륭한 천연 항산화 보존제입니다. 안심하고 급여할 수 있습니다.' },
  { name: '로즈마리 추출물', ko: '로즈마리 추출물', bonus: 2, category: 'preservative', reason: '천연 항산화제 역할을 하여 부작용 없이 사료의 신선도를 유지해 줍니다.' }
];

// ──────────────── Regex & Parsing Helpers ────────────────

function parseGuaranteedAnalysis(text: string, productType: string) {
  // 기본 디폴트 프로필
  const defaults = {
    crudeProtein: productType === 'snack' ? 15 : 26,
    crudeFat: productType === 'snack' ? 5 : 12,
    crudeFiber: 5,
    crudeAsh: 8,
    moisture: productType === 'wet' ? 80 : 10,
    calcium: 1.0,
    phosphorus: 0.8,
    total_dietary_fiber: 0
  };

  const getMatch = (patterns: RegExp[]) => {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return parseFloat(match[1]);
    }
    return null;
  };

  const protein = getMatch([/조단백질?\s*:?\s*(\d+(\.\d+)?)\s*%/i, /Protein\s*:?\s*(\d+(\.\d+)?)\s*%/i]);
  const fat = getMatch([/조지방\s*:?\s*(\d+(\.\d+)?)\s*%/i, /Fat\s*:?\s*(\d+(\.\d+)?)\s*%/i]);
  const fiber = getMatch([/조섬유\s*:?\s*(\d+(\.\d+)?)\s*%/i, /Fiber\s*:?\s*(\d+(\.\d+)?)\s*%/i]);
  const ash = getMatch([/조회분\s*:?\s*(\d+(\.\d+)?)\s*%/i, /Ash\s*:?\s*(\d+(\.\d+)?)\s*%/i]);
  const moisture = getMatch([/수분\s*:?\s*(\d+(\.\d+)?)\s*%/i, /Moisture\s*:?\s*(\d+(\.\d+)?)\s*%/i]);
  const calcium = getMatch([/칼슘\s*:?\s*(\d+(\.\d+)?)\s*%/i, /Calcium\s*:?\s*(\d+(\.\d+)?)\s*%/i]);
  const phosphorus = getMatch([/인\s*:?\s*(\d+(\.\d+)?)\s*%/i, /Phosphorus\s*:?\s*(\d+(\.\d+)?)\s*%/i]);
  const tdf = getMatch([/총\s*식이섬유\s*:?\s*(\d+(\.\d+)?)\s*%/i, /Dietary\s*Fiber\s*:?\s*(\d+(\.\d+)?)\s*%/i]);

  return {
    crudeProtein: protein ?? defaults.crudeProtein,
    crudeFat: fat ?? defaults.crudeFat,
    crudeFiber: fiber ?? defaults.crudeFiber,
    crudeAsh: ash ?? defaults.crudeAsh,
    moisture: moisture ?? defaults.moisture,
    calcium: calcium ?? defaults.calcium,
    phosphorus: phosphorus ?? defaults.phosphorus,
    total_dietary_fiber: tdf ?? defaults.total_dietary_fiber
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { ingredient, animal = 'dog', product_type = 'food', productId, petProfile } = body;

    // 만약 productId가 오면 DB 조회 방식으로 우회 수행
    if (productId) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      )

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
      const { allergies = [], healthConcerns = [], petName = '아이' } = petProfile || {}
      
      let dangerCount = 0;
      let cautionCount = 0;
      let isCritical = false;
      const criticalReasons: string[] = [];
      
      const analyzedIngredients = mappedIngredients.map((ing: any) => {
        let finalRisk = ing.risk_level;
        let reason = ing.description || '';

        const hasAllergy = allergies.some((a: string) => ing.allergy_triggers?.includes(a) || ing.name_ko.includes(a));
        if (hasAllergy) {
          finalRisk = 'danger';
          isCritical = true;
          criticalReasons.push(`${ing.name_ko} (알레르기 유발)`);
          reason = `${petName}의 알레르기 유발 성분입니다. 절대 급여하지 마세요!`;
        }

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
        ingredients: analyzedIngredients.sort((a: any, b: any) => {
          const riskScore = { 'danger': 3, 'caution': 2, 'safe': 1 };
          return riskScore[b.risk as keyof typeof riskScore] - riskScore[a.risk as keyof typeof riskScore];
        })
      };

      return new Response(JSON.stringify(responsePayload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // ─── 텍스트 붙여넣기 분석 모드 (Vero로 핵심 기능) ───
    if (!ingredient || typeof ingredient !== 'string' || ingredient.trim().length < 5) {
      return new Response(JSON.stringify({ error: "성분 텍스트를 최소 5자 이상 전달해야 합니다." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    const rawText = ingredient.trim();
    // 쉼표, 점, 혹은 뉴라인 등으로 성분 파싱
    const splitted = rawText.split(/[,\n]/).map(x => x.replace(/[*·•-]/g, '').trim()).filter(x => x.length > 1);

    // 보증 성분 파싱
    const ga = parseGuaranteedAnalysis(rawText, product_type);
    
    // 점수 및 리스크 계산
    let safetyScore = 100;
    const penalties: { reason: string; points: number } = [];
    const alerts: string[] = [];
    const ingredientAnalysis: IngredientAnalysisItem[] = [];

    // 독성 성분 체크
    TOXIC_INGREDIENTS.forEach(toxic => {
      const found = splitted.some(ing => ing.toLowerCase().includes(toxic.name));
      if (found) {
        safetyScore -= 30;
        alerts.push(`${toxic.name} (독성 물질 검출)`);
        ingredientAnalysis.push({
          name: toxic.name,
          category: "toxic",
          risk: "danger",
          reason: toxic.reason
        });
      }
    });

    // 화학 방부제 체크
    CAUTION_PRESERVATIVES.forEach(pres => {
      const found = splitted.some(ing => ing.toLowerCase().includes(pres.name));
      if (found) {
        safetyScore -= pres.deduction;
        alerts.push(`합성 산화방지제 검출: ${pres.ko} (-${pres.deduction}점)`);
        ingredientAnalysis.push({
          name: pres.ko,
          category: "preservative",
          risk: "danger",
          reason: pres.reason
        });
      }
    });

    // 알레르기 유발 곡물 체크
    CAUTION_GRAINS.forEach(grain => {
      const found = splitted.some(ing => ing.toLowerCase().includes(grain.name));
      if (found) {
        safetyScore -= grain.deduction;
        ingredientAnalysis.push({
          name: grain.ko,
          category: "carbohydrate",
          risk: "caution",
          reason: grain.reason
        });
      }
    });

    // 출처 불분명 고기
    const specificAnimals = /닭|소|오리|양|칠면조|연어|참치|황태|명태|가다랑어|chicken|beef|duck|lamb|turkey|salmon|tuna/i;
    const anonymousPatterns = /(가금류|동물성|고기|동물|가금)\s*(부산물|육분|지방|유|분말|밀|meal|fat|by-product)/i;
    splitted.forEach(ing => {
      if (anonymousPatterns.test(ing) && !specificAnimals.test(ing)) {
        safetyScore -= 10;
        alerts.push(`출처 불분명 동물성 단백질: ${ing} (-10점)`);
        ingredientAnalysis.push({
          name: ing,
          category: "protein_source",
          risk: "danger",
          reason: "구체적인 원료 종(닭, 소 등)을 알 수 없는 렌더링 부산물이나 불분명 고기 지방입니다. 신뢰할 수 없습니다."
        });
      }
    });

    // 곡물 분할 꼼수 검사 (상위 5개 중)
    const top5 = splitted.slice(0, 5);
    const grainsCategories = [
      { words: ['쌀', '쌀가루', '현미', '미강', '싸라기', 'rice'], label: '쌀 계열' },
      { words: ['옥수수', '옥수수가루', '콘글루텐', 'corn'], label: '옥수수 계열' },
      { words: ['밀', '밀가루', '소맥분', 'wheat'], label: '밀 계열' }
    ];
    grainsCategories.forEach(cat => {
      const matched = top5.filter(ing => cat.words.some(word => ing.toLowerCase().includes(word)));
      if (matched.length >= 2) {
        safetyScore -= 5;
        alerts.push(`곡물 분할(Ingredient Splitting) 감지: 상위 5개 중 ${cat.label} ${matched.length}개 쪼개기 표기 (-5점)`);
      }
    });

    // 가산점 및 유익 성분
    let bonusScore = 0;
    // 첫번째 생육 보너스
    if (splitted.length > 0) {
      const firstIng = splitted[0];
      const meatRegex = /닭고기|생육|양고기|소고기|오리고기|칠면조|연어|참치|대구|chicken|lamb|beef|duck|turkey|salmon/i;
      const excludeRaw = /육분|부산물|meal|by-product/i;
      if (meatRegex.test(firstIng) && !excludeRaw.test(firstIng)) {
        bonusScore += 5;
        ingredientAnalysis.push({
          name: firstIng,
          category: "protein_source",
          risk: "safe",
          reason: "제1원료로 양질의 생육/생선을 사용하여 영양 구성이 우수합니다."
        });
      }
    }

    BENEFICIAL_INGREDIENTS.forEach(ben => {
      const found = splitted.some(ing => ing.toLowerCase().includes(ben.name));
      if (found) {
        bonusScore += ben.bonus;
        ingredientAnalysis.push({
          name: ben.ko,
          category: ben.category,
          risk: "safe",
          reason: ben.reason
        });
      }
    });

    // 안전성 점수 최종 (최소 0, 최대 100)
    safetyScore = Math.max(0, Math.min(100, safetyScore));

    // 영양성 점수 (AAFCO DMB 기준 + NFE Atwater 칼로리 계산)
    const moisture = ga.moisture;
    const proteinDMB = (ga.crudeProtein / (100 - moisture)) * 100;
    const fatDMB = (ga.crudeFat / (100 - moisture)) * 100;

    const minProtein = animal === 'cat' ? 26 : 18;
    const minFat = animal === 'cat' ? 9 : 5.5;

    let nutritionScore = 100;
    const aafcoFailures: string[] = [];
    if (proteinDMB < minProtein) {
      nutritionScore -= 25;
      aafcoFailures.push(`조단백질 AAFCO 최소 규격 미달 (건물 DMB ${proteinDMB.toFixed(1)}% < 기준 ${minProtein}%)`);
    }
    if (fatDMB < minFat) {
      nutritionScore -= 25;
      aafcoFailures.push(`조지방 AAFCO 최소 규격 미달 (건물 DMB ${fatDMB.toFixed(1)}% < 기준 ${minFat}%)`);
    }

    // Atwater 칼로리 기여도
    const nfe = Math.max(0, 100 - ga.crudeProtein - ga.crudeFat - ga.crudeFiber - ga.crudeAsh - ga.moisture);
    const proteinKcal = ga.crudeProtein * 3.5;
    const fatKcal = ga.crudeFat * 8.5;
    const carbKcal = nfe * 3.5;
    const totalKcal = proteinKcal + fatKcal + carbKcal;
    const caloriesPerKg = totalKcal * 10;

    let proteinContribution = 0;
    let fatContribution = 0;
    let carbContribution = 0;
    if (totalKcal > 0) {
      proteinContribution = (proteinKcal / totalKcal) * 100;
      fatContribution = (fatKcal / totalKcal) * 100;
      carbContribution = (carbKcal / totalKcal) * 100;
    }

    // 단백질 칼로리 분담률이 너무 낮으면(20% 미만) 영양 감점
    if (proteinContribution < 20) {
      nutritionScore -= 15;
    }
    nutritionScore = Math.max(0, Math.min(100, nutritionScore));

    // 최종 종합 점수 (안전 60% + 영양 40%) + 보너스 가중
    let finalScore = Math.round((safetyScore * 0.6) + (nutritionScore * 0.4) + bonusScore);
    finalScore = Math.max(0, Math.min(100, finalScore));

    // 리스크 수준 판별
    let riskLevel: RiskLevel = "safe";
    if (alerts.length > 0) {
      riskLevel = alerts.some(a => a.includes("독성") || a.includes("BHA") || a.includes("BHT") || a.includes("에톡시퀸") || a.includes("프로필렌")) ? "danger" : "caution";
    }

    // 안전 리스트에 채워지지 않은 일반 성분들은 safe 처리
    splitted.forEach(ing => {
      const alreadyAnalyzed = ingredientAnalysis.some(i => i.name === ing || ing.includes(i.name));
      if (!alreadyAnalyzed) {
        // 단어에 따라 심플 매핑
        let cat = "unknown";
        if (/고기|닭|소|양|연어|오리|참치|밀|fish|chicken|beef/i.test(ing)) cat = "protein_source";
        else if (/쌀|감자|고구마|보리|옥수수|밀가루/i.test(ing)) cat = "carbohydrate";
        else if (/오일|유|지방|fat|oil/i.test(ing)) cat = "fat";
        else if (/추출물|토코페롤|보존/i.test(ing)) cat = "preservative";
        else if (/비타민|미네랄|유산균/i.test(ing)) cat = "additive";

        ingredientAnalysis.push({
          name: ing,
          category: cat,
          risk: "safe",
          reason: "일반적으로 널리 쓰이는 사료 안전 성분입니다."
        });
      }
    });

    // 조합 코멘트 생성
    let proteinQuality = "생육 위주 양질 단백질";
    if (splitted.some(ing => anonymousPatterns.test(ing))) {
      proteinQuality = "출처 불분명 부산물/육분 다수";
    }

    let additiveLevel = "천연 보존제 사용 안전 구성";
    if (alerts.some(a => a.includes("합성"))) {
      additiveLevel = "BHA/BHT 합성 방부제 주의";
    }

    let riskComment = `전성분 분석 결과, 안전성 점수 ${safetyScore}점, 영양성 점수 ${nutritionScore}점으로 종합 점수는 ${finalScore}점입니다. `;
    if (riskLevel === 'danger') {
      riskComment += "강아지나 고양이에게 치명적일 수 있는 합성 첨가물 또는 독성 우려 성분이 감지되어 매우 주의 깊은 급여가 요구됩니다.";
    } else if (riskLevel === 'caution') {
      riskComment += "심각한 독성 원료는 없으나 옥수수/밀가루 등 일부 알레르기 유발 가능 곡물 또는 확인이 필요한 원료들이 기재되어 있습니다.";
    } else {
      riskComment += "화학 합성 방부제가 배제되고 양질의 동물성 단백질 위주로 배합된 훌륭하고 매우 안심할 수 있는 사료입니다.";
    }

    // 추천/비추천 질환 연동
    const recommendedFor: HealthCondition[] = [];
    const notRecommendedFor: HealthCondition[] = [];

    if (splitted.some(ing => /글루코사민|콘드로이친/i.test(ing))) {
      recommendedFor.push("joint");
    }
    if (ga.crudeFat <= 10) {
      recommendedFor.push("obesity");
    } else if (ga.crudeFat > 18) {
      notRecommendedFor.push("obesity");
    }
    if (ga.crudeProtein >= 30) {
      recommendedFor.push("urinary");
    }

    // DMB 및 칼로리 텍스트 보충을 위한 상세 분석 결과 반환
    const responsePayload = {
      summary: riskLevel === 'danger' ? "주의! 유해 화학 보존료나 치명적인 독성 성분이 관찰됩니다." : (riskLevel === 'caution' ? "급여 전에 꼼꼼히 확인해봐야 할 주의 성분들이 있습니다." : "아주 훌륭해요! 안심하고 급여할 수 있는 프리미엄 성분 조화입니다."),
      risk_level: riskLevel,
      scores: {
        safety: safetyScore,
        nutrition: nutritionScore,
        final: finalScore
      },
      ingredient_analysis: ingredientAnalysis.sort((a, b) => {
        const riskVal = { 'danger': 3, 'caution': 2, 'safe': 1 };
        return riskVal[b.risk] - riskVal[a.risk];
      }),
      alerts: [...alerts, ...aafcoFailures],
      combination_analysis: {
        protein_quality: proteinQuality,
        additive_level: additiveLevel,
        risk_comment: riskComment
      },
      recommended_for: recommendedFor.length > 0 ? recommendedFor : ["none"],
      not_recommended_for: notRecommendedFor.length > 0 ? notRecommendedFor : ["none"],
      estimated_calories_kcal_kg: Math.round(caloriesPerKg),
      caloric_distribution: {
        protein: Math.round(proteinContribution),
        fat: Math.round(fatContribution),
        carbs: Math.round(carbContribution)
      },
      contains_toxic: alerts.some(a => a.includes("독성") || a.includes("자일리톨") || a.includes("초콜릿") || a.includes("포도") || a.includes("마늘") || a.includes("양파")),
      toxic_ingredients: ingredientAnalysis.filter(i => i.category === 'toxic').map(i => ({ name: i.name, reason: i.reason }))
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
