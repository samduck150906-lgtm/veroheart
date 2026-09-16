import { useEffect } from 'react';

/**
 * 작성 중인 내용이 있을 때 페이지를 벗어나려 하면 브라우저 경고를 띄운다.
 *
 * 제품 등록 폼은 입력 항목이 많아 다시 채우는 비용이 크다. 모달 바깥 클릭은
 * 이미 막아 두었지만, 브라우저 뒤로가기·탭 닫기·새로고침은 그것으로 막히지
 * 않는다. 여기서 그 경로를 덮는다.
 *
 * 문구는 브라우저가 정한 것으로 고정된다(피싱 방지). 우리가 넣는 문자열은
 * 표시되지 않지만, 값을 반환해야 경고가 뜨는 규약이라 유지한다.
 */
export function useUnsavedChangesWarning(hasUnsavedChanges: boolean): void {
  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // 일부 브라우저는 returnValue 가 설정돼야 경고를 띄운다.
      event.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsavedChanges]);
}

export default useUnsavedChangesWarning;
