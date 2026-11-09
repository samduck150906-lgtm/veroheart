import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAsFedNutrition, readManufacturerPage, selectSourceTarget } from './prepare-reviewed-catalog.mjs';
test('reads only explicit percentage values, preserves zero, and rejects dry-matter substitution', () => {
  assert.deepEqual(parseAsFedNutrition('조단백 28.0% 이상, 조지방 0% 이상, 수분 6.5% 이하'), { crude_protein: 28, crude_fat: 0, moisture: 6.5 });
  assert.deepEqual(parseAsFedNutrition('Dry Matter 단백질 43.9%'), {});
  assert.deepEqual(parseAsFedNutrition('조단백 300% 조지방 미표기'), {});
});
test('manufacturer dry matter stays separate from as-fed nutrient data and kcal/kg converts explicitly', () => {
  const p = { brand: '힐스', httpStatus: 200, nameMatches: true };
  const result = readManufacturerPage(p, '<h1>제조사 제품</h1><p>평균 영양소 및 칼로리 함량 3087 kcal/kg</p><table><tr><th>Nutrient</th><th>Dry Matter</th></tr><tr><td>단백질</td><td>20.4 %</td></tr></table>');
  assert.deepEqual(result.nutrition, {}); assert.match(result.dryMatterText, /20.4/);
  assert.equal(result.kcalPer100g, 308.7); assert.deepEqual(result.items, []);
});
test('ambiguous source identity never silently selects a product or creates a duplicate', () => {
  const source = { sourceUrl: 'https://www.royalcanin.com/kr/cats/products/retail-products/kitten-2522', brand: '로얄캐닌', species: 'cat', name: '키튼' };
  const catalog = { products: [{id:'one',catalog_source_url:source.sourceUrl},{id:'two',catalog_source_url:source.sourceUrl}], observations: [] };
  assert.throws(() => selectSourceTarget(source, catalog), /Conflicting/);
});
test('separates nutrition embedded in a manufacturer ingredient accordion from actual ingredients', () => {
  const p = { brand: '로얄캐닌', httpStatus: 200, nameMatches: true };
  const result = readManufacturerPage(p, '<h1>제품</h1><div data-testid="product-nutrition-item"><h3>사용한 원료의 명칭</h3><div data-testid="product-nutrition-content">닭고기, 쌀\n조단백 9.0% 이상, 수분 84.1% 이하 ※ 유의사항</div></div>');
  assert.equal(result.ingredientsText, '닭고기, 쌀');
  assert.deepEqual(result.nutrition, {crude_protein:9,moisture:84.1});
  assert.equal(result.items.length, 2);
});
