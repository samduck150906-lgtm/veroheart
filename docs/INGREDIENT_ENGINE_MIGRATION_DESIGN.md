# 베로로 성분 분석·판정 시스템 통합 마이그레이션 설계서

> 작성일: 2026-06-23
> 전제: 본 설계 단계에서 **판정 로직 코드는 수정하지 않음**. 운영 DB는 **읽기 전용 조회만** 수행함(쓰기·마이그레이션 미실행).
> 선행 문서: `docs/INGREDIENT_ANALYSIS_AUDIT.md` (현행 구조 감사)
> 대상 운영 프로젝트: Supabase `veroro` (`nlutpmjloryqdomgbqrr`, ap-south-1)

---

## 0. 운영 데이터 실측 결과 (감사 보고서 "확인 불가" 항목 해소)

저장소 코드만으로는 볼 수 없던 사실을 운영 DB에서 직접 확인했다. 이 실측이 설계의 핵심 근거이자 최대 위험 요인이다.

| 항목 | 실측값 | 의미 |
|---|---|---|
| `ingredients` 행 수 | **539** (시드 SQL은 70) | 운영에서 자동 적재로 폭증 |
| `products` 행 수 | 458 | |
| `product_ingredients` 링크 | 4,265 | |
| 성분이 1개라도 연결된 제품 | 313 / 458 | **145개 제품은 성분 링크 0개 → INSUFFICIENT_DATA 대상** |
| **닭 계열 변형 row** | **47개** | "닭고기/닭 지방/닭고기 지방/닭고기 기름/닭고기 밀/닭고기 식사/동결건조 닭고기/유기농 닭고기…"가 **각각 독립 성분 row** |
| `allergy_triggers` 채워진 행 | **0 / 539** | 태그 기반 알러지 판정 데이터가 **운영에 전무** |
| `allergen_group` 채워진 행 | **0 / 539** | (운영에서 추가됐으나 미사용 컬럼) |
| `functional_benefit` 채워진 행 | **0 / 539** | (동일) |
| `risk_level` 분포 | safe 474 / caution 57 / danger 8 | |
| `analysis_rules` | 12행 (존재) | 규칙 DB는 적재됐으나 **런타임이 안 읽음** |
| `ingredient_synonyms` | 121행 (존재) | 별칭 테이블 존재하나 **score.ts가 안 읽음** |
| `allergens` | 15행 | |
| `ingredient_allergen_map` | **0행** | 성분↔알러지 연결 비어 있음 |
| `unmatched_ingredients` 큐 | **0행** | 운영에서 한 번도 적재 안 됨(카탈로그 경로 미연결) |
| Edge Functions | `analyze-ingredients` v1, `personalized-score` v1, `admin-auth` v1 (모두 ACTIVE) | |

**결정적 결론 3가지**
1. 운영의 살아있는 알러지 판정은 **오직 `score.ts` 부분문자열**뿐이다. 잘 설계된 태그·시노님·규칙 테이블은 적재돼 있으나 **런타임에서 사용되지 않는다**(죽은 데이터).
2. `ingredients` 테이블은 정규화 사전이 아니라 **표면형이 그대로 행이 된 평면 집합**이다(닭 47행). canonical 개념이 없다.
3. `product_ingredients` 4,265개 링크가 이 표면형 행을 가리킨다 → 마이그레이션의 최대 난점은 **표면형 539행을 canonical로 병합하면서 FK 4,265개를 재지정**하는 것이다.

> ⚠️ 본 조회는 `veroro` 프로젝트가 현재 앱이 가리키는 운영 DB라는 **코드상 확증은 못 했다**(`.env`의 `VITE_SUPABASE_URL` 실제 값 미확인). 동일 조직 내 후보 프로젝트(`eternalsix-core`, `o1t`, `veroro` 등)가 여럿 존재. **운영 URL 최종 확인 필요**(아래 9장·미해결 문제).

---

## 1. 목표 아키텍처

### 1-1. 단일 판정 경로 (유일한 진실 공급원)

