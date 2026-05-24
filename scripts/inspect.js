import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase config missing from .env.local!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log('Connecting to Supabase:', supabaseUrl);
  
  // 1. Try querying products
  const { data: products, error: pError } = await supabase.from('products').select('count');
  console.log('Products query:', pError ? { error: pError.message } : { success: true, count: products });

  // 2. Try querying users
  const { data: users, error: uError } = await supabase.from('users').select('count');
  console.log('Users query:', uError ? { error: uError.message } : { success: true, count: users });

  // 3. Try querying pets
  const { data: pets, error: petError } = await supabase.from('pets').select('count');
  console.log('Pets query:', petError ? { error: petError.message } : { success: true, count: pets });

  // 4. Try querying cart_items
  const { data: cart, error: cError } = await supabase.from('cart_items').select('count');
  console.log('Cart Items query:', cError ? { error: cError.message } : { success: true, count: cart });

  // 5. Try querying favorites
  const { data: favs, error: fError } = await supabase.from('favorites').select('count');
  console.log('Favorites query:', fError ? { error: fError.message } : { success: true, count: favs });
}

inspect().catch(console.error);
