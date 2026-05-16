import hmac
import hashlib
import datetime
import requests
import urllib.parse
import os
import uuid
import sys

# -----------------------------------------------------------------------------
# 1. 환경변수 및 키 설정
# -----------------------------------------------------------------------------
ACCESS_KEY = 'd87f5aa5-f003-4928-b46e-9503ab77568a'
SECRET_KEY = 'f3de518a140a75028d1ad0c8f851f1314da45a84'

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
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZHNuYWJlYWVud3ZjemlseGViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc4NDE1NSwiZXhwIjoyMDkwMzYwMTU1fQ.phJd8BUCkdLjAXuKDyRjLxgv4omTGTqGUndavTYmrd8'

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

# -----------------------------------------------------------------------------
# 2. 쿠팡 파트너스 Open API 연동 함수
# -----------------------------------------------------------------------------
def generate_hmac(method, url, secret_key, access_key):
    path, *query = url.split("?")
    now = datetime.datetime.now(datetime.timezone.utc)
    datetime_str = now.strftime('%y%m%d') + 'T' + now.strftime('%H%M%S') + 'Z'
    
    message = datetime_str + method + path + (query[0] if query else "")
    
    signature = hmac.new(
        secret_key.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    
    return f"CEA algorithm=HmacSHA256, access-key={access_key}, signed-date={datetime_str}, signature={signature}"

def search_coupang_products(keyword, limit=50):
    method = 'GET'
    path = f'/v2/providers/affiliate_open_api/apis/openapi/products/search?keyword={urllib.parse.quote(keyword)}&limit={limit}'
    authorization = generate_hmac(method, path, SECRET_KEY, ACCESS_KEY)
    
    url = 'https://api-gateway.coupang.com' + path
    headers = {
        'Authorization': authorization,
        'Content-Type': 'application/json'
    }
    
    print(f"[{keyword}] 쿠팡 검색 중...")
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        if "data" in data and "productData" in data["data"]:
            return data["data"]["productData"]
    else:
        print(f"API Error ({response.status_code}): {response.text}")
    return []

# -----------------------------------------------------------------------------
# 3. 데이터 변환 및 Supabase 업로드
# -----------------------------------------------------------------------------
def upload_to_supabase(products):
    if not products:
        print("업로드할 상품이 없습니다.")
        return
        
    url = f"{SUPABASE_URL}/rest/v1/products"
    print(f"총 {len(products)}개의 상품을 Supabase에 업로드합니다...")
    
    chunk_size = 100
    for i in range(0, len(products), chunk_size):
        chunk = products[i:i+chunk_size]
        response = requests.post(url, headers=HEADERS, json=chunk)
        if response.status_code in (200, 201):
            print(f"{i+1}~{i+len(chunk)} 업로드 완료")
        else:
            print(f"업로드 실패: {response.status_code} - {response.text}")

# -----------------------------------------------------------------------------
# 4. 봇 메인 실행
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    sys.stdout.reconfigure(encoding='utf-8')
    
    print("=" * 60)
    print("쿠팡 파트너스 Open API 자동 연동 봇 시작")
    print("=" * 60)
    
    # 80개의 상세 키워드로 각 카테고리당 수백 개의 데이터를 추출
    keywords = [
        # 강아지 사료 (20개)
        "강아지 사료", "로얄캐닌 강아지 사료", "오리젠 강아지 사료", "나우 강아지 사료", "하림 강아지 사료",
        "지위픽 강아지", "아카나 강아지 사료", "강아지 처방식", "강아지 눈물 사료", "강아지 연어 사료",
        "강아지 다이어트 사료", "노령견 사료", "퍼피 사료", "소형견 사료", "관절 사료 강아지",
        "피부 사료 강아지", "강아지 습식 사료", "강아지 소프트 사료", "강아지 가수분해 사료", "건식 사료 강아지",
        
        # 강아지 간식 (20개)
        "강아지 간식", "강아지 껌", "강아지 수제 간식", "강아지 개껌", "강아지 저키",
        "강아지 트릿", "강아지 동결건조 간식", "강아지 소시지", "강아지 뼈 간식", "불리스틱",
        "강아지 치석제거 껌", "그리니즈", "포켄스 덴탈스틱", "강아지 황태 간식", "강아지 고구마 간식",
        "강아지 육포", "강아지 훈련용 간식", "노즈워크 간식", "강아지 츄르", "강아지 우유",
        
        # 고양이 사료 (20개)
        "고양이 사료", "로얄캐닌 고양이 사료", "오리젠 고양이 사료", "하림 고양이 사료", "고양이 유리너리 사료",
        "고양이 헤어볼 사료", "고양이 다이어트 사료", "고양이 건식 사료", "고양이 습식 사료", "고양이 파우치 사료",
        "고양이 처방식", "키튼 사료", "어덜트 고양이 사료", "시니어 고양이 사료", "길고양이 사료 대용량",
        "대용량 고양이 사료", "고양이 캔 사료", "캣츠랑 사료", "프로플랜 고양이 사료", "이즈칸 고양이 사료",
        
        # 고양이 간식 (20개)
        "고양이 츄르", "차오츄르", "고양이 간식", "고양이 동결건조 간식", "고양이 트릿",
        "고양이 캔 간식", "고양이 파우치 간식", "고양이 육포", "고양이 스틱 간식", "템테이션 고양이",
        "마도로스펫", "이나바 츄르", "고양이 치석제거 간식", "고양이 캣닢 간식", "고양이 마따따비",
        "고양이 습식 간식", "고양이 대용량 츄르", "고양이 미니 캔", "고양이 연어 간식", "고양이 닭가슴살 간식"
    ]
    
    all_mapped_products = []
    seen_ids = set()
    
    for kw in keywords:
        items = search_coupang_products(kw, limit=10)
        
        for item in items:
            # 중복 방지 (쿠팡 상품 ID 기준)
            c_id = str(item.get("productId", ""))
            if c_id in seen_ids:
                continue
            seen_ids.add(c_id)
            
            # 베로하트 DB 스키마에 맞게 변환
            pet_type = "cat" if "고양이" in kw else "dog"
            if "사료" in kw:
                category = "food"
            else:
                category = "snack"
                
            brand_name = item.get("productName", "").split(" ")[0] # 보통 첫 단어가 브랜드명
            
            mapped = {
                "id": str(uuid.uuid4()),
                "name": item.get("productName", "이름없음"),
                "brand_name": brand_name,
                "product_type": category,
                "min_price": int(float(item.get("productPrice", 0))),
                "image_url": item.get("productImage", ""),
                "target_pet_type": pet_type
            }
            all_mapped_products.append(mapped)
            
    print(f"\nAPI에서 총 {len(all_mapped_products)}개의 상품 데이터를 가져왔습니다.")
    
    # Supabase로 전송
    upload_to_supabase(all_mapped_products)
    
    print("\n모든 작업이 완료되었습니다! 앱을 새로고침해보세요.")
