import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const TOSS_SECRET_KEY = Deno.env.get("TOSS_SECRET_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { paymentKey, orderId, amount } = await req.json()
    
    // 1. Toss Payments 승인 요청
    const encodedKey = btoa(`${TOSS_SECRET_KEY}:`)
    const tossResponse = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodedKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount,
      }),
    })

    const result = await tossResponse.json()

    if (!tossResponse.ok) {
      return new Response(JSON.stringify({ success: false, message: result.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      })
    }

    // 2. Supabase DB 업데이트 (구매 데이터 기록)
    // 인증 헤더에서 유저 ID를 가져올 수도 있고, Toss result에서 고객 정보를 받을 수도 있음.
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    const { data: { user }, error: userError } = await createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (userError || !user) {
       console.error("User Auth Error:", userError)
    }

    // Orders 테이블에 기록 (결제 성공 상태로)
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .update({ 
        status: 'paid', 
        payment_key: paymentKey,
        paid_at: new Date().toISOString()
      })
      .eq('order_id_ext', orderId)
      .select()
      .single()

    if (orderError) {
      console.error("Order Update Error:", orderError)
      // 이미 성공한 결제이므로 에러를 리턴하진 않지만 로그를 남김
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
