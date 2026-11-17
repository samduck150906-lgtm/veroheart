import { test } from 'node:test';
import assert from 'node:assert/strict';
import { manufacturerSourceIdentity } from './manufacturer-source-rules.mjs';
import { reviewManufacturerCandidate } from './review-manufacturer-candidate.mjs';
import { prepareBreadthManifest } from './build-manufacturer-breadth-sql.mjs';

const source={brand:'하림펫푸드',name:'더리얼로우 닭고기 어덜트',species:'dog',productType:'food',sourceType:'manufacturer',sourceProductId:'1480',sourceUrl:'https://harimpetfood.com/product/chicken/1480/',sourceListUrl:'https://harimpetfood.com/category/dog/97/',sourceListSha256:'a'.repeat(64),documentSha256:'b'.repeat(64),retrievedAt:'2026-11-17T00:00:00Z',sourceCaveat:'Identity only; label facts require evidence',market:'KR'};
test('manufacturer URL, brand, product id and region cannot be substituted',()=>{
  assert.equal(manufacturerSourceIdentity(source).namespace,'harim-kr');
  for(const change of [{brand:'힐스'},{sourceProductId:'1481'},{sourceUrl:source.sourceUrl+'?redirect=https://example.com'},{sourceUrl:source.sourceUrl.replace('harimpetfood.com','harimpetfood.com.example.com')}])assert.equal(manufacturerSourceIdentity({...source,...change}),null);
});
test('mixed offers and toys never become foods; supplement/snack types stay distinct',()=>{
  for(const name of ['더리얼 오븐 노즈워크 삑삑이 토이','강아지 혼합 7일 식단','더리얼 크런치 +트릿 증정'])assert.equal(reviewManufacturerCandidate({...source,name}),null);
  assert.equal(reviewManufacturerCandidate({...source,name:'밥이보약 영양톡톡 관절'}).productType,'supplement');
  assert.equal(reviewManufacturerCandidate({...source,name:'밥이보약 건강쿠키 관절'}).productType,'snack');
});
test('Japanese min/max evidence retains raw wording, units, basis and ordered ingredients',()=>{
  const row={...source,brand:'이나바',market:'JP',sourceUrl:'https://www.inaba-petfood.co.jp/product/detail/ciao/3112',sourceProductId:'3112',name:'CIAO ちゅ～る まぐろ',species:'cat',productType:'snack',labelFacts:[['原材料Ingredients','まぐろ、ビタミンE'],['保証成分値Nutriton Facts','たんぱく質7.0％以上、水分91.0％以下'],['JAN(単品)Bar Code','4901133716577']]};
  const prepared=prepareBreadthManifest({products:[row]}).accepted[0];
  assert.equal(prepared.items.length,2);assert.equal(prepared.language,'ja');assert.equal(prepared.barcode,'4901133716577');
  assert.deepEqual(prepared.measurements.map(m=>[m.nutrientCode,m.value,m.qualifier,m.unit,m.basis]),[['protein',7,'minimum','g/100g','as_fed'],['moisture',91,'maximum','g/100g','as_fed']]);
});
