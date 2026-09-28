import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Edit2, Trash2, X, Upload, ChevronLeft, ChevronRight, AlertTriangle, Eye, EyeOff, Pin, PinOff } from 'lucide-react';
import { notify } from '../../store/useNotification';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import ProductIngredientsEditor from './ProductIngredientsEditor';
import ProductLabelPasteBox from './ProductLabelPasteBox';
import {
  fetchProductForEdit,  type BulkProductPatch,
  bulkUpdateProducts,
  BULK_PRODUCT_LIMIT,
  deleteProduct as deleteProductApi,
  fetchCategories,
  saveIngredient,
  fetchProductIngredients,
  fetchProductsPage,
  saveProduct as saveProductApi,
  setProductPinned as setProductPinnedApi,
  setProductVisibility as setProductVisibilityApi,
  uploadProductImage,
  validateProductImage,
  type AdminCategory,
  type AdminProductRow,
  type ProductIngredientLink,
  type RiskLevel,
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
  image_url?: string;
  min_price?: number;
  barcode?: string;
  kcal_per_100g?: number;
  verification_status?: 'pending' | 'reviewed' | 'verified';
  is_visible?: boolean;
  /** 판매처 링크 — 판매가 확인의 근거이므로 필수로 받는다. */
  coupang_link?: string;
  /** 링크에서 뽑은 쿠팡 productId. 판매가 동기화가 이 값으로 제품을 찾는다. */
  coupang_product_id?: string;
}

/**
 * 쿠팡 상품 링크에서 productId 를 뽑는다.
 *
 * 형태: https://www.coupang.com/vp/products/{productId}?itemId=...
 * 단축 링크(link.coupang.com)에는 productId 가 없어 null 을 돌려준다 —
 * 그 경우 판매가 자동 확인 대상에서 빠지고 화면이 그 사실을 알려 준다.
 */
