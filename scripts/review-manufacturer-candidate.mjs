import { validateCandidate } from './import-official-catalog.mjs';

export function reviewManufacturerCandidate(source) {
  if (!/^[a-f0-9]{64}$/.test(source.documentSha256) || !source.sourceListUrl || !source.sourceListSha256) throw Error('Source document provenance required');
  const name = source.name;
  if (/토이|노즈워크|삑삑|바스락|식단|혼합|Variety Pack|Multipack|증정|골라|선택|\{|\}|\/.*(?:소고기|연어|유리너리)|헤어볼\+|웰빙\/|1kg.*단독/i.test(name)) return null;
  validateCandidate(source);
  if (source.brand === '하림펫푸드') {
    if (/영양톡톡/.test(name)) return { ...source, productType: 'supplement' };
    if (/건강볼|건강무스|건강쿠키|필렛/.test(name)) return { ...source, productType: 'snack', species: /DOG\/CAT 공용/.test(name) ? 'all' : source.species };
  }
  return source;
}
