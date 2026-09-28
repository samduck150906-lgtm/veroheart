type Step = 'photos' | 'processing' | 'confirm' | 'published';

const STEPS: Array<{ id: Step; label: string }> = [
  { id: 'photos', label: '사진' },
  { id: 'processing', label: '추출' },
  { id: 'confirm', label: '확인' },
  { id: 'published', label: '공개' },
];

export default function ScanProgress({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);
  return (
    <ol aria-label="등록 진행 상태" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, margin: '18px 0 22px', padding: 0, listStyle: 'none' }}>
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={step.id} aria-current={active ? 'step' : undefined} style={{ textAlign: 'center' }}>
            <div style={{ height: 4, borderRadius: 999, background: done || active ? '#FFD90A' : '#E8E7DF', marginBottom: 7 }} />
            <span style={{ fontSize: 11, fontWeight: active ? 800 : 650, color: active ? '#15150F' : '#89887E' }}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
