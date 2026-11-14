import type { MaterialConstituent, MaterialNutrientReference } from '../analysis/materialComposition';

export function MaterialCompositionDetails({ name, edges = [], references = [] }: { name: string; edges?: MaterialConstituent[]; references?: MaterialNutrientReference[] }) {
  if (!edges.length && !references.length) return null;
  const sources = [...new Map(edges.map(edge => [edge.sourceUrl, edge.sourceVersion])).entries()];
  return <section aria-label="원재료와 영양소의 연결" style={{ marginTop: 20, lineHeight: 1.65 }}>
    <h3 style={{ fontSize: 16 }}>원재료 → 구성 성분 → 영양소</h3>
    <ul style={{ paddingLeft: 20 }}>
      {edges.map((edge, index) => <li key={`${edge.constituentCode}-${index}`}>
        {name} → {edge.constituentName} → {edge.nutrientName}
        {edge.amount !== null ? <span> (원료 참고값 {edge.amount} {edge.unit}, {edge.basis === 'dry_matter' ? '건물 기준' : '원물 기준'})</span> : null}
      </li>)}
    </ul>
    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
      원재료가 어떤 영양소의 공급원이 되는지 설명합니다. 제품의 실제 함량·소화율이나 충분량을 뜻하지 않습니다.
      제품의 함량 분석에는 별도로 표시된 영양정보를 사용합니다.
    </p>
    {sources.map(([url, version]) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: 12 }}>영양 관계 근거 보기 · {version}</a>)}
    {references.length > 0 && <details style={{ marginTop: 12 }}>
      <summary>같은 원재료·가공 형태의 영양 참고값 {references.length}개</summary>
      <p style={{ fontSize: 12 }}>한국표준사료성분표 2022를 옮긴 원료 참고값입니다. 제품의 실제 함량이 아니며, 다른 축종의 소화율·대사에너지는 개·고양이 분석에 사용하지 않습니다. 총에너지는 표시 대사에너지와 구분합니다.</p>
      <dl style={{ margin: 0 }}>{references.map(reference => <div key={reference.sourceLocator} style={{ margin: '8px 0' }}>
        <dt style={{ fontWeight: 700 }}>{reference.name}</dt>
        <dd style={{ margin: 0 }}>{reference.value} {reference.unit} · {reference.basis === 'as_fed' ? '원물 기준' : '건물 기준'}
          {reference.quality === 'inconsistent' && <strong> · 수치 불일치로 계산 제외</strong>}
          <a href={reference.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 8 }}>자료 출처</a>
        </dd>
      </div>)}</dl>
    </details>}
  </section>;
}
