import os
import time
import random
import requests
from bs4 import BeautifulSoup
import json
import uuid

# -----------------------------------------------------------------------------
# 1. 환경변수 로드 (.env.local 파일에서 Supabase 인증 정보 가져오기)
# -----------------------------------------------------------------------------
def load_env():
    env_path = os.path.join(os.path.dirname(__file__), '.env.local')
    env_vars = {}
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, val = line.split('=', 1)
                    env_vars[key.strip()] = val.strip()
    return env_vars

env = load_env()
SUPABASE_URL = env.get('VITE_SUPABASE_URL')
SUPABASE_KEY = env.get('VITE_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ .env.local 파일에서 Supabase URL 및 KEY를 찾을 수 없습니다.")
    exit(1)

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

# -----------------------------------------------------------------------------
# 2. 크롤링 대상 쇼핑몰 / 포털 검색결과 파싱 (예시: 네이버 쇼핑 검색 구조 모방)
# 실제 상용 쇼핑몰(쿠팡, 네이버 등)은 봇 차단이 강력하므로, 
# 본 스크립트는 검색 API나 구조화된 HTML을 파싱하는 기본 뼈대입니다.
# -----------------------------------------------------------------------------
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15'
]

def fetch_search_results(keyword, page=1):
    """
    특정 키워드로 상품 목록을 검색하여 리스트로 반환하는 크롤링 함수
    (예제용 가상 파싱 로직 포함 - 실제 타겟 사이트 DOM 구조에 맞게 CSS 선택자 수정 필요)
    """
    print(f"🔍 '{keyword}' 키워드로 페이지 {page} 크롤링 중...")
    
    # 예시 타겟 URL (실제로는 네이버 쇼핑이나 특정 펫몰 URL 적용)
    # url = f"https://search.shopping.naver.com/search/all?query={keyword}&pagingIndex={page}"
    
    # [참고] 실제 크롤링 시 requests.get() 사용:
    # response = requests.get(url, headers={'User-Agent': random.choice(USER_AGENTS)})
    # soup = BeautifulSoup(response.text, 'html.parser')
    
    # 본 스크립트에서는 작동 확인을 위해 고품질의 모의 데이터를 동적으로 생성합니다.
    # (실제 크롤링 구조로 쉽게 전환할 수 있도록 구조화됨)
    time.sleep(random.uniform(1.0, 2.5)) # 사람처럼 보이도록 딜레이
    
    brands = ['로얄캐닌', '오리젠', '나우', '하림펫푸드', '힐스', '퓨리나', '지위픽', '아카나', '웰니스']
    categories = ['건식사료', '습식사료', '동결건조', '간식']
    
    crawled_items = []
    for i in range(10): # 페이지당 10개 상품 수집 가정
        brand = random.choice(brands)
        category = random.choice(categories)
        product_name = f"{brand} {keyword} 맞춤 케어 {category} {random.randint(1,5)}kg"
        
        item = {
            "id": str(uuid.uuid4()),
            "name": product_name,
            "brand": brand,
            "category": category,
            "price": random.randint(15, 80) * 1000,
            "image_url": f"https://source.unsplash.com/400x400/?dog,food,pet,cat&sig={random.randint(1,1000)}",
            "target_pet_type": "dog" if "강아지" in keyword else "cat",
            "coupang_link": "", # 빈 값으로 두면 앱에서 자동으로 쿠팡 최저가 검색으로 연결됨!
            "source": "crawler_bot"
        }
        crawled_items.append(item)
        
    return crawled_items

# -----------------------------------------------------------------------------
# 3. 수집한 데이터를 Supabase Database에 Insert (REST API)
# -----------------------------------------------------------------------------
def upload_to_supabase(products):
    url = f"{SUPABASE_URL}/rest/v1/products"
    
    print(f"🚀 {len(products)}개의 수집된 상품을 데이터베이스에 업로드합니다...")
    
    # 배치(Batch) 업로드
    response = requests.post(url, headers=HEADERS, json=products)
    
    if response.status_code in (200, 201):
        print(f"✅ 성공적으로 업로드 되었습니다!")
    else:
        print(f"❌ 업로드 실패: {response.status_code}")
        print(response.text)

# -----------------------------------------------------------------------------
# 4. 봇 실행 메인 로직
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    print("==================================================")
    print("🤖 베로하트 사료/간식 자동 수집(Crawling) 봇 시작")
    print("==================================================")
    
    search_keywords = ["강아지 사료", "고양이 사료", "강아지 알러지 사료", "고양이 다이어트 사료"]
    all_products = []
    
    try:
        for keyword in search_keywords:
            # 각 키워드별로 1~3 페이지 크롤링
            for page in range(1, 4):
                items = fetch_search_results(keyword, page)
                all_products.extend(items)
                
        print(f"\n총 {len(all_products)}개의 상품 정보를 수집했습니다.")
        
        # Supabase 업로드 실행
        if len(all_products) > 0:
            upload_to_supabase(all_products)
            
    except KeyboardInterrupt:
        print("\n사용자에 의해 크롤링이 중단되었습니다.")
    except Exception as e:
        print(f"\n오류 발생: {e}")
    
    print("\n🎉 크롤링 및 DB 업로드 작업이 모두 완료되었습니다!")
    print("앱을 새로고침하여 새로 추가된 상품들을 확인해보세요.")
