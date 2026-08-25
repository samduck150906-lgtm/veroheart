/**
 * 회귀 테스트 — 배경 스크롤 잠금.
 *
 * 배경 1: 이 앱의 스크롤 영역은 body 가 아니라 .app-main 이다(#root 는
 *         overflow:hidden). 예전 바텀시트는 body.overflow 만 건드려서 시트가
 *         열려 있어도 뒤 화면이 그대로 스크롤됐다.
 * 배경 2: 정리 함수가 없어, 시트 안에서 화면을 이동해 컴포넌트가 사라지면
 *         잠금이 그대로 남았다.
 * 배경 3: 시트가 겹쳐 열렸다가 하나만 닫히면 아직 열려 있는 시트 뒤가 풀렸다.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __resetAppScrollLock, lockAppScroll, unlockAppScroll } from './scroll';

function mountAppMain(): HTMLElement {
  const main = document.createElement('div');
  main.className = 'app-main';
  document.body.appendChild(main);
  return main;
}

beforeEach(() => {
  document.body.innerHTML = '';
  document.body.style.overflow = '';
  __resetAppScrollLock();
});

afterEach(() => {
  __resetAppScrollLock();
  document.body.innerHTML = '';
});

describe('배경 스크롤 잠금', () => {
  it('실제 스크롤 컨테이너(.app-main)를 잠근다', () => {
    const main = mountAppMain();

    lockAppScroll();
    expect(main.style.overflow).toBe('hidden');
    // 관리자 데스크톱 모드에서는 body 가 스크롤되므로 body 도 함께 잠근다.
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('잠금을 풀면 원래 값으로 되돌린다', () => {
    const main = mountAppMain();
    main.style.overflow = 'auto';

    lockAppScroll();
    unlockAppScroll();

    expect(main.style.overflow).toBe('auto');
    expect(document.body.style.overflow).toBe('');
  });

  it('시트가 겹쳐 열리면 마지막 하나가 닫힐 때까지 잠금을 유지한다', () => {
    const main = mountAppMain();

    lockAppScroll();
    lockAppScroll();

    unlockAppScroll();
    expect(main.style.overflow).toBe('hidden');

    unlockAppScroll();
    expect(main.style.overflow).toBe('');
  });

  it('잠그지 않은 상태에서 풀어도 스크롤을 망가뜨리지 않는다', () => {
    const main = mountAppMain();
    main.style.overflow = 'auto';

    unlockAppScroll();
    expect(main.style.overflow).toBe('auto');

    // 그 뒤에도 정상적으로 잠기고 풀린다.
    lockAppScroll();
    expect(main.style.overflow).toBe('hidden');
    unlockAppScroll();
    expect(main.style.overflow).toBe('auto');
  });

  it('.app-main 이 아직 없어도 던지지 않는다', () => {
    expect(() => {
      lockAppScroll();
      unlockAppScroll();
    }).not.toThrow();
  });
});
