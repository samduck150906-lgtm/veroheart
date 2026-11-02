import { describe, expect, it } from 'vitest';
import { mapConfirmedLabelNutrition } from '../../netlify/functions/_shared/labelNutrition';

describe('confirmed scan nutrition', () => {
  it('maps explicit Korean/English percentages, including actual zero values', () => {
    expect(mapConfirmedLabelNutrition({ guaranteedComponents: [{name:'조단백질',value:30,unit:'%',qualifier:'min'},{name:'Crude Fat',value:0,unit:'%',qualifier:'max'},{name:'Moisture',value:10,unit:'%'}], registeredComponents:[{name:'칼슘',value:1.2,unit:'%'}] })).toEqual({ profile:{crude_protein:30,crude_fat:0,moisture:10,calcium:1.2},kcalPer100g:null,source:'confirmed_package_label' });
  });
  it('converts only explicit kcal/kg and kcal/100g values', () => {
    expect(mapConfirmedLabelNutrition({ guaranteedComponents:[{name:'대사에너지',value:3800,unit:'kcal/kg'}],registeredComponents:[{name:'Energy',value:380,unit:'kcal/100g'}] }).kcalPer100g).toBe(380);
    expect(mapConfirmedLabelNutrition({ guaranteedComponents:[{name:'열량',value:380,unit:'kcal'}],registeredComponents:[] }).kcalPer100g).toBeNull();
  });
  it('omits ambiguous, unknown, missing-unit and invalid percentages without placeholders', () => {
    expect(mapConfirmedLabelNutrition({ guaranteedComponents:[{name:'조단백질',value:30,unit:'g'},{name:'조회분',value:120,unit:'%'},{name:'EPA',value:10,unit:'%'},{name:'인',value:null,unit:'%'}],registeredComponents:[] })).toEqual({ profile:{},kcalPer100g:null,source:'confirmed_package_label' });
  });
  it('leaves conflicting component observations unknown', () => {
    const result = mapConfirmedLabelNutrition({ guaranteedComponents:[{name:'조단백질',value:30,unit:'%'},{name:'열량',value:3800,unit:'kcal/kg'}], registeredComponents:[{name:'Crude Protein',value:32,unit:'%'},{name:'열량',value:300,unit:'kcal/100g'}] });
    expect(result.profile).toEqual({});
    expect(result.kcalPer100g).toBeNull();
  });
});
