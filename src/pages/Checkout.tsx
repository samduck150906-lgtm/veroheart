import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { Helmet } from 'react-helmet-async';
import { Loader2, CreditCard } from 'lucide-react';
import { loadPaymentWidget, type PaymentWidgetInstance } from '@tosspayments/payment-widget-sdk';
import { useStore } from '../store/useStore';
import { notify } from '../store/useNotification';
import { getCurrentUser, createOrder } from '../lib/supabase';

const clientKey = import.meta.env.VITE_TOSS_WIDGET_CLIENT_KEY ?? '';
const DAUM_POSTCODE_SCRIPT_SRC = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

function loadDaumPostcodeScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).daum?.Postcode) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src="${DAUM_POSTCODE_SCRIPT_SRC}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('postcode script load failed')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = DAUM_POSTCODE_SCRIPT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('postcode script load failed'));
    document.head.appendChild(script);
  });
}

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, products, isLoggedIn } = useStore();
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

  const openPostcode = async () => {
    try {
      await loadDaumPostcodeScript();
      new (window as any).daum.Postcode({
        oncomplete: (data: any) => {
          const addr = data.roadAddress || data.jibunAddress;
          setCustomerInfo(prev => ({ ...prev, address: addr }));
        }
      }).open();
    } catch {
      notify.error('주소 검색 스크립트를 불러오지 못했습니다.');
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      notify.error('결제를 위해 먼저 로그인해 주세요.');
      navigate('/login', { state: { from: location.pathname }, replace: true });
      return;
    }
    getCurrentUser().then(setUser);
  }, [isLoggedIn, navigate, location.pathname]);

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

    // 입력 검증
    if (!customerInfo.name.trim()) {
      notify.error('받는 분 이름을 입력해주세요.');
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
    const fullAddress = `${customerInfo.address} ${detailAddress}`.trim();

    setIsProcessing(true);
    try {
      // 1. 백엔드(Supabase)에 'pending' 상태로 주문을 먼저 생성합니다.
      // 이렇게 함으로써 서버-투-서버 승인(Confirm) 시 DB 데이터 변조 여부를 대조할 수 있습니다.
      const order = await createOrder(
        user.id, 
        cartWithDetails, 
        totalPrice, 
        fullAddress,
        customerInfo
      );

      if (!order) {
        throw new Error('주문 생성 중 오류가 발생했습니다.');
      }

      const orderName = cart.length > 1
        ? `${cartWithDetails[0].name} 외 ${cart.length - 1}건`
        : cartWithDetails[0].name;

      // 2. 토스페이먼츠 결제창 호출
      await paymentWidget.requestPayment({
        orderId: order.orderIdExt, // DB에서 생성한 고유 주문ID 사용
        orderName,
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

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-fade-in" style={{ paddingBottom: '100px' }}>
      <Helmet><title>안전 결제 - 베로로</title></Helmet>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 주문 정보 입력 */}
        <div className="space-y-6">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="bg-blue-50 text-blue-500 p-2 rounded-lg">1</span>
              배송 정보 입력
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">받는 분</label>
                <input 
                  type="text" 
                  value={customerInfo.name} 
                  onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
                <input 
                  type="text" 
                  value={customerInfo.phone} 
                  onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">배송지 주소</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={customerInfo.address}
                    onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})}
                    className="flex-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="도로명 주소"
                    readOnly={!!customerInfo.address}
                  />
                  <button
                    type="button"
                    onClick={openPostcode}
                    className="px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl border border-gray-200 whitespace-nowrap text-sm"
                  >
                    우편번호
                  </button>
                </div>
                <input
                  type="text"
                  value={detailAddress}
                  onChange={e => setDetailAddress(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="상세 주소 (동/호수)"
                />
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="bg-blue-50 text-blue-500 p-2 rounded-lg">2</span>
              주문 요약
            </h3>
            <div className="space-y-3">
              {cartWithDetails.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.name} ({item.quantity}개)</span>
                  <span className="font-medium">{(item.price * item.quantity).toLocaleString()}원</span>
                </div>
              ))}
              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="font-bold text-gray-900">최종 결제 금액</span>
                <span className="text-2xl font-black text-blue-600">{totalPrice.toLocaleString()}원</span>
              </div>
            </div>
          </section>
        </div>

        {/* 결제 위젯 */}
        <div className="space-y-6">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="bg-blue-50 text-blue-500 p-2 rounded-lg">3</span>
              결제 방법 선택
            </h3>
            {widgetError && (
              <p className="text-sm text-red-600 mb-3 p-3 bg-red-50 rounded-xl">
                결제 위젯을 불러오지 못했습니다. 루트 <code className="text-xs bg-white px-1 rounded">.env</code>에{' '}
                <code className="text-xs bg-white px-1 rounded">VITE_TOSS_WIDGET_CLIENT_KEY</code>를 설정한 뒤 개발 서버를 다시 실행해 주세요.
              </p>
            )}
            <div id="payment-widget" />
            <div id="agreement" />
          </section>

          <button 
            className="w-full bg-gray-900 text-white p-5 rounded-2xl font-bold text-lg shadow-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2" 
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
    </div>
  );
}
