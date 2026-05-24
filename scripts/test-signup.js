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

async function testSignup() {
  const testEmail = `verorotest_${Math.floor(Math.random() * 100000)}@gmail.com`;
  const testPassword = 'Password123!';

  console.log(`Testing signup for email: ${testEmail}`);
  
  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
  });

  if (error) {
    console.error('Signup error:', error);
    return;
  }

  console.log('Signup succeeded!', {
    user: data.user ? { id: data.user.id, email: data.user.email } : null,
    session: data.session ? 'Session created' : 'No session (email verification required)'
  });

  if (data.user) {
    // Wait a brief moment for database trigger to complete
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('Checking if user record was created in public.users table...');
    const { data: publicUser, error: pError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (pError) {
      console.error('Failed to find public.users record:', pError.message);
    } else {
      console.log('Found public.users record:', publicUser);
    }
  }
}

testSignup().catch(console.error);
