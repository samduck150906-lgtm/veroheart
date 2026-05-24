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

async function testAdminCreate() {
  const testEmail = `veroroadmin_${Math.floor(Math.random() * 100000)}@gmail.com`;
  const testPassword = 'Password123!';

  console.log(`Testing admin user creation for email: ${testEmail}`);
  
  const { data, error } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true // This auto-confirms the email!
  });

  if (error) {
    console.error('Admin create error:', error);
    return;
  }

  console.log('Admin user creation succeeded!', {
    user: data.user ? { id: data.user.id, email: data.user.email, confirmed: data.user.email_confirmed_at } : null
  });
}

testAdminCreate().catch(console.error);
