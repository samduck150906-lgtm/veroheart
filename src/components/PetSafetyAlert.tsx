import type { PetSafetyScan } from '../utils/petSafety';

/**
 * 홈 화면 위험 성분 경고 배너.
 * 최근 본 제품 스캔 결과에서 위험(danger) 또는 프로필 알레르기 성분이 걸린 경우에만 노출.
 */
export default function PetSafetyAlert({
  scan,
  petName,
  onOpen,
}: {
  scan: PetSafetyScan;
  petName: string;
  onOpen: (productId: string) => void;
}) {
  if (scan.flaggedCount === 0) return null;

  const hasDanger = scan.dangerNames.length > 0;
  const tone = hasDanger
    ? { bg: '#FDECEE', border: '#FECDD3', text: '#BE123C' }
    : { bg: '#FEF6E0', border: '#FDE68A', text: '#92400E' };

  const names = [...scan.dangerNames, ...scan.allergenNames];
  const shown = names.slice(0, 3).join(' · ');
  const more = names.length > 3 ? ` 외 ${names.length - 3}` : '';
  const name = petName && petName !== '우리 아이' ? petName : '우리 아이';

  return (
    <section style={{ marginBottom: '16px' }}>
      <div style={{ background: tone.bg, border: `1px solid ${tone.border}`, borderRadius: '18px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <span aria-hidden style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0 }}>
            {hasDanger ? '🚨' : '⚠️'}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: tone.text }}>
              {name}가 주의할 성분이 있어요
            </div>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: tone.text, opacity: 0.9, marginTop: '3px', lineHeight: 1.5 }}>
              최근 본 제품 {scan.flaggedCount}개에서 <b>{shown}{more}</b> 발견
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {scan.flagged.slice(0, 6).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onOpen(f.id)}
              aria-label={`${f.name} 성분 분석 보기`}
              style={{ flexShrink: 0, width: '64px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
            >
              <img
                src={f.imageUrl || '/placeholder.png'}
                alt={f.name}
                loading="lazy"
                decoding="async"
                onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
                style={{ width: '64px', height: '64px', borderRadius: '14px', objectFit: 'cover', background: '#fff', border: `1px solid ${tone.border}` }}
              />
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: tone.text, marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {f.hits[0]}
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
