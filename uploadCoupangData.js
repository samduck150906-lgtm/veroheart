import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Uploading Coupang data to Supabase...');

  const filePath = path.join(process.cwd(), 'src', 'data', 'coupang_products.json');
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  const rawData = fs.readFileSync(filePath, 'utf-8');
  const products = JSON.parse(rawData);

  console.log(`Found ${products.length} products to upload.`);

  const mappedProducts = products.map((p, index) => {
    // Generate a determinisic UUID or a random one. For mock purposes, random UUID using crypto
    const id = crypto.randomUUID();
    return {
      id: id,
      name: p.name,
      brand_name: p.brand,
      product_type: 'food',
      main_category: p.main_category,
      target_pet_type: p.target_pet_type,
      min_price: p.price,
      image_url: p.image_url,
      product_url: p.product_url,
      source: p.source
    };
  });

  const { error } = await supabase.from('products').upsert(mappedProducts);

  if (error) {
    console.error('Error uploading products:', error);
  } else {
    console.log('Successfully uploaded Coupang products with Affiliate links!');
  }
}

run();
