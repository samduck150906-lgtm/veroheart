import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Trash2, ExternalLink } from 'lucide-react';
import { notify } from '../store/useNotification';
import { openCoupangForProduct } from '../utils/externalPurchase';
import { COUPANG_PARTNERS_DISCLOSURE } from '../constants/coupangPartners';

export default function Cart() {
  const navigate = useNavigate();
  const { cart, removeFromCart, products, isLoggedIn } = useStore();

  const cartItems = cart
    .map((c) => {
      const p = products.find((prod) => prod.id === c.productId);
      return p ? { ...p, quantity: c.quantity } : null;
    })
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const totalPrice = cartItems.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);

  const handleOpenCoupang = () => {
    if (!isLoggedIn) {
      notify.info('담아둔 상품을 이어 보려면 로그인해 주세요.');
      navigate('/login', { state: { from: '/cart' } });
      return;
    }
    if (cartItems.length === 0) return;
    const first = cartItems[0];
    openCoupangForProduct(first);
    notify.info('쿠팡에서 상품을 확인해 주세요. 수익은 파트너스 정책에 따라 적립될 수 있습니다.');
  };

  if (cartItems.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: 'var(--surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
          <img src="https://cdn-icons-png.flaticon.com/512/825/825590.png" alt="Empty Cart" style={{ width: '60px', opacity: 0.6 }} />
        </div>
        <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', color: 'var(--text-dark)' }}>장바구니가 텅 비었어요!</h3>
        <p style={{ marginBottom: '32px', color: 'var(--text-muted)', fontSize: '15px' }}>우리 아이와 궁합이 잘 맞는 사료를<br/>먼저 찾아볼까요?</p>
        <button 
          className="btn btn-primary" 
          style={{ padding: '16px 32px', borderRadius: '16px', fontWeight: 800, fontSize: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: 'none', cursor: 'pointer' }}
          onClick={() => navigate('/search')}
        >
          맞춤 사료 탐색하기
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '100px' }}>
      <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>장바구니</h2>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5, fontWeight: 600 }}>
        베로로는 결제를 받지 않습니다. 담아둔 상품은 쿠팡에서 이어서 확인·구매할 수 있습니다(쿠팡파트너스).
      </p>
      <p
        style={{
          fontSize: '11px',
          lineHeight: 1.5,
          fontWeight: 600,
          color: 'var(--text-muted)',
          marginBottom: '24px',
          padding: '10px 12px',
          background: 'var(--surface-alt)',
          borderRadius: '12px',
          border: '1px solid var(--line)',
        }}
      >
        {COUPANG_PARTNERS_DISCLOSURE}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
        {cartItems.map((item) => (
          <div
            key={item.id}
            className="card"
            style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px' }}
          >
            <img
              src={item.imageUrl}
              alt={item.name}
              loading="lazy"
              decoding="async"
              style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 600 }}>{item.brand}</div>
              <div style={{ fontSize: '14px', fontWeight: 700, margin: '4px 0', lineHeight: 1.3 }}>{item.name}</div>
              <div style={{ fontWeight: 800 }}>
                {(item.price * item.quantity).toLocaleString()}원{' '}
                <span style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 'normal' }}>
                  (수량: {item.quantity}개)
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeFromCart(item.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '8px' }}
              aria-label="삭제"
            >
              <Trash2 size={20} />
            </button>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '16px',
          fontWeight: 800,
          marginBottom: '16px',
          padding: '0 8px',
        }}
      >
        <span>참고 금액 합계</span>
        <span style={{ color: 'var(--primary-dark)', fontSize: '22px' }}>{totalPrice.toLocaleString()}원</span>
      </div>

      <div style={{ height: '120px' }} aria-hidden />

      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: '84px',
          zIndex: 9,
          padding: '12px 20px calc(12px + env(safe-area-inset-bottom, 0px))',
          background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, var(--bg-gradient) 32%)',
          boxShadow: '0 -8px 24px rgba(0,0,0,0.06)',
          borderTop: '1px solid rgba(128,128,140,0.12)',
        }}
      >
        <button
          type="button"
          className="btn"
          style={{
            width: '100%',
            backgroundColor: '#FA622F',
            color: '#fff',
            padding: '16px',
            fontSize: '17px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            borderRadius: '16px',
            border: 'none',
            cursor: 'pointer',
          }}
          onClick={handleOpenCoupang}
        >
          <ExternalLink size={22} strokeWidth={2.25} />
          쿠팡에서 첫 상품 보기
        </button>
      </div>
    </div>
  );
}
