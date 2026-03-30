// 토스페이먼츠 결제 승인 서버사이드 함수 (Netlify Functions)
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
    const { paymentKey, orderId, amount } = JSON.parse(event.body);

    if (!paymentKey || !orderId || !amount) {
      return { statusCode: 400, headers, body: JSON.stringify({ message: '필수 파라미터가 누락되었습니다.' }) };
    }

    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      console.error('TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.');
      return { statusCode: 500, headers, body: JSON.stringify({ message: '서버 설정 오류입니다. 관리자에게 문의하세요.' }) };
    }

    const encryptedKey = Buffer.from(secretKey + ':').toString('base64');

    const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + encryptedKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ message: data.message || '결제 승인 실패', code: data.code }),
      };
    }

    // 결제 승인 성공
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: data.status,
        orderId: data.orderId,
        method: data.method,
        totalAmount: data.totalAmount,
        approvedAt: data.approvedAt,
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
