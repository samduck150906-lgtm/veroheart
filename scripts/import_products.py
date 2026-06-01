import csv
import json
import os
import requests
from dotenv import load_dotenv

# Load Supabase config from .env.local
load_dotenv('.env.local')

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY') # or service_role key for admin bypass

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in .env.local")
    exit(1)

API_URL = f"{SUPABASE_URL}/rest/v1"
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def upsert_ingredient(name):
    # Upsert logic for an ingredient (basic stub)
    name = name.strip()
    # Check if exists
    res = requests.get(f"{API_URL}/ingredients?name_ko=eq.{name}", headers=HEADERS)
    match = res.json()
    if match and len(match) > 0:
        return match[0]['id']
    else:
        # Create
        payload = {
            "name_ko": name,
            "risk_level": "safe", # Default
        }
        create_res = requests.post(f"{API_URL}/ingredients", headers=HEADERS, json=payload)
        if create_res.status_code in [200, 201]:
            return create_res.json()[0]['id']
        else:
            print(f"Failed to create ingredient {name}:", create_res.text)
            return None

def import_products(csv_path):
    print(f"Starting import from {csv_path}...")
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            print(f"Processing product: {row['name_ko']}")
            
            # 1. Parse lists
            life_stages = [s.strip() for s in row['target_life_stage'].split(',')] if row['target_life_stage'] else []
            concerns = [s.strip() for s in row['health_concerns'].split(',')] if row['health_concerns'] else []
            ingredient_names = [s.strip() for s in row['ingredients_csv'].split(',')] if row['ingredients_csv'] else []

            # 2. Insert Product
            product_payload = {
                "name": row['name_ko'],
                "brand_name": row['brand_name'],
                "min_price": int(row['min_price']) if row['min_price'] else 0,
                "image_url": row['image_url'],
                "main_category": row['main_category'],
                "sub_category": row['sub_category'],
                "target_pet_type": row['target_pet_type'],
                "target_life_stage": life_stages,
                "formulation": row['formulation'],
                "product_health_concerns": concerns,
                "product_type": "food", # legacy fallback
            }
            
            p_res = requests.post(f"{API_URL}/products", headers=HEADERS, json=product_payload)
            if p_res.status_code not in [200, 201]:
                print("Failed to insert product:", p_res.text)
                continue
                
            product_id = p_res.json()[0]['id']
            print(f" ✓ Product inserted -> {product_id}")

            # 3. Handle Ingredients linking
            for ing_name in ingredient_names:
                ing_id = upsert_ingredient(ing_name)
                if ing_id:
                    link_payload = {
                        "product_id": product_id,
                        "ingredient_id": ing_id
                    }
                    requests.post(f"{API_URL}/product_ingredients", headers=HEADERS, json=link_payload)
            print(f" ✓ Ingredients linked for {row['name_ko']}")

if __name__ == "__main__":
    import sys
    csv_file = sys.argv[1] if len(sys.argv) > 1 else "../data/products_template.csv"
    import_products(csv_file)
    print("Import complete!")
