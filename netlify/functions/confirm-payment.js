// 토스페이먼츠 결제 승인 (Netlify Functions) — Supabase Edge와 동일하게 DB 주문 금액 검증 후 승인
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ message: 'Method Not Allowed' }) };
  }

  try {
    const { paymentKey, orderId, amount } = JSON.parse(event.body || '{}');

    if (!paymentKey || !orderId || amount == null) {
      return { statusCode: 400, headers, body: JSON.stringify({ message: '필수 파라미터가 누락되었습니다.' }) };
    }

    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      console.error('TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.');
      return { statusCode: 500, headers, body: JSON.stringify({ message: '서버 설정 오류입니다. 관리자에게 문의하세요.' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRole) {
      console.error('SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
      return { statusCode: 500, headers, body: JSON.stringify({ message: '서버 설정 오류입니다. 관리자에게 문의하세요.' }) };
    }

    const supabase = createClient(supabaseUrl, serviceRole);
    const { data: order, error: orderFetchError } = await supabase
      .from('orders')
      .select('id, total_amount, status')
      .eq('order_id_ext', orderId)
      .single();

    if (orderFetchError || !order) {
      console.error('Order lookup failed:', orderFetchError);
      return { statusCode: 400, headers, body: JSON.stringify({ message: '주문 정보를 찾을 수 없습니다.' }) };
    }

    if (order.total_amount !== Number(amount)) {
      console.error(`Amount mismatch! DB: ${order.total_amount}, Client: ${amount}, orderId: ${orderId}`);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: '결제 금액이 주문 금액과 일치하지 않습니다.' }),
      };
    }

    if (order.status === 'paid' || order.status === 'completed') {
      return { statusCode: 400, headers, body: JSON.stringify({ message: '이미 결제가 완료된 주문입니다.' }) };
    }

    const encryptedKey = Buffer.from(secretKey + ':').toString('base64');

    const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + encryptedKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
    });

    const data = await response.json();

    if (!response.ok) {
      await supabase.from('orders').update({ status: 'failed' }).eq('order_id_ext', orderId);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ message: data.message || '결제 승인 실패', code: data.code }),
      };
    }

    const paidAt = new Date().toISOString();
    const { data: updatedOrder, error: orderError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_key: paymentKey,
        paid_at: paidAt,
      })
      .eq('order_id_ext', orderId)
      .eq('status', 'pending')
      .select('id, status, payment_key, paid_at')
      .single();

    if (orderError) {
      console.error('Order Update Error:', orderError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ message: '결제는 승인되었지만 주문 상태를 확정하지 못했습니다. 관리자에게 문의해주세요.' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          status: data.status,
          orderId: data.orderId,
          method: data.method,
          totalAmount: data.totalAmount,
          approvedAt: data.approvedAt,
        },
        order: updatedOrder,
      }),
    };
  } catch (error) {
    console.error('Payment confirm error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: '서버 오류가 발생했습니다.' }),
    };
  }
};
