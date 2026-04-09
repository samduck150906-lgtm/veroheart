import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X,
  Check
} from 'lucide-react';
import { notify } from '../../store/useNotification';

interface Product {
  id: string;
  name: string;
  brand_name: string;
  product_type: string;
  main_category: string;
  sub_category?: string;
  target_pet_type: string;
  target_life_stage?: string[];
  formulation?: string;
  product_health_concerns?: string[];
  has_risk_factors?: string[];
  image_url: string;
  min_price: number;
}

const MAIN_CATEGORIES = [
  '사료', '간식', '영양제', '구강관리', '피부·목욕·위생', '눈·귀 케어', '배변/위생', '생활용품'
];

const LIFE_STAGES = ['퍼피·키튼', '성체', '시니어'];
const PET_TYPES = ['dog', 'cat', 'all'];

const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
  
  // UI Helpers
  const [activeTab, setActiveTab] = useState('전체');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!currentProduct.name || !currentProduct.brand_name) {
      notify.error('필수 항목을 입력해주세요.');
      return;
    }

    const payload = {
      ...currentProduct,
      target_life_stage: currentProduct.target_life_stage || [],
      product_health_concerns: currentProduct.product_health_concerns || [],
      has_risk_factors: currentProduct.has_risk_factors || []
    };

    try {
      if (currentProduct.id) {
        const { error } = await supabase.from('products').update(payload).eq('id', currentProduct.id);
        if (error) throw error;
        notify.success('제품이 수정되었습니다.');
      } else {
        const { error } = await supabase.from('products').insert([payload]);
        if (error) throw error;
        notify.success('제품이 등록되었습니다.');
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      notify.error(`저장 실패: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('정말 삭제하시겠습니까? 데이터가 영구적으로 삭제됩니다.')) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        notify.error('삭제 실패');
      } else {
        notify.success('삭제 완료');
        fetchProducts();
      }
    }
  };

  const toggleArrayField = (field: keyof Product, value: string) => {
    const currentArray = (currentProduct[field] as string[]) || [];
    if (currentArray.includes(value)) {
      setCurrentProduct({
        ...currentProduct,
        [field]: currentArray.filter(v => v !== value)
      });
    } else {
      setCurrentProduct({
        ...currentProduct,
        [field]: [...currentArray, value]
      });
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.brand_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === '전체' || p.main_category === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="admin-products animate-fade-in" style={{ paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#111827' }}>제품 관리</h1>
          <p style={{ color: '#6B7280', marginTop: '4px' }}>총 {products.length}개의 상품이 등록되어 있습니다.</p>
        </div>
        <button 
          onClick={() => { setCurrentProduct({ target_pet_type: 'dog', target_life_stage: [], product_health_concerns: [], has_risk_factors: [] }); setIsModalOpen(true); }}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', background: '#4F46E5', color: '#fff', 
            padding: '12px 24px', borderRadius: '14px', border: 'none', fontWeight: 800, cursor: 'pointer',
            boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.4)'
          }}
        >
          <Plus size={20} /> 신규 제품 등록
        </button>
      </div>

      <div
        style={{
          marginBottom: '24px',
          padding: '16px 18px',
          borderRadius: '18px',
          background: '#FFF7ED',
          border: '1px solid #FED7AA',
          color: '#9A3412',
        }}
      >
        <div style={{ fontSize: '13px', fontWeight: 900, marginBottom: '6px' }}>수동 검수 우선 운영 원칙</div>
        <div style={{ fontSize: '13px', lineHeight: 1.6, fontWeight: 600 }}>
          제품/브랜드/가격 정보는 자동 수집보다 사람 검수와 제조사 확인을 우선합니다.
          등록 전에는 브랜드, 제조사, 전성분, 급여 대상, 건강 태그를 교차 확인해 주세요.
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', marginBottom: '24px', paddingBottom: '8px' }}>
        {['전체', ...MAIN_CATEGORIES].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px', borderRadius: '12px', whiteSpace: 'nowrap', fontWeight: 700,
              fontSize: '14px', border: '1px solid', transition: '0.2s', cursor: 'pointer',
              backgroundColor: activeTab === tab ? '#111827' : '#fff',
              color: activeTab === tab ? '#fff' : '#4B5563',
              borderColor: activeTab === tab ? '#111827' : '#E5E7EB'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="action-bar" style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input 
            type="text" 
            placeholder="제품명 또는 브랜드로 검색하세요..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '14px 14px 14px 48px', borderRadius: '16px', border: '1px solid #E5E7EB', outline: 'none', fontSize: '15px' }}
          />
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '24px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', color: '#6B7280' }}>아이템</th>
              <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', color: '#6B7280' }}>카테고리</th>
              <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', color: '#6B7280' }}>타겟</th>
              <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', color: '#6B7280' }}>가격</th>
              <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '13px', color: '#6B7280' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '100px 0', color: '#9CA3AF' }}>데이터를 불러오는 중...</td></tr>
            ) : filteredProducts.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '100px 0', color: '#9CA3AF' }}>검색 결과가 없습니다.</td></tr>
            ) : (
              filteredProducts.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6', transition: '0.2s' }} className="hover:bg-gray-50">
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <img src={p.image_url} alt={p.name} style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #F1F5F9' }} />
                      <div>
                        <div style={{ fontWeight: 800, color: '#1F2937' }}>{p.name}</div>
                        <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{p.brand_name} • {p.id.substring(0,8)}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#4B5563' }}>{p.main_category}</div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{p.sub_category || '-'}</div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '8px', backgroundColor: '#EEF2FF', color: '#4F46E5', fontWeight: 800, textTransform: 'uppercase' }}>
                      {p.target_pet_type}
                    </span>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>{p.target_life_stage?.join(', ') || '전연령'}</div>
                  </td>
                  <td style={{ padding: '16px 24px', fontWeight: 800, color: '#111827' }}>₩{p.min_price.toLocaleString()}</td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={() => { setCurrentProduct(p); setIsModalOpen(true); }} style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#F3F4F6', border: 'none', cursor: 'pointer', color: '#4B5563' }}><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(p.id)} style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#FEE2E2', border: 'none', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Product Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="animate-scale-in" style={{ width: '90%', maxWidth: '700px', maxHeight: '90vh', backgroundColor: '#fff', borderRadius: '32px', padding: '40px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 900 }}>{currentProduct.id ? '제품 정보 수정' : '신규 제품 등록'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <Section label="제품 기본 정보">
                <Input label="제품명*" value={currentProduct.name} onChange={(v) => setCurrentProduct({...currentProduct, name: v})} />
                <Input label="브랜드*" value={currentProduct.brand_name} onChange={(v) => setCurrentProduct({...currentProduct, brand_name: v})} />
                <Input label="가격" type="number" value={currentProduct.min_price} onChange={(v) => setCurrentProduct({...currentProduct, min_price: parseInt(v)})} />
                <Input label="이미지 URL" value={currentProduct.image_url} onChange={(v) => setCurrentProduct({...currentProduct, image_url: v})} />
              </Section>

              <Section label="카테고리 & 분류">
                <Select label="메인 카테고리" value={currentProduct.main_category} options={MAIN_CATEGORIES} onChange={(v) => setCurrentProduct({...currentProduct, main_category: v})} />
                <Input label="서브 카테고리" value={currentProduct.sub_category} onChange={(v) => setCurrentProduct({...currentProduct, sub_category: v})} />
                <Input label="제형 (Dry, Wet, etc.)" value={currentProduct.formulation} onChange={(v) => setCurrentProduct({...currentProduct, formulation: v})} />
                <Select label="타겟 반려동물" value={currentProduct.target_pet_type} options={PET_TYPES} onChange={(v) => setCurrentProduct({...currentProduct, target_pet_type: v})} />
              </Section>
            </div>

            <div style={{ marginTop: '24px' }}>
              <Section label="상세 분석 메타데이터">
                <MultiChip label="생애주기" selected={currentProduct.target_life_stage || []} options={LIFE_STAGES} onToggle={(v) => toggleArrayField('target_life_stage', v)} />
                <div style={{ marginTop: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '8px' }}>건강 고민 태그 (컴마로 구분)</label>
                  <input 
                    type="text" 
                    value={currentProduct.product_health_concerns?.join(', ') || ''} 
                    onChange={(e) => setCurrentProduct({...currentProduct, product_health_concerns: e.target.value.split(',').map(s => s.trim())})}
                    placeholder="관절, 피부, 다이어트..."
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E5E7EB', outline: 'none' }}
                  />
                </div>
              </Section>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '40px' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '16px', borderRadius: '16px', border: '1px solid #E5E7EB', backgroundColor: '#fff', fontWeight: 700, cursor: 'pointer' }}>취소</button>
              <button onClick={handleSave} style={{ flex: 2, padding: '16px', borderRadius: '16px', backgroundColor: '#111827', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>저장하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function Section({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#4F46E5' }}>{label}</h3>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, type = 'text' }: { label: string, value?: string | number, onChange: (v: string) => void, type?: string }) {
  return (
    <div>
      <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '8px' }}>{label}</label>
      <input 
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E5E7EB', outline: 'none' }}
      />
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string, value?: string, options: string[], onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '8px' }}>{label}</label>
      <select 
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E5E7EB', outline: 'none', backgroundColor: '#fff' }}
      >
        <option value="">선택하세요</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

function MultiChip({ label, selected, options, onToggle }: { label: string, selected: string[], options: string[], onToggle: (v: string) => void }) {
  return (
    <div>
      <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '8px' }}>{label}</label>
      <div style={{ display: 'flex', gap: '8px' }}>
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            style={{
              padding: '8px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: 700,
              border: '1px solid', transition: '0.2s', cursor: 'pointer',
              backgroundColor: selected.includes(opt) ? '#EEF2FF' : '#fff',
              color: selected.includes(opt) ? '#4F46E5' : '#6B7280',
              borderColor: selected.includes(opt) ? '#C7D2FE' : '#E5E7EB'
            }}
          >
            {selected.includes(opt) && <Check size={12} style={{ marginRight: '4px' }} />}
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default AdminProducts;
