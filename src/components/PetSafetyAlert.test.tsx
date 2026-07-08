import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PetSafetyAlert from './PetSafetyAlert';
import type { PetSafetyScan } from '../utils/petSafety';

const emptyScan: PetSafetyScan = { flaggedCount: 0, allergenNames: [], dangerNames: [], flagged: [] };

const dangerScan: PetSafetyScan = {
  flaggedCount: 2,
  allergenNames: ['닭고기'],
  dangerNames: ['BHA'],
  flagged: [
    { id: '1', name: '위험사료', brand: '테스트', imageUrl: '', hits: ['BHA'] },
    { id: '2', name: '알러지사료', brand: '테스트', imageUrl: '', hits: ['닭고기'] },
  ],
};

describe('PetSafetyAlert', () => {
  it('걸린 제품이 없으면 아무것도 렌더하지 않는다', () => {
    expect(renderToStaticMarkup(<PetSafetyAlert scan={emptyScan} petName="로니" onOpen={() => {}} />)).toBe('');
  });

  it('위험 성분이 있으면 경고 문구·성분·제품 수를 렌더한다', () => {
    const html = renderToStaticMarkup(<PetSafetyAlert scan={dangerScan} petName="로니" onOpen={() => {}} />);
    expect(html).toContain('로니가 주의할 성분이 있어요');
    expect(html).toContain('최근 본 제품 2개');
    expect(html).toContain('BHA');
    expect(html).toContain('🚨'); // danger 톤
  });

  it('알레르기만 있으면 주의(⚠️) 톤으로 렌더한다', () => {
    const allergyOnly: PetSafetyScan = {
      flaggedCount: 1,
      allergenNames: ['소고기'],
      dangerNames: [],
      flagged: [{ id: '1', name: '소고기사료', brand: '테스트', imageUrl: '', hits: ['소고기'] }],
    };
    const html = renderToStaticMarkup(<PetSafetyAlert scan={allergyOnly} petName="우리 아이" onOpen={() => {}} />);
    expect(html).toContain('⚠️');
    expect(html).toContain('소고기');
  });
});