```
제품 원재료 원문 (DB ingredients_raw / OCR / 텍스트 입력)
        │
        ▼
[1] split        성분 문자열 분리            ← splitIngredients (공용)
        │
        ▼
[2] normalize    표준 표기 정규화             ← normalize() (공용, 단일 함수)
        │
        ▼
[3] resolve      canonical 성분 + 파생형 해석  ← ingredient_aliases (DB, 단일 소스)
        │                                       관계: same/meal/fat/broth/extract/...
        ▼
[4] evaluate     반려동물 프로필 × 규칙 비교    ← analysis_rules (DB) + allergen_map (DB)
        │
        ▼
[5] score        suitability / confidence 계산  ← 순수 함수(런타임 무관)
        │
        ▼
[6] explain      판정 이유·출처 코드 부착        ← reasonCodes / sourceIds / *Version
        │
        ▼
   UnifiedAnalysisResult  ← 모든 화면·스캐너·Edge가 "소비만" 함
```

핵심 원칙:
- **데이터(성분·별칭·규칙)는 DB 한 곳**. 코드에 하드코딩 사전 금지.
- **엔진 코드는 1벌**(순수 TS, DOM/Deno/Node 비의존). 데이터는 주입(injection)받아 처리 → 브라우저·Edge 동일 모듈 사용.
- **화면은 재판정 금지**. `UnifiedAnalysisResult`만 표시.

### 1-2. 런타임 토폴로지 (브라우저 ↔ Edge 동일 출력 보장)

```
        ┌─────────────────────────────────────────────┐
        │   @veroro/analysis-core  (순수 TS, 부수효과 없음)   │
        │   normalize · resolve · evaluate · score        │
        │   입력: (rawText, petProfile, EngineData)        │
        │   출력: UnifiedAnalysisResult                    │
        └───────────────▲───────────────▲────────────────┘
                        │               │  (동일 코드, 동일 입력 → 동일 출력)
         브라우저(Vite)  │               │  Edge(Deno)
                        │               │
        supabase-js fetch│               │supabase-js fetch
   (ingredients/aliases/rules)     (동일 쿼리)
                        │               │
                        ▼               ▼
              ┌──────────────────────────────┐
              │   Supabase (단일 데이터 소스)     │
              │   ingredients / ingredient_aliases │
              │   analysis_rules / ingredient_allergen_map │
              │   engine_versions               │
              └──────────────────────────────┘
```

> 엔진은 DB를 직접 호출하지 않는다. **데이터 로딩은 각 런타임의 얇은 어댑터**가 담당하고, 로딩된 `EngineData`를 순수 엔진에 주입한다. 이로써 Deno/브라우저 런타임 차이를 우회하면서 "동일 입력 → 동일 출력"을 보장한다.

---

## 2. 적합도 지표 분리

`score.ts`의 단일 점수를 **5개 독립 지표**로 분해한다. **사용자에게 보이는 "우리 아이 적합도"에는 리뷰·인기·가격을 포함하지 않는다.**

| 지표 | 구성 요소 | 산출 위치 | 사용처 |
|---|---|---|---|
| **suitabilityScore** | 독성, 알러지 충돌, 종 적합성, 연령 적합성, 프로필 주의사항 | `analysis-core` (엔진) | **화면 헤드라인 "적합도"** |
| **analysisConfidence** | 원재료 공개 수준, 미등록 성분 수, 보증성분·열량 유무, 출처·검수 상태 | `analysis-core` (엔진) | 적합도 옆 "분석 신뢰도" 배지 |
| **productTrustScore** | 제조사·제품 검수, 데이터 최신성, 출처 신뢰도 | `src/utils/productTrust.ts` (신규) | 랭킹 가중치(선택) |
| **popularityScore** | 리뷰 수, 평점 | `src/utils/popularity.ts` (신규) | 랭킹 가중치(선택) |
| **valueScore** | 가격, 중량, 일일 급여비용 | `src/utils/value.ts` (신규) | 랭킹 가중치(선택) |

- `UnifiedAnalysisResult`는 **suitability + confidence + findings**만 담는다(판정).
- `productTrust/popularity/value`는 **결과 객체 밖**에서 따로 계산하고, **종합 랭킹이 필요할 때만** 별도 조합:

```ts
// 랭킹 전용 (적합도 화면에는 노출 안 함)
interface ProductRankingScore {
  suitability: number | null;   // 안전 하드캡 우선
  productTrust: number;
  popularity: number;
  value: number;
  composite: number;            // 가중 조합 (suitability 우선, 충돌 시 강등)
}
```

> 안전 하드캡(알러지/독성 충돌 시 추천 등급 강제 강등)은 **suitability에서만** 적용하고, 인기·가격으로 상쇄되지 않게 한다.

---

