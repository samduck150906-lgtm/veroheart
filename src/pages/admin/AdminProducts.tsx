import React, { useMemo, useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  Package,
  ShieldCheck,
  Link2,
  Factory,
} from 'lucide-react';
import { notify } from '../../store/useNotification';
import {
  AdminBadge,
  AdminButton,
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminSearchField,
  AdminSectionCard,
  AdminToolbar,
} from '../../components/admin/AdminUI';

interface Product {
  id: string;
  name: string;
  brand_name: string;
  manufacturer_name?: string;
  product_type: string;
  main_category: string;
  sub_category?: string;
  target_pet_type: string;
  target_life_stage?: string[];
  formulation?: string;
  product_health_concerns?: string[];
  has_risk_factors?: string[];
  verification_status?: 'pending' | 'verified' | 'needs_review';
  verified_at?: string | null;
  coupang_product_id?: string | null;
  image_url: string;
  min_price: number;
}

const MAIN_CATEGORIES = [
  '사료', '간식', '영양제', '구강관리', '피부·목욕·위생', '눈·귀 케어', '배변/위생', '생활용품'
];

const LIFE_STAGES = ['퍼피·키튼', '성체', '시니어'];
const PET_TYPES = ['dog', 'cat', 'all'];
const VERIFICATION_OPTIONS = [
  { value: 'pending', label: '검수 대기' },
  { value: 'verified', label: '검수 완료' },
  { value: 'needs_review', label: '재검토 필요' },
] as const;

