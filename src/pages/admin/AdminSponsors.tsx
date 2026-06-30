import React, { useEffect, useState, useCallback } from 'react';
import { Megaphone, Search, ToggleLeft, ToggleRight, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { setSponsoredProduct } from '../../lib/supabase';
import { notify } from '../../store/useNotification';

type SponsorRow = {
  id: string;
  name: string;
  brand_name: string;
  product_type: string;
  is_sponsored: boolean;
  sponsor_label: string;
  sponsor_order: number;
  min_price: number | null;
  image_url: string | null;
};

const AdminSponsors: React.FC = () => {
  const [products, setProducts] = useState<SponsorRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('id, name, brand_name, product_type, is_sponsored, sponsor_label, sponsor_order, min_price, image_url')
      .order('is_sponsored', { ascending: false })
      .order('sponsor_order', { ascending: true })
      .order('name', { ascending: true })
      .limit(500);
    setLoading(false);
    if (error) {
      notify.error('상품 목록을 불러오지 못했습니다.');
      return;
    }
    setProducts((data || []).map(p => ({
      ...p,
      is_sponsored: p.is_sponsored ?? false,
      sponsor_label: p.sponsor_label ?? '광고',
      sponsor_order: p.sponsor_order ?? 0,
    })));
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleToggleSponsored = async (p: SponsorRow) => {
    setSavingId(p.id);
    const next = !p.is_sponsored;
    await setSponsoredProduct(p.id, next, p.sponsor_label, p.sponsor_order);
    setProducts(prev => prev.map(r => r.id === p.id ? { ...r, is_sponsored: next } : r));
    notify.success(next ? `"${p.name}" 스폰서 등록 완료` : `"${p.name}" 스폰서 해제`);
    setSavingId(null);
  };

  const handleLabelChange = async (p: SponsorRow, label: string) => {
    setProducts(prev => prev.map(r => r.id === p.id ? { ...r, sponsor_label: label } : r));
    if (p.is_sponsored) {
      await setSponsoredProduct(p.id, true, label, p.sponsor_order);
    }
  };

  const handleOrderChange = async (p: SponsorRow, delta: number) => {
    const next = Math.max(0, p.sponsor_order + delta);
    setProducts(prev => prev.map(r => r.id === p.id ? { ...r, sponsor_order: next } : r));
    if (p.is_sponsored) {
      await setSponsoredProduct(p.id, true, p.sponsor_label, next);
    }
  };

  const sponsored = products.filter(p => p.is_sponsored);
  const filtered = products.filter(p =>
    !search || p.name.includes(search) || p.brand_name.includes(search)
  );

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <Megaphone size={20} color="#3B82F6" />
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>스폰서 슬롯 관리</h2>
          <p style={{ margin: 0, fontSize: 12, color: '#6B7280', marginTop: 2 }}>
            스폰서 상품은 랭킹 추천 알고리즘과 완전 분리되어, 하단 광고 영역에만 노출됩니다. 반드시 "광고" 표시가 함께 노출됩니다.
          </p>
        </div>
      </div>

      {/* 광고 정책 안내 */}
      <div style={{
        padding: '12px 16px', borderRadius: 10,
        background: '#FEF3C7', border: '1px solid #F59E0B',
        marginBottom: 24, fontSize: 13, color: '#92400E', lineHeight: 1.6,
      }}>
        <strong>📋 광고 정책</strong><br />
        • 스폰서 상품은 추천 피드 하단에 별도 "스폰서" 섹션으로 완전 분리 표시됩니다.<br />
        • 스폰서 노출은 일반 추천 순위에 영향을 주지 않습니다.<br />
        • "광고" 또는 "스폰서" 레이블이 반드시 표시되어야 합니다.
      </div>

      {/* 현재 스폰서 현황 */}
      <div style={{
        padding: '14px 16px', borderRadius: 12,
        background: sponsored.length > 0 ? '#EFF6FF' : '#F9FAFB',
        border: `1px solid ${sponsored.length > 0 ? '#3B82F6' : '#E5E7EB'}`,
        marginBottom: 24,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: sponsored.length > 0 ? '#1D4ED8' : '#6B7280', marginBottom: 8 }}>
          현재 스폰서 상품 {sponsored.length}개 운영 중
        </div>
        {sponsored.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {sponsored
              .sort((a, b) => a.sponsor_order - b.sponsor_order)
              .map((p, i) => (
                <div key={p.id} style={{ fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: '#6B7280', width: 16 }}>{i + 1}</span>
                  <span style={{ fontWeight: 600 }}>{p.brand_name}</span>
                  <span>{p.name}</span>
                  <span style={{
                    padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                    background: '#DBEAFE', color: '#1D4ED8',
                  }}>{p.sponsor_label}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* 검색 */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="상품명 또는 브랜드 검색..."
          style={{
            width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10,
            border: '1px solid #E5E7EB', fontSize: 14, outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* 상품 테이블 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6B7280' }}>불러오는 중...</div>
      ) : (
        <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>상품</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>카테고리</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>스폰서</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>레이블</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>순서</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => (
                <tr
                  key={p.id}
                  style={{
                    borderBottom: '1px solid #F3F4F6',
                    background: p.is_sponsored ? '#EFF6FF' : idx % 2 === 0 ? '#fff' : '#FAFAFA',
                  }}
                >
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>{p.brand_name}</div>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#6B7280' }}>{p.product_type}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleToggleSponsored(p)}
                      disabled={savingId === p.id}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: savingId === p.id ? 0.5 : 1 }}
                    >
                      {p.is_sponsored
                        ? <ToggleRight size={28} color="#3B82F6" />
                        : <ToggleLeft size={28} color="#D1D5DB" />
                      }
                    </button>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <select
                      value={p.sponsor_label}
                      onChange={e => handleLabelChange(p, e.target.value)}
                      disabled={!p.is_sponsored}
                      style={{
                        padding: '4px 8px', borderRadius: 6, border: '1px solid #E5E7EB',
                        fontSize: 12, fontWeight: 600, cursor: p.is_sponsored ? 'pointer' : 'not-allowed',
                        background: p.is_sponsored ? '#fff' : '#F9FAFB', color: p.is_sponsored ? '#111827' : '#9CA3AF',
                      }}
                    >
                      <option value="광고">광고</option>
                      <option value="스폰서">스폰서</option>
                      <option value="AD">AD</option>
                      <option value="파트너">파트너</option>
                    </select>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                      <button
                        onClick={() => handleOrderChange(p, -1)}
                        disabled={!p.is_sponsored || p.sponsor_order === 0}
                        style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 4, cursor: 'pointer', padding: '2px 4px', opacity: p.is_sponsored ? 1 : 0.3 }}
                      >
                        <ChevronUp size={12} />
                      </button>
                      <span style={{ fontSize: 13, fontWeight: 700, width: 20, textAlign: 'center', color: p.is_sponsored ? '#111827' : '#9CA3AF' }}>
                        {p.is_sponsored ? p.sponsor_order + 1 : '—'}
                      </span>
                      <button
                        onClick={() => handleOrderChange(p, 1)}
                        disabled={!p.is_sponsored}
                        style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 4, cursor: 'pointer', padding: '2px 4px', opacity: p.is_sponsored ? 1 : 0.3 }}
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>
                    검색 결과가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminSponsors;
