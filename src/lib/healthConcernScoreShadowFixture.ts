import type { Product, UserPetProfile } from '../types';
import { buildHealthConcernScoreShadowReport } from './healthConcernScoreShadowReport';

export const HEALTH_CONCERN_SHADOW_FIXTURE_PRODUCTS: Product[] = [
  {
    id: 'fixture-dog-supported',
    brand: 'Fixture',
    name: 'Dog support fixture',
    category: 'food',
    mainCategory: 'food',
    targetPetType: 'dog',
    imageUrl: '',
    ingredients: [
      { id: 'joint', nameKo: '글루코사민', nameEn: 'glucosamine', purpose: '관절', riskLevel: 'safe' },
      { id: 'skin', nameKo: '연어오일', nameEn: 'salmon oil', purpose: '피부', riskLevel: 'safe' },
    ],
    healthConcerns: ['관절', '피부'],
    reviewsCount: 0,
    averageRating: 0,
  },
  {
    id: 'fixture-cat-missing-data',
    brand: 'Fixture',
    name: 'Cat missing-data fixture',
    category: 'food',
    mainCategory: 'food',
    targetPetType: 'cat',
    formulation: 'dry',
    imageUrl: '',
    ingredients: undefined as unknown as Product['ingredients'],
    healthConcerns: [],
    guaranteedAnalysis: { taurine: 1500, kcalPer100g: 350 },
    reviewsCount: 0,
    averageRating: 0,
  },
  {
    id: 'fixture-all-caution',
    brand: 'Fixture',
    name: 'All-species caution fixture',
    category: 'food',
    mainCategory: 'food',
    targetPetType: 'all',
    imageUrl: '',
    ingredients: [
      { id: 'danger', nameKo: '위험 원료', nameEn: 'danger ingredient', purpose: '', riskLevel: 'danger' },
      { id: 'cranberry', nameKo: '크랜베리', nameEn: 'cranberry', purpose: '요로', riskLevel: 'safe' },
    ],
    healthConcerns: ['요로'],
    reviewsCount: 0,
    averageRating: 0,
  },
];

export const HEALTH_CONCERN_SHADOW_FIXTURE_PROFILES: UserPetProfile[] = [
  { id: 'two-recognized', name: 'Fixture', species: 'Dog', age: 4, allergies: [], healthConcerns: ['관절', '피부·모질'] },
  { id: 'several-recognized', name: 'Fixture', species: 'Dog', age: 4, allergies: [], healthConcerns: ['관절', '소화기', '눈'] },
  { id: 'duplicate-aliases', name: 'Fixture', species: 'Dog', age: 4, allergies: [], healthConcerns: ['관절', 'joint', '관절 건강'] },
  { id: 'mixed-unknown', name: 'Fixture', species: 'Dog', age: 4, allergies: [], healthConcerns: ['관절', 'legacy-unknown'] },
  { id: 'unknown-only', name: 'Fixture', species: 'Dog', age: 4, allergies: [], healthConcerns: ['legacy-unknown'] },
];

export function buildHealthConcernScoreShadowFixtureReport() {
  return buildHealthConcernScoreShadowReport(
    HEALTH_CONCERN_SHADOW_FIXTURE_PRODUCTS,
    HEALTH_CONCERN_SHADOW_FIXTURE_PROFILES,
  );
}