function extractCoupangProductId(link: string): string | null {
  const match = link.match(/\/vp\/products\/(\d+)/);
  return match ? match[1] : null;
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

/**
 * 카테고리 목록을 아직 불러오지 못했을 때만 쓰는 대비값.
 * 실제 목록은 카테고리 관리 화면이 관리하는 product_categories 를 따른다.
 */
const FALLBACK_CATEGORIES = ['사료', '간식', '영양제'];

const PET_TYPES = ['dog', 'cat', 'all'];

/** 빠른 성분 등록에서 고를 수 있는 분류 — 성분 관리 화면과 같은 목록이다. */
const INGREDIENT_CATEGORIES = [
  '동물성 단백질', '식물성 단백질', '탄수화물·곡물', '지방·오일', '과일·채소·식이섬유',
  '비타민·미네랄', '기능성 성분', '보존료·산화방지제', '유산균·프리바이오틱스',
  '첨가물·기호성', '조사료', '기타',
];
const PAGE_SIZE = 20;

function productCompleteness(product: AdminProductRow): number {
  const fields = [
    Boolean(product.name?.trim()),
    Boolean(product.brand_name?.trim()),
    Boolean(product.target_pet_type),
    Boolean(product.main_category),
    (product.ingredientCount ?? 0) > 0,
    (product.nutritionCount ?? 0) > 0,
    Boolean(product.barcode?.trim()),
    Boolean(product.image_url?.trim()),
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

const AdminProducts: React.FC = () => {
  const [urlParams, setUrlParams] = useSearchParams();

  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(() => Math.max(1, Number(urlParams.get('page')) || 1));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState(() => urlParams.get('q') ?? '');
  const [search, setSearch] = useState(() => urlParams.get('q') ?? '');
  const [activeTab, setActiveTab] = useState(() => urlParams.get('category') ?? '전체');
  const [petType, setPetType] = useState(() => urlParams.get('species') ?? '전체');
  const [verificationStatus, setVerificationStatus] = useState(() => urlParams.get('status') ?? '전체');
  const [visibility, setVisibility] = useState<'전체' | 'visible' | 'hidden'>(() => {
    const value = urlParams.get('visibility');
    return value === 'visible' || value === 'hidden' ? value : '전체';
  });

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
  const [visibilitySavingId, setVisibilitySavingId] = useState<string | null>(null);
  const [pinSavingId, setPinSavingId] = useState<string | null>(null);
  const [categoryRows, setCategoryRows] = useState<AdminCategory[]>([]);
  // 건강 고민 태그는 입력 중 원문을 그대로 들고 있어야 콤마를 칠 수 있다.
  // (배열로 바로 파싱하면 "피부," 를 다시 렌더할 때 콤마가 지워진다.)
  const [healthConcernText, setHealthConcernText] = useState('');
  // 가격도 문자열로 다룬다. 숫자 입력창은 0 이 남아 있어 커서가 뒤로 밀렸다.
  const [priceText, setPriceText] = useState('');
  const [quickIngredientName, setQuickIngredientName] = useState<string | null>(null);
  const [quickIngredientRisk, setQuickIngredientRisk] = useState<RiskLevel>('safe');
  const [quickIngredientCategory, setQuickIngredientCategory] = useState('기타');
  const [quickIngredientSaving, setQuickIngredientSaving] = useState(false);

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

  useEffect(() => {
    const next = new URLSearchParams();
    if (page > 1) next.set('page', String(page));
    if (search) next.set('q', search);
    if (activeTab !== '전체') next.set('category', activeTab);
    if (petType !== '전체') next.set('species', petType);
    if (verificationStatus !== '전체') next.set('status', verificationStatus);
    if (visibility !== '전체') next.set('visibility', visibility);
    setUrlParams(next, { replace: true });
  }, [activeTab, page, petType, search, setUrlParams, verificationStatus, visibility]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { rows, total: count } = await fetchProductsPage({
        page,
        pageSize: PAGE_SIZE,
        search,
        category: activeTab,
        petType,
        verificationStatus,
        visibility,
      });
      setProducts(rows);
      // 목록이 바뀌면 선택을 비운다 — 화면에 없는 제품이 선택된 채 남지 않게.
      setSelectedIds(new Set());
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
  }, [page, search, activeTab, petType, verificationStatus, visibility]);

  useEffect(() => {
    // 페이지/검색/카테고리 변경 시 서버에서 다시 조회한다.
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    // 분류 목록은 카테고리 관리 화면이 단일 원본이다. 비활성 카테고리도 기존
    // 제품이 그 값을 쓰고 있을 수 있으므로 관리자 화면에서는 모두 보여 준다.
    let cancelled = false;
    fetchCategories()
      .then((rows) => {
        if (cancelled || rows.length === 0) return;
        setCategoryRows(rows);
      })
      .catch(() => {
        // 실패해도 기본 분류로 계속 운영할 수 있어야 한다.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectTab = (tab: string) => {
    setActiveTab(tab);
    setPage(1); // 카테고리 변경 시 1페이지 초기화
  };

  const openCreateModal = () => {
    setCurrentProduct({
      target_pet_type: 'dog',
      target_life_stage: [],
      product_health_concerns: [],
      min_price: 0,
      verification_status: 'pending',
      is_visible: true,
    });
    setNutrition(EMPTY_NUTRITION);
    setIngredientLinks([]);
    setHealthConcernText('');
    setPriceText('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = async (row: AdminProductRow) => {
    setFormError('');
    setNutrition(EMPTY_NUTRITION);
    setIngredientLinks([]);
    setHealthConcernText('');
    setPriceText('');
    setIsModalOpen(true);
    setIngredientsLoading(true);

    // 목록은 경량 컬럼만 조회하므로, 편집 시 전체 필드를 다시 읽는다.
    // 제품 본문은 service_role 로 읽는다 — 비노출 제품도 편집할 수 있어야 한다.
    // 보장성분(nutritional_profiles)은 공개 SELECT 라 그대로 anon 으로 읽는다.
    const [full, { data: np }] = await Promise.all([
      fetchProductForEdit(row.id),
      supabase.from('nutritional_profiles').select('*').eq('product_id', row.id).maybeSingle(),
    ]);

    const loaded = (full ?? row) as ProductForm;
    setCurrentProduct(loaded);
    setHealthConcernText((loaded.product_health_concerns ?? []).join(', '));
    setPriceText(loaded.min_price ? String(loaded.min_price) : '');

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
    const sellerLink = (currentProduct.coupang_link || '').trim();
    if (!sellerLink) {
      setFormError('판매처 링크는 필수입니다. 가격 확인의 근거가 됩니다.');
      return;
    }
    if (!/^https?:\/\//i.test(sellerLink)) {
      setFormError('판매처 링크는 http 또는 https 로 시작해야 합니다.');
      return;
    }
    for (const { key, label } of NUTRITION_FIELDS) {
      if (!nutrition[key].trim()) continue;
      const value = Number(nutrition[key]);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        setFormError(`${label}은(는) 0에서 100 사이의 숫자로 입력해 주세요.`);
        return;
      }
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
      coupang_link: sellerLink,
      // 링크에서 뽑히면 저장한다. 없으면 기존 값을 지우지 않는다.
      coupang_product_id:
        extractCoupangProductId(sellerLink) ?? (currentProduct.coupang_product_id || null),
      kcal_per_100g:
        Number.isFinite(Number(currentProduct.kcal_per_100g)) && Number(currentProduct.kcal_per_100g) > 0
          ? Number(currentProduct.kcal_per_100g)
          : null,
      min_price: Math.max(0, Number(priceText.replace(/[^0-9]/g, '') || 0)),
      target_life_stage: normalizeCommaValues(currentProduct.target_life_stage),
      product_health_concerns: normalizeCommaValues(healthConcernText),
    };

    // 보장성분: 입력값이 하나라도 있을 때만 함께 전송(숫자로 변환)
    const hasNutrition = NUTRITION_FIELDS.some(({ key }) => nutrition[key].trim() !== '');
    const num = (s: string) => Number(s);
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
      // 제품 저장과 원재료 연결 교체는 같은 관리자 요청 안에서 처리된다.
      const saved = await saveProductApi({
        product: payload,
        nutrition: nutritionPayload,
        ingredients: ingredientLinks.map((link, index) => ({
          ingredient_id: link.ingredientId,
          sort_order: index,
        })),
      });
      notify.success(
        currentProduct.id
          ? `제품명 “${saved.product.name}” 저장 및 앱 조회 확인이 완료되었습니다.`
          : `신규 제품 “${saved.product.name}” 등록 및 앱 조회 확인이 완료되었습니다.`,
      );
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

  const toggleVisibility = async (product: AdminProductRow) => {
    if (visibilitySavingId) return;
    const nextVisible = !product.is_visible;
    setVisibilitySavingId(product.id);
    try {
      await setProductVisibilityApi(product.id, nextVisible);
      setProducts((rows) => rows.map((row) => (
        row.id === product.id ? { ...row, is_visible: nextVisible } : row
      )));
      notify.success(
        nextVisible
          ? `“${product.name}” 제품을 사용자 앱에 노출했습니다.`
          : `“${product.name}” 제품을 사용자 앱에서 비노출 처리했습니다.`,
      );
      if (visibility !== '전체') await loadProducts();
    } catch (err) {
      notify.error(`노출 상태 변경 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setVisibilitySavingId(null);
    }
  };

  const mainCategoryNames = categoryRows.length > 0
    ? categoryRows.filter((row) => !row.parentId).map((row) => row.name)
    : FALLBACK_CATEGORIES;

  /** 선택한 대분류 아래 등록된 소분류만 고르게 한다. */
  const subCategoryNames = (() => {
    const parent = categoryRows.find(
      (row) => !row.parentId && row.name === (currentProduct.main_category ?? '').trim(),
    );
    if (!parent) return [];
    return categoryRows.filter((row) => row.parentId === parent.id).map((row) => row.name);
  })();

  /**
   * 원재료 검색에 없는 성분을 제품 폼을 벗어나지 않고 바로 등록한다.
   *
   * 예전에는 성분 사전 화면으로 이동시켰는데, 그 순간 입력 중이던 제품 정보가
   * 전부 사라졌다. 여기서 등록하면 그대로 이 제품의 원재료로 붙는다.
   */
  const saveQuickIngredient = async () => {
    const name = (quickIngredientName ?? '').trim();
    if (!name || quickIngredientSaving) return;
    setQuickIngredientSaving(true);
    try {
      const { id, ingredient } = await saveIngredient({
        name_ko: name,
        risk_level: quickIngredientRisk,
        category: quickIngredientCategory,
      });
      setIngredientLinks((links) => (
        links.some((link) => link.ingredientId === id)
          ? links
          : [...links, {
              ingredientId: id,
              nameKo: ingredient.name_ko,
              nameEn: ingredient.name_en,
              riskLevel: ingredient.risk_level,
              sortOrder: links.length,
            }]
      ));
      notify.success(`성분 “${ingredient.name_ko}”을(를) 사전에 등록하고 이 제품에 연결했습니다.`);
      setQuickIngredientName(null);
    } catch (err) {
      notify.error(`성분 등록 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setQuickIngredientSaving(false);
    }
  };

  const togglePinned = async (product: AdminProductRow) => {
    if (pinSavingId) return;
    const nextPinned = !product.is_pinned;
    setPinSavingId(product.id);
    try {
      const result = await setProductPinnedApi(product.id, nextPinned);
      setProducts((rows) => rows.map((row) => (
        row.id === product.id
          ? { ...row, is_pinned: result.isPinned, pinned_order: result.pinnedOrder }
          : row
      )));
      notify.success(
        nextPinned
          ? `“${product.name}” 제품을 앱 목록 상단에 고정했습니다.`
          : `“${product.name}” 제품의 상단 고정을 해제했습니다.`,
      );
    } catch (err) {
      notify.error(`상단 고정 변경 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPinSavingId(null);
    }
  };

  const rangeLabel = useMemo(() => {
    if (total === 0) return '0';
    const from = (page - 1) * PAGE_SIZE + 1;
    const to = Math.min(page * PAGE_SIZE, total);
    return `${from.toLocaleString()}–${to.toLocaleString()}`;
  }, [page, total]);

  // 등록/수정 폼이 열려 있는 동안 탭 닫기·새로고침·뒤로가기를 경고한다.
  // 모달 바깥 클릭은 이미 막아 두었지만 그 경로들은 따로 막히지 않는다.
  useUnsavedChangesWarning(isModalOpen);

  const allSelected = products.length > 0 && products.every((row) => selectedIds.has(row.id));

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(products.map((row) => row.id)));
  };

  const toggleOne = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /**
   * 선택한 제품을 한 번에 바꾼다.
   *
   * 요청 수와 실제 반영 수를 비교해 알린다 — 일부만 바뀌었는데 "전부 성공"으로
   * 보여 주면 운영자가 확인하지 않고 넘어간다.
   */
  const runBulk = async (patch: BulkProductPatch, label: string, destructive = false) => {
    const ids = [...selectedIds];
    if (bulkBusy || ids.length === 0) return;
    if (ids.length > BULK_PRODUCT_LIMIT) {
      notify.error(`한 번에 최대 ${BULK_PRODUCT_LIMIT}개까지 변경할 수 있습니다.`);
      return;
    }
    if (destructive && !window.confirm(`선택한 ${ids.length}개 제품을 ${label} 처리할까요?`)) return;

    setBulkBusy(true);
    try {
      const result = await bulkUpdateProducts(ids, patch);
      if (result.updated === result.requested) {
        notify.success(`제품 ${result.updated.toLocaleString()}개를 ${label} 처리했습니다.`);
      } else {
        notify.warning(
          `${result.requested.toLocaleString()}개 중 ${result.updated.toLocaleString()}개만 ${label} 처리됐습니다.`,
        );
      }
      await loadProducts();
    } catch (err) {
      notify.error(`일괄 처리 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBulkBusy(false);
    }
  };

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
        {['전체', ...mainCategoryNames].map((tab) => (
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

      <div className="admin-query-bar admin-product-query-bar">
        <label className="admin-compact-field">
          <span>대상</span>
          <select value={petType} onChange={(event) => { setPetType(event.target.value); setPage(1); }}>
            <option value="전체">전체</option>
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
            <option value="all">Dog + Cat</option>
          </select>
        </label>
        <label className="admin-compact-field">
          <span>앱 노출</span>
          <select value={visibility} onChange={(event) => {
            setVisibility(event.target.value as '전체' | 'visible' | 'hidden');
            setPage(1);
          }}>
            <option value="전체">전체</option>
            <option value="visible">노출</option>
            <option value="hidden">비노출</option>
          </select>
        </label>
        <label className="admin-compact-field">
          <span>검수 상태</span>
          <select value={verificationStatus} onChange={(event) => { setVerificationStatus(event.target.value); setPage(1); }}>
            <option value="전체">전체</option>
            <option value="pending">검수 대기</option>
            <option value="reviewed">검토됨</option>
            <option value="verified">검수 완료</option>
          </select>
        </label>
      </div>

      <div className="admin-search-wrap">
        <Search size={16} className="admin-search-icon" />
        <label htmlFor="admin-product-search" className="admin-visually-hidden">
          제품명, 브랜드, 바코드 검색
        </label>
        <input
          id="admin-product-search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="제품명, 브랜드, 바코드 검색"
        />
      </div>

      {selectedIds.size > 0 && (
        <div className="admin-card" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 14 }}>{selectedIds.size.toLocaleString()}개 선택됨</strong>
          <div className="admin-actions" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="admin-btn-soft" disabled={bulkBusy}
              onClick={() => runBulk({ isVisible: true }, '앱 노출')}>앱 노출</button>
            <button type="button" className="admin-btn-soft" disabled={bulkBusy}
              onClick={() => runBulk({ isVisible: false }, '앱 미노출', true)}>앱 미노출</button>
            <button type="button" className="admin-btn-soft" disabled={bulkBusy}
              onClick={() => runBulk({ verificationStatus: 'verified' }, '검수 완료')}>검수 완료</button>
            <button type="button" className="admin-btn-soft" disabled={bulkBusy}
              onClick={() => runBulk({ verificationStatus: 'pending' }, '검수 대기', true)}>검수 대기로</button>
            <button type="button" className="admin-btn-soft" disabled={bulkBusy}
              onClick={() => setSelectedIds(new Set())}>선택 해제</button>
          </div>
        </div>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={products.length === 0}
                  aria-label="이 페이지 제품 전체 선택"
                />
              </th>
              <th>아이템</th>
              <th>카테고리</th>
              <th>타겟</th>
              <th>원재료</th>
              <th>정보완성도</th>
              <th>검수 상태</th>
              <th>앱 노출</th>
              <th>상단 고정</th>
              <th>가격</th>
              <th style={{ textAlign: 'right' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11}>
                  <div className="admin-empty">데이터를 불러오는 중입니다...</div>
                </td>
              </tr>
            ) : loadError ? (
              <tr>
                <td colSpan={11}>
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
                <td colSpan={11}>
                  <div className="admin-empty">
                    {search || activeTab !== '전체' || petType !== '전체' || verificationStatus !== '전체' || visibility !== '전체'
                      ? '검색 조건에 맞는 제품이 없습니다.'
                      : '등록된 제품이 없습니다. "신규 제품 등록"으로 시작해 주세요.'}
                  </div>
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleOne(p.id)}
                      aria-label={`${p.name} 선택`}
                    />
                  </td>
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
                  <td><strong>{(p.ingredientCount ?? 0).toLocaleString()}</strong>개</td>
                  <td>
                    <span className={`admin-tag ${productCompleteness(p) >= 80 ? 'green' : productCompleteness(p) >= 50 ? 'yellow' : 'red'}`}>
                      {productCompleteness(p)}%
                    </span>
                  </td>
                  <td>
                    <span className={`admin-tag ${p.verification_status === 'verified' ? 'green' : p.verification_status === 'reviewed' ? 'yellow' : 'gray'}`}>
                      {p.verification_status === 'verified' ? '검수 완료' : p.verification_status === 'reviewed' ? '검토됨' : '검수 대기'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`admin-visibility-btn ${p.is_visible ? 'is-visible' : 'is-hidden'}`}
                      onClick={() => toggleVisibility(p)}
                      disabled={visibilitySavingId !== null}
                      aria-label={`${p.name} 앱 ${p.is_visible ? '비노출' : '노출'}로 변경`}
                    >
                      {p.is_visible ? <Eye size={13} /> : <EyeOff size={13} />}
                      {visibilitySavingId === p.id ? '저장 중' : p.is_visible ? '노출' : '비노출'}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`admin-visibility-btn ${p.is_pinned ? 'is-pinned' : 'is-hidden'}`}
                      onClick={() => togglePinned(p)}
                      disabled={pinSavingId !== null}
                      aria-label={`${p.name} 상단 고정 ${p.is_pinned ? '해제' : '설정'}`}
                    >
                      {p.is_pinned ? <Pin size={13} /> : <PinOff size={13} />}
                      {pinSavingId === p.id ? '저장 중' : p.is_pinned ? `고정 ${p.pinned_order}` : '해제'}
                    </button>
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
        // 입력 도중 바깥을 눌러 폼이 통째로 사라지는 사고를 막는다 — 닫기는 X/취소로만.
        <div className="admin-modal-backdrop">
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-label={currentProduct.id ? '제품 정보 수정' : '신규 제품 등록'}
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
                label="가격 (원)"
                inputMode="numeric"
                placeholder="예: 32000"
                value={priceText ? Number(priceText).toLocaleString() : ''}
                onChange={(value) => setPriceText(value.replace(/[^0-9]/g, '').slice(0, 9))}
              />
              <InputField
                id="pf-barcode"
                label="바코드 (EAN/UPC)"
                value={currentProduct.barcode}
                onChange={(value) => setCurrentProduct({ ...currentProduct, barcode: value })}
              />
              <div className="admin-form-group admin-form-span-2">
                <label htmlFor="pf-seller-link">판매처 링크 *</label>
                <input
                  id="pf-seller-link"
                  value={currentProduct.coupang_link ?? ''}
                  onChange={(event) => setCurrentProduct({ ...currentProduct, coupang_link: event.target.value })}
                  placeholder="https://www.coupang.com/vp/products/1234567890"
                />
                <p className="admin-hint">
                  {(() => {
                    const link = (currentProduct.coupang_link || '').trim();
                    if (!link) return '가격이 바뀌었을 때 확인할 근거입니다. 상품 상세 페이지 주소를 넣어 주세요.';
                    const id = extractCoupangProductId(link);
                    return id
                      ? `상품번호 ${id} 를 찾았습니다. 판매가 변동을 자동으로 확인합니다.`
                      : '이 주소에서는 상품번호를 찾지 못했습니다. 저장은 되지만 판매가 자동 확인 대상에서 빠집니다.';
                  })()}
                </p>
              </div>

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
                options={mainCategoryNames}
                onChange={(value) => setCurrentProduct({ ...currentProduct, main_category: value })}
              />
              <SelectField
                id="pf-verification"
                label="검수 상태"
                value={currentProduct.verification_status}
                options={['pending', 'reviewed', 'verified']}
                onChange={(value) => setCurrentProduct({ ...currentProduct, verification_status: value as ProductForm['verification_status'] })}
              />
              <label className="admin-visibility-field" htmlFor="pf-visible">
                <input
                  id="pf-visible"
                  type="checkbox"
                  checked={currentProduct.is_visible !== false}
                  onChange={(event) => setCurrentProduct({
                    ...currentProduct,
                    is_visible: event.target.checked,
                  })}
                />
                <span>
                  <strong>사용자 앱에 노출</strong>
                  <small>끄면 검색·목록·바코드·상세 화면에서 숨겨집니다.</small>
                </span>
              </label>
              <SelectField
                id="pf-pet-type"
                label="타겟 반려동물"
                value={currentProduct.target_pet_type}
                options={PET_TYPES}
                onChange={(value) => setCurrentProduct({ ...currentProduct, target_pet_type: value })}
              />
              {subCategoryNames.length > 0 ? (
                <SelectField
                  id="pf-sub-cat"
                  label="서브 카테고리"
                  value={currentProduct.sub_category}
                  options={subCategoryNames}
                  onChange={(value) => setCurrentProduct({ ...currentProduct, sub_category: value })}
                />
              ) : (
                <div className="admin-form-group">
                  <label htmlFor="pf-sub-cat">서브 카테고리</label>
                  <select id="pf-sub-cat" value="" disabled>
                    <option value="">
                      {currentProduct.main_category
                        ? '등록된 서브 카테고리가 없습니다'
                        : '먼저 메인 카테고리를 고르세요'}
                    </option>
                  </select>
                  <p className="admin-hint">
                    서브 카테고리는 <strong>카테고리 관리</strong>에서 메인 카테고리 아래에 등록합니다.
                  </p>
                </div>
              )}
              <InputField
                id="pf-formulation"
                label="제형"
                value={currentProduct.formulation}
                onChange={(value) => setCurrentProduct({ ...currentProduct, formulation: value })}
              />
              <InputField
                id="pf-concerns"
                className="admin-form-span-2"
                label="건강 고민 태그 (콤마로 구분)"
                placeholder="예: 피부, 관절, 소화"
                value={healthConcernText}
                onChange={setHealthConcernText}
              />

              {/* 라벨 원문 한 번으로 원재료 연결과 보증성분을 함께 채운다.
                  성분을 하나씩 검색해 붙이는 것이 제품당 10~30회라 실제 병목이었다. */}
              <div className="admin-form-span-2">
                <ProductLabelPasteBox
                  linkedIngredientIds={ingredientLinks.map((link) => link.ingredientId)}
                  disabled={isSaving || ingredientsLoading}
                  onRequestCreateIngredient={(name) => {
                    setQuickIngredientName(name);
                    setQuickIngredientRisk('safe');
                    setQuickIngredientCategory('기타');
                  }}
                  onApply={({ ingredients, nutrition: parsedNutrition }) => {
                    if (ingredients.length > 0) {
                      // 라벨 표기 순서를 그대로 뒤에 잇는다. sort_order 는 저장할 때
                      // 목록 순서로 다시 매겨지므로 여기서는 순서만 지키면 된다.
                      setIngredientLinks((links) => [
                        ...links,
                        ...ingredients.map((entry, index) => ({
                          ingredientId: entry.id,
                          nameKo: entry.nameKo,
                          nameEn: entry.nameEn,
                          riskLevel: entry.riskLevel,
                          sortOrder: links.length + index,
                        })),
                      ]);
                    }
                    const found = Object.entries(parsedNutrition) as [keyof NutritionForm, number][];
                    if (found.length > 0) {
                      setNutrition((prev) => {
                        const next = { ...prev };
                        for (const [key, value] of found) next[key] = String(value);
                        return next;
                      });
                    }
                    notify.success(`라벨에서 성분 ${ingredients.length}개, 보증성분 ${found.length}칸을 채웠어요. 저장 전에 확인해 주세요.`);
                  }}
                />
              </div>

              {/* 원재료 구성 — 분석 엔진의 핵심 입력 */}
              <div className="admin-form-span-2">
                {ingredientsLoading ? (
                  <div className="admin-empty">원재료를 불러오는 중입니다…</div>
                ) : (
                  <ProductIngredientsEditor
                    value={ingredientLinks}
                    onChange={setIngredientLinks}
                    disabled={isSaving}
                    onRequestCreateIngredient={(name) => {
                      setQuickIngredientName(name);
                      setQuickIngredientRisk('safe');
                      setQuickIngredientCategory('기타');
                    }}
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

      {quickIngredientName !== null && (
        <div className="admin-modal-backdrop" style={{ zIndex: 1200 }}>
          <div className="admin-modal admin-modal-sm" role="dialog" aria-modal="true" aria-label="성분 빠른 등록">
            <div className="admin-dialog-heading">
              <h3>성분 사전에 등록</h3>
              <button
                type="button"
                className="admin-btn-soft"
                onClick={() => setQuickIngredientName(null)}
                disabled={quickIngredientSaving}
                aria-label="닫기"
              >
                <X size={16} />
              </button>
            </div>
            <p className="admin-modal-desc">
              등록하면 성분 사전에 추가되고, 편집 중인 이 제품의 원재료로 바로 연결됩니다.
              상세 설명·영양값은 나중에 성분 관리에서 채울 수 있습니다.
            </p>

            <div className="admin-form-group" style={{ marginTop: 14 }}>
              <label htmlFor="qi-name">성분명 *</label>
              <input
                id="qi-name"
                value={quickIngredientName}
                onChange={(event) => setQuickIngredientName(event.target.value)}
                maxLength={200}
              />
            </div>
            <div className="admin-form-group" style={{ marginTop: 12 }}>
              <label htmlFor="qi-category">분류 *</label>
              <select
                id="qi-category"
                value={quickIngredientCategory}
                onChange={(event) => setQuickIngredientCategory(event.target.value)}
              >
                {INGREDIENT_CATEGORIES.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="admin-form-group" style={{ marginTop: 12 }}>
              <label htmlFor="qi-risk">위험도 *</label>
              <select
                id="qi-risk"
                value={quickIngredientRisk}
                onChange={(event) => setQuickIngredientRisk(event.target.value as RiskLevel)}
              >
                <option value="safe">안전</option>
                <option value="caution">주의</option>
                <option value="danger">위험</option>
              </select>
              <p className="admin-hint">확실하지 않으면 안전으로 두고, 나중에 성분 관리에서 검수하세요.</p>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn-soft"
                onClick={() => setQuickIngredientName(null)}
                disabled={quickIngredientSaving}
              >
                취소
              </button>
              <button
                type="button"
                className="admin-btn-primary"
                onClick={saveQuickIngredient}
                disabled={quickIngredientSaving || !quickIngredientName.trim()}
              >
                {quickIngredientSaving ? '등록 중…' : '등록하고 연결'}
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
              <strong>{deleteTarget.name}</strong> 을(를) 앱과 관리자 목록에서 내립니다. 연결된 원재료·보장성분·리뷰도 함께 사라집니다.
              <br />
              삭제 직전 상태는 <strong>휴지통</strong>에 보관되므로, 실수로 지웠다면 휴지통에서 그대로 복원할 수 있습니다.
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
  inputMode,
}: {
  id: string;
  label: string;
  value?: string | number;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
  placeholder?: string;
  inputMode?: 'numeric' | 'text' | 'decimal';
}) {
  return (
    <div className={`admin-form-group ${className || ''}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
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
