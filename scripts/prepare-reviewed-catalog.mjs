import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { parseIngredientLabelItems } from '../src/analysis/labelIngredientParser.ts';
import { normalizeBarcode } from '../src/lib/productIdentity.ts';

const fields = { crude_protein: '조단백(?:질)?', crude_fat: '조지방', crude_fiber: '조섬유', crude_ash: '조회분', moisture: '수분', calcium: '칼슘', phosphorus: '(?:^|[,\\s])인' };
export function parseAsFedNutrition(text) {
  const values = {};
  if (/dry matter|건물\s*기준/i.test(text)) return values;
  for (const [key, label] of Object.entries(fields)) {
    const match = text.match(new RegExp(label + '\\s*([0-9]+(?:\\.[0-9]+)?)\\s*%'));
    if (match && Number(match[1]) <= 100) values[key] = Number(match[1]);
  }
  return values;
}
export function readManufacturerPage(source, html) {
  const window = new JSDOM(html).window;
  try {
    const d = window.document;
    const name = d.querySelector('h1')?.textContent.replace(/\s+/g, ' ').trim();
    if (!name || !source.nameMatches || source.httpStatus !== 200) throw new Error('Unconfirmed product identity');
    let ingredientsText = '', nutritionText = '', dryMatterText = '';
    if (source.brand === '로얄캐닌') {
      for (const item of d.querySelectorAll('[data-testid="product-nutrition-item"]')) {
        const title = item.querySelector('h3')?.textContent ?? '';
        const text = item.querySelector('[data-testid="product-nutrition-content"]')?.textContent.trim() ?? '';
        if (/사용한 원료/.test(title)) {
          const boundary = text.search(/조단백|ANALYTICAL CONSTITUENTS/i);
          ingredientsText = (boundary >= 0 ? text.slice(0, boundary) : text).split('※')[0].trim();
        }
        if (/등록성분량/.test(title) || /조단백\s*\d|조단백질\s*\d|Crude protein\s*\d/i.test(text)) nutritionText += text + '\n';
      }
    } else if (source.brand === '힐스') {
      const title = [...d.querySelectorAll('.cmp-accordion__title')].find(e => e.textContent.trim() === '성분');
      ingredientsText = d.getElementById(title?.closest('button')?.getAttribute('aria-controls'))?.textContent.trim() ?? '';
      const table = [...d.querySelectorAll('table')].find(t => /Dry Matter/i.test(t.textContent));
      dryMatterText = table ? [...table.querySelectorAll('tr')].map(tr => [...tr.querySelectorAll('td,th')].map(td => td.textContent.trim()).join(' ')).join(' · ').replace(/\s+/g, ' ') : '';
    }
    const body = d.body.textContent.replace(/\s+/g, ' ');
    const energyArea = source.brand === '로얄캐닌' ? nutritionText : body.slice(body.indexOf('평균 영양소 및 칼로리 함량'));
    const energy = energyArea.match(/([0-9]+(?:[,.][0-9]+)?)\s*kcal\s*\/\s*kg/i);
    const kcalPer100g = energy ? Number(energy[1].replace(',', '')) / 10 : null;
    const productImage=[...d.querySelectorAll('img')].find(img=>img.alt.replace(/\s+(?:제품 사진|Packshot)$/i,'').replace(/\s+/g,' ').trim()===name && /^https:\/\/(?:cdn\.royalcanin-weshare-online\.io|marspetcareaprimocdn\.petcare\.global|p1\.aprimocdn\.net|pxmshare\.colgatepalmolive\.com)\//.test(img.src))?.src;
    const slug = source.sourceUrl?.split('/').at(-1);
    const galleries = slug ? [...d.querySelectorAll('div[id]')].filter(e => e.id.startsWith(slug + '-simpleCarousel-')) : [];
    const galleryImage = source.brand === '힐스' && galleries.length === 1
      ? [...galleries[0].querySelectorAll('img.swiper-image-desktop')].find(img => /^https:\/\/pxmshare\.colgatepalmolive\.com\/PNG_2000\//.test(img.src))?.src : null;
    const image = source.image || productImage || galleryImage || d.querySelector('meta[property="og:image"]')?.content || null;
    const items = ingredientsText ? parseIngredientLabelItems(ingredientsText).map(p => ({ ...p, normalizedText: p.baseText.normalize('NFKC').toLowerCase().replace(/\s+/g, ''), matchStatus: 'unreviewed' })) : [];
    const declaredBarcodes = html.match(/product_eans\s*=\s*"([0-9, ]+)"/i)?.[1] ?? '';
    const barcodes = [...new Set(declaredBarcodes.split(',').map(value => normalizeBarcode(value.trim())).filter(Boolean))];
    return { name, ingredientsText, items, nutrition: parseAsFedNutrition(nutritionText), nutritionText, dryMatterText, kcalPer100g, image, barcodes };
  } finally { window.close(); }
}

export function selectSourceTarget(source, catalog) {
  const matches = new Set([
    ...catalog.products.filter(p => p.catalog_source_url === source.sourceUrl).map(p => p.id),
    ...catalog.observations.filter(o => o.source_url === source.sourceUrl).map(o => o.product_id),
  ]);
  if (matches.size > 1) throw new Error('Conflicting existing source identities');
  if (matches.size === 1) return catalog.products.find(p => p.id === [...matches][0]);
  // Explicitly reviewed existing dog w/d dry identity; preserve its hidden duplicate.
  if (source.sourceUrl === 'https://www.hillspet.co.kr/dog-food/prescription-diet-wd-glucose-management-dry')
    return catalog.products.find(p => p.id === '160e8323-fbb8-4fd2-b44e-1923f6825153');
  if (source.brand === '힐스' && source.species === 'cat' && /adult.*salmon.*dry/.test(source.sourceUrl))
    throw new Error('Existing generic adult salmon title does not identify this formula');
  const identity = s => s.normalize('NFKC').toLowerCase().replace(/[^a-z0-9가-힣]/g, '').replaceAll(source.brand, '');
  const similar = catalog.products.filter(p => p.brand_name === source.brand && p.target_pet_type === source.species &&
    (identity(p.name).includes(identity(source.name)) || identity(source.name).includes(identity(p.name))));
  if (similar.length) throw new Error('Existing similar product requires manual identity review');
  return null;
}

async function main() {
  const args = process.argv.slice(2); const arg = flag => args[args.indexOf(flag) + 1];
  const verified = JSON.parse(await readFile(arg('--verified'), 'utf8')).products;
  const catalog = JSON.parse(await readFile(arg('--catalog'), 'utf8')).rows[0].catalog;
  const accepted = [], deferred = [];
  for (const source of verified) {
    try {
      const data = readManufacturerPage(source, await readFile(path.join(arg('--pages'), source.htmlHash + '.html'), 'utf8'));
      const existing = selectSourceTarget(source, catalog);
      if (existing && (existing.brand_name !== source.brand || existing.target_pet_type !== source.species)) throw new Error('Stored species/brand conflict');
      const note = `${source.checkedAt.slice(0, 10)} 제조사 공개 페이지 대조. 국내 유통 포장 표시와 다를 수 있으므로 실제 포장도 확인해 주세요. ` +
        (data.dryMatterText ? `제조사 건물기준 영양정보(수분 제거 기준): ${data.dryMatterText}. 이 값은 보장성분이나 급여량 계산에 사용하지 않습니다.`
          : Object.keys(data.nutrition).length ? '영양 수치는 제조사가 표시한 등록성분량이며 종합적인 급여 적합성 판정이 아닙니다.' : '현재 제조사 공개 페이지에서 보장성분 수치가 확인되지 않아 영양 수치를 제공하지 않습니다.');
      accepted.push({ ...source, ...data, note, veterinaryOnly: /\/vet-products\/|\/prescription-diet-/.test(source.sourceUrl), existingProductId: existing?.id ?? null, before: existing ?? null });
    } catch (e) { deferred.push({ sourceUrl: source.sourceUrl, name: source.name, reason: e.message }); }
  }
  const report = { preparedAt: new Date().toISOString(), created: accepted.filter(x => !x.existingProductId).length,
    updated: accepted.filter(x => x.existingProductId).length, asFedNutrition: accepted.filter(x => Object.keys(x.nutrition).length).length,
    dryMatterOnly: accepted.filter(x => x.dryMatterText).length, withIngredients: accepted.filter(x => x.items.length).length,
    accepted, deferred };
  await writeFile(arg('--out'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, accepted: report.accepted.length, deferred: report.deferred }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
