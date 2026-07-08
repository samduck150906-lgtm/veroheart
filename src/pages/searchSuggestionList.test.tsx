import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SearchSuggestionList } from './Search';
import type { Suggestion } from '../utils/searchSuggestions';

const suggestions: Suggestion[] = [
  { kind: 'brand', label: '로얄캐닌' },
  { kind: 'product', label: '로얄캐닌 미니 인도어 어덜트', brand: '로얄캐닌' },
  { kind: 'ingredient', label: 'BHA', risk: 'danger' },
];

describe('SearchSuggestionList', () => {
  it('브랜드·제품·성분 제안을 종류 배지와 함께 렌더한다', () => {
    const html = renderToStaticMarkup(<SearchSuggestionList suggestions={suggestions} onPick={() => {}} />);
    expect(html).toContain('로얄캐닌');
    expect(html).toContain('미니 인도어');
    expect(html).toContain('BHA');
    expect(html).toContain('브랜드');
    expect(html).toContain('제품');
    expect(html).toContain('성분');
  });

  it('제품 제안에는 브랜드명을 함께 노출한다', () => {
    const html = renderToStaticMarkup(
      <SearchSuggestionList suggestions={[{ kind: 'product', label: '오리젠 도그', brand: '오리젠' }]} onPick={() => {}} />,
    );
    expect(html).toContain('오리젠 도그');
    expect(html).toContain('오리젠');
  });
});
