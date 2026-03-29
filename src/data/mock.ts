export interface UserPetProfile {
  id: string;
  name: string;
  species: 'Dog' | 'Cat';
  age: number;
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
  category: string; // compatibility mapping for old code (product_type)
  mainCategory?: string;
  subCategory?: string;
  targetPetType?: 'dog' | 'cat' | 'all';
  targetLifeStage?: string[];
  formulation?: string;
  healthConcerns?: string[];
  hasRiskFactors?: string[];
  price: number;
  imageUrl: string;
  ingredients: Ingredient[];
  reviewsCount: number;
  averageRating: number;
}

export const mockPetProfile: UserPetProfile = {
  id: 'user_1',
  name: '로니',
  species: 'Dog',
  age: 4,
  healthConcerns: ['관절', '피부'],
  allergies: ['닭고기', '인공색소'],
};

export const mockIngredients: Record<string, Ingredient> = {
  ing_1: { id: 'ing_1', nameKo: '가수분해 연어', nameEn: 'Hydrolyzed Salmon', purpose: '주단백질원', riskLevel: 'safe' },
  ing_2: { id: 'ing_2', nameKo: '고구마', nameEn: 'Sweet Potato', purpose: '탄수화물원', riskLevel: 'safe' },
  ing_3: { id: 'ing_3', nameKo: '닭고기 분말', nameEn: 'Chicken Meal', purpose: '단백질원', riskLevel: 'caution' },
  ing_4: { id: 'ing_4', nameKo: 'BHA', nameEn: 'BHA', purpose: '합성 보존료', riskLevel: 'danger' },
  ing_5: { id: 'ing_5', nameKo: '글루코사민', nameEn: 'Glucosamine', purpose: '관절 건강', riskLevel: 'safe' },
  ing_6: { id: 'ing_6', nameKo: '인공색소 적색40호', nameEn: 'Red 40', purpose: '색소', riskLevel: 'danger' },
};

export const mockProducts: Product[] = [
  {
    id: 'prod_1',
    brand: '올리브펫',
    name: '프리미엄 조인트 케어 연어 레시피',
    category: '건식 사료',
    price: 35000,
    imageUrl: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&q=80',
    ingredients: [mockIngredients.ing_1, mockIngredients.ing_2, mockIngredients.ing_5],
    reviewsCount: 1245,
    averageRating: 4.8,
  },
  {
    id: 'prod_2',
    brand: '해피독',
    name: '치킨 앤 라이스 데일리 밸런스',
    category: '건식 사료',
    price: 28000,
    imageUrl: 'https://images.unsplash.com/photo-1568644396922-5c3bfae12521?w=400&q=80',
    ingredients: [mockIngredients.ing_3, mockIngredients.ing_2, mockIngredients.ing_4],
    reviewsCount: 890,
    averageRating: 3.9,
  },
  {
    id: 'prod_3',
    brand: '내추럴본',
    name: '알러지 프리 덴탈츄',
    category: '간식',
    price: 12000,
    imageUrl: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80',
    ingredients: [mockIngredients.ing_2, mockIngredients.ing_5, mockIngredients.ing_6],
    reviewsCount: 320,
    averageRating: 3.5,
  }
];
