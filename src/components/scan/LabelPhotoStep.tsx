import type { ChangeEvent } from 'react';

interface Props {
  title: string;
  inputLabel: string;
  guidance: string;
  path: string | null;
  busy: boolean;
  onSelect(file: File): void;
}

export default function LabelPhotoStep({ title, inputLabel, guidance, path, busy, onSelect }: Props) {
  const inputId = `scan-photo-${inputLabel.replace(/\s/g, '-')}`;
  return (
    <section style={{ border: `1.5px solid ${path ? '#C6DBB4' : '#E8E7DF'}`, borderRadius: 18, background: path ? '#F7FBF3' : '#fff', padding: 17, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 14, display: 'grid', placeItems: 'center', flex: 'none', background: path ? '#DFF2CF' : '#F2F1EB', color: '#36352F', fontSize: 20 }}>
        {path ? '✓' : '＋'}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <h2 style={{ margin: 0, fontSize: 16, color: '#15150F' }}>{title}</h2>
        <p style={{ margin: '5px 0 0', fontSize: 12.5, lineHeight: 1.45, color: '#74736A' }}>{path ? '사진 저장됨' : guidance}</p>
      </div>
      <label htmlFor={inputId} style={{ flex: 'none', borderRadius: 11, padding: '10px 12px', background: '#15150F', color: '#fff', fontSize: 12.5, fontWeight: 800, cursor: busy ? 'wait' : 'pointer', opacity: busy ? .55 : 1 }}>
        {busy ? '저장 중' : path ? '교체' : '촬영'}
      </label>
      <input
        id={inputId}
        aria-label={inputLabel}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        disabled={busy}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files?.[0];
          if (file) onSelect(file);
          event.target.value = '';
        }}
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}
      />
    </section>
  );
}
