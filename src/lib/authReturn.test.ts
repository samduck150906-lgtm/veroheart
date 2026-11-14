import { afterEach,describe,expect,it } from 'vitest';
import { safeAuthReturn,rememberAuthReturn,consumeAuthReturn } from './authReturn';
afterEach(()=>sessionStorage.clear());
describe('로그인 후 내부 복귀',()=>{
  it('등록 폼의 탭과 새 반려동물 의도를 보존하고 한 번만 소비한다',()=>{
    rememberAuthReturn('/profile?tab=pets&add=1');
    expect(consumeAuthReturn()).toBe('/profile?tab=pets&add=1'); expect(consumeAuthReturn()).toBe('/profile');
  });
  it.each(['https://example.org','//example.org','/\\example.org','/%2fexample.org','/%252fexample.org','/LOGIN','/auth/callback','/%61uth/callback','/%00','/%zz'])('외부·인코딩 우회·로그인 루프를 차단한다: %s',path=>{
    expect(safeAuthReturn(path)).toBe('/profile');
  });
});
