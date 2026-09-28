import { useMemo, useState } from 'react';

import type { ExtractedProductLabel, LabelComponent, ProductSpecies, ProductType } from '../../scan/types';

interface Props {
  initial: ExtractedProductLabel;
  busy: boolean;
  onSubmit(label: ExtractedProductLabel): void;
}

function ComponentRows({
  title,
  rows,
  onChange,
}: {
  title: string;
  rows: LabelComponent[];
  onChange(rows: LabelComponent[]): void;
}) {
  if (!rows.length) return null;
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'grid', gap: 7 }}>
        {rows.map((row, index) => (
          <div key={`${row.name}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr 72px 58px', gap: 7 }}>
            <input aria-label={`${title} ${index + 1} 이름`} value={row.name} onChange={(event) => onChange(rows.map((item, target) => target === index ? { ...item, name: event.target.value } : item))} style={inputStyle} />
            <input aria-label={`${title} ${index + 1} 값`} inputMode="decimal" value={row.value ?? ''} onChange={(event) => {
              const next = event.target.value.trim();
              onChange(rows.map((item, target) => target === index ? { ...item, value: next === '' ? null : Number(next) } : item));
            }} style={inputStyle} />
            <input aria-label={`${title} ${index + 1} 단위`} value={row.unit ?? ''} onChange={(event) => onChange(rows.map((item, target) => target === index ? { ...item, unit: event.target.value || null } : item))} style={inputStyle} />
          </div>
        ))}
      </div>
    </div>
  );
}

const inputStyle = { width: '100%', boxSizing: 'border-box' as const, border: '1.5px solid #E3E2DA', borderRadius: 11, padding: '11px 12px', background: '#fff', fontSize: 14, color: '#15150F' };

export default function ExtractionConfirmStep({ initial, busy, onSubmit }: Props) {
  const [name, setName] = useState(initial.name ?? '');
  const [brand, setBrand] = useState(initial.brand ?? '');
  const [manufacturer, setManufacturer] = useState(initial.manufacturer ?? '');
  const [species, setSpecies] = useState<ProductSpecies>(initial.species ?? 'all');
  const [productType, setProductType] = useState<ProductType>(initial.productType ?? 'food');
  const [ingredientText, setIngredientText] = useState(initial.ingredients.join('\n'));
  const [guaranteedComponents, setGuaranteedComponents] = useState(initial.guaranteedComponents);
  const [registeredComponents, setRegisteredComponents] = useState(initial.registeredComponents);
  const [agreed, setAgreed] = useState(false);
  const ingredients = useMemo(() => ingredientText.split('\n').map((item) => item.trim()).filter(Boolean), [ingredientText]);
  const valid = name.trim() && (brand.trim() || manufacturer.trim()) && agreed;

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <div style={{ padding: 15, borderRadius: 14, background: '#FFF8CF', fontSize: 12.5, lineHeight: 1.55, color: '#5B531B' }}>
        사진에서 읽은 값입니다. 실제 포장과 다른 부분만 고쳐 주세요.
      </div>
      <label style={labelStyle}>제품명<input aria-label="제품명" value={name} onChange={(event) => setName(event.target.value)} style={inputStyle} /></label>
      <label style={labelStyle}>브랜드<input aria-label="브랜드" value={brand} onChange={(event) => setBrand(event.target.value)} style={inputStyle} /></label>
      <label style={labelStyle}>제조사<input aria-label="제조사" value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} style={inputStyle} /></label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label style={labelStyle}>대상
          <select aria-label="대상 반려동물" value={species} onChange={(event) => setSpecies(event.target.value as ProductSpecies)} style={inputStyle}>
            <option value="dog">강아지</option><option value="cat">고양이</option><option value="all">공용</option>
          </select>
        </label>
        <label style={labelStyle}>제품 종류
          <select aria-label="제품 종류" value={productType} onChange={(event) => setProductType(event.target.value as ProductType)} style={inputStyle}>
            <option value="food">사료</option><option value="treat">간식</option><option value="supplement">영양제</option>
          </select>
        </label>
      </div>
      <label style={labelStyle}>원재료 · 한 줄에 하나씩
        <textarea aria-label="원재료" value={ingredientText} onChange={(event) => setIngredientText(event.target.value)} rows={Math.min(10, Math.max(4, ingredients.length))} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }} />
      </label>
      <ComponentRows title="보장성분" rows={guaranteedComponents} onChange={setGuaranteedComponents} />
      <ComponentRows title="등록성분" rows={registeredComponents} onChange={setRegisteredComponents} />
      <label style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '14px 4px', fontSize: 13.5, fontWeight: 750, color: '#36352F' }}>
        <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
        라벨 내용이 실제 포장과 같아요
      </label>
      <button type="button" disabled={!valid || busy} onClick={() => onSubmit({
        name: name.trim(), brand: brand.trim() || null, manufacturer: manufacturer.trim() || null,
        species, productType, ingredients,
        guaranteedComponents,
        registeredComponents,
      })} className="vr-btn vr-btn--primary" style={{ padding: 16, opacity: !valid || busy ? .5 : 1 }}>
        {busy ? '공개 중…' : '확인하고 공개하기'}
      </button>
    </section>
  );
}

const labelStyle = { display: 'grid', gap: 7, fontSize: 13, fontWeight: 800, color: '#36352F' };
