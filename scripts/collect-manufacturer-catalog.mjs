import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

// Acquisition only: this command never writes to Supabase or grants publication.
// List membership supplies species; a list URL alone cannot supply label facts.
const lists = [
  ['하림펫푸드','dog','https://harimpetfood.com/category/dog/97/'],
  ['하림펫푸드','cat','https://harimpetfood.com/category/cat/98/'],
  ['네츄럴코어','dog','https://naturalcore.co.kr/product/list.html?cate_no=29','food'],
  ['네츄럴코어','cat','https://naturalcore.co.kr/product/list.html?cate_no=32','food'],
  ['네츄럴코어','dog','https://naturalcore.co.kr/product/list.html?cate_no=30','snack'],
  ['네츄럴코어','cat','https://naturalcore.co.kr/product/list.html?cate_no=33','snack'],
  ['트릿테이블','dog','https://dogttfood.cafe24.com/','snack'],
  ['오리젠','dog','https://www.orijenpetfoods.com/en-US/dogs/dog-food'],
  ['오리젠','cat','https://www.orijenpetfoods.com/en-US/cats/cat-food'],
  ['아카나','dog','https://www.acana.com/en-US/dogs/dog-food'],
  ['아카나','cat','https://www.acana.com/en-US/cats/cat-food'],
  ['이나바','cat','https://www.inaba-petfood.co.jp/product/name/cat/CIAO%2B%E3%81%A1%E3%82%85%EF%BD%9E%E3%82%8B','snack'],
];
const out = process.argv[2];
if (!out) throw Error('Usage: node --use-system-ca scripts/collect-manufacturer-catalog.mjs <capture-directory>');
await mkdir(out, { recursive: true });
const digest = text => createHash('sha256').update(text).digest('hex');
const clean = text => text?.replace(/\s+/g, ' ').trim() ?? '';
const rejected = [], found = new Map();
async function capture(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw Error(`HTTP ${r.status}`);
  const html = await r.text(), hash = digest(html);
  await writeFile(`${out}/${hash}.html`, html);
  return { window: new JSDOM(html, { url }).window, hash, retrievedAt: new Date().toISOString() };
}
for (const [brand, species, sourceListUrl, declaredType] of lists) {
  try {
    const { window, hash, retrievedAt } = await capture(sourceListUrl), d = window.document;
    const cafe = d.querySelectorAll('li[id^="anchorBoxId_"]');
    const nodes = cafe.length ? [...cafe].map(node => ({
      name: clean(node.querySelector('.name a')?.textContent).replace(/^상품명\s*:\s*/, ''),
      href: node.querySelector('.name a')?.href, image: node.querySelector('.thumbnail img')?.src,
      sourceProductId: node.id.replace('anchorBoxId_', ''),
    })) : [...d.querySelectorAll('a[href]')].filter(a =>
      /\/en-US\/(dogs|cats)\/(dog|cat)-food\/[^/]+\/[^/]+\.html$|\/product\/detail\/[^/]+\/\d+$/.test(a.href)
      && !/Learn More|Shop Now|Quick View/i.test(a.textContent)).map(a => ({ name: clean(a.textContent), href: a.href, sourceProductId: new URL(a.href).pathname.split('/').at(-1).replace('.html','') }));
    for (const row of nodes) {
      if (!row.name || !row.href) continue;
      // A mixed offer/accessory/alternate-brand is not a single manufacturer recipe.
      if (/모음|체험|샘플|키트|세트|문의|위탁|묶음|골라|선택|랜덤|퓨레.*mix|푸치|펫밀크.*보틀|스쿱|보울|장난감|배변|용품|플러스.*증정|택배|보냉|레시피북/i.test(row.name)
        || /\d\s*\+\s*\d|\d종|피모\/관절|믹스.*선택/.test(row.name)) continue;
      const url = new URL(row.href); url.search = ''; url.hash = '';
      if (url.origin !== new URL(sourceListUrl).origin) continue;
      if (cafe.length) {
        const parts = url.pathname.match(/^(\/product\/[^/]+\/\d+\/)/);
        if (parts) url.pathname = parts[1];
      }
      let productType = declaredType;
      if (!productType && brand === '하림펫푸드') {
        if (/퍼프|트릿|간식|양갱|육포|저키|츄|덴탈|스틱|멍이탕/.test(row.name)) productType = 'snack';
        else if (/로우|사료|크런치|오븐|밥이보약|화식/.test(row.name)) productType = 'food';
        else continue;
      }
      const key = `${url.origin}:${row.sourceProductId}`;
      const previous = found.get(key);
      if (previous) { if (previous.species !== species) previous.species = 'all'; continue; }
      found.set(key, { ...row, sourceUrl: url.href, sourceListUrl, sourceListSha256: hash, retrievedAt, brand, species, productType,
        sourceType: 'manufacturer', market: /en-US/.test(url.pathname) ? 'US' : brand === '이나바' ? 'JP' : 'KR' });
    }
    window.close();
    console.log(JSON.stringify({ list: sourceListUrl, collected: nodes.length, unique: found.size }));
  } catch (error) { rejected.push({ sourceListUrl, reason: error.message }); }
}
const queue = [...found.values()], accepted = [];
async function worker() {
  while (queue.length) {
    const row = queue.shift();
    try {
      if (row.brand === '트릿테이블') {
        // Public manufacturer listing is evidence of identity only. The detail
        // page requires a trade account; never bypass it or fabricate its label.
        if (!/멍소주|멍맥주|멍와인|멍콜라|멍사이다|멍걸리|멍커피/.test(row.name)) continue;
        row.productType = 'snack'; row.subCategory = '음료';
        row.documentSha256 = row.sourceListSha256;
        row.sourceCaveat = '제조사 공개 목록에서 제품명·용량·이미지를 확인했습니다. 상세 성분은 사업자 로그인 제한으로 확인하지 못해 제공하지 않습니다. 반려견용 간식 음료이며 사람용 주류와 구분해 주세요. 판매·재고 상태는 보장하지 않습니다.';
      } else {
        const { window, hash, retrievedAt } = await capture(row.sourceUrl), d = window.document;
        d.querySelectorAll('script,style').forEach(n => n.remove());
        const heading = [...d.querySelectorAll('.headingArea h2, .product-name, h1, h2')].map(n => clean(n.textContent)).find(Boolean)
          || [...d.querySelectorAll('meta[property="og:title"]')].at(-1)?.content;
        const productTitle = [...d.querySelectorAll('meta[property="og:title"]')].at(-1)?.content || heading;
        const body = clean(d.body.textContent);
        if (!heading || /not found|없는 상품|로그인.*필요/i.test(heading)) throw Error('Product identity not accessible');
        const identity = text => clean(text).normalize('NFKC').toLowerCase().replace(/[^a-z0-9가-힣ぁ-んァ-ン一-龯]/g, '');
        if (!identity(productTitle).includes(identity(row.name)) && !identity(row.name).includes(identity(productTitle))) throw Error('List/detail product names differ');
        row.sourceTitle = productTitle; row.documentSha256 = hash; row.retrievedAt = retrievedAt;
        row.image = d.querySelector('meta[property="og:image"]')?.content || d.querySelector('.keyImg img, .product-primary-image img, .product-image img, .carousel-item.active img.image-zoom-carousel, .detail-item img')?.src || row.image;
        if (!row.productType) row.productType = /freeze.dried treats|dog treats|cat treats/i.test(body) ? 'snack' : 'food';
        row.subCategory = /dry.*food|오븐|크런치|로우/i.test(heading) ? '건식' : /wet.*food|화식/i.test(heading) ? '습식' : '';
        const facts = [...d.querySelectorAll('tr')].map(tr => [clean(tr.querySelector('th')?.textContent), clean(tr.querySelector('td')?.textContent)]);
        row.labelFacts = facts.filter(([label]) => /原材料|保証成分|内容量|JAN|Ingredients|Guaranteed Analysis/i.test(label));
        row.sourceCaveat = `${row.market === 'KR' ? '국내' : row.market === 'US' ? '미국' : '일본'} 제조사 공식 제품 정보와 대조했습니다. 국가·레시피·포장별 표시가 다를 수 있습니다. 제품 존재 확인과 성분·영양 분석의 준비 상태는 별개이며, 확인되지 않은 수치와 안전 판정은 제공하지 않습니다.`;
        window.close();
      }
      row.name = row.name.replace(/^\[(?:[^\]]*생산|빠른배송|당일배송)\]\s*/g, '').replace(/^트릿테이블_/, '').trim();
      accepted.push(row);
    } catch (error) { rejected.push({ sourceUrl: row.sourceUrl, name: row.name, reason: error.message }); }
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
accepted.sort((a,b) => a.sourceUrl.localeCompare(b.sourceUrl));
await writeFile(`${out}/manifest.json`, JSON.stringify({ collectedAt: new Date().toISOString(), products: accepted, rejected }, null, 2));
console.log(JSON.stringify({ accepted: accepted.length, brands: [...new Set(accepted.map(r => r.brand))], rejected: rejected.length }));
