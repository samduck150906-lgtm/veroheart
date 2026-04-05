import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { Helmet } from 'react-helmet-async';
import { Loader2, CreditCard } from 'lucide-react';
import { loadPaymentWidget, type PaymentWidgetInstance } from '@tosspayments/payment-widget-sdk';
import { useStore } from '../store/useStore';
import { notify } from '../store/useNotification';
import { getCurrentUser, createOrder } from '../lib/supabase';

const clientKey = import.meta.env.VITE_TOSS_WIDGET_CLIENT_KEY ?? '';

export default function Checkout() {
  const navigate = useNavigate();
  const { cart, products } = useStore();
  const [user, setUser] = useState<User | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 주문 정보 입력 상태
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  
  const [detailAddress, setDetailAddress] = useState('');
  const paymentWidgetRef = useRef<PaymentWidgetInstance | null>(null);
  const [isWidgetLoaded, setIsWidgetLoaded] = useState(false);
  const [widgetError, setWidgetError] = useState(false);

  const openPostcode = () => {
    const script = document.createElement('script');
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.onload = () => {
      new (window as any).daum.Postcode({
        oncomplete: (data: any) => {
          const addr = data.roadAddress || data.jibunAddress;
          setCustomerInfo(prev => ({ ...prev, address: addr }));
        }
      }).open();
    };
    document.head.appendChild(script);
  };

  useEffect(() => {
    getCurrentUser().then((currentUser) => {
      setUser(currentUser);
      if (currentUser?.email) {
        setCustomerInfo((prev) => ({ ...prev, email: currentUser.email ?? prev.email }));
      }
    });
  }, []);

  const cartWithDetails = cart.map(item => {
    const p = products.find(prod => prod.id === item.productId);
    return {
      ...item,
      name: p?.name || '상품',
      price: p?.price || 0
    };
  });

  const totalPrice = cartWithDetails.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

  useEffect(() => {
    if (cart.length === 0 || !user) return;
    if (!clientKey.trim()) {
      setWidgetError(true);
      return;
    }

    (async () => {
      try {
        setWidgetError(false);
        const paymentWidget = await loadPaymentWidget(clientKey, user.id);

        paymentWidget.renderPaymentMethods(
          '#payment-widget',
          { value: totalPrice },
          { variantKey: 'DEFAULT' }
        );

        paymentWidget.renderAgreement('#agreement', { variantKey: 'AGREEMENT' });

        paymentWidgetRef.current = paymentWidget;
        setIsWidgetLoaded(true);
      } catch (err) {
        console.error('Widget render error:', err);
        setWidgetError(true);
      }
    })();
  }, [totalPrice, cart.length, user]);

  const handlePayment = async () => {
    const paymentWidget = paymentWidgetRef.current;
    if (!paymentWidget || !user) return;
    const fullAddress = [customerInfo.address.trim(), detailAddress.trim()].filter(Boolean).join(' ');

    // 입력 검증
    if (!customerInfo.name.trim()) {
      notify.error('받는 분 이름을 입력해주세요.');
      return;
    }
    if (!customerInfo.email.trim()) {
      notify.error('이메일 주소를 입력해주세요.');
      return;
    }
    if (!customerInfo.phone.trim() || customerInfo.phone.trim().length < 10) {
      notify.error('올바른 연락처를 입력해주세요.');
      return;
    }
    if (!customerInfo.address.trim()) {
      notify.error('배송지 주소를 입력해주세요.');
      return;
    }

    setIsProcessing(true);
    try {
      // 1. 백엔드(Supabase)에 'pending' 상태로 주문을 먼저 생성합니다.
      // 이렇게 함으로써 서버-투-서버 승인(Confirm) 시 DB 데이터 변조 여부를 대조할 수 있습니다.
      const order = await createOrder(
        user.id, 
        cartWithDetails, 
        totalPrice, 
        fullAddress,
        { ...customerInfo, address: fullAddress }
      );

      if (!order) {
        throw new Error('주문 생성 중 오류가 발생했습니다.');
      }

      // 2. 토스페이먼츠 결제창 호출
      await paymentWidget.requestPayment({
        orderId: order.orderIdExt, // DB에서 생성한 고유 주문ID 사용
        orderName: `${cartWithDetails[0].name} 외 ${cart.length - 1}건`,
        successUrl: window.location.origin + '/success',
        failUrl: window.location.origin + '/fail',
        customerEmail: customerInfo.email,
        customerName: customerInfo.name,
        customerMobilePhone: customerInfo.phone,
      });
    } catch (error) {
      console.error(error);
      notify.error('결제 준비 중 문제가 발생했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    } finally {
      setIsProcessing(false);
    }
  };

  if (cart.length === 0) return (
    <div className="p-20 text-center">
      <h2 className="text-xl font-bold mb-4">장바구니가 비어있습니다.</h2>
      <button onClick={() => navigate('/')} className="btn bg-gray-900 text-white px-6 py-2 rounded-lg">쇼핑하러 가기</button>
    </div>
  );

  if (!user) {
    return (
      <div className="animate-fade-in" style={{ paddingBottom: '100px' }}>
        <section className="ui-info-card" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 900, marginBottom: '10px' }}>로그인 확인이 필요합니다</h2>
          <p style={{ fontSize: '14px', color: '#66707C', lineHeight: 1.6, marginBottom: '18px' }}>
            결제를 진행하려면 사용자 세션을 먼저 확인해야 합니다. 다시 로그인한 뒤 결제를 시도해주세요.
          </p>
          <button
            type="button"
            className="btn"
            style={{ background: '#111827', color: '#fff' }}
            onClick={() => navigate('/login')}
          >
            로그인하러 가기
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '100px' }}>
      <Helmet><title>안전 결제 - 베로로</title></Helmet>
      <section className="ui-hero-panel" style={{ marginBottom: '18px', padding: '20px' }}>
        <span className="ui-badge ui-badge-soft" style={{ marginBottom: '10px', display: 'inline-flex' }}>
          <CreditCard size={13} />
          secure checkout
        </span>
        <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>안전 결제</h2>
        <p style={{ fontSize: '14px', color: '#66707C', lineHeight: 1.6 }}>
          배송 정보 입력 후 토스페이먼츠로 안전하게 주문을 완료하세요.
        </p>
      </section>

      <div style={{ display: 'grid', gap: '16px' }}>
        <section className="ui-info-card">
          <div className="ui-checkout-step">1. 배송 정보</div>
          <div style={{ display: 'grid', gap: '14px' }}>
            <Field label="받는 분">
              <input
                type="text"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                className="ui-input"
              />
            </Field>
            <Field label="이메일">
              <input
                type="email"
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                className="ui-input"
                placeholder="영수증 수신용 이메일"
              />
            </Field>
            <Field label="연락처">
              <input
                type="text"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                className="ui-input"
              />
            </Field>
            <Field label="배송지 주소">
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                  className="ui-input"
                  placeholder="도로명 주소"
                  readOnly={!!customerInfo.address}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={openPostcode}
                  className="ui-secondary-button"
                  style={{ flexShrink: 0 }}
                >
                  주소 검색
                </button>
              </div>
              <input
                type="text"
                value={detailAddress}
                onChange={(e) => setDetailAddress(e.target.value)}
                className="ui-input"
                placeholder="상세 주소 (동/호수)"
              />
            </Field>
          </div>
        </section>

        <section className="ui-info-card">
          <div className="ui-checkout-step">2. 주문 요약</div>
          <div style={{ display: 'grid', gap: '10px' }}>
            {cartWithDetails.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '14px' }}>
                <span style={{ color: '#5F6772' }}>{item.name} ({item.quantity}개)</span>
                <strong>{(item.price * item.quantity).toLocaleString()}원</strong>
              </div>
            ))}
            <div style={{ height: '1px', background: '#ECEEF3', margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800 }}>최종 결제 금액</span>
              <span style={{ fontSize: '26px', fontWeight: 900, color: 'var(--primary-dark)' }}>{totalPrice.toLocaleString()}원</span>
            </div>
          </div>
        </section>

        <section className="ui-info-card">
          <div className="ui-checkout-step">3. 결제 수단</div>
          {widgetError && (
            <p style={{ fontSize: '13px', color: '#B42318', marginBottom: '12px', padding: '12px', background: '#FEF3F2', borderRadius: '14px' }}>
              결제 위젯을 불러오지 못했습니다. <code>.env</code>의 <code>VITE_TOSS_WIDGET_CLIENT_KEY</code> 설정을 확인해 주세요.
            </p>
          )}
          <div id="payment-widget" />
          <div id="agreement" />
        </section>

        <button
          className="btn"
          style={{
            width: '100%',
            background: '#111827',
            color: '#fff',
            padding: '18px',
            borderRadius: '18px',
            fontWeight: 900,
            fontSize: '17px',
          }}
          disabled={!isWidgetLoaded || isProcessing || widgetError || !clientKey.trim()}
          onClick={handlePayment}
        >
          {isProcessing ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <CreditCard className="w-6 h-6" />
              {totalPrice.toLocaleString()}원 안전 결제하기
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: '8px' }}>
      <span style={{ fontSize: '13px', fontWeight: 800, color: '#374151' }}>{label}</span>
      {children}
    </label>
  );
}