const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      notify.error(`저장 실패: ${msg}`);
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

  const productMetrics = useMemo(() => {
    const verifiedCount = products.filter((product) => product.verification_status === 'verified').length;
    const pendingCount = products.filter((product) => product.verification_status !== 'verified').length;
    const linkedCount = products.filter((product) => !!product.coupang_product_id).length;
    const manufacturerCount = products.filter((product) => !!product.manufacturer_name?.trim()).length;

    return {
      verifiedCount,
      pendingCount,
      linkedCount,
      manufacturerCount,
    };
  }, [products]);

  return (
    <div className="admin-products animate-fade-in">
      <AdminPageHeader
        eyebrow="catalog operations"
        title="제품 관리"
        description="제품 카탈로그, 제조사, 검수 상태, 외부 구매 연결을 한 화면에서 운영합니다."
        actions={(
          <AdminButton
            onClick={() => {
              setCurrentProduct({
                target_pet_type: 'dog',
                target_life_stage: [],
                product_health_concerns: [],
                has_risk_factors: [],
                verification_status: 'pending',
              });
              setIsModalOpen(true);
            }}
          >
            <Plus size={18} />
            신규 제품 등록
          </AdminButton>
        )}
      />

      <div className="admin-metrics-grid admin-metrics-grid-four">
        <AdminMetricCard
          label="전체 제품"
          value={products.length.toLocaleString()}
          delta="catalog"
          icon={<Package size={22} />}
          tone="indigo"
          footnote="현재 등록된 카탈로그 총계"
        />
        <AdminMetricCard
          label="검수 완료"
          value={productMetrics.verifiedCount.toLocaleString()}
          delta="trusted"
          icon={<ShieldCheck size={22} />}
          tone="emerald"
          footnote="추천 우선 노출 대상"
        />
        <AdminMetricCard
          label="검수 대기/재검토"
          value={productMetrics.pendingCount.toLocaleString()}
          delta="review"
          icon={<Factory size={22} />}
          tone="amber"
          footnote="사람 검수 필요 항목"
        />
        <AdminMetricCard
          label="쿠팡 연결"
          value={productMetrics.linkedCount.toLocaleString()}
          delta="affiliate"
          icon={<Link2 size={22} />}
          tone="rose"
          footnote="상품 ID 직접 연결 완료"
        />
      </div>

      <div className="admin-dashboard-grid admin-dashboard-grid-wide" style={{ marginTop: '24px' }}>
        <AdminSectionCard
          title="검수 운영 원칙"
          description="자동 수집보다 사람 검수와 제조사 대조를 우선하는 운영 원칙입니다."
        >
          <div className="admin-info-banner admin-info-banner-amber">
            <div className="admin-info-banner-title">수동 검수 우선 카탈로그</div>
            <p>
              제품 등록 전 브랜드, 제조사, 전성분, 급여 대상, 건강 태그, 외부 구매 연결 값을
              교차 확인하세요. 검수 완료 상태만 추천 우선순위에 반영됩니다.
            </p>
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title="데이터 완성도"
          description="운영상 중요한 카탈로그 메타데이터 채움 정도를 추적합니다."
        >
          <div className="admin-inline-stats-grid">
            <div className="admin-inline-stat">
              <div className="admin-inline-stat-label">제조사 입력 완료</div>
              <div className="admin-inline-stat-value">{productMetrics.manufacturerCount.toLocaleString()}</div>
              <div className="admin-inline-stat-hint">브랜드 신뢰 검증에 사용</div>
            </div>
            <div className="admin-inline-stat">
              <div className="admin-inline-stat-label">쿠팡 상품 연결</div>
              <div className="admin-inline-stat-value">{productMetrics.linkedCount.toLocaleString()}</div>
              <div className="admin-inline-stat-hint">외부 구매 전환 가능</div>
            </div>
          </div>
        </AdminSectionCard>
      </div>

      <AdminSectionCard
        title="제품 카탈로그"
        description="브랜드, 제조사, 검수 상태, 대상 종, 외부 구매 연결 정보를 데스크톱 테이블로 관리합니다."
        style={{ marginTop: '24px' }}
      >
        <AdminToolbar
          left={(
            <>
              <AdminSearchField
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="제품명 또는 브랜드로 검색"
              />
              <div className="admin-chip-row">
                {['전체', ...MAIN_CATEGORIES].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={activeTab === tab ? 'admin-filter-chip active' : 'admin-filter-chip'}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </>
          )}
          right={(
            <div className="admin-table-meta">
              <span>노출 제품 {filteredProducts.length}개</span>
            </div>
          )}
        />

        <div className="admin-table-shell">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>아이템</th>
                <th>카테고리</th>
                <th>대상</th>
                <th>검수</th>
                <th>쿠팡 연결</th>
                <th>가격</th>
                <th className="align-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}>
                    <div className="admin-table-loading">데이터를 불러오는 중...</div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <AdminEmptyState
                      title="조건에 맞는 제품이 없습니다."
                      description="검색어를 바꾸거나 카테고리 필터를 조정해 다시 확인해 보세요."
                    />
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="admin-table-item">
                        <img src={product.image_url} alt={product.name} />
                        <div>
                          <div className="admin-table-item-title">{product.name}</div>
                          <div className="admin-table-item-subtitle">
                            {product.brand_name} · {product.id.substring(0, 8)}
                          </div>
                          <div className="admin-table-item-meta">
                            {product.manufacturer_name || '제조사 미입력'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="admin-table-primary">{product.main_category}</div>
                      <div className="admin-table-secondary">{product.sub_category || '-'}</div>
                    </td>
                    <td>
                      <AdminBadge tone="indigo">{product.target_pet_type}</AdminBadge>
                      <div className="admin-table-secondary" style={{ marginTop: '6px' }}>
                        {product.target_life_stage?.join(', ') || '전연령'}
                      </div>
                    </td>
                    <td>
                      <VerificationBadge status={product.verification_status} />
                      <div className="admin-table-secondary" style={{ marginTop: '6px' }}>
                        {product.verified_at ? new Date(product.verified_at).toLocaleDateString() : '검수일 없음'}
                      </div>
                    </td>
                    <td>
                      {product.coupang_product_id ? (
                        <>
                          <AdminBadge tone="emerald">연결 완료</AdminBadge>
                          <div className="admin-table-secondary" style={{ marginTop: '6px' }}>
                            {product.coupang_product_id}
                          </div>
                        </>
                      ) : (
                        <AdminBadge tone="slate">미연결</AdminBadge>
                      )}
                    </td>
                    <td className="admin-table-primary">₩{product.min_price.toLocaleString()}</td>
                    <td className="align-right">
                      <div className="admin-table-actions">
                        <button
                          type="button"
                          className="admin-icon-btn"
                          onClick={() => {
                            setCurrentProduct(product);
                            setIsModalOpen(true);
                          }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          className="admin-icon-btn danger"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminSectionCard>

      {/* Product Modal */}
      {isModalOpen && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal admin-modal-wide animate-scale-in">
            <div className="admin-modal-head">
              <div>
                <div className="admin-page-eyebrow">catalog editor</div>
                <h2 className="admin-modal-title">{currentProduct.id ? '제품 정보 수정' : '신규 제품 등록'}</h2>
              </div>
              <button type="button" className="admin-icon-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="admin-form-grid">
              <Section label="제품 기본 정보">
                <Input label="제품명*" value={currentProduct.name} onChange={(v) => setCurrentProduct({...currentProduct, name: v})} />
                <Input label="브랜드*" value={currentProduct.brand_name} onChange={(v) => setCurrentProduct({...currentProduct, brand_name: v})} />
                <Input label="제조사" value={currentProduct.manufacturer_name} onChange={(v) => setCurrentProduct({...currentProduct, manufacturer_name: v})} />
                <Input label="가격" type="number" value={currentProduct.min_price} onChange={(v) => setCurrentProduct({...currentProduct, min_price: parseInt(v)})} />
                <Input label="이미지 URL" value={currentProduct.image_url} onChange={(v) => setCurrentProduct({...currentProduct, image_url: v})} />
              </Section>

              <Section label="카테고리 & 분류">
                <Select label="메인 카테고리" value={currentProduct.main_category} options={MAIN_CATEGORIES} onChange={(v) => setCurrentProduct({...currentProduct, main_category: v})} />
                <Input label="서브 카테고리" value={currentProduct.sub_category} onChange={(v) => setCurrentProduct({...currentProduct, sub_category: v})} />
                <Input label="제형 (Dry, Wet, etc.)" value={currentProduct.formulation} onChange={(v) => setCurrentProduct({...currentProduct, formulation: v})} />
                <Select label="타겟 반려동물" value={currentProduct.target_pet_type} options={PET_TYPES} onChange={(v) => setCurrentProduct({...currentProduct, target_pet_type: v})} />
                <Select
                  label="검수 상태"
                  value={currentProduct.verification_status}
                  options={VERIFICATION_OPTIONS.map((option) => option.value)}
                  labels={Object.fromEntries(VERIFICATION_OPTIONS.map((option) => [option.value, option.label]))}
                  onChange={(v) =>
                    setCurrentProduct({
                      ...currentProduct,
                      verification_status: v as Product['verification_status'],
                      verified_at: v === 'verified' ? (currentProduct.verified_at || new Date().toISOString()) : currentProduct.verified_at ?? null,
                    })
                  }
                />
              </Section>
            </div>

            <div style={{ marginTop: '24px' }}>
              <Section label="상세 분석 메타데이터">
                <MultiChip label="생애주기" selected={currentProduct.target_life_stage || []} options={LIFE_STAGES} onToggle={(v) => toggleArrayField('target_life_stage', v)} />
                <div style={{ marginTop: '16px' }}>
                  <label className="admin-field-label">건강 고민 태그 (컴마로 구분)</label>
                  <input 
                    type="text" 
                    value={currentProduct.product_health_concerns?.join(', ') || ''} 
                    onChange={(e) => setCurrentProduct({...currentProduct, product_health_concerns: e.target.value.split(',').map(s => s.trim())})}
                    placeholder="관절, 피부, 다이어트..."
                    className="admin-text-input"
                  />
                </div>
                <div style={{ marginTop: '16px' }}>
                  <Input
                    label="쿠팡 상품 ID"
                    value={currentProduct.coupang_product_id}
                    onChange={(v) => setCurrentProduct({ ...currentProduct, coupang_product_id: v })}
                  />
                  <p className="admin-field-help">
                    입력하면 제품 상세에서 쿠팡 검색 대신 해당 상품으로 직접 연결합니다.
                  </p>
                </div>
              </Section>
            </div>

            <div className="admin-modal-actions">
              <AdminButton variant="secondary" onClick={() => setIsModalOpen(false)} style={{ flex: 1 }}>
                취소
              </AdminButton>
              <AdminButton onClick={handleSave} style={{ flex: 2 }}>
                저장하기
              </AdminButton>
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
      <h3 className="admin-section-title" style={{ fontSize: '15px' }}>{label}</h3>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, type = 'text' }: { label: string, value?: string | number, onChange: (v: string) => void, type?: string }) {
  return (
    <div>
      <label className="admin-field-label">{label}</label>
      <input 
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="admin-text-input"
      />
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
  labels,
}: {
  label: string,
  value?: string,
  options: string[],
  onChange: (v: string) => void,
  labels?: Record<string, string>,
}) {
  return (
    <div>
      <label className="admin-field-label">{label}</label>
      <select 
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="admin-text-input"
      >
        <option value="">선택하세요</option>
        {options.map(opt => <option key={opt} value={opt}>{labels?.[opt] || opt}</option>)}
      </select>
    </div>
  );
}

function VerificationBadge({ status }: { status?: Product['verification_status'] }) {
  if (status === 'verified') return <AdminBadge tone="emerald">검수 완료</AdminBadge>;
  if (status === 'needs_review') return <AdminBadge tone="rose">재검토 필요</AdminBadge>;
  return <AdminBadge tone="amber">검수 대기</AdminBadge>;
}

function MultiChip({ label, selected, options, onToggle }: { label: string, selected: string[], options: string[], onToggle: (v: string) => void }) {
  return (
    <div>
      <label className="admin-field-label">{label}</label>
      <div className="admin-chip-row">
        {options.map(opt => (
          <button
            type="button"
            key={opt}
            onClick={() => onToggle(opt)}
            className={selected.includes(opt) ? 'admin-filter-chip active' : 'admin-filter-chip'}
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
