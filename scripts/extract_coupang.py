import urllib.request
import urllib.parse
import json
import hashlib
import hmac
import time
from datetime import datetime, timezone
import os

ACCESS_KEY = "d87f5aa5-f003-4928-b46e-9503ab77568a"
SECRET_KEY = "f3de518a140a75028d1ad0c8f851f1314da45a84"

def generate_hmac(method, url, secret_key, access_key):
    path, *query = url.split("?")
    now = datetime.now(timezone.utc)
    datetime_str = now.strftime('%y%m%d') + 'T' + now.strftime('%H%M%S') + 'Z'
    message = datetime_str + method + path + (query[0] if query else "")
    signature = hmac.new(bytes(secret_key, "utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()
    return "CEA algorithm=HmacSHA256, access-key={}, signed-date={}, signature={}".format(access_key, datetime_str, signature)

def search_coupang(keyword, limit=5):
    method = "GET"
    url = f"/v2/providers/affiliate_open_api/apis/openapi/products/search?keyword={urllib.parse.quote(keyword)}&limit={limit}"
    
    authorization = generate_hmac(method, url, SECRET_KEY, ACCESS_KEY)
    
    req = urllib.request.Request(f"https://api-gateway.coupang.com{url}")
    req.add_header("Authorization", authorization)
    req.add_header("Content-Type", "application/json")
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} - {e.reason}")
        print(e.read().decode('utf-8'))
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None

def main():
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    
    keywords = ["강아지 건식사료", "고양이 습식사료", "강아지 트릿", "고양이 츄르"]
    
    all_products = []
    
    for keyword in keywords:
        print(f"Searching for {keyword}...")
        result = search_coupang(keyword)
        if result and "data" in result and "productData" in result["data"]:
            products = result["data"]["productData"]
            for p in products:
                # Map to our product format
                mapped_product = {
                    "brand": "쿠팡상품", # Coupang doesn't always provide clean brand
                    "name": p["productName"],
                    "price": p["productPrice"],
                    "image_url": p["productImage"],
                    "product_type": "food", # Default
                    "main_category": "사료" if "사료" in keyword else "간식",
                    "target_pet_type": "dog" if "강아지" in keyword else "cat",
                    "product_url": p["productUrl"],
                    "source": "coupang_partners"
                }
                all_products.append(mapped_product)
        time.sleep(1) # Be nice to API
        
    print(f"\nExtracted {len(all_products)} products.")
    
    # Save to JSON
    output_path = r"C:\Users\USER\Desktop\veroheart\src\data\coupang_products.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_products, f, ensure_ascii=False, indent=2)
    print(f"Saved to {output_path}")

if __name__ == "__main__":
    main()
