import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContext, SourceTextModule } from 'node:vm';
import { it } from 'node:test';
import ts from 'typescript';

// The original review reproducer, now a CI regression test.
// Real pure application modules execute; there is no API, DB or mocked scorer.
const sourceRoot = new URL('../src/', import.meta.url);
const context = createContext({ console, fetch: () => { throw Error('Network forbidden'); } });
const modules = new Map();
async function load(url) {
  assert.ok(url.href.startsWith(sourceRoot.href));
  if (!modules.has(url.href)) modules.set(url.href, (async () => new SourceTextModule(
    ts.transpileModule(await readFile(url, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText, { context, identifier: url.href },
  ))());
  return modules.get(url.href);
}
const entry = await load(new URL('analysis/feedAnalysis.ts', sourceRoot));
await entry.link(async (specifier, importer) => {
  assert.ok(specifier.startsWith('.'), 'No external runtime modules');
  return load(new URL(specifier.endsWith('.ts') ? specifier : `${specifier}.ts`, importer.identifier));
});
await entry.evaluate();
const { analyzeFeed } = entry.namespace;
const profile = { id: 'synthetic-profile', name: '합성 프로필', species: 'Dog', age: 4, healthConcerns: [], allergies: [] };
const ingredient = (nameKo) => ({ id: nameKo, nameKo, nameEn: '', purpose: '', riskLevel: 'safe' });
const product = (patch = {}) => ({ id: 'synthetic-product', brand: '합성 브랜드', name: '합성 사료',
  category: 'food', price: 0, imageUrl: '', ingredients: [], reviewsCount: 0, averageRating: 0, ...patch });
const richIngredients = ['닭고기', '연어', '타우린', '유산균', '글루코사민'].map(ingredient);

it('control: missing and unknown ingredient evidence produces an insufficient-information summary', () => {
  const absent = analyzeFeed(product(), profile);
  assert.equal(absent.analysisReadiness.status, 'unavailable');
  assert.match(absent.summary, /부족/);
  const partial = analyzeFeed(product({ ingredients: richIngredients, unknownIngredientTerms: ['미해결 합성 원료'] }), profile);
  assert.equal(partial.analysisReadiness.status, 'partial');
  assert.doesNotMatch(partial.summary, /균형 잡힌|무난하게 급여/);
});

it('control: numeric zero is observed nutrition, unlike absent/null measurements', () => {
  assert.equal(analyzeFeed(product({ guaranteedAnalysis: { crudeProtein: 0, crudeFat: 0 } }), profile).hasNutritionData, true);
  assert.equal(analyzeFeed(product({ guaranteedAnalysis: { crudeProtein: null, crudeFat: null } }), profile).hasNutritionData, false);
});

it('no nutrition measurements must not support a balanced-food claim', () => {
  const result = analyzeFeed(product({ ingredients: richIngredients }), profile);
  assert.equal(result.hasNutritionData, false);
  assert.equal(result.macros, null);
  assert.equal(result.aafco.evaluated, false);
  assert.equal(result.analysisReadiness.status, 'partial');
  assert.ok(result.analysisReadiness.reasonCodes.includes('label_comparison_missing')); // no attestation in this fixture
  assert.equal(result.score, 82);
  assert.equal(result.grade, 'A');
  assert.match(result.summary, /영양정보 부족으로 영양 균형을 평가할 수 없습니다/);
  assert.doesNotMatch(result.summary, /균형 잡힌|무난하게 급여/, JSON.stringify({
    score: result.score, grade: result.grade, summary: result.summary, nutrition: result.hasNutritionData,
  }));
});

it('protein alone without fat/moisture must not support a balanced-food claim', () => {
  const result = analyzeFeed(product({ ingredients: richIngredients, guaranteedAnalysis: { crudeProtein: 30 } }), profile);
  assert.equal(result.macros, null);
  assert.equal(result.aafco.evaluated, false);
  assert.equal(result.score, 82);
  assert.equal(result.grade, 'A');
  assert.doesNotMatch(result.summary, /균형 잡힌|무난하게 급여/, JSON.stringify({
    score: result.score, grade: result.grade, summary: result.summary, nutrition: result.hasNutritionData,
  }));
});
