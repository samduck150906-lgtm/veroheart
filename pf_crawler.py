import os
import time
import uuid
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
import requests

# -----------------------------------------------------------------------------
# 1. 환경변수 로드
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

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

# -----------------------------------------------------------------------------
# 2. Selenium 크롤러 설정 (펫프렌즈 전용)
# -----------------------------------------------------------------------------
def scrape_pet_friends(url):
    print(f"브라우저를 실행하여 '{url}' 접속 중...")
    
    options = Options()
    options.add_argument('--headless') # 백그라운드 실행
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36')
    
    # webdriver-manager를 통해 크롬 드라이버 자동 설치 및 실행
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    
    driver.get(url)
    time.sleep(5) # 페이지 로딩 대기
    
    # 스크롤 다운하여 동적 콘텐츠 로드 (무한 스크롤 처리)
    for _ in range(5):
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)
        
    print("페이지 로딩 완료. 상품 정보 추출을 시작합니다.")
    
    products = []
    # 펫프렌즈는 a 태그 링크 내부에 상품 정보가 있음
    links = driver.find_elements(By.TAG_NAME, 'a')
    seen_names = set()
    
    for link in links:
        text = link.text.strip()
        if not text:
            continue
            
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        if len(lines) >= 2:
            name = lines[0]
            if len(name) < 3 or name in seen_names:
                continue
            seen_names.add(name)
            
            price = 15000
            for line in lines:
                if '원' in line or ',' in line:
                    num_str = ''.join(filter(str.isdigit, line))
                    if num_str:
                        price = int(num_str)
                        break
            
            # 썸네일 이미지 시도
            src = "https://source.unsplash.com/400x400/?dog,cat,petfood"
            try:
                img = link.find_element(By.TAG_NAME, 'img')
                found_src = img.get_attribute('src')
                if found_src: src = found_src
            except:
                pass
                
            products.append({
                "id": str(uuid.uuid4()),
                "name": name,
                "brand": "펫프렌즈",
                "category": "크롤링상품",
                "price": price,
                "image_url": src,
                "target_pet_type": "all",
                "coupang_link": "",
                "source": "petfriends_bot"
            })
                
    driver.quit()
    return products

# -----------------------------------------------------------------------------
# 3. Supabase 업로드
# -----------------------------------------------------------------------------
def upload_to_supabase(products):
    if not products:
        print("수집된 상품이 없습니다.")
        return
        
    url = f"{SUPABASE_URL}/rest/v1/products"
    print(f"{len(products)}개의 상품을 Supabase에 업로드합니다...")
    
    # 100개씩 청크 단위로 업로드
    chunk_size = 100
    for i in range(0, len(products), chunk_size):
        chunk = products[i:i+chunk_size]
        response = requests.post(url, headers=HEADERS, json=chunk)
        if response.status_code in (200, 201):
            print(f"{i+1}~{i+len(chunk)} 업로드 완료")
        else:
            print(f"업로드 실패: {response.status_code} - {response.text}")

# -----------------------------------------------------------------------------
# 4. 메인
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    target_url = "https://m.pet-friends.co.kr/main/tab/6"
    print("=" * 60)
    print("펫프렌즈 (Pet Friends) 스크래핑 봇 시작")
    print("=" * 60)
    
    try:
        scraped_data = scrape_pet_friends(target_url)
        print(f"\n총 {len(scraped_data)}개의 유효한 상품을 수집했습니다.")
        upload_to_supabase(scraped_data)
        
    except Exception as e:
        print(f"오류 발생: {e}")
        
    print("\n모든 작업이 완료되었습니다!")
