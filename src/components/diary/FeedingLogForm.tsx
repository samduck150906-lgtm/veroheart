import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Check, FlaskConical, Camera, Trash2, PawPrint } from 'lucide-react';
import BottomSheet from '../BottomSheet';
import { searchDiaryProducts, createFeedingLog, updateFeedingLog } from '../../lib/supabase';
import { notify } from '../../store/useNotification';
import type {
  FeedingLogInput,
  FeedingProductType,
  MealPeriod,
  PetFeedingLog,
  Product,
  UserPetProfile,
} from '../../types';
import {
  FEEDING_TYPE_OPTIONS,
  MEAL_PERIOD_OPTIONS,
  PREFERENCE_OPTIONS,
  UNIT_OPTIONS,
  feedingTypeMeta,
  nowTimeHHMM,
  toDateKey,
} from './feedingConstants';

export interface PresetProduct {
  id: string;
  name: string;
  brand: string;
  imageUrl: string;
  productType: FeedingProductType;
}

interface FeedingLogFormProps {
  isOpen: boolean;
  onClose: () => void;
  pets: UserPetProfile[];
  initialPetId: string | null;
  editingLog?: PetFeedingLog | null;
  /** 생성 시 초기 날짜 'YYYY-MM-DD' */
  initialDate?: string;
  /** PDP 등에서 제품을 미리 지정 */
  presetProduct?: PresetProduct | null;
  userId: string | null;
  onSaved: (log: PetFeedingLog) => void;
}

type SelectedProduct = { id: string; name: string; brand: string; imageUrl: string };

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80';

