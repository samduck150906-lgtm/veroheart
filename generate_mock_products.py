import uuid
import random
import os
import requests

# -----------------------------------------------------------------------------
# 1. 설정 및 환경 변수
# -----------------------------------------------------------------------------
SUPABASE_URL = 'https://zddsnabeaenwvczilxeb.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZHNuYWJlYWVud3ZjemlseGViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc4NDE1NSwiZXhwIjoyMDkwMzYwMTU1fQ.phJd8BUCkdLjAXuKDyRjLxgv4omTGTqGUndavTYmrd8'

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

# -----------------------------------------------------------------------------
# 2. 리얼리티를 높인 가상(Mock) 데이터셋 (브랜드, 품명, 가격대 조합)
# -----------------------------------------------------------------------------
DOG_BRANDS = ['로얄캐닌', '오리젠', '나우', '하림펫푸드', '지위픽', '아카나', 'ANF', '네츄럴코어', '닥터독', '정관장 지니펫']
CAT_BRANDS = ['로얄캐닌', '오리젠', '하림펫푸드', '이나바', '캣츠랑', '프로플랜', '이즈칸', '웰츠', '위스카스', '쉬바']

DOG_FOOD_SUFFIX = ['미니 어덜트', '인도어 퍼피', '조인트 케어', '가수분해 연어', '다이어트 라이트', '스몰바이트', '시니어 건강', '눈물 지우개 사료', '그레인프리 치킨']
DOG_SNACK_SUFFIX = ['수제 닭가슴살 육포', '한우 불리스틱', '덴탈 치석제거 껌', '동결건조 북어트릿', '말랑 고구마스틱', '오리 목뼈', '유산균 츄르', '칭찬용 미니 트릿']

CAT_FOOD_SUFFIX = ['인도어 캣', '키튼 앤 마더', '헤어볼 케어', '유리너리 건강', '웨이트 케어 다이어트', '그레인프리 연어', '센서티브 소화강화', '대용량 포대']
CAT_SNACK_SUFFIX = ['가다랑어 츄르', '참치 베이스 미니캔', '닭가슴살 동결건조 트릿', '헤어볼 방지 츄르', '캣닢 캔디', '마따따비 스틱', '크런치 스낵', '영양 닭가슴살 파우치']

IMAGES = [
    "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&q=80",
    "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80",
    "https://images.unsplash.com/photo-1568644396922-5c3bfae12521?w=400&q=80",
    "https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=400&q=80",
    "https://images.unsplash.com/photo-1623387641168-d9803ddd3f35?w=400&q=80",
    "https://images.unsplash.com/photo-1606011334315-025e4baab810?w=400&q=80"
]

def generate_mock_products(count_per_category=200):
    products = []
    
    # 1. 강아지 사료
    for _ in range(count_per_category):
        brand = random.choice(DOG_BRANDS)
        name = f"[{brand}] {random.choice(DOG_FOOD_SUFFIX)} {random.randint(1,5)}kg"
        price = random.randint(15, 80) * 1000
        products.append({
            "id": str(uuid.uuid4()),
            "name": name,
            "brand_name": brand,
            "product_type": "food",
            "min_price": price,
            "image_url": random.choice(IMAGES),
            "target_pet_type": "dog"
        })
        
    # 2. 강아지 간식
    for _ in range(count_per_category):
        brand = random.choice(DOG_BRANDS)
        name = f"[{brand}] {random.choice(DOG_SNACK_SUFFIX)} {random.randint(100,500)}g"
        price = random.randint(5, 25) * 1000
        products.append({
            "id": str(uuid.uuid4()),
            "name": name,
            "brand_name": brand,
            "product_type": "snack",
            "min_price": price,
            "image_url": random.choice(IMAGES),
            "target_pet_type": "dog"
        })

    # 3. 고양이 사료
    for _ in range(count_per_category):
        brand = random.choice(CAT_BRANDS)
        name = f"[{brand}] {random.choice(CAT_FOOD_SUFFIX)} {random.randint(1,7)}kg"
        price = random.randint(18, 90) * 1000
        products.append({
            "id": str(uuid.uuid4()),
            "name": name,
            "brand_name": brand,
            "product_type": "food",
            "min_price": price,
            "image_url": random.choice(IMAGES),
            "target_pet_type": "cat"
        })

    # 4. 고양이 간식
    for _ in range(count_per_category):
        brand = random.choice(CAT_BRANDS)
        name = f"[{brand}] {random.choice(CAT_SNACK_SUFFIX)} {random.randint(10,50)}p"
        price = random.randint(3, 30) * 1000
        products.append({
            "id": str(uuid.uuid4()),
            "name": name,
            "brand_name": brand,
            "product_type": "snack",
            "min_price": price,
            "image_url": random.choice(IMAGES),
            "target_pet_type": "cat"
        })
        
    return products

# -----------------------------------------------------------------------------
# 3. 데이터 변환 및 Supabase 업로드
# -----------------------------------------------------------------------------
def upload_to_supabase(products):
    if not products:
        print("업로드할 상품이 없습니다.")
        return
        
    url = f"{SUPABASE_URL}/rest/v1/products"
    print(f"총 {len(products)}개의 고품질 가상 상품을 Supabase에 업로드합니다...")
    
    chunk_size = 100
    success_count = 0
    for i in range(0, len(products), chunk_size):
        chunk = products[i:i+chunk_size]
        response = requests.post(url, headers=HEADERS, json=chunk)
        if response.status_code in (200, 201):
            success_count += len(chunk)
            print(f"{i+1}~{i+len(chunk)} 업로드 완료")
        else:
            print(f"업로드 실패: {response.status_code} - {response.text}")
            
    print(f"\n최종 완료: {success_count}개 상품 등록 성공!")

if __name__ == "__main__":
    print("=" * 60)
    print("초고속 고품질 가상 상품(Mock) 생성기 시작")
    print("=" * 60)
    mock_data = generate_mock_products(count_per_category=200) # 총 800개 생성
    upload_to_supabase(mock_data)
