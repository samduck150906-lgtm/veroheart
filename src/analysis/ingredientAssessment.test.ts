import { describe,expect,it } from 'vitest';
import { assessIngredient } from './ingredientAssessment';
import { classifyAllergyRelationship } from './allergyFamilyMatcher';
import { findIngredientByName } from './ingredientDictionary';
import { analyzeFeed } from './feedAnalysis';
import { DEFAULT_USER_PET_PROFILE, type Ingredient, type Product } from '../types';
const ingredient:Ingredient={id:'material',nameKo:'육분',nameEn:'Meat meal',purpose:'',riskLevel:'safe'};
describe('현재 원료 원문에 근거한 판정',()=>{
  it('괄호 안의 여러 동물 출처를 각각 반영한다',()=>{
    const material={...ingredient,rawLabelText:'육분(닭, 오리)'};
    for(const allergy of ['닭','오리'])expect(assessIngredient(material,{...DEFAULT_USER_PET_PROFILE,allergies:[allergy]}).kind).toBe('allergy');
  });
  it('지방의 동물 출처는 처리 관련 주의로 같은 팝업에 전달한다',()=>{
    const material={...ingredient,nameKo:'동물성지방',nameEn:'Animal fat',rawLabelText:'동물성 유지(닭, 오리)'};
    for(const allergy of ['닭','오리'])expect(classifyAllergyRelationship(material,allergy).kind).toBe('processing_caution');
  });
  it('설명 문장을 동물 출처나 가수분해 처리의 증거로 사용하지 않는다',()=>{
    const rice={...ingredient,nameKo:'쌀',nameEn:'Rice',purpose:'닭고기를 대체하는 원료. 가수분해 제품이라는 뜻은 아닙니다.'};
    expect(assessIngredient(rice,{...DEFAULT_USER_PET_PROFILE,allergies:['닭']}).kind).toBe('general');
  });
  it('글자 포함만으로 보리지유를 보리, 쌀전분을 쌀로 연결하지 않는다',()=>{
    expect(findIngredientByName('보리지유')).toBeNull();
    expect(findIngredientByName('알수없는쌀전분원료')).toBeNull();
  });
  it('양조효모와 닭기름을 동물성 단백질 제1원료로 판정하지 않는다',()=>{
    const product:Product={id:'fixture',brand:'Fixture',name:'Fixture',category:'food',imageUrl:'',reviewsCount:0,averageRating:0,ingredients:[]};
    for(const name of ['양조효모','닭기름'])expect(analyzeFeed({...product,ingredients:[{...ingredient,nameKo:name,nameEn:''}]},DEFAULT_USER_PET_PROFILE).ingredientQuality.firstIsAnimalProtein).toBe(false);
  });
});
