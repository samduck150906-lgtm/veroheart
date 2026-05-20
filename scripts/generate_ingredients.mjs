import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env.local');

let envConfig = {};
try {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) envConfig[match[1]] = match[2]?.replace(/^['"]|['"]$/g, '');
  });
} catch {}

const SUPABASE_URL = envConfig['VITE_SUPABASE_URL'] || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = envConfig['VITE_SUPABASE_ANON_KEY'] || process.env.VITE_SUPABASE_ANON_KEY;
const GEMINI_KEY = envConfig['GEMINI_API_KEY'] || process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set");
  process.exit(1);
}
if (!GEMINI_KEY) {
  console.error("Error: GEMINI_API_KEY not set");
  process.exit(1);
}

const API_URL = `${SUPABASE_URL}/rest/v1`;
const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation"
};

// ──────── AI 성분 생성 (Gemini) ────────

async function generateIngredientsWithAI(productName, petType, subCategory) {
  const animalLabel = petType === 'cat' ? '고양이' : '강아지';
  const categoryLabel = subCategory === 'snack' ? '간식' : '사료';

  const systemInstruction = `당신은 수의 영양학 전문 분석 AI입니다.
제품의 전성분표나 제품 설명 이미지를 스캔하여 필수 영양 정보와 성분을 추출합니다.
화려한 마케팅 문구는 무시하고, 법적으로 요구되는 '사용 원료(Ingredients)' 목록과 '보증 성분량(Guaranteed Analysis)'을 정확히 분석해 주세요.
특히 AAFCO 2024년 펫푸드 라벨 현대화(Pet Food Label Modernization) 규정에 맞게, 기존 조섬유 외에 '총 식이섬유(Total Dietary Fiber)' 표기가 있다면 추출하고, 제품에 표시된 '칼로리 분포(단백질, 지방, 탄수화물 유래 칼로리 비율)'를 찾아 caloric_distribution에 저장하십시오. 만약 칼로리 분포가 명시적으로 기재되어 있지 않다면, 보증 성분(조단백, 조지방, 조섬유, 조회분, 수분 등)을 바탕으로 Modified Atwater 계수(단백질 3.5, 지방 8.5, 탄수화물 3.5)를 활용해 직접 추정 계산하여 소수점 첫째 자리까지 제공하십시오.
성분 오류나 오탈자가 있을 시 표준 사료 원료명으로 정규화(Normalization)하여 저장하십시오.
(예: '닭고기 분말' -> '닭고기분', '비타민 E 보존제' -> '혼합 토코페롤')`;

  const prompt = `아래 ${animalLabel} ${categoryLabel} 제품의 전성분을 분석하고 보증 성분을 추출해서 구조화된 JSON 데이터로 응답해 주세요.
만일 자일리톨, 초콜릿, 포도, 양파, 마늘 등 강아지/고양이에게 유해하거나 치명적인 성분이 단 하나라도 발견된다면, contains_toxic 필드를 true로 설정하고 toxic_ingredients 목록에 해당 성분명과 수의학적 위험 원인을 작성해 주세요.
총 식이섬유(total_dietary_fiber) 값이 이미지에 나타나지 않는 경우 제외하거나 null로 지정하지 않고 0 또는 추정값으로 기록해도 좋습니다.

제품명: ${productName}`;

  // OpenAPI Schema 정의
  const responseSchema = {
    type: "OBJECT",
    properties: {
      product_name: { type: "STRING" },
      ingredients: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            name_ko: { type: "STRING" },
            name_en: { type: "STRING" },
            risk_level: { type: "STRING", enum: ["safe", "caution", "danger"] },
            description: { type: "STRING" }
          },
          required: ["name_ko", "risk_level"]
        }
      },
      guaranteed_analysis: {
        type: "OBJECT",
        properties: {
          crudeProtein: { type: "NUMBER" },
          crudeFat: { type: "NUMBER" },
          crudeFiber: { type: "NUMBER" },
          crudeAsh: { type: "NUMBER" },
          moisture: { type: "NUMBER" },
          calcium: { type: "NUMBER" },
          phosphorus: { type: "NUMBER" },
          total_dietary_fiber: { type: "NUMBER" }
        },
        required: ["crudeProtein", "crudeFat", "crudeFiber", "crudeAsh", "moisture"]
      },
      calories_per_kg: { type: "NUMBER" },
      intended_life_stage: { type: "STRING", enum: ["Puppy", "Adult", "Senior", "All"] },
      contains_toxic: { type: "BOOLEAN" },
      toxic_ingredients: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            reason: { type: "STRING" }
          },
          required: ["name", "reason"]
        }
      },
      caloric_distribution: {
        type: "OBJECT",
        properties: {
          protein: { type: "NUMBER" },
          fat: { type: "NUMBER" },
          carbs: { type: "NUMBER" }
        },
        required: ["protein", "fat", "carbs"]
      }
    },
    required: ["product_name", "ingredients", "guaranteed_analysis", "intended_life_stage", "contains_toxic", "caloric_distribution"]
  };

  try {
    // structured output을 지원하는 최신 gemini-2.5-flash 모델 사용
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
          responseSchema: responseSchema
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`  Gemini API Error ${response.status}:`, errText);
      return null;
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return JSON.parse(rawText.trim());
  } catch (err) {
    console.error('  Gemini fetch error:', err.message);
    return null;
  }
}

