import os
import time
import uuid
import re
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
import requests

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

def scrape_coupang(url):
    print(f"브라우저를 실행하여 '{url}' 접속 중...")
    
    options = Options()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-blink-features=AutomationControlled') # 자동화 탐지 우회
    options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    options.add_argument("accept-language=ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7")
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    
    # webdriver 속성 숨기기
    driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
        "source": """
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            })
        """
    })
    
    driver.get(url)
    time.sleep(4)
    
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    time.sleep(2)
    
    print("페이지 로딩 완료. 상품 정보 추출을 시작합니다.")
    products = []
    
    # 쿠팡 검색 결과 아이템
    items = driver.find_elements(By.CSS_SELECTOR, "li.search-product")
    print(f"발견된 상품 컨테이너 수: {len(items)}")
    
    for item in items:
        try:
            name_el = item.find_element(By.CSS_SELECTOR, "div.name")
            name = name_el.text.strip()
            
            price = 0
            try:
                price_el = item.find_element(By.CSS_SELECTOR, "strong.price-value")
                price = int(price_el.text.replace(',', ''))
            except:
                pass
                
            img_url = ""
            try:
                img_el = item.find_element(By.CSS_SELECTOR, "img.search-product-wrap-img")
                img_url = img_el.get_attribute('src')
                if not img_url or 'data:image' in img_url:
                    img_url = img_el.get_attribute('data-src') or img_url
            except:
                pass
                
            link_url = ""
            try:
                a_el = item.find_element(By.CSS_SELECTOR, "a.search-product-link")
                link_url = a_el.get_attribute('href')
            except:
                pass
                
            if name and price > 0:
                products.append({
                    "id": str(uuid.uuid4()),
                    "name": name,
                    "brand": "쿠팡 파트너스", # 임시
                    "category": "강아지 사료",
                    "price": price,
                    "image_url": img_url if img_url else "https://source.unsplash.com/400x400/?dog,food",
                    "target_pet_type": "dog",
                    "coupang_link": link_url,
                    "source": "coupang_crawler"
                })
        except Exception as e:
            continue
            
    driver.quit()
    return products

def upload_to_supabase(products):
    if not products:
        print("수집된 상품이 없습니다.")
        return
        
    url = f"{SUPABASE_URL}/rest/v1/products"
    print(f"{len(products)}개의 상품을 Supabase에 업로드합니다...")
    
    chunk_size = 100
    for i in range(0, len(products), chunk_size):
        chunk = products[i:i+chunk_size]
        response = requests.post(url, headers=HEADERS, json=chunk)
        if response.status_code in (200, 201):
            print(f"{i+1}~{i+len(chunk)} 업로드 완료")
        else:
            print(f"업로드 실패: {response.status_code} - {response.text}")

if __name__ == "__main__":
    target_url = "https://www.coupang.com/np/search?component=&q=%EA%B0%95%EC%95%84%EC%A7%80+%EC%82%AC%EB%A3%8C&traceId=mp7rwc88&channel=user"
    print("=" * 60)
    print("쿠팡 스크래핑 봇 시작")
    print("=" * 60)
    
    try:
        scraped_data = scrape_coupang(target_url)
        print(f"\n총 {len(scraped_data)}개의 유효한 상품을 수집했습니다.")
        upload_to_supabase(scraped_data)
    except Exception as e:
        print(f"오류 발생: {e}")
