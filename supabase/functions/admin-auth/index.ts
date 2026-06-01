import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { buildCorsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, email, password } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are missing on the server.');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    if (action === 'signup') {
      if (!email || !password) {
        return new Response(JSON.stringify({ error: 'Email and password are required.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Create the user with email_confirm: true using the service_role client
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Defensively upsert the user into public.users table from the Edge Function
      const nickname = email.split('@')[0] || '베로';
      const { error: upsertError } = await supabaseAdmin.from('users').upsert({
        id: data.user.id,
        nickname: nickname,
        avatar_url: ''
      }, { onConflict: 'id' });

      if (upsertError) {
        console.error('Upsert to public.users failed:', upsertError);
      }

      return new Response(JSON.stringify({ user: data.user }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (action === 'confirm') {
      if (!email) {
        return new Response(JSON.stringify({ error: 'Email is required.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // List all users to find the matching email
      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        return new Response(JSON.stringify({ error: listError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const foundUser = (listData.users as any[]).find((u: any) => u.email === email);
      if (!foundUser) {
        return new Response(JSON.stringify({ error: 'User not found.' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Update email_confirm to true
      const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(foundUser.id, {
        email_confirm: true
      });

      if (confirmError) {
        return new Response(JSON.stringify({ error: confirmError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Also ensure public user exists
      const nickname = email.split('@')[0] || '베로';
      await supabaseAdmin.from('users').upsert({
        id: foundUser.id,
        nickname: nickname,
        avatar_url: ''
      }, { onConflict: 'id' });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      return new Response(JSON.stringify({ error: 'Invalid action.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})
