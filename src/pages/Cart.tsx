import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Trash2, CreditCard, Minus, Plus, ShoppingBag, ShieldCheck } from 'lucide-react';

export default function Cart() {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateCartQuantity, products } = useStore();
  
  const cartItems = cart.map(c => {
    const p = products.find(prod => prod.id === c.productId);
    return { ...p, quantity: c.quantity };
  }).filter(c => c.id) as (typeof products[number] & { quantity: number })[];

  const totalPrice = cartItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

  if (cartItems.length === 0) {
    return (
      <div className="ui-info-card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <div className="ui-icon-pill" style={{ margin: '0 auto 12px', width: '56px', height: '56px' }}>
          <ShoppingBag size={22} color="var(--primary-dark)" />
        </div>
        <p style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 700 }}>장바구니가 비어있습니다.</p>
        <button className="btn btn-primary" onClick={() => navigate('/search')}>상품 둘러보기</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '100px' }}>
      <section className="ui-hero-panel" style={{ marginBottom: '18px', padding: '20px' }}>
        <span className="ui-badge ui-badge-soft" style={{ marginBottom: '10px', display: 'inline-flex' }}>
          <ShieldCheck size={13} />
          주문 전 최종 점검
        </span>
        <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>장바구니에 담은 제품</h2>
        <p style={{ fontSize: '14px', color: '#66707C', lineHeight: 1.6 }}>
          수량을 조정하고 결제 전 최종 금액을 확인해보세요.
        </p>
      </section>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
        {cartItems.map(item => (
          <div key={item.id} className="ui-list-card" style={{ alignItems: 'stretch' }}>
            <img src={item.imageUrl} alt={item.name} style={{ width: '88px', height: '88px', borderRadius: '18px', objectFit: 'cover' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '4px' }}>{item.brand}</div>
              <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '8px', lineHeight: 1.45, color: 'var(--text-dark)' }}>{item.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 900, fontSize: '18px', color: 'var(--text-dark)' }}>{(item.price * item.quantity).toLocaleString()}원</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px', background: '#F7F7FA', borderRadius: '14px' }}>
                  <button
                    type="button"
                    onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#fff',
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <Minus size={16} />
                  </button>
                  <strong style={{ minWidth: '18px', textAlign: 'center', fontSize: '14px' }}>{item.quantity}</strong>
                  <button
                    type="button"
                    onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#fff',
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
            <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '8px', alignSelf: 'flex-start' }}>
              <Trash2 size={20} />
            </button>
          </div>
        ))}
      </div>

      <div className="ui-info-card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', fontWeight: 700, marginBottom: '10px', color: '#6B7280' }}>
          <span>상품 금액</span>
          <span>{totalPrice.toLocaleString()}원</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '18px', fontWeight: 900 }}>
          <span>총 결제금액</span>
          <span style={{ color: 'var(--primary-dark)', fontSize: '26px' }}>{totalPrice.toLocaleString()}원</span>
        </div>
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
