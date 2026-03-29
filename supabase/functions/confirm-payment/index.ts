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

    if (!paymentKey || !orderId || !amount) {
      return new Response(JSON.stringify({ success: false, message: '필수 결제 정보가 누락되었습니다.' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      })
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // ★ 핵심 보안: DB에 저장된 주문 금액과 클라이언트에서 전달한 금액 대조
    const { data: order, error: orderFetchError } = await supabaseAdmin
      .from('orders')
      .select('id, total_amount, status')
      .eq('order_id_ext', orderId)
      .single()

    if (orderFetchError || !order) {
      console.error("Order lookup failed:", orderFetchError)
      return new Response(JSON.stringify({ success: false, message: '주문 정보를 찾을 수 없습니다.' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      })
    }

    // 금액 변조 감지
    if (order.total_amount !== Number(amount)) {
      console.error(`Amount mismatch! DB: ${order.total_amount}, Client: ${amount}, orderId: ${orderId}`)
      return new Response(JSON.stringify({ 
        success: false, 
        message: '결제 금액이 주문 금액과 일치하지 않습니다. 결제 변조가 감지되었습니다.' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      })
    }

    // 이미 결제된 주문 방어
    if (order.status === 'paid' || order.status === 'completed') {
      return new Response(JSON.stringify({ success: false, message: '이미 결제가 완료된 주문입니다.' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      })
    }

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
        amount: Number(amount),
      }),
    })

    const result = await tossResponse.json()

    if (!tossResponse.ok) {
      // 토스 승인 실패 시 주문 상태를 failed로 변경
      await supabaseAdmin
        .from('orders')
        .update({ status: 'failed' })
        .eq('order_id_ext', orderId)

      return new Response(JSON.stringify({ success: false, message: result.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      })
    }

    // 2. 결제 성공 → Orders 테이블 업데이트
    const { error: orderError } = await supabaseAdmin
      .from('orders')
      .update({ 
        status: 'paid', 
        payment_key: paymentKey,
        paid_at: new Date().toISOString()
      })
      .eq('order_id_ext', orderId)

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

