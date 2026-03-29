import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { mockProducts } from '../data/mock';
import { Trash2 } from 'lucide-react';

export default function Cart() {
  const navigate = useNavigate();
  const { cart, removeFromCart } = useStore();
  
  const cartItems = cart.map(c => {
    const p = mockProducts.find(prod => prod.id === c.productId);
    return { ...p, quantity: c.quantity };
  }).filter(c => c.id) as (typeof mockProducts[number] & { quantity: number })[];

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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '18px', fontWeight: 800, marginBottom: '24px', padding: '0 8px' }}>
        <span>총 결제금액</span>
        <span style={{ color: 'var(--primary-dark)', fontSize: '24px' }}>{totalPrice.toLocaleString()}원</span>
      </div>

      <button className="btn" style={{ width: '100%', backgroundColor: '#1F2937', color: '#fff', padding: '16px', fontSize: '18px' }} onClick={() => navigate('/checkout')}>
        {totalPrice.toLocaleString()}원 결제하기
      </button>
    </div>
  );
}