## 3. 단일 분석 결과 형식

```ts
// src/analysis/types.ts (신규 타입)

export type Verdict = 'SUITABLE' | 'CAUTION' | 'NOT_RECOMMENDED' | 'INSUFFICIENT_DATA';

export type RelationType =
  | 'same_ingredient' | 'protein_derivative' | 'meal' | 'broth'
  | 'fat_derivative'  | 'oil' | 'extract' | 'flavor'
  | 'possible_trace'  | 'unknown_derivative';

export interface NormalizedIngredient {
  rawName: string;            // 라벨 원문
  normalized: string;         // 정규화 키
  ingredientId: string | null;// canonical 성분 id (없으면 null)
  canonicalNameKo: string | null;
  sourceGroup: string | null; // 원료 기원 그룹 (예: chicken)
  ingredientForm: string | null; // 형태 (예: fat, meal, broth, muscle)
  relationType: RelationType | null;
  position: number;           // 표기 순서(1부터)
  allergenTags: string[];     // canonical에서 상속
  matchConfidence: number;    // 0~1
}

export interface AnalysisFinding {
  code: string;               // reasonCode (예: ALLERGEN_CONFLICT)
  level: 'danger' | 'caution' | 'watch' | 'good' | 'info';
  title: string;
  message: string;
  ingredients: string[];
  scoreDelta: number;
  evidenceLevel: 'regulatory' | 'veterinary' | 'nutrition_guideline' | 'internal_policy';
  sourceIds: string[];        // 근거 row id (ingredient/rule)
}

export interface UnknownIngredient {
  rawName: string;
  normalized: string;
  loggedToQueue: boolean;
}

export interface UnifiedAnalysisResult {
  verdict: Verdict;
  suitabilityScore: number | null;   // INSUFFICIENT_DATA면 null
  analysisConfidence: number;        // 0~100, 항상 산출

  normalizedIngredients: NormalizedIngredient[];
  conflicts: AnalysisFinding[];      // 알러지/독성 충돌
  warnings: AnalysisFinding[];
  positives: AnalysisFinding[];
  unknownIngredients: UnknownIngredient[];

  reasonCodes: string[];
  sourceIds: string[];

  ingredientDbVersion: string;       // 데이터 버전 스탬프
  ruleVersion: string;
  scoringVersion: string;
}
```

**소비 전환 대상**(각자 재판정하지 않고 이 객체만 사용):
`src/utils/score.ts`(suitability만 위임) · `src/utils/productConclusion.ts` · `src/analysis/scoringPipeline.ts` · 상세 리포트(`src/utils/analysis.ts`) · `ProductCard` · `Search` · `Ranking` · `Home` · `Comparison` · 스캐너(`Analyzer.tsx`) · Edge `analyze-ingredients`/`personalized-score`.

---

## 4. 성분 마스터 및 별칭 구조 (목표 스키마)

### 4-1. `ingredients` (canonical 마스터로 재정의)

기존 539행의 표면형을 **canonical 개념 단위로 축약**하고 컬럼을 확장한다.

```sql
-- 신규 컬럼 (ALTER, 멱등)
ALTER TABLE public.ingredients
  ADD COLUMN IF NOT EXISTS canonical_name_ko text,     -- 표준 한글명
  ADD COLUMN IF NOT EXISTS canonical_name_en text,
  ADD COLUMN IF NOT EXISTS category text,              -- animal_protein / animal_fat / carbohydrate ...
  ADD COLUMN IF NOT EXISTS source_group text,          -- chicken / beef / salmon ... (원료 기원)
  ADD COLUMN IF NOT EXISTS ingredient_form text,       -- muscle / meal / fat / broth / oil / extract ...
  ADD COLUMN IF NOT EXISTS dog_risk text,              -- safe/caution/danger
  ADD COLUMN IF NOT EXISTS cat_risk text,
  ADD COLUMN IF NOT EXISTS allergen_tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS nutrition_tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS risk_tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS default_severity text DEFAULT 'safe',
  ADD COLUMN IF NOT EXISTS evidence_level text DEFAULT 'internal_policy',
  ADD COLUMN IF NOT EXISTS review_status text DEFAULT 'pending', -- pending/verified/needs_review
  ADD COLUMN IF NOT EXISTS is_canonical boolean DEFAULT true,    -- 병합 후 표면형은 false
  ADD COLUMN IF NOT EXISTS merged_into uuid REFERENCES public.ingredients(id),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
```

