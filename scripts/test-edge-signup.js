import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase config missing from .env.local!');
  process.exit(1);
}

async function testEdgeSignup() {
  const testEmail = `edge_test_${Math.floor(Math.random() * 100000)}@gmail.com`;
  const testPassword = 'Password123!';

  console.log(`Testing Edge Function signup for email: ${testEmail}`);

  const functionUrl = `${supabaseUrl}/functions/v1/admin-auth`;
  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        action: 'signup',
        email: testEmail,
        password: testPassword
      }),
    });

    const status = response.status;
    const body = await response.json();
    console.log(`Edge Function Response (Status: ${status}):`, body);

    if (response.ok && body.user) {
      console.log('Edge signup succeeded! User ID:', body.user.id);
      
      // Let's try to sign in with this email & password using standard supabase client to see if it works immediately!
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      console.log('Attempting to sign in standardly with the newly created user...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      if (error) {
        console.error('Sign-in failed after Edge signup:', error.message);
      } else {
        console.log('Sign-in succeeded!', {
          sessionCreated: !!data.session,
          userId: data.user.id,
          emailConfirmed: data.user.email_confirmed_at
        });

        // Since we are authenticated now, RLS should allow us to read our own public.users record!
        console.log('Fetching public.users record as the authenticated user...');
        const { data: publicUser, error: pError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (pError) {
          console.error('Failed to read public.users record:', pError.message);
        } else {
          console.log('Successfully read public.users record! Details:', publicUser);
        }
      }
    } else {
      console.error('Edge signup failed:', body);
    }
  } catch (error) {
    console.error('Network or fetch error:', error);
  }
}

testEdgeSignup().catch(console.error);
