import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Edit2, Trash2, X, Upload, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { notify } from '../../store/useNotification';
import ProductIngredientsEditor from './ProductIngredientsEditor';
import {
  deleteProduct as deleteProductApi,
  fetchProductIngredients,
  fetchProductsPage,
  saveProduct as saveProductApi,
  uploadProductImage,
  validateProductImage,
  type AdminProductRow,
  type ProductIngredientLink,
} from '../../lib/adminApi';

interface ProductForm {
  id?: string;
  name?: string;
  brand_name?: string;
  product_type?: string;
  main_category?: string;
  sub_category?: string;
  target_pet_type?: string;
  target_life_stage?: string[];
  formulation?: string;
  product_health_concerns?: string[];
  has_risk_factors?: string[];
  image_url?: string;
  min_price?: number;
  barcode?: string;
  kcal_per_100g?: number;
}

/** nutritional_profiles(보장성분) 입력 폼 — 값은 문자열로 다루고 저장 시 숫자로 변환 */
type NutritionForm = {
  crude_protein: string;
  crude_fat: string;
  crude_fiber: string;
  crude_ash: string;
  moisture: string;
  calcium: string;
  phosphorus: string;
};

const EMPTY_NUTRITION: NutritionForm = {
  crude_protein: '', crude_fat: '', crude_fiber: '', crude_ash: '', moisture: '', calcium: '', phosphorus: '',
};

const NUTRITION_FIELDS: { key: keyof NutritionForm; label: string }[] = [
  { key: 'crude_protein', label: '조단백질 (%)' },
  { key: 'crude_fat', label: '조지방 (%)' },
  { key: 'crude_fiber', label: '조섬유 (%)' },
  { key: 'crude_ash', label: '조회분 (%)' },
  { key: 'moisture', label: '수분 (%)' },
  { key: 'calcium', label: '칼슘 (%)' },
  { key: 'phosphorus', label: '인 (%)' },
];

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
const PAGE_SIZE = 20;

