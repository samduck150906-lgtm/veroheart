import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// TODO: Replace mock data with Supabase queries
// Example:
// export async function getProducts() {
//   const { data, error } = await supabase.from('products').select('*');
//   if (error) throw error;
//   return data;
// }
