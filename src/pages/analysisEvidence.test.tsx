import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { IngredientEvidenceCard, IngredientDetail, DiseaseFitCard } from './AnalysisResult';
import { runScoringPipeline } from '../analysis/scoringPipeline';
import { evaluateHealthConcerns } from '../health/evaluator';
import type { Ingredient, Product } from '../types';

/**
 * 분석 결과 화면이 잠들어 있던 성분 품질·기능성 엔진(runScoringPipeline)과
 * 성분 사전(findIngredientByName)을 실제로 렌더에 연결하는지 검증한다.
 */

function ing(nameKo: string, nameEn: string, riskLevel: Ingredient['riskLevel']): Ingredient {
  return { id: nameKo, nameKo, nameEn, purpose: '', riskLevel };
}

const product: Product = {
  id: 'p1',
  brand: '테스트',
  name: '테스트 사료',
  category: '건식',
  imageUrl: '',
  reviewsCount: 0,
  averageRating: 0,
  ingredients: [
    ing('닭고기', 'chicken', 'safe'),
    ing('글루코사민', 'glucosamine', 'safe'),
    ing('유산균', 'probiotics', 'safe'),
    ing('완두단백', 'pea protein', 'caution'),
  ],
  guaranteedAnalysis: { crudeProtein: 30, crudeFat: 15, crudeFiber: 3, crudeAsh: 8, moisture: 10 },
};

describe('AnalysisResult — 원료 품질 근거 카드', () => {
  const pipeline = runScoringPipeline(product);

  it('원료 품질 등급과 품질 지표를 렌더한다', () => {
    const html = renderToStaticMarkup(<IngredientEvidenceCard pipeline={pipeline} />);
    expect(html).toContain('원료 품질 근거');
    expect(html).toContain(`${pipeline.rawMaterialGrade}등급`);
    expect(html).toContain(pipeline.ingredientScoreDisplay);
  });

  it('기능성 성분(글루코사민·유산균)을 칩으로 노출한다', () => {
    expect(pipeline.functionalIngredients.length).toBeGreaterThan(0);
    const html = renderToStaticMarkup(<IngredientEvidenceCard pipeline={pipeline} />);
    expect(html).toContain('기능성 성분');
    expect(html).toContain('글루코사민');
    expect(html).toContain('유산균');
  });
});

describe('AnalysisResult — 성분 상세(성분 사전 근거)', () => {
  it('사전에 등록된 성분은 설명·분류·위험도·출처를 노출한다', () => {
    const html = renderToStaticMarkup(<IngredientDetail ing={ing('닭고기', 'chicken', 'safe')} />);
    expect(html).toContain('안전 성분'); // 위험도 칩
    expect(html).toContain('설명');
    expect(html).toContain('동물성 단백질'); // 카테고리 라벨
    expect(html).toContain('동물성 단백질원'); // 사전 explanation
    expect(html).toContain('성분 사전'); // 출처 근거 문구
  });

  it('사전 미매칭 성분도 폴백 설명으로 안전하게 렌더한다', () => {
    const html = renderToStaticMarkup(<IngredientDetail ing={ing('희귀원료XYZ', 'rareXYZ', 'caution')} />);
    expect(html).toContain('주의 성분');
    expect(html).toContain('설명');
  });
});

describe('AnalysisResult — 건강 고민 맞춤 분석 카드', () => {
  const results = evaluateHealthConcerns(product, {
    id: 'pet-1',
    name: '로니',
    species: 'Dog',
    age: 4,
    healthConcerns: ['신장·비뇨기', '관절'],
    allergies: [],
  });

  it('점수와 같은 canonical 결과의 고민명·정량 상태·정보 부족 근거를 렌더한다', () => {
    const html = renderToStaticMarkup(<DiseaseFitCard results={results} petName="로니" />);
    expect(html).toContain('로니 건강 고민 맞춤 분석');
    expect(html).toContain('신장·비뇨기');
    expect(html).toContain('관절');
    expect(html).toContain('인');
    expect(html).toContain('정보 필요');
    expect(html).not.toContain('NRC 기준');
  });
});