const AdminProducts: React.FC = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('전체');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<ProductForm>({});
  const [nutrition, setNutrition] = useState<NutritionForm>(EMPTY_NUTRITION);
  const [ingredientLinks, setIngredientLinks] = useState<ProductIngredientLink[]>([]);
  const [ingredientsLoading, setIngredientsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [uploading, setUploading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminProductRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // 검색어 디바운스 — 입력할 때마다 서버를 때리지 않는다.
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1); // 검색 조건이 바뀌면 항상 1페이지부터
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchInput]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { rows, total: count } = await fetchProductsPage({
        page,
        pageSize: PAGE_SIZE,
        search,
        category: activeTab,
      });
      setProducts(rows);
      setTotal(count);
      // 삭제 등으로 현재 페이지가 비면 이전 페이지로 이동
      if (rows.length === 0 && count > 0 && page > 1) {
        setPage((p) => Math.max(1, p - 1));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLoadError(message);
      notify.error(`제품 조회 실패: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeTab]);

  useEffect(() => {
    // 페이지/검색/카테고리 변경 시 서버에서 다시 조회한다.
    loadProducts();
  }, [loadProducts]);

  const selectTab = (tab: string) => {
    setActiveTab(tab);
    setPage(1); // 카테고리 변경 시 1페이지 초기화
  };

  const openCreateModal = () => {
    setCurrentProduct({
      target_pet_type: 'dog',
      target_life_stage: [],
      product_health_concerns: [],
      has_risk_factors: [],
      min_price: 0,
    });
    setNutrition(EMPTY_NUTRITION);
    setIngredientLinks([]);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = async (row: AdminProductRow) => {
    setFormError('');
    setNutrition(EMPTY_NUTRITION);
    setIngredientLinks([]);
    setIsModalOpen(true);
    setIngredientsLoading(true);

    // 목록은 경량 컬럼만 조회하므로, 편집 시 전체 필드를 다시 읽는다.
    const [{ data: full }, { data: np }] = await Promise.all([
      supabase.from('products').select('*').eq('id', row.id).maybeSingle(),
      supabase.from('nutritional_profiles').select('*').eq('product_id', row.id).maybeSingle(),
    ]);

    setCurrentProduct((full ?? row) as ProductForm);

    if (np) {
      const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));
      setNutrition({
        crude_protein: s(np.crude_protein),
        crude_fat: s(np.crude_fat),
        crude_fiber: s(np.crude_fiber),
        crude_ash: s(np.crude_ash),
        moisture: s(np.moisture),
        calcium: s(np.calcium),
        phosphorus: s(np.phosphorus),
      });
    }

    try {
      setIngredientLinks(await fetchProductIngredients(row.id));
    } catch (err) {
      notify.error(`원재료 조회 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIngredientsLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    const invalid = validateProductImage(file);
    if (invalid) {
      notify.error(invalid);
      return;
    }
    setUploading(true);
    try {
      const publicUrl = await uploadProductImage(file, currentProduct.id);
      setCurrentProduct((prev) => ({ ...prev, image_url: publicUrl }));
      notify.success('이미지가 업로드되었습니다.');
    } catch (err) {
      notify.error(`이미지 업로드 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!currentProduct.name?.trim() || !currentProduct.brand_name?.trim()) {
      setFormError('제품명과 브랜드는 필수입니다.');
      return;
    }

    const normalizeCommaValues = (value?: string[] | string) =>
      (Array.isArray(value) ? value : (value || '').split(','))
        .map((v) => String(v).trim())
        .filter(Boolean);

    const payload = {
      ...currentProduct,
      name: (currentProduct.name || '').trim(),
      brand_name: (currentProduct.brand_name || '').trim(),
      main_category: (currentProduct.main_category || '').trim(),
      sub_category: (currentProduct.sub_category || '').trim() || null,
      formulation: (currentProduct.formulation || '').trim() || null,
      target_pet_type: (currentProduct.target_pet_type || 'dog').trim(),
      image_url: (currentProduct.image_url || '').trim(),
      // 빈 문자열은 부분 유니크 인덱스에서 충돌하므로 null로 정규화
      barcode: (currentProduct.barcode || '').trim() || null,
      kcal_per_100g:
        Number.isFinite(Number(currentProduct.kcal_per_100g)) && Number(currentProduct.kcal_per_100g) > 0
          ? Number(currentProduct.kcal_per_100g)
          : null,
      min_price: Number.isFinite(Number(currentProduct.min_price)) ? Math.max(0, Number(currentProduct.min_price)) : 0,
      target_life_stage: normalizeCommaValues(currentProduct.target_life_stage),
      product_health_concerns: normalizeCommaValues(currentProduct.product_health_concerns),
      has_risk_factors: normalizeCommaValues(currentProduct.has_risk_factors),
    };

    // 보장성분: 입력값이 하나라도 있을 때만 함께 전송(숫자로 변환)
    const hasNutrition = NUTRITION_FIELDS.some(({ key }) => nutrition[key].trim() !== '');
    const num = (s: string) => {
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : 0;
    };
    const nutritionPayload = hasNutrition
      ? {
          crude_protein: num(nutrition.crude_protein),
          crude_fat: num(nutrition.crude_fat),
          crude_fiber: num(nutrition.crude_fiber),
          crude_ash: num(nutrition.crude_ash),
          moisture: num(nutrition.moisture),
          calcium: num(nutrition.calcium),
          phosphorus: num(nutrition.phosphorus),
        }
      : null;

    setIsSaving(true);
    setFormError('');
    try {
      // anon 키로는 RLS에 막히므로 service_role Edge Function 프록시로 쓴다.
      // 제품 저장과 원재료 연결 교체는 같은 요청 안에서 처리된다(RPC 트랜잭션).
      await saveProductApi({
        product: payload,
        nutrition: nutritionPayload,
        ingredients: ingredientLinks.map((link, index) => ({
          ingredient_id: link.ingredientId,
          sort_order: index,
        })),
      });
      notify.success(currentProduct.id ? '제품 정보가 수정되었습니다.' : '신규 제품이 등록되었습니다.');
      setIsModalOpen(false);
      await loadProducts();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setFormError(message);
      notify.error(`저장 실패: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteProductApi(deleteTarget.id);
      notify.success('제품이 삭제되었습니다.');
      setDeleteTarget(null);
      await loadProducts();
    } catch (err) {
      notify.error(`삭제 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const rangeLabel = useMemo(() => {
    if (total === 0) return '0';
    const from = (page - 1) * PAGE_SIZE + 1;
    const to = Math.min(page * PAGE_SIZE, total);
    return `${from.toLocaleString()}–${to.toLocaleString()}`;
  }, [page, total]);

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-title-wrap">
          <h2>제품 관리</h2>
          <p>
            총 {total.toLocaleString()}개 제품 · {rangeLabel} 표시 중
          </p>
        </div>
        <button type="button" className="admin-btn-primary" onClick={openCreateModal}>
          <Plus size={16} />
          신규 제품 등록
        </button>
      </div>

      <div className="admin-filter-row">
        {['전체', ...MAIN_CATEGORIES].map((tab) => (
          <button
            type="button"
            key={tab}
            className={`admin-chip ${activeTab === tab ? 'active' : ''}`}
            onClick={() => selectTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="admin-search-wrap">
        <Search size={16} className="admin-search-icon" />
        <label htmlFor="admin-product-search" className="admin-visually-hidden">
          제품명, 브랜드 검색
        </label>
        <input
          id="admin-product-search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
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
            ) : loadError ? (
              <tr>
                <td colSpan={5}>
                  <div className="admin-empty">
                    제품을 불러오지 못했습니다.
                    <button type="button" className="admin-btn-soft" style={{ marginLeft: 10 }} onClick={loadProducts}>
                      다시 시도
                    </button>
                  </div>
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="admin-empty">
                    {search || activeTab !== '전체'
                      ? '검색 조건에 맞는 제품이 없습니다.'
                      : '등록된 제품이 없습니다. "신규 제품 등록"으로 시작해 주세요.'}
                  </div>
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="admin-item-cell">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" loading="lazy" decoding="async" />
                      ) : (
                        <div className="admin-thumb-empty" aria-hidden="true" />
                      )}
                      <div>
                        <div className="admin-item-main">{p.name}</div>
                        <div className="admin-item-sub">
                          {p.brand_name} · {p.id.slice(0, 8)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>{p.main_category || '-'}</div>
                    <div className="admin-item-sub">{p.sub_category || '-'}</div>
                  </td>
                  <td>
                    <span className="admin-tag blue">{(p.target_pet_type || 'all').toUpperCase()}</span>
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
                        type="button"
                        className="admin-icon-btn edit"
                        onClick={() => openEditModal(p)}
                        aria-label={`${p.name} 수정`}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="admin-icon-btn delete"
                        onClick={() => setDeleteTarget(p)}
                        aria-label={`${p.name} 삭제`}
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

      <nav className="admin-pagination" aria-label="제품 목록 페이지">
        <button
          type="button"
          className="admin-btn-soft"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1 || loading}
          aria-label="이전 페이지"
        >
          <ChevronLeft size={14} /> 이전
        </button>
        <span className="admin-pagination-label">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className="admin-btn-soft"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages || loading}
          aria-label="다음 페이지"
        >
          다음 <ChevronRight size={14} />
        </button>
      </nav>

      {isModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => !isSaving && setIsModalOpen(false)}>
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-label={currentProduct.id ? '제품 정보 수정' : '신규 제품 등록'}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>{currentProduct.id ? '제품 정보 수정' : '신규 제품 등록'}</h3>
              <button
                type="button"
                className="admin-btn-soft"
                onClick={() => setIsModalOpen(false)}
                aria-label="모달 닫기"
                disabled={isSaving}
              >
                <X size={16} />
              </button>
            </div>

            <div className="admin-form-grid">
              <InputField
                id="pf-name"
                label="제품명*"
                value={currentProduct.name}
                onChange={(value) => setCurrentProduct({ ...currentProduct, name: value })}
              />
              <InputField
                id="pf-brand"
                label="브랜드*"
                value={currentProduct.brand_name}
                onChange={(value) => setCurrentProduct({ ...currentProduct, brand_name: value })}
              />
              <InputField
                id="pf-price"
                label="가격"
                type="number"
                value={currentProduct.min_price}
                onChange={(value) => setCurrentProduct({ ...currentProduct, min_price: Number(value || 0) })}
              />
              <InputField
                id="pf-barcode"
                label="바코드 (EAN/UPC)"
                value={currentProduct.barcode}
                onChange={(value) => setCurrentProduct({ ...currentProduct, barcode: value })}
              />

              {/* 이미지: 업로드가 기본, 외부 URL 직접 입력은 보조 수단으로 유지 */}
              <div className="admin-form-group admin-form-span-2">
                <span className="admin-form-legend">제품 이미지</span>
                <div className="admin-image-row">
                  {currentProduct.image_url ? (
                    <img className="admin-image-preview" src={currentProduct.image_url} alt="제품 이미지 미리보기" />
                  ) : (
                    <div className="admin-image-preview admin-thumb-empty" aria-hidden="true" />
                  )}
                  <div style={{ flex: 1 }}>
                    <input
                      ref={fileInputRef}
                      id="pf-image-file"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="admin-visually-hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(file);
                      }}
                    />
                    <button
                      type="button"
                      className="admin-btn-soft"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || isSaving}
                    >
                      <Upload size={14} /> {uploading ? '업로드 중…' : '이미지 업로드'}
                    </button>
                    {currentProduct.image_url && (
                      <button
                        type="button"
                        className="admin-btn-soft"
                        style={{ marginLeft: 8 }}
                        onClick={() => setCurrentProduct({ ...currentProduct, image_url: '' })}
                        disabled={uploading || isSaving}
                      >
                        이미지 제거
                      </button>
                    )}
                    <label htmlFor="pf-image-url" className="admin-inline-label">
                      또는 이미지 URL 직접 입력
                    </label>
                    <input
                      id="pf-image-url"
                      value={currentProduct.image_url ?? ''}
                      onChange={(e) => setCurrentProduct({ ...currentProduct, image_url: e.target.value })}
                      placeholder="https://..."
                    />
                    <p className="admin-hint">JPG · PNG · WebP, 최대 3MB. 업로드 시 긴 변 1200px로 축소됩니다.</p>
                  </div>
                </div>
              </div>

              <SelectField
                id="pf-main-cat"
                label="메인 카테고리"
                value={currentProduct.main_category}
                options={MAIN_CATEGORIES}
                onChange={(value) => setCurrentProduct({ ...currentProduct, main_category: value })}
              />
              <SelectField
                id="pf-pet-type"
                label="타겟 반려동물"
                value={currentProduct.target_pet_type}
                options={PET_TYPES}
                onChange={(value) => setCurrentProduct({ ...currentProduct, target_pet_type: value })}
              />
              <InputField
                id="pf-sub-cat"
                label="서브 카테고리"
                value={currentProduct.sub_category}
                onChange={(value) => setCurrentProduct({ ...currentProduct, sub_category: value })}
              />
              <InputField
                id="pf-formulation"
                label="제형"
                value={currentProduct.formulation}
                onChange={(value) => setCurrentProduct({ ...currentProduct, formulation: value })}
              />
              <InputField
                id="pf-concerns"
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

              {/* 원재료 구성 — 분석 엔진의 핵심 입력 */}
              <div className="admin-form-span-2">
                {ingredientsLoading ? (
                  <div className="admin-empty">원재료를 불러오는 중입니다…</div>
                ) : (
                  <ProductIngredientsEditor
                    value={ingredientLinks}
                    onChange={setIngredientLinks}
                    disabled={isSaving}
                    onRequestCreateIngredient={() => navigate('/admin/ingredients')}
                  />
                )}
              </div>

              {/* 보장성분(영양) — 입력 시 분석 결과가 "실측"으로 표시됨 */}
              <div className="admin-form-span-2 admin-form-legend" style={{ marginTop: 8 }}>
                보장성분 (입력 시 분석 결과가 실측으로 표시돼요)
              </div>
              <InputField
                id="pf-kcal"
                label="100g당 열량 (kcal)"
                type="number"
                value={currentProduct.kcal_per_100g}
                onChange={(value) => setCurrentProduct({ ...currentProduct, kcal_per_100g: Number(value || 0) })}
              />
              {NUTRITION_FIELDS.map(({ key, label }) => (
                <InputField
                  id={`pf-${key}`}
                  key={key}
                  label={label}
                  type="number"
                  value={nutrition[key]}
                  onChange={(value) => setNutrition((prev) => ({ ...prev, [key]: value }))}
                />
              ))}
            </div>

            {formError && (
              <p className="admin-form-error" role="alert">
                {formError}
              </p>
            )}

            <div className="admin-modal-footer">
              <button type="button" className="admin-btn-soft" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
                취소
              </button>
              <button type="button" className="admin-btn-primary" onClick={handleSave} disabled={isSaving || uploading}>
                {isSaving ? '저장 중…' : '저장하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="admin-modal-backdrop" style={{ zIndex: 1200 }} onClick={() => !isDeleting && setDeleteTarget(null)}>
          <div className="admin-modal admin-modal-sm" role="alertdialog" aria-modal="true" aria-label="제품 삭제 확인" onClick={(e) => e.stopPropagation()}>
            <h3>
              <AlertTriangle size={18} style={{ verticalAlign: '-3px', marginRight: 6, color: '#f59e0b' }} />
              제품을 삭제할까요?
            </h3>
            <p className="admin-modal-desc">
              <strong>{deleteTarget.name}</strong> 을(를) 삭제하면 연결된 원재료·보장성분 정보도 함께 사라집니다. 되돌릴 수 없습니다.
            </p>
            <div className="admin-modal-footer">
              <button type="button" className="admin-btn-soft" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                취소
              </button>
              <button type="button" className="admin-btn-danger" onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? '삭제 중…' : '삭제하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function InputField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  className,
  placeholder,
}: {
  id: string;
  label: string;
  value?: string | number;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
  placeholder?: string;
}) {
  return (
    <div className={`admin-form-group ${className || ''}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value?: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="admin-form-group">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value || ''} onChange={(e) => onChange(e.target.value)}>
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
