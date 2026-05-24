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

async function confirmUser() {
  const targetEmail = 'samduck150906@gmail.com';
  console.log(`Searching for user with email: ${targetEmail}`);

  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('List users error:', listError);
    return;
  }

  const user = users.find(u => u.email === targetEmail);
  if (!user) {
    console.error(`User with email ${targetEmail} not found!`);
    return;
  }

  console.log(`Found user: ${user.id}. Confirming email...`);

  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    email_confirm: true
  });

  if (error) {
    console.error('Confirm error:', error);
    return;
  }

  console.log('Successfully confirmed email for user:', data.user.email);
}

confirmUser().catch(console.error);