// ──────── DB 작업 ────────

async function upsertIngredient(ing) {
  // Check if ingredient exists by name_ko
  const checkRes = await fetch(
    `${API_URL}/ingredients?name_ko=eq.${encodeURIComponent(ing.name_ko)}&select=id`,
    { headers: HEADERS }
  );
  const existing = await checkRes.json();

  if (existing && existing.length > 0) {
    return existing[0].id;
  }

  // Insert new ingredient
  const payload = {
    name_ko: ing.name_ko,
    name_en: ing.name_en || null,
    risk_level: ing.risk_level || 'safe',
    description: ing.description || null,
  };

  const res = await fetch(`${API_URL}/ingredients`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    const data = await res.json();
    return data[0]?.id;
  } else {
    const errText = await res.text();
    console.error(`  Failed to insert ingredient ${ing.name_ko}:`, errText);
    return null;
  }
}

async function linkProductIngredient(productId, ingredientId) {
  // Check if link exists
  const checkRes = await fetch(
    `${API_URL}/product_ingredients?product_id=eq.${productId}&ingredient_id=eq.${ingredientId}`,
    { headers: HEADERS }
  );
  const existing = await checkRes.json();
  if (existing && existing.length > 0) return true;

  const res = await fetch(`${API_URL}/product_ingredients`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ product_id: productId, ingredient_id: ingredientId }),
  });

  return res.ok;
}

// ──────── 메인 실행 ────────

async function fetchProductsWithoutIngredients() {
  // Get all products that have no linked ingredients
  const res = await fetch(
    `${API_URL}/products?select=id,name,target_pet_type,sub_category,product_ingredients(ingredient_id)&order=created_at.desc`,
    { headers: HEADERS }
  );
  const products = await res.json();
  
  // Filter to only products with 0 ingredients
  return products.filter(p => !p.product_ingredients || p.product_ingredients.length === 0);
}

async function processProduct(product) {
  const petType = product.target_pet_type || 'dog';
  const subCategory = product.sub_category || 'dry';
  
  console.log(`\n🔬 [${product.name}]`);
  
  const aiData = await generateIngredientsWithAI(product.name, petType, subCategory);
  if (!aiData || !aiData.ingredients || aiData.ingredients.length === 0) {
    console.log('  ❌ AI 성분 생성 실패');
    return 0;
  }

  const ingredients = aiData.ingredients;

  let linked = 0;
  for (const ing of ingredients) {
    const ingId = await upsertIngredient(ing);
    if (ingId) {
      const ok = await linkProductIngredient(product.id, ingId);
      if (ok) linked++;
    }
  }

  console.log(`  ✅ ${linked}/${ingredients.length}개 성분 연결 완료`);
  return linked;
}

async function run() {
  console.log('🚀 성분 데이터 자동 생성 시작');
  console.log('================================\n');
  
  const products = await fetchProductsWithoutIngredients();
  console.log(`성분이 없는 상품: ${products.length}개\n`);
  
  if (products.length === 0) {
    console.log('✅ 모든 상품에 성분 데이터가 이미 있습니다!');
    return;
  }

  let totalProcessed = 0;
  let totalLinked = 0;
  
  for (const product of products) {
    const linked = await processProduct(product);
    totalLinked += linked;
    totalProcessed++;
    
    // Progress update every 10 products
    if (totalProcessed % 10 === 0) {
      console.log(`\n📊 진행률: ${totalProcessed}/${products.length} (${Math.round(totalProcessed/products.length*100)}%)\n`);
    }
    
    // Rate limiting: Claude Haiku allows ~100 RPM, so 700ms delay is safe
    await new Promise(resolve => setTimeout(resolve, 700));
  }

  console.log('\n================================');
  console.log(`🎉 완료! ${totalProcessed}개 상품에 총 ${totalLinked}개 성분 연결`);
}

run();
