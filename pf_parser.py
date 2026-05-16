import json

with open('pf_data.json', encoding='utf-8') as f:
    d = json.load(f)

products = []

def find_products(obj):
    if isinstance(obj, dict):
        # Look for typical product keys in Pet Friends
        if 'productName' in obj and 'salePrice' in obj:
            products.append({
                'name': obj.get('productName'),
                'price': obj.get('salePrice'),
                'img': obj.get('imageUrl') or obj.get('listImageUrl')
            })
        for v in obj.values():
            find_products(v)
    elif isinstance(obj, list):
        for item in obj:
            find_products(item)

find_products(d)
print(f"Found {len(products)} products in the home page structure.")
for p in products[:5]:
    print(p['name'])
