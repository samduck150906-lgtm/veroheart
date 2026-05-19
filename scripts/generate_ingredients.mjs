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

  const prompt = `당신은 반려동물 영양 전문가입니다.
아래 ${animalLabel} ${categoryLabel} 제품의 주요 성분 10~15개를 추론해서 JSON 배열로 알려주세요.
실제 시중 제품 성분표를 참고하여 현실적인 성분을 추론해 주세요.

제품명: ${productName}

다음 JSON 형식으로만 응답해주세요 (마크다운 없이 순수 JSON 배열):
[
  {
    "name_ko": "성분 한국어명",
    "name_en": "English name",
    "risk_level": "safe | caution | danger",
    "description": "이 성분의 역할 (한국어, 10자 이내)"
  }
]

risk_level 기준:
- safe: 천연 단백질원, 비타민, 미네랄, 유익한 지방 등
- caution: 옥수수, 밀, 대두 등 알레르기 가능성 있는 원료, 일부 보존료
- danger: BHA, BHT, 에톡시퀸, 인공색소, 프로필렌글리콜 등 유해 첨가물`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
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
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('  Failed to parse Gemini response');
      return null;
    }
    return JSON.parse(jsonMatch[0]);
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
  
  const ingredients = await generateIngredientsWithAI(product.name, petType, subCategory);
  if (!ingredients || ingredients.length === 0) {
    console.log('  ❌ AI 성분 생성 실패');
    return 0;
  }

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
