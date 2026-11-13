import type { Product } from '../types';

export function NutrientEvidenceDetails({ evidence }: { evidence: Product['nutrientEvidence'] }) {
  if (!evidence?.length) return null;
  // A profile projection is a copy, not a second measurement. Prefer the
  // captured document for an identical value, including a document from another
  // official regional page. A copied profile is never an independent source.
  const displayed = evidence.filter(item => item.sourceVersion !== 'profile-projection-v1' || !evidence.some(other =>
    other.sourceVersion !== 'profile-projection-v1' && other.nutrientCode === item.nutrientCode &&
    other.value === item.value && other.unit === item.unit && other.basis === item.basis));
  const qualifiers = { minimum: '이상', maximum: '이하', typical: '대표값', exact: '표시값', unspecified: '표시 조건 미기록' };
  const bases = { as_fed: '제품 그대로 기준', as_sold: '분말 제품 그대로 기준 · 조유 후 수치 아님', dry_matter: '건물 기준', per_energy: '에너지 기준', unspecified: '기준 미기록' };
  return <details style={{ margin: '16px 0', fontSize: 13, lineHeight: 1.6 }}>
    <summary style={{ cursor: 'pointer', fontWeight: 700 }}>제품에 표시된 영양소와 근거</summary>
    <p>원재료의 일반적인 성분 관계와 구분되는 제품 표시 정보입니다. 이상·이하 조건이 기록되지 않은 과거 자료는 그 조건을 임의로 가정하지 않습니다.</p>
    <ul style={{ paddingLeft: 20 }}>{displayed.map((item, index) => <li key={`${item.nutrientCode}-${index}`}>
      {item.name}: {item.value} {item.unit} · {qualifiers[item.qualifier]} · {bases[item.basis]}{' '}
      <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">출처</a>
    </li>)}</ul>
  </details>;
}
