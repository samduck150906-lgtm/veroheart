import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUnsavedChangesWarning } from './useUnsavedChangesWarning';

/**
 * 제품 등록 폼은 입력 항목이 많아 다시 채우는 비용이 크다. 모달 바깥 클릭은
 * 이미 막았지만 탭 닫기·새로고침은 그것으로 막히지 않는다.
 */
describe('작성 중 이탈 경고', () => {
  it('작성 중이면 beforeunload 를 구독한다', () => {
    const add = vi.spyOn(window, 'addEventListener');
    renderHook(() => useUnsavedChangesWarning(true));
    expect(add).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    add.mockRestore();
  });

  it('작성 중이 아니면 구독하지 않는다', () => {
    const add = vi.spyOn(window, 'addEventListener');
    renderHook(() => useUnsavedChangesWarning(false));
    expect(add).not.toHaveBeenCalledWith('beforeunload', expect.any(Function));
    add.mockRestore();
  });

  it('폼을 닫으면 구독을 해제한다', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { rerender } = renderHook(
      ({ dirty }) => useUnsavedChangesWarning(dirty),
      { initialProps: { dirty: true } },
    );
    rerender({ dirty: false });
    expect(remove).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    remove.mockRestore();
  });

  it('경고가 뜨도록 returnValue 를 설정한다', () => {
    let handler: ((event: BeforeUnloadEvent) => unknown) | null = null;
    const add = vi.spyOn(window, 'addEventListener').mockImplementation((type, fn) => {
      if (type === 'beforeunload') handler = fn as (event: BeforeUnloadEvent) => unknown;
    });
    renderHook(() => useUnsavedChangesWarning(true));
    add.mockRestore();

    expect(handler).not.toBeNull();
    const event = { preventDefault: vi.fn(), returnValue: undefined } as unknown as BeforeUnloadEvent;
    handler!(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.returnValue).toBe('');
  });
});
