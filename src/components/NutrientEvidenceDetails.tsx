import type { Product } from '../types';

export function NutrientEvidenceDetails({ evidence }: { evidence: Product['nutrientEvidence'] }) {
  if (!evidence?.length) return null;
  const qualifiers = { minimum: '이상', maximum: '이하', typical: '대표값', exact: '표시값', unspecified: '표시 조건 미기록' };
  const bases = { as_fed: '제품 그대로 기준', dry_matter: '건물 기준', per_energy: '에너지 기준', unspecified: '기준 미기록' };
  return <details style={{ margin: '16px 0', fontSize: 13, lineHeight: 1.6 }}>
    <summary style={{ cursor: 'pointer', fontWeight: 700 }}>제품에 표시된 영양소와 근거</summary>
    <p>원재료의 일반적인 성분 관계와 구분되는 제품 표시 정보입니다. 이상·이하 조건이 기록되지 않은 과거 자료는 그 조건을 임의로 가정하지 않습니다.</p>
    <ul style={{ paddingLeft: 20 }}>{evidence.map((item, index) => <li key={`${item.nutrientCode}-${index}`}>
      {item.name}: {item.value} {item.unit} · {qualifiers[item.qualifier]} · {bases[item.basis]}{' '}
      <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">출처</a>
    </li>)}</ul>
  </details>;
}