export default function FeedingLogForm({
  isOpen,
  onClose,
  pets,
  initialPetId,
  editingLog,
  initialDate,
  presetProduct,
  userId,
  onSaved,
}: FeedingLogFormProps) {
  const navigate = useNavigate();
  const isEditing = Boolean(editingLog);

  const [petId, setPetId] = useState<string | null>(initialPetId);
  const [productType, setProductType] = useState<FeedingProductType>('food');
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [date, setDate] = useState<string>(initialDate ?? toDateKey(new Date()));
  const [time, setTime] = useState<string>('');
  const [mealPeriod, setMealPeriod] = useState<MealPeriod | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [unit, setUnit] = useState<string>('g');
  const [customUnit, setCustomUnit] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [preference, setPreference] = useState<number | null>(null);
  const [reaction, setReaction] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // 제품 검색
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 시트가 열릴 때(또는 편집 대상/프리셋이 바뀔 때) 폼 상태 초기화
  useEffect(() => {
    if (!isOpen) return;
    if (editingLog) {
      setPetId(editingLog.petId);
      setProductType(editingLog.productType);
      setCustomMode(editingLog.isCustomProduct);
      setCustomName(editingLog.customProductName ?? '');
      setSelectedProduct(
        editingLog.product && !editingLog.isCustomProduct
          ? {
              id: editingLog.product.id,
              name: editingLog.product.name,
              brand: editingLog.product.brand,
              imageUrl: editingLog.product.imageUrl,
            }
          : null,
      );
      setDate(editingLog.feedingDate);
      setTime(editingLog.feedingTime ?? '');
      setMealPeriod(editingLog.mealPeriod);
      setAmount(editingLog.amount != null ? String(editingLog.amount) : '');
      if (editingLog.unit && !UNIT_OPTIONS.includes(editingLog.unit as (typeof UNIT_OPTIONS)[number])) {
        setUnit('__custom__');
        setCustomUnit(editingLog.unit);
      } else {
        setUnit(editingLog.unit ?? 'g');
        setCustomUnit('');
      }
      setMemo(editingLog.memo ?? '');
      setPreference(editingLog.preferenceLevel);
      setReaction(editingLog.reactionNote ?? '');
      setImageUrl(editingLog.imageUrl ?? '');
    } else {
      // 생성 모드
      setPetId(initialPetId);
      setDate(initialDate ?? toDateKey(new Date()));
      setTime(nowTimeHHMM());
      setMealPeriod(null);
      setAmount('');
      setUnit('g');
      setCustomUnit('');
      setMemo('');
      setPreference(null);
      setReaction('');
      setImageUrl('');
      setSearchQuery('');
      setSearchResults([]);
      if (presetProduct) {
        setProductType(presetProduct.productType);
        setCustomMode(false);
        setCustomName('');
        setSelectedProduct({
          id: presetProduct.id,
          name: presetProduct.name,
          brand: presetProduct.brand,
          imageUrl: presetProduct.imageUrl,
        });
      } else {
        setProductType('food');
        setCustomMode(false);
        setCustomName('');
        setSelectedProduct(null);
      }
    }
  }, [isOpen, editingLog, presetProduct, initialPetId, initialDate]);

  // 제품 검색(디바운스) — 공식 유형 + 검색 모드에서만
  const searchType = feedingTypeMeta(productType).searchType;
  useEffect(() => {
    if (!isOpen) return;
    if (productType === 'custom' || customMode) return;
    if (!searchType) return;
    const q = searchQuery.trim();
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await searchDiaryProducts(q, searchType);
        setSearchResults(res);
      } catch (e) {
        console.error(e);
      } finally {
        setSearchLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, searchType, productType, customMode, isOpen]);

  const isCustomProduct = productType === 'custom' || customMode;
  const resolvedUnit = unit === '__custom__' ? customUnit.trim() : unit;

  const canSave = useMemo(() => {
    if (!petId) return false;
    if (isCustomProduct) return customName.trim().length > 0;
    return Boolean(selectedProduct);
  }, [petId, isCustomProduct, customName, selectedProduct]);

  const handleSelectType = (t: FeedingProductType) => {
    setProductType(t);
    setSelectedProduct(null);
    setSearchQuery('');
    setSearchResults([]);
    setCustomMode(t === 'custom');
  };

  const handlePickProduct = (p: Product) => {
    setSelectedProduct({ id: p.id, name: p.name, brand: p.brand, imageUrl: p.imageUrl });
    setCustomMode(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 900 * 1024) {
      notify.warning('사진은 900KB 이하로 올려주세요. (더 작은 이미지를 선택해주세요)');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setImageUrl(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!canSave || isSaving) return;
    if (!userId) {
      navigate('/login');
      return;
    }
    if (!petId) return;

    const input: FeedingLogInput = {
      petId,
      productId: isCustomProduct ? null : selectedProduct?.id ?? null,
      productType,
      customProductName: isCustomProduct ? customName.trim() : null,
      isCustomProduct,
      feedingDate: date,
      feedingTime: time || null,
      mealPeriod,
      amount: amount.trim() ? Number(amount.replace(/[^0-9.]/g, '')) : null,
      unit: resolvedUnit || null,
      memo: memo.trim() || null,
      preferenceLevel: preference,
      reactionNote: reaction.trim() || null,
      imageUrl: imageUrl || null,
    };

    setIsSaving(true);
    try {
      const saved = editingLog
        ? await updateFeedingLog(editingLog.id, userId, input)
        : await createFeedingLog(userId, input);
      if (saved) {
        notify.success(isEditing ? '기록을 수정했어요.' : '섭취 기록을 저장했어요.');
        onSaved(saved);
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 800,
    color: 'var(--text-muted)',
    marginBottom: '8px',
    letterSpacing: '0.02em',
    display: 'block',
  };
  const fieldInput: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid var(--line)',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    background: 'var(--surface-elevated)',
    color: 'var(--text-dark)',
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? '섭취 기록 수정' : '섭취 기록 추가'}
      maxHeight="92vh"
      footer={
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || isSaving}
          className="ui-press"
          style={{
            width: '100%',
            minHeight: '52px',
            padding: '16px',
            borderRadius: '16px',
            border: 'none',
            fontWeight: 800,
            fontSize: '16px',
            cursor: !canSave || isSaving ? 'not-allowed' : 'pointer',
            opacity: !canSave || isSaving ? 0.55 : 1,
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
            color: '#fff',
          }}
        >
          {isSaving ? '저장 중…' : isEditing ? '수정 저장' : '기록 저장'}
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* 반려동물 선택 */}
        {pets.length > 0 && (
          <div>
            <label style={sectionLabel}>
              <PawPrint size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />
              반려동물
            </label>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {pets.map((p) => {
                const active = petId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPetId(p.id)}
                    style={{
                      flexShrink: 0,
                      minHeight: '44px',
                      padding: '8px 14px',
                      borderRadius: '999px',
                      border: active ? '2px solid var(--primary)' : '1px solid var(--line)',
                      background: active ? 'rgba(250, 204, 21, 0.18)' : 'var(--surface-elevated)',
                      color: active ? 'var(--primary-dark)' : 'var(--text-muted)',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    {p.species === 'Cat' ? '🐱' : '🐶'} {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 제품 유형 */}
        <div>
          <label style={sectionLabel}>제품 유형</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {FEEDING_TYPE_OPTIONS.map((t) => {
              const active = productType === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleSelectType(t.value)}
                  style={{
                    minHeight: '44px',
                    padding: '10px 16px',
                    borderRadius: '12px',
                    border: active ? 'none' : '1px solid var(--line)',
                    background: active ? t.bg : 'var(--surface-elevated)',
                    color: active ? t.color : 'var(--text-muted)',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 제품 선택 (공식 검색 or 직접 입력) */}
        <div>
          <label style={sectionLabel}>제품</label>

          {isCustomProduct ? (
            <div>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="제품명을 직접 입력하세요"
                style={fieldInput}
              />
              {productType !== 'custom' && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomMode(false);
                    setCustomName('');
                  }}
                  className="ui-text-button"
                  style={{ marginTop: '8px', padding: 0 }}
                >
                  <Search size={13} /> 등록된 제품에서 검색
                </button>
              )}
            </div>
          ) : selectedProduct ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                borderRadius: '14px',
                border: '1px solid var(--line)',
                background: 'var(--surface-alt)',
              }}
            >
              <img
                src={selectedProduct.imageUrl || FALLBACK_IMG}
                alt={selectedProduct.name}
                style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>{selectedProduct.brand}</div>
                <div
                  className="line-clamp-2"
                  style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)', lineHeight: 1.4 }}
                >
                  {selectedProduct.name}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                aria-label="제품 선택 해제"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '8px',
                  display: 'flex',
                }}
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <div>
              <div style={{ position: 'relative' }}>
                <Search
                  size={16}
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="제품명·브랜드명으로 검색"
                  style={{ ...fieldInput, paddingLeft: '36px' }}
                />
              </div>

              <div
                style={{
                  marginTop: '8px',
                  border: '1px solid var(--line)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  maxHeight: '240px',
                  overflowY: 'auto',
                }}
              >
                {searchLoading ? (
                  <div style={{ padding: '18px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                    불러오는 중…
                  </div>
                ) : searchResults.length === 0 ? (
                  <div style={{ padding: '18px 14px', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)' }}>
                      검색 결과가 없습니다.
                    </p>
                    <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      제품이 없다면 직접 입력할 수 있어요.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomMode(true);
                        setCustomName(searchQuery.trim());
                      }}
                      style={{
                        minHeight: '44px',
                        padding: '10px 18px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'var(--primary)',
                        color: 'var(--text-dark)',
                        fontWeight: 800,
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      직접 입력하기
                    </button>
                  </div>
                ) : (
                  searchResults.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderBottom: '1px solid var(--surface-alt)',
                      }}
                    >
                      <img
                        src={p.imageUrl || FALLBACK_IMG}
                        alt={p.name}
                        style={{ width: '42px', height: '42px', borderRadius: '9px', objectFit: 'cover', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>{p.brand}</div>
                        <div
                          className="line-clamp-1"
                          style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}
                        >
                          {p.name}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/product/${p.id}`)}
                        title="성분 분석 보기"
                        aria-label="성분 분석 보기"
                        style={{
                          flexShrink: 0,
                          minWidth: '44px',
                          minHeight: '40px',
                          borderRadius: '10px',
                          border: '1px solid var(--line)',
                          background: 'var(--surface-elevated)',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <FlaskConical size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePickProduct(p)}
                        style={{
                          flexShrink: 0,
                          minHeight: '40px',
                          padding: '0 14px',
                          borderRadius: '10px',
                          border: 'none',
                          background: 'var(--primary-dark)',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        기록
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 날짜 · 시간 */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label style={sectionLabel}>섭취 날짜</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={fieldInput} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={sectionLabel}>섭취 시간</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={fieldInput} />
          </div>
        </div>

        {/* 시간대 (선택) */}
        <div>
          <label style={sectionLabel}>시간대 (선택)</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {MEAL_PERIOD_OPTIONS.map((m) => {
              const active = mealPeriod === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMealPeriod(active ? null : m.value)}
                  style={{
                    minHeight: '40px',
                    padding: '8px 14px',
                    borderRadius: '999px',
                    border: active ? 'none' : '1px solid var(--line)',
                    background: active ? 'var(--primary)' : 'var(--surface-elevated)',
                    color: active ? 'var(--text-dark)' : 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 급여량 · 단위 */}
        <div>
          <label style={sectionLabel}>급여량</label>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="예: 50"
              style={{ ...fieldInput, flex: 1 }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {UNIT_OPTIONS.map((u) => {
              const active = unit === u;
              return (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  style={{
                    minHeight: '40px',
                    padding: '8px 14px',
                    borderRadius: '999px',
                    border: active ? 'none' : '1px solid var(--line)',
                    background: active ? 'var(--primary)' : 'var(--surface-elevated)',
                    color: active ? 'var(--text-dark)' : 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {u}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setUnit('__custom__')}
              style={{
                minHeight: '40px',
                padding: '8px 14px',
                borderRadius: '999px',
                border: unit === '__custom__' ? 'none' : '1px solid var(--line)',
                background: unit === '__custom__' ? 'var(--primary)' : 'var(--surface-elevated)',
                color: unit === '__custom__' ? 'var(--text-dark)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              직접 입력
            </button>
          </div>
          {unit === '__custom__' && (
            <input
              type="text"
              value={customUnit}
              onChange={(e) => setCustomUnit(e.target.value)}
              placeholder="단위 직접 입력 (예: 조각)"
              style={{ ...fieldInput, marginTop: '8px' }}
            />
          )}
        </div>

        {/* 기호도 (선택) */}
        <div>
          <label style={sectionLabel}>반응 · 기호도 (선택)</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {PREFERENCE_OPTIONS.map((p) => {
              const active = preference === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPreference(active ? null : p.value)}
                  style={{
                    minHeight: '44px',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    border: active ? '2px solid var(--primary)' : '1px solid var(--line)',
                    background: active ? 'rgba(250, 204, 21, 0.16)' : 'var(--surface-elevated)',
                    color: 'var(--text-dark)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span aria-hidden>{p.emoji}</span>
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 메모 */}
        <div>
          <label style={sectionLabel}>메모 (선택)</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="특이사항·컨디션 등을 기록하세요"
            style={{ ...fieldInput, height: '72px', resize: 'none' }}
          />
        </div>

        {/* 특이사항(반응 노트) */}
        <div>
          <label style={sectionLabel}>특이사항 (선택)</label>
          <input
            type="text"
            value={reaction}
            onChange={(e) => setReaction(e.target.value)}
            placeholder="예: 먹고 나서 물을 많이 마셨어요"
            style={fieldInput}
          />
        </div>

        {/* 사진 (선택) */}
        <div>
          <label style={sectionLabel}>사진 (선택)</label>
          {imageUrl ? (
            <div style={{ position: 'relative', width: '96px', height: '96px' }}>
              <img
                src={imageUrl}
                alt="기록 사진"
                style={{ width: '96px', height: '96px', borderRadius: '14px', objectFit: 'cover' }}
              />
              <button
                type="button"
                onClick={() => setImageUrl('')}
                aria-label="사진 삭제"
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'var(--danger, #EF4444)',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                minHeight: '44px',
                padding: '10px 16px',
                borderRadius: '12px',
                border: '1px dashed var(--line)',
                background: 'var(--surface-alt)',
                color: 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Camera size={16} /> 사진 추가
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>

        {!canSave && (
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check size={13} /> 반려동물과 제품(또는 직접 입력)을 선택하면 저장할 수 있어요.
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
