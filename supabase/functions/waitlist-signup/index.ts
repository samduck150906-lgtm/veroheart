import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { buildCorsHeaders } from '../_shared/cors.ts';

/**
 * waitlist-signup — 베로로 출시 전 랜딩페이지의 "출시 알림 받기" 신청 접수.
 *
 * anon 키로는 launch_waitlist에 쓸 수 없다(RLS: 정책 없음 = 전면 차단).
 * 이 함수는 service_role 키(서버 전용, Edge Function 시크릿)로만 삽입하며,
 * service_role 키는 클라이언트로 절대 노출되지 않는다.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RequestBody {
  email?: string;
  phone?: string;
  marketingConsent?: boolean;
  privacyConsent?: boolean;
  source?: string;
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST 요청만 허용됩니다.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: '요청 본문을 확인해 주세요.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const phone = (body.phone ?? '').trim();

  if (!EMAIL_PATTERN.test(email)) {
    return new Response(JSON.stringify({ error: '올바른 이메일 형식을 입력해 주세요.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (body.privacyConsent !== true) {
    return new Response(
      JSON.stringify({ error: '개인정보 수집·이용 동의가 필요합니다.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: '서버 설정이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { error } = await supabase.from('launch_waitlist').insert({
    email,
    phone: phone || null,
    marketing_consent: body.marketingConsent === true,
    privacy_consent: true,
    source: body.source?.trim() || 'landing',
  });

  if (error) {
    // 23505 = unique_violation (이미 신청한 이메일)
    if (error.code === '23505') {
      return new Response(JSON.stringify({ duplicate: true }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(
      JSON.stringify({ error: '신청 처리 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
