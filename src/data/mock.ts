export interface UserPetProfile {
  id: string;
  name: string;
  species: 'Dog' | 'Cat';
  age: number;
  weight?: number;
  healthConcerns: string[];
  allergies: string[];
}

export interface Ingredient {
  id: string;
  nameKo: string;
  nameEn: string;
  purpose: string;
  riskLevel: 'safe' | 'caution' | 'danger';
}

export interface Product {
  id: string;
  brand: string;
  name: string;
  category: string;
  mainCategory?: string;
  subCategory?: string;
  targetPetType?: 'dog' | 'cat' | 'all';
  targetLifeStage?: string[];
  formulation?: string;
  healthConcerns?: string[];
  hasRiskFactors?: string[];
  price: number;
  imageUrl: string;
  productUrl?: string;
  source?: string;
  ingredients: Ingredient[];
  reviewsCount: number;
  averageRating: number;
}
