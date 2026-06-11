import { describe, expect, it } from 'vitest';
import { analyzeProduct } from './ruleEngine';
import {
  TemplateExplanationGenerator,
  LlmExplanationGenerator,
  buildExplanationPrompt,
} from './explanation';
import type { ProductForAnalysis } from './types';

const dogFood: ProductForAnalysis = { species: 'dog', productType: 'complete_food' };

describe('TemplateExplanationGenerator', () => {
  it('위험 성분이 있으면 헤드라인에 확인 필요 문구', async () => {
    const r = analyzeProduct(dogFood, { species: 'dog', allergies: [] }, ['닭고기', '자일리톨']);
    const g = new TemplateExplanationGenerator();
    const exp = await g.generate(r, '초코');
    expect(exp.headline).toContain('주의');
    expect(exp.summary).toContain('초코');
    expect(exp.cautionPoints.length).toBeGreaterThan(0);
    expect(exp.disclaimer).toBe(r.disclaimer);
  });

  it('미매칭 원료는 missingInfo로 안내', async () => {
    const r = analyzeProduct(dogFood, undefined, ['닭고기', '정체불명원료abc']);
    const exp = await new TemplateExplanationGenerator().generate(r);
    expect(exp.missingInfo.join(' ')).toContain('정체불명원료abc');
  });
});

describe('buildExplanationPrompt', () => {
  it('판단 금지 가드레일과 사실 JSON을 포함', () => {
    const r = analyzeProduct(dogFood, undefined, ['닭고기', '연어오일']);
    const prompt = buildExplanationPrompt(r, '초코');
    expect(prompt).toContain('절대 바꾸거나 새로 판단하지 마세요');
    expect(prompt).toContain('환각 금지');
    expect(prompt).toContain('"grade"');
  });
});

describe('LlmExplanationGenerator', () => {
  it('정상 JSON 응답을 파싱하고 disclaimer는 사실에서 가져온다', async () => {
    const r = analyzeProduct(dogFood, undefined, ['닭고기', '연어오일']);
    const fakeLlm = async () =>
      '```json\n{"headline":"좋아요","summary":"요약","goodPoints":["좋은점"],"cautionPoints":[],"missingInfo":[]}\n```';
    const exp = await new LlmExplanationGenerator(fakeLlm).generate(r, '초코');
    expect(exp.headline).toBe('좋아요');
    expect(exp.goodPoints).toEqual(['좋은점']);
    expect(exp.disclaimer).toBe(r.disclaimer); // 모델이 만든 게 아님
  });

  it('LLM 실패 시 템플릿으로 폴백', async () => {
    const r = analyzeProduct(dogFood, undefined, ['닭고기', '자일리톨']);
    const brokenLlm = async () => {
      throw new Error('network');
    };
    const exp = await new LlmExplanationGenerator(brokenLlm).generate(r);
    expect(exp.headline).toContain('종합 등급');
    expect(exp.cautionPoints.length).toBeGreaterThan(0);
  });

  it('비JSON 잡텍스트 응답도 폴백', async () => {
    const r = analyzeProduct(dogFood, undefined, ['닭고기']);
    const junk = async () => '죄송하지만 잘 모르겠어요';
    const exp = await new LlmExplanationGenerator(junk).generate(r);
    expect(exp.headline).toContain('종합 등급');
  });
});
