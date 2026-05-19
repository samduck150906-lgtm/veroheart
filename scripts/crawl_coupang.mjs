import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load simple dotenv parser since we might not have `dotenv` package installed
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env.local');

let envConfig = {};
try {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      envConfig[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  });
} catch (e) {
  console.log('Failed to read .env.local', e.message);
}

const SUPABASE_URL = envConfig['VITE_SUPABASE_URL'] || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = envConfig['VITE_SUPABASE_ANON_KEY'] || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in .env.local");
  process.exit(1);
}

const API_URL = `${SUPABASE_URL}/rest/v1`;
const HEADERS = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation"
};

const COUPANG_ACCESS_KEY = "d87f5aa5-f003-4928-b46e-9503ab77568a";
const COUPANG_SECRET_KEY = "f3de518a140a75028d1ad0c8f851f1314da45a84";
const COUPANG_BASE_URL = "https://api-gateway.coupang.com";

function generateHmac(method, url, secretKey, accessKey) {
  const parts = url.split('?');
  const path = parts[0];
  const query = parts[1] || '';

  // Format: YYMMDD'T'HHMMSS'Z'
  const datetime = new Date().toISOString().substring(2, 19).replace(/[-:]/g, '') + 'Z';
  const message = datetime + method + path + query;
  
  const signature = crypto.createHmac('sha256', secretKey).update(message).digest('hex');
  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;
}

async function searchCoupangProducts(keyword, targetCount = 100) {
  console.log(`\n========================================`);
  console.log(`Searching Coupang for: "${keyword}" (target: ${targetCount} unique products)`);
  console.log(`========================================`);
  const method = "GET";
  const apiPath = "/v2/providers/affiliate_open_api/apis/openapi/products/search";
  
  const seenIds = new Set();
  let uniqueProducts = [];
  let page = 1;
  const maxPages = 50; // safety limit
  
  while (uniqueProducts.length < targetCount && page <= maxPages) {
    const query = `keyword=${encodeURIComponent(keyword)}&limit=10&subId=veroheart&page=${page}`;
    const requestUri = `${apiPath}?${query}`;
    const url = `${COUPANG_BASE_URL}${requestUri}`;
    
    const authorization = generateHmac(method, requestUri, COUPANG_SECRET_KEY, COUPANG_ACCESS_KEY);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          "Authorization": authorization,
          "Content-Type": "application/json"
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const items = data.data?.productData || data.data || [];
        
        let newCount = 0;
        for (const item of items) {
          if (!seenIds.has(item.productId)) {
            seenIds.add(item.productId);
            uniqueProducts.push(item);
            newCount++;
          }
        }
        console.log(` - Page ${page}: ${items.length} items, ${newCount} new unique (total unique: ${uniqueProducts.length})`);
        
        // If no new unique items found, API is recycling - stop
        if (newCount === 0) {
          console.log(` ⚠ No new unique items on this page, stopping.`);
          break;
        }
      } else {
        console.error(`Coupang API Error on page ${page}: ${response.status}`);
        const text = await response.text();
        console.error(text);
        break;
      }
    } catch (error) {
      console.error("Fetch error:", error);
      break;
    }
    
    page++;
    // Rate limit: max 5 calls/sec, so 250ms delay is safe
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  
  console.log(`✅ Total unique products found for "${keyword}": ${uniqueProducts.length}`);
  return uniqueProducts;
}

async function upsertProduct(item, petType, subCategory) {
  const productPayload = {
    name: item.productName,
    brand_name: "쿠팡검색", 
    min_price: item.productPrice,
    image_url: item.productImage,
    main_category: subCategory === "snack" ? "snack" : "food", 
    sub_category: subCategory, 
    target_pet_type: petType, 
    product_type: subCategory === "snack" ? "snack" : "food",
    coupang_product_id: String(item.productId),
    coupang_link: item.productUrl
  };
  
  // Check if exists
  const checkRes = await fetch(`${API_URL}/products?coupang_product_id=eq.${item.productId}`, {
    method: 'GET',
    headers: HEADERS
  });
  
  const match = await checkRes.json();
  
  if (match && match.length > 0) {
    return 'skip';
  } else {
    const pRes = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(productPayload)
    });
    
    if (pRes.ok) {
      const resData = await pRes.json();
      return resData[0].id;
    } else {
      const errorText = await pRes.text();
      console.error(`  ✗ Failed: ${item.productName} - ${errorText}`);
      return null;
    }
  }
}

