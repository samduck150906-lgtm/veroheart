import type { Ingredient, Product, UserPetProfile } from '../types';
import { assessIngredient } from '../analysis/ingredientAssessment';
import { IngredientCard } from './pdp/PdpParts';
import { materialTraitLabel } from '../analysis/materialComposition';
import { MaterialCompositionDetails } from './MaterialCompositionDetails';
import { ingredientLabelCounts } from '../utils/ingredientLabelCounts';

export function IngredientLabelSummary({product}:{product:Product}) {
  const counts=ingredientLabelCounts(product);
  if(product.ingredientDataLoaded===false)return null;
  return <div aria-label="원료 확인 범위" style={{fontSize:13,lineHeight:1.7,color:'var(--text-muted)',marginBottom:12}}>
    <div>표시 원료 {counts.declared}개 · {counts.sourceConfirmed===undefined ? '라벨 대조 정보 미등록' : `확인된 원료 ${counts.sourceConfirmed}개`} · 특성 연결 {counts.traitsResolved}개</div>
    <div style={{fontSize:12}}>확인된 원료는 제조사 원문과 대조한 수입니다. 원료 특성과 점수 반영·안전성 판단은 별개입니다.</div>
  </div>;
}

export function IngredientLabelList({ product, profile, onOpen }: { product: Product; profile?: UserPetProfile | null; onOpen: (ingredient: Ingredient) => void }) {
  const entries: NonNullable<Product['ingredientLabelEntries']> = product.ingredientLabelEntries ?? [
    ...product.ingredients.map((ingredient,index) => ({ id:ingredient.id+'-'+index,order:index,rawName:ingredient.rawLabelText||ingredient.nameKo,
      sourceVerified:ingredient.sourceLabelVerified===true,traitResolved:true,ingredient })),
    ...(product.unknownIngredientTerms ?? []).map((rawName,index) => ({id:'unknown-'+index,order:product.ingredients.length+index,
      rawName,sourceVerified:false,traitResolved:false,ingredient:null})),
  ];
  return <div>{entries.map(entry => {
    const ingredient=entry.ingredient;
    if (!ingredient) return <div key={entry.id} style={{ padding:14,marginBottom:10,borderRadius:12,background:'var(--surface-alt)',lineHeight:1.6 }}>
      <strong>{entry.rawName}</strong>
      <div style={{ fontSize:13 }}>원료 특성 · {entry.traitResolved
        ? materialTraitLabel(entry.traitInformation?.materialComposition,'원료 영양 참고자료 연결됨') : '특성 확인 중'}</div>
      <div style={{ fontSize:12,color:'var(--text-muted)' }}>{entry.sourceVerified ? '라벨 원문 대조됨' : '라벨 원문 대조 전'} · 점수 미반영 · 안전성 판정 근거 부족</div>
      <MaterialCompositionDetails name={entry.rawName} edges={entry.traitInformation?.materialComposition} references={entry.traitInformation?.nutrientReference} />
    </div>;
    const assessment=assessIngredient(ingredient,profile);
    return <IngredientCard key={entry.id} ing={{...ingredient,
      riskLevel:assessment.kind==='caution'?'caution':ingredient.riskLevel,isAllergy:assessment.kind==='allergy'}} onOpen={()=>onOpen(ingredient)} />;
  })}</div>;
}
