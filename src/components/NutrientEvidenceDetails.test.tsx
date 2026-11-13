import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { NutrientEvidenceDetails } from './NutrientEvidenceDetails';
import type { Product } from '../types';
const base: NonNullable<Product['nutrientEvidence']>[number] = {nutrientCode:'protein',name:'단백질',value:24,unit:'g/100g',basis:'as_fed',qualifier:'unspecified',sourceUrl:'https://naturalcore.co.kr/product/official/971/',sourceVersion:'profile-projection-v1'};
describe('NutrientEvidenceDetails',()=>{
  afterEach(cleanup);
  it('shows a captured minimum once instead of adding its legacy profile copy',()=>{
    render(<NutrientEvidenceDetails evidence={[base,{...base,qualifier:'minimum',sourceVersion:'official-completion-sha256:document'}]} />);
    expect(screen.getAllByRole('listitem',{hidden:true})).toHaveLength(1);
    expect(screen.getByRole('listitem',{hidden:true}).textContent).toContain('이상');
  });
  it('preserves different values, bases and independent sources',()=>{
    render(<NutrientEvidenceDetails evidence={[base,{...base,value:26,qualifier:'minimum',sourceVersion:'document'},{...base,basis:'dry_matter',sourceVersion:'document'},{...base,sourceUrl:'https://other.example/label',sourceVersion:'document'}]} />);
    expect(screen.getAllByRole('listitem',{hidden:true})).toHaveLength(4);
  });
});
