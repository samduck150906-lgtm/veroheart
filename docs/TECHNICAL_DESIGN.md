# 베로로(Veroro) MVP 기술 설계서

> 반려동물 사료 성분 분석 앱 — 풀스택 아키텍처 문서  
> 작성일: 2026-06-21

---

## 목차

1. [추천 기술스택](#1-추천-기술스택)
2. [전체 아키텍처](#2-전체-아키텍처)
3. [DB 스키마](#3-db-스키마)
4. [API 명세](#4-api-명세)
5. [화면별 프론트 구조](#5-화면별-프론트-구조)
6. [상태관리 구조](#6-상태관리-구조)
7. [추천 알고리즘 MVP](#7-추천-알고리즘-mvp)
8. [OCR 처리 플로우](#8-ocr-처리-플로우)
9. [보안/개인정보 고려사항](#9-보안개인정보-고려사항)
10. [MVP 개발 일정](#10-mvp-개발-일정)
11. [기능 우선순위](#11-기능-우선순위)
12. [추후 확장 방향](#12-추후-확장-방향)

---

## 1. 추천 기술스택

### 최종 채택 스택 (현재 구현 기준)

| 레이어 | 기술 | 선택 이유 |
|--------|------|-----------|
| **프론트엔드** | React 18 + TypeScript + Vite | 생태계 최대, 빠른 HMR, 팀 러닝커브 최소 |
| **모바일 래핑** | Capacitor (iOS/Android) | 웹 코드베이스 100% 재사용, RN 대비 빠른 배포 |
| **스타일** | Tailwind CSS + 커스텀 Toss 디자인 시스템 | 유틸리티 클래스로 빠른 Toss-style 구현 |
| **백엔드** | Supabase (PostgreSQL + Auth + Storage + Edge Functions) | BaaS로 인프라 관리 없이 즉시 시작 가능 |
| **상태관리** | Zustand | 보일러플레이트 최소, TypeScript 친화적 |
| **OCR** | Tesseract.js (클라이언트) + Supabase Edge Function | 오프라인 동작 가능, 서버 비용 절감 |
| **결제** | Toss Payments Widget SDK | 국내 최고 UX, 간편한 연동 |
| **배포** | Netlify (웹) + App Store/Play Store (앱) | Capacitor 공식 지원, CI/CD 자동화 |

### React Native vs Flutter 비교 (결정 근거)

베로로는 **React + Capacitor** 채택. 그 이유:

```
React Native
✅ 네이티브 성능 우수
✅ 큰 생태계
❌ 웹/앱 코드 분리 필요 — 사실상 2개 프로젝트
❌ Expo 외 설정 복잡
❌ 팀이 React 웹 경험 있을 때 전환 비용 발생

Flutter
✅ 단일 코드베이스 (웹+앱)
✅ 성능 최상위권
❌ Dart 언어 — 러닝커브 높음
❌ 국내 NPM 생태계 (사료 DB, 쿠팡 SDK 등) 미지원
❌ 웹 지원 아직 성숙도 낮음

React + Capacitor (채택)
✅ 기존 React 웹 자산 100% 재활용
✅ 단일 코드베이스로 웹/iOS/Android 동시 배포
✅ NPM 생태계 풀 활용 (Tesseract.js, Toss SDK 등)
✅ Supabase JS SDK 완벽 지원
✅ Toss-style 디자인 → CSS만으로 구현 가능
⚠️ 네이티브 성능은 RN 대비 약간 열세 (사료 분석 앱에서는 비중요)
```

---

## 2. 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                        클라이언트 레이어                              │
│                                                                     │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐   │
│   │  웹 (Netlify) │   │  iOS 앱      │   │  Android 앱          │   │
│   │  React+Vite  │   │  Capacitor   │   │  Capacitor           │   │
│   └──────┬───────┘   └──────┬───────┘   └──────────┬───────────┘   │
│          └──────────────────┴──────────────────────┘               │
│                    React 18 + Zustand + Tailwind                    │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS / Supabase JS SDK
┌────────────────────────────▼────────────────────────────────────────┐
│                        Supabase 레이어                               │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  Auth        │  │  PostgreSQL  │  │  Storage     │             │
│  │  (이메일/소셜) │  │  (메인 DB)   │  │  (이미지/OCR)│             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                     │
│  ┌──────────────────────────────────────────────────────┐          │
│  │                  Edge Functions (Deno)               │          │
│  │  analyze-ingredients │ personalized-score │ admin-auth│          │
│  └──────────────────────────────────────────────────────┘          │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐                                │
│  │  Row Level   │  │  Realtime    │                                │
│  │  Security    │  │  (커뮤니티)   │                                │
│  └──────────────┘  └──────────────┘                                │
└────────────────────────────┬────────────────────────────────────────┘
                             │ 외부 연동
┌────────────────────────────▼────────────────────────────────────────┐
│                       외부 서비스                                     │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐                                │
│  │  Toss Pay   │  │  쿠팡 파트너스 │                                │
│  │  (결제)      │  │  (제휴링크)   │                                │
│  └──────────────┘  └──────────────┘                                │
└─────────────────────────────────────────────────────────────────────┘
```

### 디렉토리 구조

```
veroheart/
├── src/
│   ├── pages/              # 라우트별 페이지 컴포넌트
│   │   ├── Home.tsx        # 홈 (개인화 추천 피드)
│   │   ├── Search.tsx      # 상품 검색
│   │   ├── Scanner.tsx     # 바코드/OCR 스캐너
│   │   ├── ScanResult.tsx  # 스캔 결과 + 궁합 점수
│   │   ├── Detail.tsx      # 상품 상세
│   │   ├── AnalysisResult.tsx  # 성분 분석 리포트
│   │   ├── Ranking.tsx     # 랭킹
│   │   ├── Comparison.tsx  # 비교함
│   │   ├── Community.tsx   # 커뮤니티
│   │   ├── IngredientDictionary.tsx  # 성분사전
│   │   ├── PetProfile.tsx  # 펫 프로필
│   │   ├── Profile.tsx     # 마이페이지
│   │   └── admin/          # 관리자 페이지
│   ├── components/         # 재사용 UI 컴포넌트
│   │   ├── cards/          # 상품카드, 성분카드 등
│   │   ├── layout/         # BottomNav, Header 등
│   │   └── ui/             # Button, Badge, Modal 등
│   ├── analysis/           # 성분 분석 엔진 (순수 TS)
│   │   ├── ruleEngine.ts   # 궁합 점수 산출 엔진
│   │   ├── rules.ts        # 규칙 데이터
│   │   ├── ocr.ts          # Tesseract 래퍼
│   │   ├── labelParser.ts  # 성분표 파싱
│   │   ├── normalize.ts    # 성분명 정규화
│   │   └── nutrition.ts    # 급여량 계산
│   ├── store/
│   │   └── useStore.ts     # Zustand 글로벌 스토어
│   ├── lib/
│   │   └── supabase.ts     # Supabase 클라이언트 + API 함수
│   └── types/              # TypeScript 타입 정의
├── supabase/
│   ├── functions/          # Edge Functions
│   │   ├── analyze-ingredients/
│   │   ├── personalized-score/
│   │   └── admin-auth/
│   └── migrations/         # SQL 마이그레이션
├── android/                # Capacitor Android 프로젝트
├── ios/                    # Capacitor iOS 프로젝트
└── public/                 # 정적 자산
```

---

## 3. DB 스키마

### 핵심 원칙
- **UUID** 기본키 (uuid_generate_v4())
- **RLS** 모든 유저 데이터 테이블에 적용
- **Soft delete** 없음 — CASCADE로 정리
- **JSONB** 배열/비정형 데이터 (건강고민, 알레르기 등)

### 전체 ERD

```sql
-- ============================================================
-- 1. 유저 / 펫
-- ============================================================

CREATE TABLE public.profiles (
  id            uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  nickname      text,
  avatar_url    text,
  push_token    text,
  marketing_agreed boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE public.pet_profiles (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name          text NOT NULL,
  species       text NOT NULL CHECK (species IN ('dog','cat')),
  breed         text,
  age_months    integer,          -- 개월 수 (정밀도 향상)
  weight_kg     numeric(5,2),
  gender        text CHECK (gender IN ('male','female','unknown')),
  is_neutered   boolean DEFAULT false,
  health_concerns text[],         -- ['관절','피부','소화'] 등
  allergies     text[],           -- ['닭고기','유제품'] 등
  is_primary    boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

-- ============================================================
-- 2. 상품 / 성분
-- ============================================================

CREATE TABLE public.products (
  id                  uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  brand_name          text NOT NULL,
  manufacturer_name   text,
  name                text NOT NULL,
  product_type        text NOT NULL,  -- 'dry_food','wet_food','snack','supplement'
  main_category       text,
  sub_category        text,
  target_pet_type     text CHECK (target_pet_type IN ('dog','cat','all')),
  target_life_stage   text[],         -- ['puppy','adult','senior','all']
  formulation         text,           -- '건식','습식','동결건조' 등
  health_concerns     text[],         -- 기능성 태그
  has_risk_factors    text[],         -- 주의 성분 태그 (denorm)
  min_price           integer,
  image_url           text,
  avg_rating          numeric(3,2) DEFAULT 0,
  review_count        integer DEFAULT 0,
  verification_status text DEFAULT 'pending'
                        CHECK (verification_status IN ('pending','verified','needs_review')),
  verified_at         timestamptz,
  coupang_product_id  text,
  coupang_link        text,
  barcode             text UNIQUE,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_products_target_pet ON products(target_pet_type);
CREATE INDEX idx_products_brand ON products(brand_name);
CREATE INDEX idx_products_barcode ON products(barcode);

-- 성분 사전
CREATE TABLE public.ingredients (
  id                  uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name_ko             text NOT NULL UNIQUE,
  name_en             text,
  aliases             text[],         -- 동의어 목록 (정규화용)
  category            text,           -- '단백질원','곡물','첨가물' 등
  purpose             text,           -- 기능 설명
  risk_level          text NOT NULL CHECK (risk_level IN ('safe','warning','danger')),
  description         text,           -- 성분사전 본문
  caution_conditions  text[],         -- 주의해야 할 조건
  allergy_triggers    text[],         -- 알레르기 유발 동물
  health_benefits     text[],         -- ['관절','피부'] — 기능성 매칭용
  created_at          timestamptz DEFAULT now()
);

-- 상품-성분 매핑 (순서 중요: 첫 번째가 주성분)
CREATE TABLE public.product_ingredients (
  product_id    uuid REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id uuid REFERENCES ingredients(id) ON DELETE CASCADE,
  sort_order    integer DEFAULT 0,    -- 성분표 표기 순서
  percentage    numeric(5,2),        -- % (라벨에 있는 경우)
  PRIMARY KEY (product_id, ingredient_id)
);

-- 보증성분 (영양분석표)
CREATE TABLE public.product_nutrition (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id      uuid REFERENCES products(id) ON DELETE CASCADE UNIQUE,
  crude_protein   numeric(5,2),   -- %
  crude_fat       numeric(5,2),
  crude_fiber     numeric(5,2),
  crude_ash       numeric(5,2),
  moisture        numeric(5,2),
  calcium         numeric(5,2),
  phosphorus      numeric(5,2),
  calories_kcal   numeric(7,1),   -- kcal/kg
  calories_source text,           -- 'ME','GE' 등
  updated_at      timestamptz DEFAULT now()
);

-- ============================================================
-- 3. 분석 / 스캔
-- ============================================================

CREATE TABLE public.scan_histories (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       uuid REFERENCES profiles(id) ON DELETE CASCADE,
  pet_id        uuid REFERENCES pet_profiles(id) ON DELETE SET NULL,
  scan_type     text NOT NULL CHECK (scan_type IN ('barcode','ocr','manual')),
  product_id    uuid REFERENCES products(id) ON DELETE SET NULL,
  raw_ocr_text  text,
  ocr_image_url text,
  result_json   jsonb,           -- 분석 결과 스냅샷
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE public.analysis_reports (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         uuid REFERENCES profiles(id) ON DELETE CASCADE,
  pet_id          uuid REFERENCES pet_profiles(id) ON DELETE SET NULL,
  product_id      uuid REFERENCES products(id) ON DELETE SET NULL,
  compatibility_score integer CHECK (compatibility_score BETWEEN 0 AND 100),
  score_breakdown jsonb,         -- {base:40, allergy:-20, health:+15, ...}
  flags           jsonb,         -- {allergyConflicts:[], cautionIngredients:[], benefits:[]}
  created_at      timestamptz DEFAULT now()
);

-- ============================================================
-- 4. 즐겨찾기 / 비교함
-- ============================================================

CREATE TABLE public.favorites (
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE,
  product_id  uuid REFERENCES products(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE public.comparisons (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE,
  product_ids uuid[] NOT NULL,   -- 최대 4개
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- 5. 리뷰 / 커뮤니티
-- ============================================================

CREATE TABLE public.product_reviews (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE,
  product_id  uuid REFERENCES products(id) ON DELETE CASCADE,
  pet_id      uuid REFERENCES pet_profiles(id) ON DELETE SET NULL,
  rating      integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       text,
  body        text,
  images      text[],
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE public.community_posts (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE,
  category    text,    -- '사료추천','건강고민','일상' 등
  title       text,
  body        text NOT NULL,
  images      text[],
  view_count  integer DEFAULT 0,
  like_count  integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE public.community_comments (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id     uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES community_comments(id) ON DELETE CASCADE,
  body        text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE public.likes (
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('post','comment','review')),
  target_id   uuid NOT NULL,
  created_at  timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, target_type, target_id)
);

-- ============================================================
-- 6. 랭킹 / 구매링크
-- ============================================================

CREATE TABLE public.rankings (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id      uuid REFERENCES products(id) ON DELETE CASCADE,
  category        text NOT NULL,   -- 'dog_dry_food', 'cat_snack' 등
  rank_position   integer NOT NULL,
  score           numeric(5,2),
  period          text,            -- 'weekly','monthly'
  calculated_at   timestamptz DEFAULT now()
);

CREATE TABLE public.purchase_links (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id  uuid REFERENCES products(id) ON DELETE CASCADE,
  platform    text NOT NULL,   -- 'coupang','naver','auction' 등
  url         text NOT NULL,
  price       integer,
  is_affiliate boolean DEFAULT false,
  updated_at  timestamptz DEFAULT now()
);

-- ============================================================
-- 7. 기타 (관리자, 배너)
-- ============================================================

CREATE TABLE public.banners (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title       text NOT NULL,
  subtitle    text,
  image_url   text,
  link_url    text,
  bg_color    text,
  sort_order  integer DEFAULT 0,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE public.unmatched_ingredients_queue (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  raw_name        text NOT NULL,
  source_type     text,            -- 'ocr','manual'
  product_id      uuid REFERENCES products(id),
  reported_count  integer DEFAULT 1,
  status          text DEFAULT 'pending',  -- 'pending','resolved','dismissed'
  created_at      timestamptz DEFAULT now()
);
```

### RLS 정책 요약

```sql
-- 공개 읽기 (상품, 성분, 랭킹)
CREATE POLICY "public_read" ON products FOR SELECT USING (true);
CREATE POLICY "public_read" ON ingredients FOR SELECT USING (true);

-- 본인 데이터만 접근
CREATE POLICY "own_data" ON pet_profiles
  USING (user_id = auth.uid());

CREATE POLICY "own_data" ON scan_histories
  USING (user_id = auth.uid());

-- 커뮤니티: 읽기 공개, 쓰기는 로그인 필요
CREATE POLICY "public_read" ON community_posts FOR SELECT USING (true);
CREATE POLICY "auth_write" ON community_posts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

---

## 4. API 명세

모든 API는 **Supabase JS SDK** (클라이언트 직접 호출) 또는 **Edge Function** (복잡한 로직)으로 구현.

### 4-1. 회원 API

| 동작 | 방식 | 설명 |
|------|------|------|
| 이메일 회원가입 | `supabase.auth.signUp()` | 이메일 인증 자동 발송 |
| 카카오 로그인 | `supabase.auth.signInWithOAuth({ provider: 'kakao' })` | |
| 로그아웃 | `supabase.auth.signOut()` | |
| 프로필 조회 | `supabase.from('profiles').select()` | |
| 프로필 수정 | `supabase.from('profiles').update()` | |

### 4-2. 펫 프로필 API

```typescript
// 펫 목록 조회
const { data } = await supabase
  .from('pet_profiles')
  .select('*')
  .eq('user_id', userId)
  .order('is_primary', { ascending: false });

// 펫 등록/수정
await supabase.from('pet_profiles').upsert({
  user_id: userId,
  name, species, breed, age_months, weight_kg,
  health_concerns, allergies, is_primary
});
```

### 4-3. 상품 검색 API

```typescript
// 키워드 검색 + 필터
const { data } = await supabase
  .from('products')
  .select(`
    *, 
    product_ingredients(ingredients(*)),
    product_nutrition(*)
  `)
  .ilike('name', `%${keyword}%`)
  .eq('target_pet_type', petType)       // 필터
  .overlaps('health_concerns', tags)    // 기능성 태그
  .order('avg_rating', { ascending: false })
  .range(offset, offset + pageSize - 1);
```

### 4-4. 상품 상세 API

```typescript
const { data } = await supabase
  .from('products')
  .select(`
    *,
    product_ingredients(sort_order, ingredients(*)),
    product_nutrition(*),
    purchase_links(*),
    product_reviews(*, profiles(nickname))
  `)
  .eq('id', productId)
  .single();
```

### 4-5. 성분 분석 API (Edge Function)

```
POST /functions/v1/analyze-ingredients
Content-Type: application/json
Authorization: Bearer <user_jwt>

{
  "productId": "uuid",
  "petId": "uuid"
}

→ Response:
{
  "compatibilityScore": 78,
  "breakdown": {
    "base": 50,
    "allergyPenalty": 0,
    "cautionPenalty": -12,
    "healthBonus": 25,
    "ageSuitability": 10,
    "speciesSuitability": 5
  },
  "flags": {
    "allergyConflicts": [],
    "cautionIngredients": ["BHA", "카라기난"],
    "benefits": ["관절 기능 성분 함유", "오메가3 풍부"]
  },
  "ingredientTrafficLights": [
    { "name": "연어", "riskLevel": "safe", "purpose": "단백질원" },
    { "name": "BHA", "riskLevel": "danger", "purpose": "산화방지제" }
  ]
}
```

### 4-6. 궁합 점수 API

성분 분석 API에 포함 (별도 호출 없음). 자세한 산식은 §7 참조.

### 4-7. 급여량 계산 API

```typescript
// 클라이언트 사이드 계산 (src/analysis/nutrition.ts)
function calculateDailyFeeding(params: {
  weightKg: number;
  activityLevel: 'low' | 'normal' | 'high';
  lifestage: 'puppy' | 'adult' | 'senior';
  productCaloriesKcalPerKg: number;
}): { gramsPerDay: number; meetsAafco: boolean }
```

### 4-8. 바코드 검색 API

```typescript
const { data } = await supabase
  .from('products')
  .select('*, product_ingredients(ingredients(*))')
  .eq('barcode', barcodeValue)
  .single();

// 미등록 바코드 → 미등록 큐 추가 후 OCR 유도
```

### 4-9. OCR 분석 API

```typescript
// 1. 이미지 → Supabase Storage 업로드
const { data: upload } = await supabase.storage
  .from('ocr-images')
  .upload(`${userId}/${Date.now()}.jpg`, imageBlob);

// 2. Tesseract.js로 텍스트 추출 (클라이언트)
const result = await Tesseract.recognize(imageBlob, 'kor+eng');

// 3. Edge Function으로 성분명 정규화 + DB 매칭
const { data } = await supabase.functions.invoke('analyze-ingredients', {
  body: { ocrText: result.data.text, petId }
});
```

### 4-10. 랭킹 API

```typescript
const { data } = await supabase
  .from('rankings')
  .select('rank_position, score, products(*)')
  .eq('category', `${species}_${productType}`)
  .eq('period', 'weekly')
  .order('rank_position')
  .limit(20);
```

### 4-11. 비교함 API

```typescript
// 비교함은 클라이언트 상태(Zustand) + 로컬스토리지로 관리
// 저장 시 comparisons 테이블에 기록

const useComparisonStore = () => {
  const items = useStore(s => s.comparisonItems);  // Product[]
  const add = (p: Product) => { /* 최대 4개 */ };
  const remove = (id: string) => { /* ... */ };
  const clear = () => { /* ... */ };
};
```

### 4-12. 찜 API

```typescript
// 찜 추가
await supabase.from('favorites')
  .insert({ user_id: userId, product_id: productId });

// 찜 삭제
await supabase.from('favorites')
  .delete()
  .match({ user_id: userId, product_id: productId });

// 찜 목록 (궁합 점수 포함)
const { data } = await supabase
  .from('favorites')
  .select('products(*)')
  .eq('user_id', userId);
```

### 4-13. 커뮤니티 API

```typescript
// 게시글 목록 (Realtime 구독)
const channel = supabase
  .channel('community')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_posts' },
    (payload) => addPost(payload.new))
  .subscribe();

// 게시글 작성
await supabase.from('community_posts').insert({
  user_id: userId, category, title, body, images
});
```

### 4-14. 성분사전 API

```typescript
const { data } = await supabase
  .from('ingredients')
  .select('*')
  .or(`name_ko.ilike.%${query}%,name_en.ilike.%${query}%`)
  .order('name_ko');
```

### 4-15. 관리자 API (Edge Function)

```
POST /functions/v1/admin-auth  (관리자 인증 미들웨어)

// 상품 등록/수정
POST /functions/v1/admin-auth + body { action: 'upsert_product', ... }

// 성분 승인 처리
POST /functions/v1/admin-auth + body { action: 'resolve_ingredient', ... }

// 랭킹 재계산
POST /functions/v1/admin-auth + body { action: 'recalculate_rankings', category }
```

---

## 5. 화면별 프론트 구조

### 하단 탭 구조

```
┌────────────────────────────────────┐
│          하단 탭 네비게이션           │
│  🏠홈  │  🔍검색  │  📷스캔  │  🏆랭킹  │  👤마이  │
└────────────────────────────────────┘
```

### 탭별 스택

```
홈 탭
  └── Home (개인화 추천 피드, 배너, 최근 본 상품)
        └── Detail (상품 상세)
              └── AnalysisResult (성분 분석 리포트)

검색 탭
  └── Search (검색 + 필터)
        ├── Detail
        └── IngredientDictionary (성분사전)

스캔 탭 (중앙 버튼)
  └── Scanner (바코드 / OCR 선택)
        └── ScanResult (분석 결과)
              └── Detail

랭킹 탭
  └── Ranking (카테고리별 랭킹)
        └── Comparison (비교함)

마이 탭
  └── Profile (마이페이지)
        ├── PetProfile (펫 프로필 관리)
        ├── Favorites (찜 목록)
        ├── Community (커뮤니티)
        └── Auth (로그인/회원가입)
```

### 주요 화면 컴포넌트 명세

#### Home.tsx
```tsx
<HomeScreen>
  <PetContextBanner pet={activePet} />   // "멍이를 위한 추천"
  <BannerCarousel banners={banners} />
  <Section title="맞춤 추천">
    <ProductCard[] products={personalizedRanking} showScore />
  </Section>
  <Section title="최근 본 상품">
    <ProductCard[] products={recentViews} />
  </Section>
  <Section title="이번 주 인기">
    <ProductCard[] products={weeklyTop} />
  </Section>
</HomeScreen>
```

#### Detail.tsx
```tsx
<DetailScreen>
  <ProductHero image thumbnail badge />
  <PetCompatibilityCard score={78} breakdown pet={activePet} />
  <IngredientTrafficLights ingredients />   // 🟢🟡🔴
  <NutritionTable guaranteed_analysis />
  <FeedingGuide weight={pet.weightKg} />
  <SimilarProducts />
  <ReviewSection />
  <StickyBottomCTA>
    <AddToFavorites />
    <AddToComparison />
    <BuyButton coupangLink />
  </StickyBottomCTA>
</DetailScreen>
```

#### ScanResult.tsx
```tsx
<ScanResultScreen>
  <PetContextBanner />
  <ScannedProductCard />
  <AnimatedScore score compatibilityScore />  // 0→78 애니메이션
  <ScoreBreakdownAccordion breakdown />
  <FlagCards allergyConflicts cautionIngredients benefits />
  <IngredientList trafficLights />
  <ActionButtons>
    <SaveToHistory />
    <ViewDetail />
    <ShareResult />
  </ActionButtons>
</ScanResultScreen>
```

#### Scanner.tsx
```tsx
<ScannerScreen>
  <TabSelector mode={barcodeMode | ocrMode} />

  {barcodeMode && (
    <BarcodeViewfinder onDetect={handleBarcode} />
  )}

  {ocrMode && (
    <>
      <CameraCapture onCapture={handleImage} />
      <OcrProgressBar />
      <OcrResultEditor         // 사용자가 OCR 결과 수정 가능
        rawText={ocrText}
        parsedIngredients={parsed}
        onEdit={handleEdit}
      />
    </>
  )}
</ScannerScreen>
```

---

## 6. 상태관리 구조

### Zustand 스토어 구조

```typescript
// src/store/useStore.ts

interface StoreState {
  // ── 인증
  userId: string | null;
  isLoggedIn: boolean;
  isInitializing: boolean;
  initApp: () => Promise<void>;
  signOut: () => Promise<void>;

  // ── 펫 프로필
  profile: UserPetProfile;          // 현재 활성 펫 (UI 전반에 사용)
  allPets: PetProfile[];
  activePetId: string | null;
  updateProfile: (updates: Partial<UserPetProfile>) => void;
  setActivePet: (petId: string) => void;

  // ── 상품
  products: Product[];
  selectedProduct: Product | null;
  isLoadingProducts: boolean;
  fetchProducts: () => Promise<void>;
  fetchProductDetail: (id: string) => Promise<void>;

  // ── 즐겨찾기
  favorites: string[];              // product_id[]
  toggleFavorite: (productId: string) => Promise<void>;

  // ── 비교함 (클라이언트 전용)
  comparisonItems: Product[];       // 최대 4개
  addToComparison: (p: Product) => void;
  removeFromComparison: (id: string) => void;
  clearComparison: () => void;

  // ── 장바구니
  cartItems: CartItem[];
  addToCart: (item: CartItem) => Promise<void>;
  removeFromCart: (id: string) => Promise<void>;

  // ── 최근 본 상품
  recentViews: Product[];
  addRecentView: (product: Product) => Promise<void>;

  // ── 주문
  orders: SupabaseOrderWithItems[];
  fetchOrders: () => Promise<void>;

  // ── 배너
  banners: Banner[];

  // ── 관리자
  isAdmin: boolean;
}
```

### 데이터 흐름 원칙

```
Supabase ──→ useStore ──→ React Components
                ↑
         Zustand persist
         (localStorage)
              ↑
         activePet / favorites / recentViews
         앱 재시작 시 복원
```

### 성능 최적화

- `shallow` equality check로 불필요한 리렌더링 방지
- 상품 목록: 무한 스크롤 + 오프셋 페이지네이션
- 이미지: Supabase Storage CDN URL + WebP 변환
- 분석 결과: 클라이언트 메모이제이션 (`useMemo`)

---

## 7. 추천 알고리즘 MVP

### 궁합 점수 산식 (0–100점)

```typescript
// src/analysis/ruleEngine.ts

interface ScoreInput {
  pet: UserPetProfile;
  product: Product;
  ingredients: Ingredient[];
  nutrition?: GuaranteedAnalysis;
}

function calculateCompatibilityScore(input: ScoreInput): AnalysisReport {
  let score = 50; // 기본 점수

  // ── 1. 알레르기 충돌 (최대 -40점)
  const allergyConflicts = input.ingredients.filter(ing =>
    ing.allergy_triggers?.some(trigger =>
      input.pet.allergies.includes(trigger)
    )
  );
  score -= allergyConflicts.length * 20;  // 건당 -20점

  // ── 2. 위험 성분 (최대 -20점)
  const dangerIngredients = input.ingredients.filter(
    ing => ing.risk_level === 'danger'
  );
  score -= dangerIngredients.length * 10;

  // ── 3. 주의 성분 (-3점/개)
  const cautionIngredients = input.ingredients.filter(
    ing => ing.risk_level === 'warning'
  );
  score -= cautionIngredients.length * 3;

  // ── 4. 건강 고민 매칭 (+5점/매칭)
  const healthBonus = (input.product.health_concerns ?? [])
    .filter(tag => input.pet.healthConcerns.includes(tag)).length * 5;
  score += Math.min(healthBonus, 25);  // 최대 +25

  // ── 5. 연령 적합성 (+10점)
  if (isLifestageMatch(input.pet, input.product)) score += 10;

  // ── 6. 종 적합성 (+5점)
  const speciesMatch =
    input.product.target_pet_type === 'all' ||
    input.product.target_pet_type === input.pet.species.toLowerCase();
  if (speciesMatch) score += 5;

  // ── 7. 주성분 품질 (+10점)
  // 첫 3개 성분 중 단백질원이 있으면 가산
  const topIngredients = input.ingredients.slice(0, 3);
  const hasQualityProtein = topIngredients.some(
    ing => ing.category === '동물성단백질'
  );
  if (hasQualityProtein) score += 10;

  return {
    compatibilityScore: Math.max(0, Math.min(100, score)),
    breakdown: { base: 50, allergyPenalty, cautionPenalty, healthBonus, ... },
    flags: { allergyConflicts, dangerIngredients, cautionIngredients, benefits }
  };
}
```

### 점수 등급

| 점수 | 등급 | 색상 | 설명 |
|------|------|------|------|
| 85–100 | 최적 | 🟢 초록 | 강력 추천 |
| 70–84 | 좋음 | 🟡 노랑 | 적합 |
| 50–69 | 보통 | 🟠 주황 | 주의 성분 있음 |
| 0–49 | 주의 | 🔴 빨강 | 비추천 / 알레르기 위험 |

### 개인화 랭킹 알고리즘

```typescript
// 홈 화면 맞춤 추천 정렬
function sortByPersonalization(products: Product[], pet: UserPetProfile) {
  return products
    .map(p => ({
      ...p,
      personalScore: calculateCompatibilityScore({ pet, product: p, ... }).compatibilityScore,
    }))
    .sort((a, b) => b.personalScore - a.personalScore);
}
```

---

## 8. OCR 처리 플로우

```
사용자 촬영
    │
    ▼
[1] 이미지 전처리 (클라이언트)
    - 리사이즈 (max 1600px)
    - 그레이스케일 변환
    - 대비 향상
    │
    ▼
[2] Tesseract.js 텍스트 추출 (클라이언트)
    - 언어: kor+eng
    - PSM 모드: 자동 세그멘테이션
    - 신뢰도 점수 반환
    │
    ▼
[3] 성분표 섹션 파싱 (src/analysis/labelParser.ts)
    - "원재료명:" 이후 텍스트 추출
    - 콤마/괄호 기준 분리
    - 정규식으로 퍼센트/괄호 정리
    │
    ▼
[4] 성분명 정규화 (src/analysis/normalize.ts)
    - 유니코드 정규화 (NFC)
    - 공백/특수문자 제거
    - 동의어 사전 매핑 (닭고기 → 가금류, Chicken → 닭고기 등)
    │
    ▼
[5] DB 성분 매칭 (ingredients 테이블)
    - 정확히 일치: matched
    - aliases 배열 검색: matched
    - 미일치: "확인필요" 태그 + unmatched_queue 적재
    │
    ▼
[6] OCR 결과 수정 UI (사용자 인터랙션)
    - 파싱된 성분 목록 표시
    - 인라인 편집 가능
    - "확인필요" 항목 하이라이트
    - 사용자 수정 후 재매칭
    │
    ▼
[7] 분석 결과 저장
    - scan_histories 테이블
    - ocr_image_url: Storage 경로
    - result_json: 최종 분석 결과 스냅샷
```

### OCR 정규화 예시

```typescript
// src/analysis/normalize.ts

const SYNONYM_MAP: Record<string, string> = {
  'chicken': '닭고기',
  '가금류분': '닭고기',
  '닭고기분': '닭고기',
  'salmon': '연어',
  'DHA': 'DHA',
  '도코사헥사엔산': 'DHA',
  'BHA': 'BHA',
  '부틸히드록시아니솔': 'BHA',
  // ...
};

function normalizeIngredientName(raw: string): string {
  const cleaned = raw
    .normalize('NFC')
    .replace(/\s+/g, '')
    .replace(/\([^)]*\)/g, '')  // 괄호 내용 제거
    .trim();
  return SYNONYM_MAP[cleaned] ?? SYNONYM_MAP[cleaned.toLowerCase()] ?? cleaned;
}
```

---

## 9. 보안/개인정보 고려사항

### 인증 보안

| 항목 | 조치 |
|------|------|
| JWT 토큰 | Supabase 자동 관리 (HttpOnly 쿠키 미사용, localStorageRLS로 보완) |
| 세션 만료 | 7일 + 리프레시 토큰 자동 갱신 |
| 관리자 권한 | Edge Function 내 `admin_users` 테이블 별도 확인 |
| 소셜 로그인 | Supabase OAuth (카카오, 애플) — 토큰 서버 측 검증 |

### 데이터 보안

```sql
-- RLS 핵심 정책: 본인 데이터만 접근
ALTER TABLE pet_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_pets" ON pet_profiles
  FOR ALL USING (user_id = auth.uid());

-- 분석 리포트: 본인만 조회
ALTER TABLE analysis_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_reports" ON analysis_reports
  FOR ALL USING (user_id = auth.uid());
```

### 개인정보 처리방침

| 데이터 | 보관 | 처리 근거 |
|--------|------|-----------|
| 이메일 | 회원 탈퇴 시 즉시 삭제 | 계약 이행 |
| 펫 정보 | 회원 탈퇴 시 CASCADE 삭제 | 동의 |
| 스캔 이력 | 최대 1년 보관 후 자동 삭제 | 동의 |
| OCR 이미지 | 분석 완료 후 30일 뒤 삭제 | 동의 |
| 결제 정보 | Toss Payments 서버에만 저장 (PCI DSS) | 법적 의무 |

### API 보안

- Edge Function에서 요청 Origin 검증
- Rate Limiting: Supabase 플랜 기본 제공 + Edge Function 커스텀 제한
- SQL Injection: Supabase JS SDK 파라미터 바인딩으로 원천 차단
- XSS: React DOM 자동 이스케이프 + DOMPurify (커뮤니티 HTML 허용 시)

### 아동 보호

- 만 14세 미만 가입 불가 (약관 + 생년월일 확인)
- 개인정보 동의 별도 체크박스

---

## 10. MVP 개발 일정

### 전제 조건
- 팀 구성: 풀스택 1명 + 디자이너 1명 (파트타임)
- 이미 구현된 기능 다수 존재 (현재 코드베이스 기준)

```
PHASE 0: 기반 정비 (1주)
─────────────────────────────
Week 1
  ✅ DB 스키마 정리 + RLS 완성
  ✅ TypeScript 타입 정리
  ✅ Supabase Edge Functions 기본 설정
  ✅ CI/CD (GitHub Actions → Netlify)

PHASE 1: 핵심 기능 (3주)
─────────────────────────────
Week 2
  ✅ 바코드 스캐너 + 상품 DB 매칭
  ✅ 성분 분석 엔진 (ruleEngine.ts)
  ✅ 궁합 점수 UI (트래픽라이트 + 점수 카드)

Week 3
  ✅ 펫 프로필 CRUD
  ✅ 홈 개인화 추천 피드
  ✅ 상품 검색 + 필터

Week 4
  ✅ OCR 스캐너 + labelParser
  ✅ 성분 정규화 + 미매칭 처리
  ✅ 사용자 OCR 수정 UI

PHASE 2: 부가 기능 (2주)
─────────────────────────────
Week 5
  □ 랭킹 페이지
  □ 비교함 (최대 4개)
  □ 즐겨찾기

Week 6
  □ 커뮤니티 기본 (게시판 + 댓글)
  □ 성분사전
  □ 리뷰 작성

PHASE 3: 출시 준비 (1주)
─────────────────────────────
Week 7
  □ 관리자 페이지 완성
  □ 상품 데이터 100개+ 입력
  □ App Store / Play Store 심사 제출
  □ 개인정보처리방침 / 이용약관
  □ 성능 테스트 + 버그 수정
```

**총 7주 → MVP 출시**

---

## 11. 기능 우선순위

### P0 — 없으면 출시 불가 (Must Have)

- [x] 회원가입/로그인 (이메일 + 카카오)
- [x] 펫 프로필 등록
- [x] 바코드 스캔 → 상품 조회
- [x] 성분 분석 + 궁합 점수
- [x] 트래픽라이트 성분 표시 (🟢🟡🔴)
- [ ] 상품 데이터 최소 100건

### P1 — 핵심 가치 (Should Have)

- [x] OCR 성분표 스캔
- [x] 홈 개인화 추천
- [x] 상품 검색 + 필터
- [x] 즐겨찾기
- [ ] 랭킹
- [ ] 비교함

### P2 — 차별화 기능 (Nice to Have)

- [ ] 커뮤니티 (게시판)
- [x] 성분사전
- [ ] 급여량 계산기
- [ ] 구매링크 (쿠팡 파트너스)
- [ ] 푸시 알림

### P3 — Phase 2 (Later)

- [ ] 영양소 부족 경고
- [ ] 브랜드 파트너십 기능
- [ ] 수의사 추천 배지
- [ ] 정기 배송 기능

---

## 12. 추후 확장 방향

### Phase 3: 데이터 인프라 (4–6개월)

- **상품 DB 자동화**: 크롤러 → 관리자 검수 → 승인 파이프라인
- **랭킹 자동 계산**: Supabase Scheduled Functions (CRON)
- **검색 고도화**: PostgreSQL Full-Text Search + pg_trgm (한국어 형태소 분석)
- **A/B 테스트**: 추천 알고리즘 버전 비교

### Phase 4: ML 고도화 (6개월+)

```
사용자 행동 데이터 수집
    ↓
협업 필터링 (비슷한 펫 프로필 → 비슷한 추천)
    ↓
성분 임베딩 (성분 벡터화 → 유사 제품 추천)
```

### 비즈니스 확장

| 단계 | 수익 모델 | 기술 요구사항 |
|------|-----------|--------------|
| MVP | 쿠팡 파트너스 제휴 | purchase_links 테이블 |
| 6개월 | 프리미엄 분석 구독 | 결제 + 구독 관리 |
| 12개월 | 브랜드 광고/스폰서 랭킹 | 광고 인벤토리 시스템 |
| 18개월 | 수의사 파트너십 | 전문가 인증 시스템 |

### 기술 부채 관리

1. **바코드 DB 확장**: 현재 수동 입력 → 식약처 공공 API 연동
2. **이미지 최적화**: Supabase Storage → Cloudflare Images (CDN)
3. **오프라인 지원**: PWA Service Worker + IndexedDB 캐싱
4. **테스트 커버리지**: 분석 엔진 단위 테스트 (Vitest) 80% 이상 목표

---

*이 문서는 현재 `veroheart` 코드베이스 (React+Vite+Capacitor+Supabase) 기준으로 작성되었으며, 구현 진행에 따라 지속 업데이트됩니다.*
