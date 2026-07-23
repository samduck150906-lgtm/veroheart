import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAppScrollEl, getAppScrollTop, scrollAppToTop } from './scroll';

describe('scroll util — .app-main 컨테이너 기준(window 아님)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('.app-main 이 없으면 getAppScrollEl 은 null', () => {
    expect(getAppScrollEl()).toBeNull();
  });

  it('.app-main 요소를 찾고 그 scrollTop 을 읽는다', () => {
    const main = document.createElement('div');
    main.className = 'app-main';
    document.body.appendChild(main);
    Object.defineProperty(main, 'scrollTop', { value: 137, configurable: true });

    expect(getAppScrollEl()).toBe(main);
    expect(getAppScrollTop()).toBe(137);
  });

  it('scrollAppToTop(false) 은 window 가 아니라 컨테이너의 scrollTo(top:0)를 호출한다', () => {
    const main = document.createElement('div');
    main.className = 'app-main';
    const spy = vi.fn();
    main.scrollTo = spy as unknown as typeof main.scrollTo;
    document.body.appendChild(main);

    scrollAppToTop(false);
    expect(spy).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
  });
});