> 종별 분리는 `dog_risk`/`cat_risk` 두 컬럼으로 명시. 기존 단일 `risk_level`은 마이그레이션 기간 호환 유지 후 폐기.

### 4-2. `ingredient_aliases` (신규, `ingredient_synonyms` 대체)

```sql
CREATE TABLE IF NOT EXISTS public.ingredient_aliases (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id    uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  raw_alias        text NOT NULL,
  normalized_alias text NOT NULL,
  language         text NOT NULL DEFAULT 'ko',
  relation_type    text NOT NULL DEFAULT 'same_ingredient',
  match_priority   integer NOT NULL DEFAULT 100,  -- 낮을수록 우선
  review_status    text NOT NULL DEFAULT 'pending',
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ingredient_aliases_norm_uniq UNIQUE (normalized_alias)
);
CREATE INDEX IF NOT EXISTS idx_aliases_ingredient ON public.ingredient_aliases(ingredient_id);
```

`relation_type` 허용값(최소): `same_ingredient`, `protein_derivative`, `meal`, `broth`, `fat_derivative`, `oil`, `extract`, `flavor`, `possible_trace`, `unknown_derivative`.

### 4-3. 닭 계열 목표 매핑 (요청 7종 + 운영 실데이터 반영)

운영에는 47개 닭 변형이 있으나, 모두 **canonical 3~4개**로 수렴시키고 표면형은 alias로 강등한다.

| 표면형(원문) | canonical | source_group | ingredient_form | relation_type | 알러지 적용 |
|---|---|---|---|---|---|
| 닭고기 / 건조 닭고기 / 동결건조 닭고기 / 뼈없는 닭고기 / 유기농 닭고기 | **닭고기** | chicken | muscle | same_ingredient | 적용(exact) |
| 닭고기 분말 / 닭고기육분 / 닭고기 밀 / 닭고기 식사 / 닭고기분 | **닭고기분(계육분)** | chicken | meal | meal | 적용(exact) |
| 닭 단백질 / 닭고기 단백질 / 가수분해 닭고기 단백질 | **닭 단백질** | chicken | protein | protein_derivative | 적용(exact) |
| 닭 육수 / 닭고기 육수 / 닭육수 | **닭 육수** | chicken | broth | broth | 적용(낮은 신뢰)¹ |
| 닭 지방 / 닭지방 / 닭고기 지방 / 닭고기 기름 / 유기농 닭 지방 | **닭지방** | chicken | fat | fat_derivative | **하드 충돌 아님**² |

¹ 육수: 단백질 잔류 가능 → `possible_trace`/`broth`로 경고(주의)하되 hard 차단은 아님.
² **지방: source_group=chicken이되 ingredient_form=fat → 닭고기 단백질과 동일한 알러지 하드 충돌을 무조건 적용하지 않음.** `fat_derivative` 관계는 "낮은 신뢰 알러지 경고(warning)"로만 반영(정제 지방은 단백질 함량 미미). 이 규칙이 요청 5장의 핵심 요구를 충족한다.

→ "닭고기, 건조 닭고기, 닭고기 분말, 닭 육분, 닭 단백질, 닭 육수, 닭 지방"이 **하나의 문자열로 뭉개지지 않으면서**(form 구분) **공통 기원(chicken)은 추적**되고, **지방은 단백질과 다른 알러지 강도**를 갖는다.

### 4-4. 알러지 연결 (`ingredient_allergen_map` 활용 + 신뢰도)

```sql
-- 기존 테이블 활용. confidence에 'derived' 추가 사용.
-- relation_type → confidence 매핑:
--   same_ingredient/protein_derivative/meal → 'exact'
--   broth/possible_trace                    → 'trace'
--   fat_derivative/oil/extract/flavor       → 'derived'
--   unknown_derivative                      → (연결 안 함)
ALTER TABLE public.ingredient_allergen_map
  DROP CONSTRAINT IF EXISTS ingredient_allergen_map_confidence_check;
ALTER TABLE public.ingredient_allergen_map
  ADD CONSTRAINT ingredient_allergen_map_confidence_check
  CHECK (confidence IN ('exact','derived','trace'));
```

엔진은 `confidence`별로 충돌 강도를 달리한다: `exact`→conflict(하드캡), `trace`→caution, `derived`→watch(경고만).

