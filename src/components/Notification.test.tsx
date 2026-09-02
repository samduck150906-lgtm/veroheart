import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import Notification from './Notification';
import { NOTIFICATION_EXIT_MS, notify, useNotification } from '../store/useNotification';

describe('상단 토스트 알림', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useNotification.setState({ notifications: [] });
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('알림이 없으면 아무것도 그리지 않는다', () => {
    const { container } = render(<Notification />);
    expect(container.innerHTML).toBe('');
  });

  it('성공 알림을 상단 토스트 한 줄로 띄운다', () => {
    render(<Notification />);
    act(() => notify.success('로그인되었습니다!'));

    const toast = screen.getByRole('status');
    expect(toast.textContent).toContain('로그인되었습니다!');
    expect(toast.getAttribute('data-type')).toBe('success');
    expect(toast.className).toContain('vr-toast');
    // 화면을 꽉 채우던 파스텔 상자 스타일로 되돌아가지 않았는지 함께 본다.
    expect(toast.className).not.toContain('bg-green-50');
    expect(toast.className).not.toContain('slide-in-from-right-full');
  });

  it('닫기(X) 버튼을 두지 않는다', () => {
    render(<Notification />);
    act(() => notify.success('로그인되었습니다!'));

    // 스스로 사라지고 눌러서도 닫히므로 별도 버튼이 없어야 한다.
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('오류·경고는 즉시 읽히도록 alert 로 전달한다', () => {
    render(<Notification />);
    act(() => notify.error('이메일 또는 비밀번호가 올바르지 않습니다.'));
    expect(screen.getByRole('alert').getAttribute('data-type')).toBe('error');

    act(() => { useNotification.setState({ notifications: [] }); });
    act(() => notify.warning('요청이 너무 잦아요.'));
    expect(screen.getByRole('alert').getAttribute('data-type')).toBe('warning');
  });

  it('시간이 지나면 퇴장 애니메이션을 거쳐 스스로 사라진다', () => {
    render(<Notification />);
    act(() => notify.success('로그인되었습니다!'));
    expect(screen.getByRole('status').hasAttribute('data-leaving')).toBe(false);

    // 표시 시간이 끝나면 바로 지우지 않고 '사라지는 중' 으로 표시한다.
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByRole('status').hasAttribute('data-leaving')).toBe(true);

    act(() => { vi.advanceTimersByTime(NOTIFICATION_EXIT_MS); });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('눌러서 바로 닫을 수 있다', () => {
    render(<Notification />);
    act(() => notify.success('로그인되었습니다!'));

    act(() => { screen.getByRole('status').click(); });
    expect(screen.getByRole('status').hasAttribute('data-leaving')).toBe(true);

    act(() => { vi.advanceTimersByTime(NOTIFICATION_EXIT_MS); });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('자동 종료와 누르기가 겹쳐도 남은 알림이 엉뚱하게 지워지지 않는다', () => {
    render(<Notification />);
    act(() => notify.success('로그인되었습니다!'));
    act(() => notify.info('두 번째 알림'));
    expect(screen.getAllByRole('status')).toHaveLength(2);

    // 첫 알림을 눌러 닫은 뒤, 그 알림의 자동 종료 타이머까지 흘려보낸다.
    act(() => { screen.getAllByRole('status')[0].click(); });
    act(() => { vi.advanceTimersByTime(NOTIFICATION_EXIT_MS); });
    const remaining = screen.getAllByRole('status');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].textContent).toContain('두 번째 알림');

    act(() => { vi.advanceTimersByTime(5000); });
    expect(useNotification.getState().notifications).toHaveLength(0);
  });

  it('여러 알림을 쌓아서 보여준다', () => {
    render(<Notification />);
    act(() => notify.success('첫 번째'));
    act(() => notify.error('두 번째'));

    expect(screen.getByRole('status').textContent).toContain('첫 번째');
    expect(screen.getByRole('alert').textContent).toContain('두 번째');
  });
});
