import React, { useEffect, useState } from 'react';
import BottomSheet from './BottomSheet';
import { notify } from '../store/useNotification';
import { createProductRequest } from '../lib/supabase';

interface ProductRequestSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** 검색 결과가 없던 검색어 — 제품명 기본값으로 채운다. */
  searchQuery: string;
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 6,
  color: 'var(--text-main)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1.5px solid var(--border, #e5e7eb)',
  fontSize: 15,
  background: 'var(--surface, #fff)',
  color: 'var(--text-main)',
};

/**
 * 찾는 제품이 없을 때 등록을 요청하는 시트.
 *
 * 예전에는 mailto: 링크를 열었다. 메일 앱이 없는 기기에서는 아무 일도 일어나지
 * 않았고, 열리더라도 기록이 남지 않아 무엇이 얼마나 요청됐는지 아무도 몰랐다.
 * 지금은 요청을 DB 에 남겨 관리자가 보고 제품을 채울 수 있게 한다.
 */
export default function ProductRequestSheet({
  isOpen,
  onClose,
  searchQuery,
}: ProductRequestSheetProps) {
  const [name, setName] = useState(searchQuery);
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 다른 검색어로 다시 열면 기본값을 새로 채운다.
  useEffect(() => {
    if (isOpen) {
      setName(searchQuery);
      setUrl('');
      setNote('');
    }
  }, [isOpen, searchQuery]);

  const submit = async () => {
    if (submitting) return; // 중복 클릭 방지
    const trimmed = name.trim();
    if (!trimmed) {
      notify.warning('등록을 요청할 제품명을 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createProductRequest({
        requestedName: trimmed,
        searchQuery,
        productUrl: url,
        note,
      });
      if (result.ok === true) {
        notify.success('등록 요청이 완료됐어요. 확인 후 반영할게요.');
        onClose();
        return;
      }
      // 이미 요청한 제품은 실패가 아니라 "접수됨"이므로 시트를 닫아 준다.
      if (result.ok === false && result.reason === 'duplicate') {
        notify.info(result.message);
        onClose();
        return;
      }
      if (result.ok === false) notify.error(result.message);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '요청을 저장하지 못했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="제품 등록 요청"
      footer={(
        <button
          type="button"
          className="btn-primary"
          style={{ width: '100%' }}
          onClick={submit}
          disabled={submitting}
        >
          {submitting ? '보내는 중…' : '등록 요청하기'}
        </button>
      )}
    >
      <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 18 }}>
        찾으시는 제품이 아직 베로로에 없어요. 알려 주시면 확인 후 등록할게요.
      </p>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="request-name">제품명</label>
        <input
          id="request-name"
          style={inputStyle}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="예) 오리젠 오리지널 캣"
          maxLength={200}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="request-url">제품 링크 (선택)</label>
        <input
          id="request-url"
          style={inputStyle}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="구매처 주소를 붙여 넣어 주세요"
          inputMode="url"
          maxLength={500}
        />
      </div>

      <div>
        <label style={labelStyle} htmlFor="request-note">남기실 말 (선택)</label>
        <textarea
          id="request-note"
          style={{ ...inputStyle, minHeight: 88, resize: 'vertical' }}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="브랜드, 용량처럼 제품을 찾는 데 도움이 될 정보를 적어 주세요."
          maxLength={1000}
        />
      </div>
    </BottomSheet>
  );
}