### 4-5. 버전 스탬프 (`engine_versions`)

```sql
CREATE TABLE IF NOT EXISTS public.engine_versions (
  kind        text PRIMARY KEY,   -- 'ingredient_db' | 'rule' | 'scoring'
  version     text NOT NULL,      -- 예: '2026-06-23.1' 또는 콘텐츠 해시
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```
엔진은 결과에 이 값을 `ingredientDbVersion/ruleVersion/scoringVersion`으로 스탬프 → 브라우저·Edge 버전 일치 검증과 캐시 무효화 기준.

---

## 5. 미등록 성분 처리 (전 경로 통일)

| 규칙 | 적용 |
|---|---|
| 자동 안전 처리 금지 | `risk:safe` 강제 부여 폐지 (현행 Edge `analyze-ingredients/index.ts:434` 제거) |
| `unknownIngredients`에 포함 | 모든 경로 |
| `analysisConfidence` 감점 | 미등록 1건당 confidence 차감 |
| 최종 판정 제한 | 미등록 비율이 높으면(예: 핵심 원료 미해석) `verdict='INSUFFICIENT_DATA'`, `suitabilityScore=null` |
| 검수 큐 기록 | `log_unmatched_ingredient` 호출을 **카탈로그·스캐너·Edge 모두**에서 수행(현재는 스캐너만, 운영 큐 0행) |

> 운영 `unmatched_ingredients`가 0행인 것은 카탈로그·Edge 경로가 큐에 안 쌓고 있다는 직접 증거다. 통일 후에는 자동 적재되어 관리자 검수로 사전이 성장한다.

---

## 6. 공통 엔진 (`src/analysis` 기반 + 부족분 명시)

`src/analysis`를 기반으로 삼되, **현재 구조 그대로 확정하지 않는다.** 부족분:

| 부족분 | 현재 | 보완 |
|---|---|---|
| 데이터 소스 | 사전이 코드 배열(`ingredientDictionary.ts`) | DB 주입형 `EngineData`로 전환 |
| canonical/파생 구분 | `chicken` vs `chicken_fat` 2종뿐 | `source_group`+`ingredient_form`+`relation_type` 정식 모델 |
| 별칭 누락 | 닭 육분/닭 단백질/닭 육수 미해석 | `ingredient_aliases`로 데이터 보강 |
| Edge 공유 | Edge가 자체 하드코딩 사전 | 순수 엔진 공유 + DB 주입 |
| 결과 형식 | `RuleEngineResult`(suitability/confidence 미분리) | `UnifiedAnalysisResult` |
| 종별 위험 | 규칙 species만 | 성분 `dog_risk`/`cat_risk` 추가 |

**브라우저/Edge 런타임 차이 대응 (요청 6장 조건 충족):**
- **단일 데이터 소스**: DB(`ingredients`/`ingredient_aliases`/`analysis_rules`/`ingredient_allergen_map`).
- **동일 입력→동일 출력**: 엔진은 순수 함수. 비결정 요소(시간/랜덤/로캘) 사용 금지. 정렬 기준 고정.
- **동일 테스트 케이스**: 공용 골든 픽스처(JSON)를 Vitest(Node)와 Deno test가 **동일 파일**로 검증.
- **버전 일치 검증**: 결과의 `*Version` 스탬프가 브라우저·Edge에서 동일한지 통합 테스트로 단언.
- **독립 하드코딩 사전 금지**: `analyze-ingredients`의 `TOXIC_INGREDIENTS`/`CAUTION_*`/`BENEFICIAL_*` 및 `INGREDIENT_DICTIONARY` 배열 제거.

> 코드 공유 방식: `src/analysis/core/`를 DOM·Deno·Node 비의존 **순수 모듈**로 분리하고, 브라우저는 Vite로 번들, Edge는 Deno가 동일 소스를 import(상대경로 또는 `deno.json` 매핑). 직접 공유가 어려우면 빌드 스텝으로 `supabase/functions/_shared/analysis-core.ts`에 **동일 소스 복제 + 해시 검증 CI**(불일치 시 빌드 실패)로 대체.

---

## 7. 단계별 이행 (점진적, 기존 코드 선삭제 금지)

