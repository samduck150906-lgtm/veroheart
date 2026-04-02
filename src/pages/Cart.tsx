import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Trash2, CreditCard } from 'lucide-react';

export default function Cart() {
  const navigate = useNavigate();
  const { cart, removeFromCart, products } = useStore();
  
  const cartItems = cart.map(c => {
    const p = products.find(prod => prod.id === c.productId);
    return { ...p, quantity: c.quantity };
  }).filter(c => c.id) as (typeof products[number] & { quantity: number })[];

  const totalPrice = cartItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

  if (cartItems.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <p style={{ marginBottom: '16px' }}>장바구니가 비어있습니다.</p>
        <button className="btn btn-primary" onClick={() => navigate('/search')}>상품 둘러보기</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '100px' }}>
      <h2 style={{ fontSize: '24px', marginBottom: '24px' }}>장바구니</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
        {cartItems.map(item => (
          <div key={item.id} className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px' }}>
            <img src={item.imageUrl} alt={item.name} style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 600 }}>{item.brand}</div>
              <div style={{ fontSize: '14px', fontWeight: 700, margin: '4px 0', lineHeight: 1.3 }}>{item.name}</div>
              <div style={{ fontWeight: 800 }}>{(item.price * item.quantity).toLocaleString()}원 <span style={{fontSize:'12px', color:'var(--text-light)', fontWeight:'normal'}}>(수량: {item.quantity}개)</span></div>
            </div>
            <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '8px' }}>
              <Trash2 size={20} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '18px', fontWeight: 800, marginBottom: '16px', padding: '0 8px' }}>
        <span>총 결제금액</span>
        <span style={{ color: 'var(--primary-dark)', fontSize: '24px' }}>{totalPrice.toLocaleString()}원</span>
      </div>

      {/* 스크롤 영역과 하단 고정 결제 버튼 사이 여백 */}
      <div style={{ height: '120px' }} aria-hidden />

      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: '84px',
          zIndex: 9,
          padding: '12px 20px calc(12px + env(safe-area-inset-bottom, 0px))',
          background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.92) 18%, #fff 100%)',
          boxShadow: '0 -8px 24px rgba(0,0,0,0.06)',
          borderTop: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <button
          type="button"
          className="btn"
          style={{
            width: '100%',
            backgroundColor: '#111827',
            color: '#fff',
            padding: '16px',
            fontSize: '17px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            borderRadius: '16px',
          }}
          onClick={() => navigate('/checkout')}
        >
          <CreditCard size={22} strokeWidth={2.25} />
          {totalPrice.toLocaleString()}원 결제하기
        </button>
      </div>
    </div>
  );
}
