import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { Helmet } from 'react-helmet-async';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function Success() {
  const [searchParams] = useSearchParams();
  const { clearCart } = useStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'fail'>('loading');
  const [message, setMessage] = useState('');

  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');
  const amountValue = Number(amount);
  const hasValidAmount = Number.isFinite(amountValue) && amountValue >= 0;

  useEffect(() => {
    const confirmPayment = async () => {
      if (!paymentKey || !orderId || !amount) {
        setStatus('fail');
        setMessage('결제 정보가 부족합니다.');
        return;
      }

      try {
        // 보안을 위해 프론트엔드에서 수동으로 거래를 끝내지 않고,
        // Supabase Edge Function을 호출하여 '결제 승인 API'를 서버사이드에서 실행합니다.
        // 이 과정에서 토스 비밀키가 서버 측에서 사용되며, 금액 변조 여부를 최종 확인합니다.
        
        const { data, error } = await supabase.functions.invoke('confirm-payment', {
          body: { 
            paymentKey, 
            orderId, 
            amount: Number(amount) 
          }
        });

        if (error) {
          console.error('Edge Function Error:', error);
          setStatus('fail');
          setMessage(error.message || '결제 승인 서버 호출 중 오류가 발생했습니다.');
          return;
        }

        if (!data.success) {
          console.error('Payment confirmation failed:', data.message);
          setStatus('fail');
          setMessage(data.message || '결제 승인이 거절되었습니다.');
        } else {
          // 승인 성공
          setStatus('success');
          clearCart(); // 결제 확정 시 장바구니 비우기
        }
      } catch (err) {
        console.error('Error during payment confirmation:', err);
        setStatus('fail');
        setMessage('서버 통신 중 예상치 못한 오류가 발생했습니다.');
      }
    };

    confirmPayment();
  }, [paymentKey, orderId, amount, clearCart]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 animate-fade-in">
        <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-4" />
        <h2 className="text-2xl font-bold mb-2">결제 승인 거래 확인 중</h2>
        <p className="text-gray-500">Toss Payments 서버와 통신하여 결제를 안전하게 확정하고 있습니다.</p>
      </div>
    );
  }

  if (status === 'fail') {
    return (
      <div className="flex flex-col items-center justify-center min-vh-60 text-center p-6 animate-fade-in">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2 text-red-600">결제 승인 실패</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-4">
          <Link to="/checkout" className="btn bg-gray-900 text-white px-8 py-3 rounded-full hover:bg-gray-800 transition-colors">
            결제 다시 시도
          </Link>
          <Link to="/" className="btn border border-gray-200 text-gray-600 px-8 py-3 rounded-full hover:bg-gray-50 transition-colors">
            홈으로 이동
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 animate-fade-in">
      <Helmet><title>결제 완료 - 베로로</title></Helmet>
      <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
      <h2 className="text-3xl font-bold mb-2 text-gray-900">결제가 안전하게 완료되었습니다!</h2>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        베로로에서 소중한 반려견을 위한 사료를 구매해주셔서 감사합니다.<br />
        주문 내역은 마이페이지에서 확인 가능합니다.
      </p>
      <div className="bg-gray-50 p-6 rounded-2xl w-full max-w-sm mb-8 text-left border border-gray-100 shadow-inner">
        <div className="flex justify-between mb-2">
          <span className="text-gray-500 font-medium">주문 번호</span>
          <span className="font-mono text-gray-900">{orderId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 font-medium">최종 결제 금액</span>
          <span className="font-bold text-blue-600">{hasValidAmount ? `${amountValue.toLocaleString()}원` : '-'}</span>
        </div>
      </div>
      <Link to="/" className="btn bg-gray-900 text-white px-12 py-4 rounded-full font-bold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1">
        쇼핑 계속하기
      </Link>
    </div>
  );
}
