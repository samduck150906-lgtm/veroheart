import React, { useCallback, useState } from 'react';
import { ClipboardPaste, Plus } from 'lucide-react';
import { fetchIngredientDictionary, type IngredientDictionaryEntry } from '../../lib/adminApi';
import { matchIngredientNames } from '../../utils/ingredientDictionaryMatch';
import { parseProductLabel, type ParsedNutritionKey } from '../../utils/productLabelParse';

export interface LabelPasteResult {
  ingredients: IngredientDictionaryEntry[];
  nutrition: Partial<Record<ParsedNutritionKey, number>>;
}

interface Props {
  /** 이미 이 제품에 연결된 성분. 다시 붙이지 않도록 걸러 낸다. */
  linkedIngredientIds: string[];
  onApply: (result: LabelPasteResult) => void;
  /** 사전에 없는 이름을 성분 사전 관리로 보낸다(자동 생성하지 않는다). */
  onRequestCreateIngredient?: (name: string) => void;
  disabled?: boolean;
}

const NUTRITION_LABEL: Record<ParsedNutritionKey, string> = {
  crude_protein: '조단백질',
  crude_fat: '조지방',
  crude_fiber: '조섬유',
  crude_ash: '조회분',
  moisture: '수분',
  calcium: '칼슘',
  phosphorus: '인',
};

/**
 * 사전은 화면을 쓰는 동안 바뀌지 않는다. 한 번 받아 두고 다시 쓴다.
 * (이 파일은 컴포넌트만 내보낸다 — fast refresh 가 깨지지 않도록.)
 */
let dictionaryCache: IngredientDictionaryEntry[] | null = null;

/**
 * 라벨 원문 붙여넣기.
 *
 * 제조사 페이지의 원재료·보증성분 표기를 그대로 붙여넣으면 성분 연결과 보증성분
 * 일곱 칸을 한 번에 채운다. 성분을 하나씩 검색해 붙이던 작업(제품당 10~30회)이
 * 붙여넣기 한 번과 확인 한 번으로 줄어든다.
 *
 * 다만 바로 저장하지 않는다. 무엇이 무엇에 연결됐는지 보여 주고 사람이 '적용'을
 * 누르게 한다 — 이 연결이 알레르기·위험성분 판정의 근거가 되기 때문이다.
 */
const ProductLabelPasteBox: React.FC<Props> = ({
  linkedIngredientIds,
  onApply,
  onRequestCreateIngredient,
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<
    { matched: { name: string; entry: IngredientDictionaryEntry }[]; unmatched: string[]; nutrition: LabelPasteResult['nutrition'] } | null
  >(null);

  const analyse = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const parsed = parseProductLabel(text);
      if (!dictionaryCache) dictionaryCache = await fetchIngredientDictionary();
      const { matched, unmatched } = matchIngredientNames(parsed.ingredients, dictionaryCache);
      setResult({ matched, unmatched, nutrition: parsed.nutrition });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setResult(null);
    } finally {
      setBusy(false);
    }
  }, [text]);

  const linked = new Set(linkedIngredientIds);
  const toAdd = result?.matched.filter((item) => !linked.has(item.entry.id)) ?? [];
  const nutritionEntries = Object.entries(result?.nutrition ?? {}) as [ParsedNutritionKey, number][];
  const nothingToApply = toAdd.length === 0 && nutritionEntries.length === 0;

  return (
    <div className="admin-form-group">
      <label>라벨 원문 붙여넣기</label>
      <p className="admin-item-sub" style={{ marginTop: 0, marginBottom: 8, lineHeight: 1.6 }}>
        제조사 공식 페이지의 <strong>원재료명·보증성분</strong> 표기를 그대로 붙여넣으세요.
        적힌 것만 읽습니다 — 사전에 없는 이름은 연결하지 않고 따로 알려 드립니다.
      </p>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={5}
        disabled={disabled || busy}
        placeholder={'원재료명: 닭고기, 현미, 감자전분...\n보증성분: 조단백질 30% 이상, 조지방 18% 이상...'}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          type="button"
          className="admin-btn-soft"
          disabled={disabled || busy || !text.trim()}
          onClick={analyse}
        >
          <ClipboardPaste size={15} /> {busy ? '읽는 중…' : '원문에서 찾기'}
        </button>
        {result && (
          <button
            type="button"
            className="admin-btn-primary"
            disabled={disabled || nothingToApply}
            onClick={() => {
              onApply({ ingredients: toAdd.map((item) => item.entry), nutrition: result.nutrition });
              setResult(null);
              setText('');
            }}
          >
            적용 ({toAdd.length}개 성분{nutritionEntries.length > 0 ? ` · 보증성분 ${nutritionEntries.length}칸` : ''})
          </button>
        )}
      </div>

      {error && <p className="admin-item-sub" style={{ color: '#dc2626', marginTop: 8 }}>원문을 읽지 못했습니다: {error}</p>}

      {result && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {nutritionEntries.length > 0 && (
            <div>
              <strong style={{ fontSize: 13 }}>보증성분 {nutritionEntries.length}칸</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {nutritionEntries.map(([key, value]) => (
                  <span className="admin-tag" key={key}>{NUTRITION_LABEL[key]} {value}%</span>
                ))}
              </div>
            </div>
          )}

          <div>
            <strong style={{ fontSize: 13 }}>
              찾은 성분 {result.matched.length}개{toAdd.length !== result.matched.length ? ` (새로 추가 ${toAdd.length}개)` : ''}
            </strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {result.matched.length === 0 ? (
                <span className="admin-item-sub">사전에서 찾은 성분이 없습니다.</span>
              ) : result.matched.map((item) => (
                <span
                  className={`admin-tag ${item.entry.riskLevel === 'danger' ? 'red' : item.entry.riskLevel === 'caution' ? 'orange' : 'green'}`}
                  key={item.entry.id}
                  title={item.name === item.entry.nameKo ? undefined : `라벨 표기: ${item.name}`}
                >
                  {item.entry.nameKo}
                  {linked.has(item.entry.id) ? ' · 이미 연결됨' : ''}
                </span>
              ))}
            </div>
          </div>

          {result.unmatched.length > 0 && (
            <div>
              <strong style={{ fontSize: 13 }}>사전에 없는 이름 {result.unmatched.length}개</strong>
              <p className="admin-item-sub" style={{ margin: '4px 0 6px' }}>
                연결하지 않았습니다. 같은 원료인지 확인하고 사전에 등록하거나 별칭을 추가해 주세요.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {result.unmatched.map((name) => (
                  <button
                    type="button"
                    key={name}
                    className="admin-tag"
                    style={{ cursor: onRequestCreateIngredient ? 'pointer' : 'default' }}
                    disabled={!onRequestCreateIngredient || disabled}
                    onClick={() => onRequestCreateIngredient?.(name)}
                  >
                    {name} {onRequestCreateIngredient && <Plus size={12} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductLabelPasteBox;
