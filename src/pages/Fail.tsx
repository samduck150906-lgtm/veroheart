import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function Fail() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const message = searchParams.get('message');

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white rounded-2xl shadow-sm border border-gray-100 animate-fade-in">
      <Helmet><title>결제 실패 - 베로로</title></Helmet>
      <AlertCircle className="w-20 h-20 text-red-500 mb-6 bg-red-50 p-4 rounded-full" />
      <h2 className="text-3xl font-bold mb-3 text-red-600">결제 처리에 실패했습니다</h2>
      <p className="text-gray-500 mb-8 max-w-md mx-auto">
        Toss Payments: [{code}] {message}
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <Link to="/checkout" className="btn bg-gray-900 text-white flex-1 py-4 rounded-full font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2">
           <ArrowLeft className="w-5 h-5" /> 다시 시도
        </Link>
        <Link to="/" className="btn border border-gray-200 text-gray-600 flex-1 py-4 rounded-full font-bold hover:bg-gray-50 transition-all flex items-center justify-center">
            홈으로 이동
        </Link>
      </div>
    </div>
  );
}
