import { useState } from 'react';

export interface CorrectionField {
  key: string;
  label: string;
  value: string;
  type?: 'text' | 'number' | 'date' | 'time' | 'textarea';
  options?: { value: string; label: string }[];
}
export default function AdminCorrectionDialog({
  title,
  fields,
  onSave,
  onClose,
}: {
  title: string;
  fields: CorrectionField[];
  onSave: (values: Record<string, string>, reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.value])),
  );
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (!reason.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await onSave(values, reason.trim());
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="admin-modal-backdrop">
      <form
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <h3>{title}</h3>
        <p className="admin-modal-desc">
          보호자 문의를 확인한 뒤 정정해 주세요. 사유와 변경 전후 값이 관리자
          변경 이력에 남습니다.
        </p>
        {fields.map((f) => (
          <label
            className="admin-form-group"
            key={f.key}
            style={{ display: 'block', marginTop: 12 }}
          >
            {f.label}
            {f.options ? (
              <select
                value={values[f.key]}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.key]: e.target.value }))
                }
              >
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea
                value={values[f.key]}
                maxLength={2000}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.key]: e.target.value }))
                }
              />
            ) : (
              <input
                type={f.type ?? 'text'}
                value={values[f.key]}
                step={f.type === 'number' ? 'any' : undefined}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.key]: e.target.value }))
                }
              />
            )}
          </label>
        ))}
        <label
          className="admin-form-group"
          style={{ display: 'block', marginTop: 12 }}
        >
          처리 사유 (필수)
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            required
          />
        </label>
        {error && (
          <p role="alert" className="admin-error">
            {error}
          </p>
        )}
        <div className="admin-modal-footer">
          <button
            type="button"
            className="admin-btn-soft"
            onClick={onClose}
            disabled={busy}
          >
            취소
          </button>
          <button
            type="submit"
            className="admin-btn-primary"
            disabled={busy || !reason.trim()}
          >
            {busy ? '저장 중…' : '정정 저장'}
          </button>
        </div>
      </form>
    </div>
  );
}