// Keyword configs: multiple keyword variations per category to maximize unique results
const KEYWORD_CONFIGS = [
  { 
    category: "강아지 사료",
    petType: "dog", 
    subCategory: "dry",
    keywords: [
      "강아지 사료", "강아지 건식사료", "강아지 습식사료", "강아지 유기농 사료",
      "강아지 그레인프리 사료", "강아지 눈물 사료", "강아지 다이어트 사료",
      "강아지 알러지 사료", "강아지 연어 사료", "강아지 치킨 사료",
      "강아지 소형견 사료", "강아지 대형견 사료", "강아지 퍼피 사료",
      "강아지 시니어 사료", "강아지 기능성 사료", "강아지 관절 사료",
      "강아지 피부 사료", "강아지 장건강 사료", "강아지 프리미엄 사료",
      "반려견 사료", "애견 사료", "독 푸드"
    ]
  },
  { 
    category: "강아지 간식",
    petType: "dog", 
    subCategory: "snack",
    keywords: [
      "강아지 간식", "강아지 져키", "강아지 덴탈 간식", "강아지 껌",
      "강아지 트릿", "강아지 동결건조 간식", "강아지 고구마 간식",
      "강아지 닭가슴살 간식", "강아지 연어 간식", "강아지 뼈 간식",
      "강아지 수제 간식", "강아지 훈련 간식", "강아지 눈물 간식",
      "강아지 유산균 간식", "강아지 황태 간식", "강아지 오리 간식",
      "강아지 소고기 간식", "반려견 간식", "애견 간식", "독 트릿"
    ]
  },
  { 
    category: "고양이 사료",
    petType: "cat", 
    subCategory: "dry",
    keywords: [
      "고양이 사료", "고양이 건식사료", "고양이 습식사료", "고양이 캔",
      "고양이 그레인프리 사료", "고양이 유기농 사료", "고양이 다이어트 사료",
      "고양이 연어 사료", "고양이 치킨 사료", "고양이 참치 사료",
      "고양이 인도어 사료", "고양이 헤어볼 사료", "고양이 키튼 사료",
      "고양이 시니어 사료", "고양이 기능성 사료", "고양이 비뇨 사료",
      "고양이 구내염 사료", "고양이 프리미엄 사료", "고양이 처방 사료",
      "반려묘 사료", "캣 푸드"
    ]
  },
  { 
    category: "고양이 간식",
    petType: "cat", 
    subCategory: "snack",
    keywords: [
      "고양이 간식", "고양이 츄르", "고양이 짜먹는 간식", "고양이 동결건조",
      "고양이 캣닙 간식", "고양이 트릿", "고양이 참치 간식",
      "고양이 닭가슴살 간식", "고양이 연어 간식", "고양이 덴탈 간식",
      "고양이 유산균 간식", "고양이 수제 간식", "고양이 스틱 간식",
      "고양이 파우치", "고양이 캔 간식", "고양이 헤어볼 간식",
      "고양이 새우 간식", "반려묘 간식", "캣 트릿", "템테이션 고양이"
    ]
  },
];

async function run() {
  const targetCount = 100;
  
  for (const config of KEYWORD_CONFIGS) {
    console.log(`\n🔍🔍🔍 [${config.category}] 카테고리 크롤링 시작 🔍🔍🔍`);
    
    const seenIds = new Set();
    let allUniqueProducts = [];
    
    for (const keyword of config.keywords) {
      if (allUniqueProducts.length >= targetCount) {
        console.log(`  ✅ 이미 목표 ${targetCount}개 달성! 다음 카테고리로...`);
        break;
      }
      
      const products = await searchCoupangProducts(keyword, targetCount - allUniqueProducts.length);
      
      for (const item of products) {
        if (!seenIds.has(item.productId)) {
          seenIds.add(item.productId);
          allUniqueProducts.push(item);
        }
      }
      console.log(`  → 누적 유니크 상품: ${allUniqueProducts.length}개`);
    }
    
    let inserted = 0, skipped = 0, failed = 0;
    for (const item of allUniqueProducts) {
      const result = await upsertProduct(item, config.petType, config.subCategory);
      if (result === 'skip') skipped++;
      else if (result) inserted++;
      else failed++;
    }
    
    console.log(`\n📊 [${config.category}] 최종 결과: 총 ${allUniqueProducts.length}개 유니크 / ${inserted}개 신규 등록 / ${skipped}개 중복 건너뜀 / ${failed}개 실패\n`);
  }
  
  console.log("\n🎉 전체 크롤링 완료!");
}

run();