| 단계 | 작업 | 산출/게이트 |
|---|---|---|
| **1. 스키마 추가** | `ingredients` 컬럼 확장 + `ingredient_aliases` + `engine_versions` + `allergen_map` confidence 확장 | 멱등 마이그레이션, 기존 컬럼 보존 |
| **2. 성분·별칭 병합** | 539 표면형 → canonical 병합, `source_group`/`form`/`relation_type` 부여, 표면형은 alias로 강등(`merged_into`), `product_ingredients` FK 재지정 | **관리자 검수 후 적용**, 드라이런 리포트 |
| **3. 규칙 이관** | `rules.ts` → `analysis_rules`(이미 12행 적재됨) 검증·보강, 엔진이 DB 로드 | `ruleEngine.test.ts` 동치 |
| **4. 공통 엔진 구현** | 순수 `analysis-core` + DB 어댑터 + `UnifiedAnalysisResult` | 신규 엔진 단위 테스트 |
| **5. 비교 모드(shadow)** | 구 엔진과 신 엔진을 **동시 계산**, 차이를 로깅(화면엔 구 결과 유지) | 차이 리포트 대시보드 |
| **6. 차이 검수** | 차이 큰 제품·프로필 표본 수의·운영 검수 | 허용 오차 합의 |
| **7. 상세 헤드라인 전환** | `Detail.tsx` 헤드라인을 신 `suitabilityScore`로 | 기능 플래그 |
| **8. 카드·검색·랭킹 전환** | `ProductCard`/`Search`/`Ranking`/`Home`/`Comparison` | 플래그 |
| **9. 스캐너·Edge 전환** | `Analyzer.tsx` + `analyze-ingredients`/`personalized-score` | 파리티 테스트 |
| **10. 중복 제거** | 죽은 코드·하드코딩 사전 삭제 | 5장 삭제 목록 |

**기능 플래그**(예: `analysis_engine=v2`)로 단계별 롤아웃. 5단계 비교 모드와 파리티 테스트 통과 전에는 **어떤 기존 코드도 삭제하지 않는다.**

---

## 8. 수정할 파일 목록 (변경, 삭제 아님)

| 파일 | 변경 내용 |
|---|---|
| `src/analysis/types.ts` | `UnifiedAnalysisResult`·`NormalizedIngredient`·`AnalysisFinding`·`RelationType` 등 추가 |
| `src/analysis/normalize.ts` | 정규화 강화(영문/괄호/쉼표 일관), 단일 표준화 |
| `src/analysis/core/` (신규) | 순수 엔진: resolve/evaluate/score |
| `src/analysis/dataSource.ts` (신규) | DB→`EngineData` 로딩 어댑터(브라우저/Edge 공용 인터페이스) |
| `src/analysis/ruleEngine.ts` | DB 규칙 소비 + `UnifiedAnalysisResult` 산출로 리팩터 |
| `src/analysis/scoringPipeline.ts` | 결과 객체 소비로 변경 |
| `src/utils/score.ts` | 5지표 분리, suitability는 엔진 위임, 부분문자열 알러지 제거 |
| `src/utils/analysis.ts` | `UnifiedAnalysisResult` 소비 |
| `src/utils/productConclusion.ts` | 자체 알러지 검사 제거, 결과 소비 |
| `src/utils/productTrust.ts`·`popularity.ts`·`value.ts` (신규) | 비-적합도 지표 분리 |
| `src/lib/supabaseRowTypes.ts` | alias/canonical·allergen_tags 매핑 |
| `src/lib/supabase.ts` | 전 경로 `logUnmatchedIngredients` 호출, `EngineData` fetch |
| `src/pages/Detail.tsx` 외 화면들 | 단일 결과 소비, 랭킹은 별도 조합 |
| `supabase/functions/analyze-ingredients/index.ts` | 하드코딩 사전 제거, 공통 엔진 사용 |
| `supabase/functions/personalized-score/index.ts` | 공통 엔진 사용 |

## 9. 삭제 예정 코드 목록 (파리티 통과 후에만)

| 대상 | 사유 |
|---|---|
| `src/utils/compatibilityScorer.ts` | 미사용(import 0) |
| `src/utils/petFoodScorer.ts` | 테스트 전용 |
| `analyze-ingredients` 내 `TOXIC_INGREDIENTS`/`CAUTION_PRESERVATIVES`/`CAUTION_GRAINS`/`BENEFICIAL_INGREDIENTS` | DB 사전으로 대체 |
| `ingredientDictionary.ts`의 하드코딩 `INGREDIENT_DICTIONARY` 배열 | DB 소스로 대체(파일은 시드 export로만 잔존 또는 제거) |
| `score.ts`·`productConclusion.ts`의 부분문자열 알러지 로직 | 엔진 태그 매칭으로 대체 |
| `ingredient_synonyms` 테이블(운영) | `ingredient_aliases`로 이관 후 폐기 |

