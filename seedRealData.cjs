const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf-8');
const envConfig = {};
envContent.split('\n').forEach(line => {
  if (line.trim() && !line.startsWith('#')) {
    const [k, ...v] = line.split('=');
    if (k && v.length > 0) envConfig[k.trim()] = v.join('=').trim();
  }
});
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Starting data insertion...');

  const ingredients = [
    { name_ko: '쌀', name_en: 'Rice', risk_level: 'safe', description: '에너지원인 저알러지 탄수화물' },
    { name_ko: '계육분', name_en: 'Chicken Meal', risk_level: 'safe', description: '닭고기를 건조 분쇄한 고단백 원료' },
    { name_ko: '닭 지방', name_en: 'Chicken Fat', risk_level: 'safe', description: '오메가-6와 에너지를 공급하는 동물성 지방' },
    { name_ko: '밀 글루텐', name_en: 'Wheat Gluten', risk_level: 'caution', description: '식물성 단백질로 소화 민감성 확인 필요' },
    { name_ko: '완두 섬유', name_en: 'Pea Fiber', risk_level: 'safe', description: '장 건강을 돕는 식이섬유' },
    { name_ko: '사탕무박', name_en: 'Beet Pulp', risk_level: 'safe', description: '변 상태를 개선하는 프리바이오틱 섬유질' },
    { name_ko: '가금류박', name_en: 'Poultry Meal', risk_level: 'safe', description: '가금류를 가공하여 단백질 효율을 높인 원료' },
    { name_ko: '대두유', name_en: 'Soybean Oil', risk_level: 'safe', description: '필수 지방산을 공급하는 식물성 유지' },
    { name_ko: '프락토올리고당', name_en: 'FOS', risk_level: 'safe', description: '장내 유익균 보조제 (프리바이오틱스)' },
    { name_ko: '보리지 오일', name_en: 'Borage Oil', risk_level: 'safe', description: '피부 건강에 좋은 감마리놀렌산 공급원' },
    { name_ko: '녹차 추출물', name_en: 'Green Tea Extract', risk_level: 'safe', description: '노화 방지와 구강 관리 보조제' },
    { name_ko: '가수분해 동물 단백질', name_en: 'Hydrolyzed Animal Protein', risk_level: 'safe', description: '알러지 최소화를 위해 쪼갠 단백질' },
    { name_ko: 'L-카르니틴', name_en: 'L-Carnitine', risk_level: 'safe', description: '지방 연소와 심장 건강에 도움' },
    { name_ko: '닭 신선육', name_en: 'Fresh Chicken', risk_level: 'safe', description: '냉각 처리를 거치지 않은 순수 단백질' },
    { name_ko: '칠면조 신선육', name_en: 'Fresh Turkey', risk_level: 'safe', description: '고품질 생육 단백질원' },
    { name_ko: '닭 간', name_en: 'Chicken Liver', risk_level: 'safe', description: '비타민A와 미네랄이 풍부한 식자재' },
    { name_ko: '건조 감자', name_en: 'Dried Potato', risk_level: 'safe', description: 'L.I.D. 사료의 주요 탄수화물원' },
    { name_ko: '오리분말', name_en: 'Duck Meal', risk_level: 'safe', description: '오리고기 농축 단백질' },
    { name_ko: '생오리', name_en: 'Fresh Duck', risk_level: 'safe', description: '고품질 생육 오리 단백질' },
    { name_ko: '유채유', name_en: 'Canola Oil', risk_level: 'safe', description: '오메가-3가 함유된 건강한 식물성 기름' },
    { name_ko: '감자단백질', name_en: 'Potato Protein', risk_level: 'safe', description: '농축된 식물성 단백질원' },
    { name_ko: '천연향료', name_en: 'Natural Flavor', risk_level: 'safe', description: '기호성을 높여주는 천연 성분' },
    { name_ko: 'DL-메티오닌', name_en: 'DL-Methionine', risk_level: 'safe', description: '필수 아미노산 및 요로 관리' },
    { name_ko: 'L-리신', name_en: 'L-Lysine', risk_level: 'safe', description: '성장과 면역에 필수적인 아미노산' },
    { name_ko: '비오틴', name_en: 'Biotin', risk_level: 'safe', description: '피부와 모질 개선 비타민 B7' },
    { name_ko: '탄산칼슘', name_en: 'Calcium Carbonate', risk_level: 'safe', description: '뼈 성격에 필요한 필수 미네랄' },
    { name_ko: '옥수수 글루텐', name_en: 'Corn Gluten Meal', risk_level: 'caution', description: '단백질 수치를 높이기 위해 사용되는 식물성 원료' },
    { name_ko: '가공 가금류 육분', name_en: 'Processed Poultry Meal', risk_level: 'safe', description: '고단백 동물성 가공분' },
    { name_ko: '동물성 지방', name_en: 'Animal Fat', risk_level: 'safe', description: '에너지원이 되는 정제 유지' },
    { name_ko: '어유', name_en: 'Fish Oil', risk_level: 'safe', description: 'DHA와 EPA가 풍부한 생선 기름' },
    { name_ko: '비타민 C', name_en: 'Vitamin C', risk_level: 'safe', description: '항산화와 관절 건강 보조' },
    { name_ko: '신선 월아이', name_en: 'Fresh Walleye', risk_level: 'safe', description: '흰살생선의 일종으로 기호성이 좋음' },
    { name_ko: '강황', name_en: 'Turmeric', risk_level: 'safe', description: '항염 효과가 뛰어난 천연 향신료' },
    { name_ko: '가다랑어', name_en: 'Skipjack Tuna', risk_level: 'safe', description: '풍부한 단백질과 오메가-3' },
    { name_ko: '건조 닭고기', name_en: 'Dried Chicken', risk_level: 'safe', description: '강화된 닭고기 단백질' },
    { name_ko: '닭고기', name_en: 'Chicken', risk_level: 'safe', description: '기본적인 가금류 단백질원' },
    { name_ko: '연어', name_en: 'Salmon', risk_level: 'safe', description: '오메가-3가 풍부한 생선류' },
    { name_ko: '칠면조고기', name_en: 'Turkey', risk_level: 'safe', description: '저지방 고단백 고기' },
    { name_ko: '신선 닭고기', name_en: 'Fresh Chicken', risk_level: 'safe', description: '냉각 처리를 거치지 않은 순수 단백질' },
    { name_ko: '신선 칠면조고기', name_en: 'Fresh Turkey', risk_level: 'safe', description: '고품질 생육 단백질원' },
    { name_ko: '신선 가다랑어', name_en: 'Fresh Skipjack', risk_level: 'safe', description: '고품질 참치류 단백질' },
    { name_ko: '옥수수', name_en: 'Corn', risk_level: 'caution', description: '알러지 유발 가능성이 있으며 소화율이 다를 수 있습니다.' },
    { name_ko: '현미', name_en: 'Brown Rice', risk_level: 'safe', description: '에너지원이 되는 통곡물' }
  ];

  console.log('Upserting ingredients...');
  const { error: iErr } = await supabase.from('ingredients').upsert(ingredients, { onConflict: 'name_ko' });
  if (iErr) {
    console.error('Ingredient Insert Error:', iErr);
    return;
  }
  console.log('Ingredients inserted.');

  console.log('Fetching ingredients to get IDs...');
  const { data: dbIngredients, error: fErr } = await supabase.from('ingredients').select('id, name_ko');
  if (fErr) {
    console.error('Ingredient Fetch Error:', fErr);
    return;
  }

  const ingMap = {};
  dbIngredients.forEach(i => ingMap[i.name_ko] = i.id);

  const products = [
    { id: '00000000-0000-0000-0000-000000000201', name: '미니 인도어 어덜트', brand_name: '로얄캐닌', product_type: 'food', target_pet_type: 'dog', min_price: 15000, image_url: 'https://www.royalcanin.com/kr/-/media/royal-canin/korea/products/retail-products/pdp/mini_indoor_adult_fop_ko.png' },
    { id: '00000000-0000-0000-0000-000000000202', name: '캣 앤 키튼', brand_name: '오리젠', product_type: 'food', target_pet_type: 'cat', min_price: 45000, image_url: 'https://orijen.ca/wp-content/uploads/2021/04/OR_Cat_Kitten_1.8kg_Front.png' },
    { id: '00000000-0000-0000-0000-000000000203', name: 'L.I.D. 감자 & 오리 건식 사료', brand_name: '내추럴발란스', product_type: 'food', target_pet_type: 'dog', min_price: 28000, image_url: 'https://www.naturalbalanceinc.com/wp-content/uploads/2021/01/LID_PotatoDuck_DryDog_5lb.png' },
    { id: '00000000-0000-0000-0000-000000000204', name: '프로플랜 스테릴라이즈드', brand_name: '퓨리나', product_type: 'food', target_pet_type: 'cat', min_price: 32000, image_url: 'https://purina.co.kr/sites/default/files/2021-03/pro-plan-cat-indoor-adult-1.5kg.png' },
    { id: '00000000-0000-0000-0000-000000000205', name: '와일드 프레이리 독', brand_name: '아카나', product_type: 'food', target_pet_type: 'dog', min_price: 38000, image_url: 'https://acana.ca/wp-content/uploads/2021/04/AC_Wild_Prairie_Dog_2kg_Front.png' }
  ];

  console.log('Upserting products...');
  const { error: pErr } = await supabase.from('products').upsert(products, { onConflict: 'id' });
  if (pErr) {
    console.error('Product Insert Error:', pErr);
    return;
  }
  console.log('Products inserted.');

  // Create product-ingredients relations
  const mappings = {
    '00000000-0000-0000-0000-000000000201': ['쌀', '계육분', '옥수수', '현미', '닭 지방'], 
    '00000000-0000-0000-0000-000000000202': ['닭 신선육', '칠면조 신선육', '가다랑어', '연어'],
    '00000000-0000-0000-0000-000000000203': ['건조 감자', '오리분말', '생오리', '유채유'],
    '00000000-0000-0000-0000-000000000204': ['닭고기', '쌀', '옥수수 글루텐', '가공 가금류 육분'],
    '00000000-0000-0000-0000-000000000205': ['신선 닭고기', '신선 칠면조고기', '신선 가다랑어', '건조 닭고기']
  };
  
  const productIngredients = [];
  for (const [prodId, ings] of Object.entries(mappings)) {
    ings.forEach((ignName, idx) => {
      const ingId = ingMap[ignName];
      if (ingId) {
        productIngredients.push({ product_id: prodId, ingredient_id: ingId, sort_order: idx + 1 });
      } else {
        console.warn(`Ingredient not found in DB for mapping: ${ignName}`);
      }
    });
  }

  console.log('Upserting product_ingredients relations...');
  const { error: piErr } = await supabase.from('product_ingredients').upsert(productIngredients, { onConflict: 'product_id,ingredient_id' });
  if (piErr) {
    console.error('Product-Ingredient Insert Error:', piErr);
    return;
  }
  
  console.log('All real data successfully seeded via REST API!');
}

run();
