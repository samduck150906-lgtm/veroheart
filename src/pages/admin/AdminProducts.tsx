import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';
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
  '사료',
  '간식',
  '영양제',
  '구강관리',
  '피부·목욕·위생',
  '눈·귀 케어',
  '배변/위생',
  '생활용품',
];

const PET_TYPES = ['dog', 'cat', 'all'];

const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('전체');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      notify.error(`제품 조회 실패: ${error.message}`);
      setLoading(false);
      return;
    }

    setProducts((data || []) as Product[]);
    setLoading(false);
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brand_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTab = activeTab === '전체' || p.main_category === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [products, searchTerm, activeTab]);

  const openCreateModal = () => {
    setCurrentProduct({
      target_pet_type: 'dog',
      target_life_stage: [],
      product_health_concerns: [],
      has_risk_factors: [],
      min_price: 0,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!currentProduct.name || !currentProduct.brand_name) {
      notify.error('제품명과 브랜드는 필수입니다.');
      return;
    }

    const payload = {
      ...currentProduct,
      min_price: Number(currentProduct.min_price || 0),
      target_life_stage: currentProduct.target_life_stage || [],
      product_health_concerns: currentProduct.product_health_concerns || [],
      has_risk_factors: currentProduct.has_risk_factors || [],
    };

    try {
      if (currentProduct.id) {
        const { error } = await supabase.from('products').update(payload).eq('id', currentProduct.id);
        if (error) throw error;
        notify.success('제품 정보가 수정되었습니다.');
      } else {
        const { error } = await supabase.from('products').insert([payload]);
        if (error) throw error;
        notify.success('신규 제품이 등록되었습니다.');
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      notify.error(`저장 실패: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      notify.error(`삭제 실패: ${error.message}`);
      return;
    }
    notify.success('제품이 삭제되었습니다.');
    fetchProducts();
  };

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-title-wrap">
          <h2>제품 관리</h2>
          <p>총 {products.length.toLocaleString()}개 제품</p>
        </div>
        <button className="admin-btn-primary" onClick={openCreateModal}>
          <Plus size={16} />
          신규 제품 등록
        </button>
      </div>

      <div className="admin-filter-row">
        {['전체', ...MAIN_CATEGORIES].map((tab) => (
          <button
            key={tab}
            className={`admin-chip ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="admin-search-wrap">
        <Search size={16} className="admin-search-icon" />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="제품명, 브랜드 검색"
        />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>아이템</th>
              <th>카테고리</th>
              <th>타겟</th>
              <th>가격</th>
              <th style={{ textAlign: 'right' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>
                  <div className="admin-empty">데이터를 불러오는 중입니다...</div>
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="admin-empty">표시할 제품이 없습니다.</div>
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="admin-item-cell">
                      <img src={p.image_url} alt={p.name} />
                      <div>
                        <div className="admin-item-main">{p.name}</div>
                        <div className="admin-item-sub">
                          {p.brand_name} · {p.id.slice(0, 8)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>{p.main_category}</div>
                    <div className="admin-item-sub">{p.sub_category || '-'}</div>
                  </td>
                  <td>
                    <span className="admin-tag blue">{p.target_pet_type.toUpperCase()}</span>
                    <div className="admin-item-sub" style={{ marginTop: 6 }}>
                      {p.target_life_stage?.join(', ') || '전연령'}
                    </div>
                  </td>
                  <td>
                    <strong>₩{Number(p.min_price || 0).toLocaleString()}</strong>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="admin-actions">
                      <button
                        className="admin-icon-btn edit"
                        onClick={() => {
                          setCurrentProduct(p);
                          setIsModalOpen(true);
                        }}
                        aria-label="제품 수정"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="admin-icon-btn delete"
                        onClick={() => handleDelete(p.id)}
                        aria-label="제품 삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>{currentProduct.id ? '제품 정보 수정' : '신규 제품 등록'}</h3>
              <button className="admin-btn-soft" onClick={() => setIsModalOpen(false)} aria-label="모달 닫기">
                <X size={16} />
              </button>
            </div>

            <div className="admin-form-grid">
              <InputField
                label="제품명*"
                value={currentProduct.name}
                onChange={(value) => setCurrentProduct({ ...currentProduct, name: value })}
              />
              <InputField
                label="브랜드*"
                value={currentProduct.brand_name}
                onChange={(value) => setCurrentProduct({ ...currentProduct, brand_name: value })}
              />
              <InputField
                label="가격"
                type="number"
                value={currentProduct.min_price}
                onChange={(value) =>
                  setCurrentProduct({ ...currentProduct, min_price: Number(value || 0) })
                }
              />
              <InputField
                label="이미지 URL"
                value={currentProduct.image_url}
                onChange={(value) => setCurrentProduct({ ...currentProduct, image_url: value })}
              />
              <SelectField
                label="메인 카테고리"
                value={currentProduct.main_category}
                options={MAIN_CATEGORIES}
                onChange={(value) => setCurrentProduct({ ...currentProduct, main_category: value })}
              />
              <SelectField
                label="타겟 반려동물"
                value={currentProduct.target_pet_type}
                options={PET_TYPES}
                onChange={(value) => setCurrentProduct({ ...currentProduct, target_pet_type: value })}
              />
              <InputField
                label="서브 카테고리"
                value={currentProduct.sub_category}
                onChange={(value) => setCurrentProduct({ ...currentProduct, sub_category: value })}
              />
              <InputField
                label="제형"
                value={currentProduct.formulation}
                onChange={(value) => setCurrentProduct({ ...currentProduct, formulation: value })}
              />
              <InputField
                className="admin-form-span-2"
                label="건강 고민 태그 (콤마 구분)"
                value={currentProduct.product_health_concerns?.join(', ')}
                onChange={(value) =>
                  setCurrentProduct({
                    ...currentProduct,
                    product_health_concerns: value
                      .split(',')
                      .map((v) => v.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>

            <div className="admin-modal-footer">
              <button className="admin-btn-soft" onClick={() => setIsModalOpen(false)}>
                취소
              </button>
              <button className="admin-btn-primary" onClick={handleSave}>
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  className,
}: {
  label: string;
  value?: string | number;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={`admin-form-group ${className || ''}`}>
      <label>{label}</label>
      <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="admin-form-group">
      <label>{label}</label>
      <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">선택하세요</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export default AdminProducts;