---

## 10. 필드 매핑표 (기존 → 신규)

### 10-1. `ingredients`

| 기존(운영) | 신규 | 변환 규칙 |
|---|---|---|
| `name_ko`(표면형 539) | `canonical_name_ko` + alias | canonical 병합, 표면형은 alias로 |
| `risk_level`(단일) | `dog_risk`,`cat_risk`,`default_severity` | 종별 분리(초기엔 동일값 복제 후 검수) |
| `allergy_triggers`(0행) | `allergen_tags` | **신규 생성** — source_group→allergen 매핑 시드로 채움 |
| `allergen_group`(0행) | `source_group` | 신규 채움(자동 추론 + 검수) |
| `functional_benefit`(0행) | `nutrition_tags` | 신규 채움 |
| `caution_conditions` | (유지) | 그대로 |
| `description` | `explanation` 역할 유지 | |
| (없음) | `category`,`ingredient_form`,`relation_type`(alias),`evidence_level`,`review_status` | 신규 |

### 10-2. 시노님/규칙

| 기존 | 신규 |
|---|---|
| `ingredient_synonyms(synonym_name, language)` | `ingredient_aliases(raw_alias, normalized_alias, language, relation_type, match_priority)` |
| `analysis_rules`(12행, 미사용) | 동일 스키마 **런타임 연결**(엔진이 로드) |
| `score.ts` 버킷(safety/concern/socialProof/value/petFit/verification/nutrition) | suitability(독성·알러지·종·연령) / confidence(공개·미등록·보증성분·검수) / productTrust(verification) / popularity(socialProof) / value(value) |

---

## 11. 테스트 및 비교 모드 계획

### 11-1. 필수 자동 테스트 (골든 픽스처, 브라우저·Edge 공용)

1. 닭 알러지 + 닭고기 → conflict(exact)
2. 닭 알러지 + 닭고기 분말 → conflict(exact, meal)
3. 닭 알러지 + 닭 단백질 → conflict(exact, protein_derivative)
4. 닭 알러지 + 닭 육수 → caution(trace), 하드 차단 아님
5. 닭 알러지 + 닭 지방 → **watch(derived) 경고만**, suitability 하드캡 미적용
6. 포도 독성 규칙 vs 포도씨유 → 포도=danger, 포도씨유=정상(오탐 없음)
7. 우유 알러지 vs 유산균 → 별개 처리(오탐 없음)
8. 미등록 성분만 있는 제품 → `INSUFFICIENT_DATA`, suitability=null, confidence 낮음, 큐 적재
9. 독성+기능성 혼재 → 독성 우선(하드캡), 기능성은 positives에만
10. 보증성분/원재료 불완전 → confidence 강등, verdict 제한
11. 동일 제품을 카탈로그·스캐너에서 분석 → **동일 결과**

### 11-2. 통합(파리티) 테스트

- 동일 입력을 카탈로그·상세·카드·스캐너·Edge 5경로에 통과 → `verdict`/`suitabilityScore`/`reasonCodes` 일치 단언.
- 브라우저 빌드 산출물과 Edge 산출물의 `*Version` 스탬프 일치.

### 11-3. 비교(shadow) 모드

- 5단계에서 구·신 엔진 동시 계산, `analysis_compare_log`(임시)에 `{productId, oldScore, newSuitability, verdict, diffReason}` 적재.
- 임계 차이(예: 등급 역전, 알러지 충돌 유무 변화) 제품을 대시보드로 검수.

---

## 12. 데이터 마이그레이션 위험

