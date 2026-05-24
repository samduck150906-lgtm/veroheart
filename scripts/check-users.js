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

async function listUsers() {
  console.log('Listing users from auth.users (via admin API)...');
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Failed to list auth users:', authError.message);
  } else {
    console.log(`Found ${users.length} users in auth.users:`);
    users.forEach(u => {
      console.log(`- ID: ${u.id}, Email: ${u.email}, Confirmed At: ${u.email_confirmed_at}, Created At: ${u.created_at}`);
    });
  }

  console.log('\nListing users from public.users table...');
  const { data: publicUsers, error: pError } = await supabase.from('users').select('*');
  if (pError) {
    console.error('Failed to list public users:', pError.message);
  } else {
    console.log(`Found ${publicUsers.length} users in public.users:`);
    publicUsers.forEach(u => {
      console.log(`- ID: ${u.id}, Nickname: ${u.nickname}, Created At: ${u.created_at}`);
    });
  }
}

listUsers().catch(console.error);
