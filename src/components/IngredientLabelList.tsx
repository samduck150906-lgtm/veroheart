import type { Ingredient, Product, UserPetProfile } from '../types';
import { assessIngredient } from '../analysis/ingredientAssessment';
import { IngredientCard } from './pdp/PdpParts';
import { materialTraitLabel } from '../analysis/materialComposition';
import { MaterialCompositionDetails } from './MaterialCompositionDetails';

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