| 위험 | 영향 | 완화 |
|---|---|---|
| **표면형 539→canonical 병합 오류** | `product_ingredients` 4,265 링크 오연결 → 판정 왜곡 | 드라이런 리포트 + 관리자 승인 + `merged_into`로 추적/되돌리기 |
| **allergen_tags 0→신규 생성** | 자동 추론 오류 시 알러지 누락/과탐 | source_group→allergen 시드 후 **수의 검수**, exact/derived/trace 신뢰도 구분 |
| `name_ko` UNIQUE 충돌 | 병합 시 제약 위반 | 표면형을 alias로 이동(행 삭제 아님), canonical만 UNIQUE 유지 |
| 운영 DB 대상 오인 | 잘못된 프로젝트에 적용 | **운영 URL 코드 확정(9·14장)** 후 진행, service_role 백업 선행 |
| 145개 성분 미연결 제품 | 대량 `INSUFFICIENT_DATA` 노출 | confidence 배지·문구로 UX 처리, 데이터 보강 우선순위화 |
| 캐시된 `analysis_reports` 불일치 | 과거 결과와 신 결과 상충 | `*Version` 스탬프로 무효화, 재계산 배치 |
| 종별 위험 초기 동일복제 | dog/cat 동일값으로 부정확 | 검수 단계에서 종별 차등 입력 |

---

## 13. 롤백 계획

- **스키마**: 모든 마이그레이션 멱등 + `ADD COLUMN IF NOT EXISTS`만 사용(기존 컬럼·데이터 파괴 금지). 롤백 시 신규 컬럼/테이블 무시 가능(앱이 신컬럼 미사용 상태로 회귀).
- **병합**: 행 삭제 대신 `is_canonical=false`+`merged_into` 사용 → 역매핑으로 원복 가능. `product_ingredients` 재지정은 **백업 테이블**(`product_ingredients_bak_YYYYMMDD`) 선저장.
- **코드**: 기능 플래그(`analysis_engine`) 한 줄로 구↔신 즉시 전환. 신 엔진 비활성 시 기존 `score.ts` 경로 그대로 동작.
- **삭제 금지 원칙**: 10단계 전까지 구 코드 보존 → 어느 단계에서도 플래그 off로 즉시 복귀.
- **Edge**: 신 함수는 새 슬러그(`analyze-ingredients-v2`)로 병행 배포 후 트래픽 전환 → 문제 시 구 슬러그로 회귀.

---

## 14. 예상되는 미해결 문제

1. **운영 DB 동일성 미확정**: 앱의 실제 `VITE_SUPABASE_URL`이 `veroro` 프로젝트인지 코드/시크릿으로 확증 못 함(동일 조직에 후보 8개). 마이그레이션 전 **운영 URL 1차 확정 필수**.
2. **canonical 병합 기준의 모호성**: "닭고기 근위/심장/연골/뼈/발" 등 부산물성 표기를 닭고기(근육)와 같은 canonical로 볼지, 별도 form으로 둘지 정책 필요(영양·알러지 함의 상이).
3. **allergen_tags 생성 신뢰도**: 539행 자동 추론은 오류 가능 → 초기에는 보수적(닭 계열 전부 chicken 태그) 후 검수로 정밀화. 지방/육수의 derived/trace 경계는 수의 자문 필요.
4. **Edge↔브라우저 코드 공유 방식 확정**: Deno import vs 소스 복제+해시검증 중 택1(빌드 파이프라인 영향).
5. **데이터 최신성(productTrust) 정의 부재**: "데이터 최신성/출처 신뢰도"를 무엇으로 측정할지(크롤링 일시·검수일·출처 등급) 메타데이터 설계 필요 — 현재 `verification_status`만 존재.
6. **과거 `analysis_reports` 재계산 범위**: 전량 재계산 vs 지연 재계산 정책, 비용 산정 필요.
7. **성능**: 4,265 링크·539 성분의 `EngineData`를 매 요청 로드 시 캐싱 전략(버전 키 기반) 필요.

---

## 15. 즉시 결정이 필요한 사항

| # | 결정 사항 | 권장 |
|---|---|---|
| 1 | 운영 DB가 `veroro`(`nlutpmjloryqdomgbqrr`)가 맞는가 | 앱 시크릿/배포 환경에서 확정 |
| 2 | 닭 부산물(간/심장/근위/연골/발)의 canonical 정책 | 별도 canonical + source_group=chicken 유지 |
| 3 | Edge 코드 공유 방식 | 소스 복제 + CI 해시 검증(가장 안전) |
| 4 | 종별 위험 초기값 | 동일복제 후 검수 |
| 5 | INSUFFICIENT_DATA 노출 UX | confidence 배지 + "정보 부족" 문구 |

---

*본 문서는 설계안이며, DB·코드 변경은 단계별 승인 후 별도 작업으로 진행한다. 운영 DB에는 읽기 조회만 수행했고 어떤 쓰기도 하지 않았다.*
