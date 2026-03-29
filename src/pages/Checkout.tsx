import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { mockProducts } from '../data/mock';
import { loadPaymentWidget, PaymentWidgetInstance } from '@tosspayments/payment-widget-sdk';
import { Helmet } from 'react-helmet-async';

const clientKey = "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm"; // 토스페이먼츠 테스트 클라이언트 키
const customerKey = "mock_customer_01"; // 구매를 진행하는 가상 사용자 키

export default function Checkout() {
  const navigate = useNavigate();
  const { cart, clearCart } = useStore();
  
  const paymentWidgetRef = useRef<PaymentWidgetInstance | null>(null);
  const paymentMethodsWidgetRef = useRef<any>(null);
  const [isWidgetLoaded, setIsWidgetLoaded] = useState(false);

  const totalPrice = cart.reduce((acc, curr) => {
    const p = mockProducts.find(prod => prod.id === curr.productId);
    return acc + (p ? p.price * curr.quantity : 0);
  }, 0);

  useEffect(() => {
    if (cart.length === 0) return;

    (async () => {
      try {
        const paymentWidget = await loadPaymentWidget(clientKey, customerKey);
        
        // 결제위젯 렌더링
        const paymentMethodsWidget = paymentWidget.renderPaymentMethods(
          '#payment-widget',
          { value: totalPrice },
          { variantKey: 'DEFAULT' }
        );

        // 이용약관 렌더링
        paymentWidget.renderAgreement('#agreement', { variantKey: 'AGREEMENT' });

        paymentWidgetRef.current = paymentWidget;
        paymentMethodsWidgetRef.current = paymentMethodsWidget;
        setIsWidgetLoaded(true);
      } catch (err) {
        console.error('Widget render error:', err);
      }
    })();
  }, [totalPrice, cart.length]);

  const handlePayment = async () => {
    const paymentWidget = paymentWidgetRef.current;
    if (!paymentWidget) return;

    try {
      // 결제 리다이렉션 (Toss Checkout)
      // 실 모바일/웹 결제창 호출 
      await paymentWidget.requestPayment({
        orderId: Math.random().toString(36).slice(2),
        orderName: `베로하트 커머스 맞춤 사료 외 ${cart.length}건`,
        successUrl: window.location.origin + '/success',
        failUrl: window.location.origin + '/fail',
        customerEmail: 'customer123@gmail.com',
        customerName: '김베로',
        customerMobilePhone: '01012341234',
      });
      // (테스트 키 환경에선 토스 팝업이 뜬 후 성공/실패 URL로 리다이렉트됨)
    } catch (error) {
      console.error(error);
      alert('결제 창 호출 중 문제가 발생했습니다.');
    }
  };

  if (cart.length === 0) return <div>장바구니가 비어있습니다.</div>;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '100px' }}>
      <Helmet><title>안전 결제 - 베로하트 커머스</title></Helmet>
      <h2 style={{ fontSize: '24px', marginBottom: '24px' }}>주문 / 결제</h2>
      
      {/* 토스페이먼츠 위젯 마운트 DOM */}
      <div id="payment-widget" style={{ marginBottom: '16px' }} />
      <div id="agreement" style={{ marginBottom: '32px' }} />

      <button 
        className="btn" 
        disabled={!isWidgetLoaded}
        style={{ width: '100%', backgroundColor: '#1F2937', color: '#fff', padding: '16px', fontSize: '18px', opacity: isWidgetLoaded ? 1 : 0.5 }} 
        onClick={handlePayment}
      >
        {isWidgetLoaded ? `${totalPrice.toLocaleString()}원 결제하기 (실제 PG)` : '결제 위젯 불러오는 중...'}
      </button>
    </div>
  );
}
