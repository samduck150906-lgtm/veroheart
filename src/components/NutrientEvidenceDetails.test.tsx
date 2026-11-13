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
    expect(screen.getAllByRole('listitem',{hidden:true})).toHaveLength(3);
    expect(screen.getAllByRole('listitem',{hidden:true}).map(e=>e.textContent).join(' ')).toContain('건물 기준');
  });
  it('preserves two actual documents while suppressing a profile copy with a different catalog URL',()=>{
    render(<NutrientEvidenceDetails evidence={[base,{...base,sourceVersion:'document-a',sourceUrl:'https://manufacturer.example/my/label'},{...base,sourceVersion:'document-b',sourceUrl:'https://manufacturer.example/uk/label'}]} />);
    expect(screen.getAllByRole('listitem',{hidden:true})).toHaveLength(2);
  });
  it('keeps liquid volume and powder basis explicit',()=>{
    render(<NutrientEvidenceDetails evidence={[{...base,unit:'g/100mL',value:5},{...base,basis:'as_sold',value:33}]} />);
    const items=screen.getAllByRole('listitem',{hidden:true});
    expect(items[0].textContent).toContain('5 g/100mL');
    expect(items[1].textContent).toContain('분말 제품 그대로 기준 · 조유 후 수치 아님');
  });
  it('shows identical statements from repeated captures once without hiding a changed guarantee',()=>{
    const old={...base,basis:'as_sold' as const,sourceVersion:'old-capture'};
    render(<NutrientEvidenceDetails evidence={[old,{...old,sourceVersion:'new-capture'},{...old,qualifier:'minimum',sourceVersion:'other-condition'}]} />);
    expect(screen.getAllByRole('listitem',{hidden:true})).toHaveLength(2);
    expect(screen.getAllByRole('listitem',{hidden:true})[1].textContent).toContain('이상');
  });
});
