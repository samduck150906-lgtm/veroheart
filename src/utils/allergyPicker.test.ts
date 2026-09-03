import { describe, expect, it } from 'vitest';
import {
  COMMON_ALLERGY_SUGGESTIONS,
  lifeStageLabel,
  petAgeDisplay,
  rankAllergyCandidates,
} from './allergyPicker';

const DICT = ['닭고기', '닭가슴살', '오리', '오리지방', '칠면조', '연어', '연어오일', '현미', '유기농 귀리'];

describe('회피 성분 검색', () => {
  it('성분 DB 에서 검색해 고른다 — 고정 5개 목록에 없던 것도 나온다', () => {
    // 예전 선택지는 닭고기·소고기·연어·곡물·인공색소 다섯 개뿐이었다.
    expect(rankAllergyCandidates('오리', DICT)).toContain('오리');
    expect(rankAllergyCandidates('칠면조', DICT)).toContain('칠면조');
  });

  it('앞에서부터 일치하는 이름을 먼저 보여준다', () => {
    const results = rankAllergyCandidates('연어', DICT);
    expect(results[0]).toBe('연어');
    expect(results).toContain('연어오일');
  });

  it('이미 고른 성분은 다시 제안하지 않는다', () => {
    expect(rankAllergyCandidates('닭', DICT, ['닭고기'])).not.toContain('닭고기');
    expect(rankAllergyCandidates('닭', DICT, ['닭고기'])).toContain('닭가슴살');
  });

  it('띄어쓰기와 대소문자를 무시한다', () => {
    expect(rankAllergyCandidates('유기농귀리', DICT)).toContain('유기농 귀리');
  });

  it('검색어가 비면 결과도 비운다 — 전체 목록을 쏟아내지 않는다', () => {
    expect(rankAllergyCandidates('', DICT)).toEqual([]);
    expect(rankAllergyCandidates('   ', DICT)).toEqual([]);
  });

  it('결과 수에 상한이 있다', () => {
    const many = Array.from({ length: 50 }, (_, i) => `닭고기${i}`);
    expect(rankAllergyCandidates('닭', many).length).toBeLessThanOrEqual(12);
  });

  it('검색 전에 보여줄 흔한 알레르겐에 오리·칠면조·달걀이 있다', () => {
    for (const name of ['오리', '칠면조', '달걀']) {
      expect(COMMON_ALLERGY_SUGGESTIONS).toContain(name);
    }
  });
});

describe('반려동물 나이 표기', () => {
  it('실제 나이를 앞세우고 단계를 보조로 붙인다', () => {
    // 예전에는 '아기 / 성인 / 시니어' 뿐이고 실제 나이는 화면에 없었다.
    expect(petAgeDisplay(2, 'Dog')).toBe('2살 · 청년기');
    expect(petAgeDisplay(12, 'Dog')).toBe('12살 · 시니어');
  });

  it('개와 고양이의 단계 기준을 나눈다', () => {
    expect(lifeStageLabel(0.5, 'Dog')).toBe('퍼피');
    expect(lifeStageLabel(0.5, 'Cat')).toBe('키튼');
    // 10살에서 갈린다: 개는 이미 시니어, 고양이는 아직 중년기다.
    expect(lifeStageLabel(10, 'Dog')).toBe('시니어');
    expect(lifeStageLabel(10, 'Cat')).toBe('중년기');
  });

  it('한 살 미만과 이상한 값도 안전하게 표기한다', () => {
    expect(petAgeDisplay(0.4, 'Dog')).toBe('1살 미만 · 퍼피');
    expect(petAgeDisplay(Number.NaN, 'Dog')).toBe('1살 미만 · 퍼피');
    expect(petAgeDisplay(-3, 'Cat')).toBe('1살 미만 · 키튼');
  });
});
