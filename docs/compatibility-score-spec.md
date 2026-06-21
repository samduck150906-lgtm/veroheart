# 베로로 궁합 점수 룰 엔진 상세 스펙

> 구현 위치: `src/utils/score.ts` (`getRecommendationBreakdown`)
> 분석 룰 엔진(성분 매칭/위험 규칙): `src/analysis/ruleEngine.ts`, `src/analysis/rules.ts`

궁합 점수는 **하나의 반려동물 프로필 × 하나의 상품**을 0~100점으로 환산한 값이다.
"이 제품이 우리 아이에게 얼마나 맞는가"를 단일 숫자 + 등급 + 근거로 보여준다.

---

## 1. 설계 원칙

1. **결정형(deterministic) 우선.** 같은 입력 → 항상 같은 점수. LLM은 "쉬운 설명" 생성에만 제한적으로 사용하고 점수 산출에는 관여하지 않는다.
2. **안전이 마케팅을 이긴다.** 회피(알레르기)·위험 성분이 있으면 평점·리뷰·가성비가 아무리 좋아도 추천 등급에 오르지 못한다(하드캡).
3. **투명성.** 점수만 주지 않고 `reasons[]`로 근거를 함께 제공한다.
4. **참고 정보.** 수의학적 진단이 아니라 구매 보조 정보임을 항상 고지한다.

---

## 2. 입력

### PetProfile (`UserPetProfile`)
`species, age, weightKg?, breed?, healthConcerns[], allergies[]`
- `allergies[]` = 회피 성분 어휘(예: `["닭고기"]`). 하드 안전 규칙의 핵심 입력.
- `healthConcerns[]` = 건강 고민(예: `["관절·슬개골"]`).

### Product
`targetPetType, targetLifeStage[], price, averageRating, reviewsCount, verificationStatus, ingredients[], healthConcerns[], guaranteedAnalysis?`
- `ingredients[].riskLevel ∈ {safe, caution, danger}` — 위험 신호의 1차 입력.

---

## 3. 가중 합산 (rawTotal, 0~100)

| 버킷 | 만점 | 산식(현행) |
|---|---:|---|
| **safety** (성분 안전) | 35 | 35 − 위험×10 − 주의×4 − 회피hit×18 (회피 1+개 시 −6) + min(6, 안전성분수) |
| **concern** (건강 고민 적합) | 25 | 8 + 매칭고민×7 + min(4, 상품 healthConcern 수) |
| **socialProof** (신뢰) | 20 | (평점/5 × 0.75 + log10(리뷰+1)/3 × 0.25) × 20 |
| **value** (가성비) | 10 | 6 ±가격대 보정 − max(0, 위험−1) |
| **petFit** (종/연령 적합) | 10 | 종 일치 10 / 공용 8 / 불일치 0, 시니어·퍼피 매칭 시 +2 |
| **verification** (검수) | 10 | verified 10 / pending 0 / needs_review 1 / 기본 4 |
| **nutrition** (AAFCO 영양) | 10 | `guaranteedAnalysis` 없으면 0. 있으면: 기본 5 + 단백 DMB ≥ 기준 +2/−2 + 지방 DMB ≥ 기준 +2/−1 + Ca:P 정상 +1/−1. clamp(0,10). |

`rawTotal = clamp(0, 100, Σ buckets)`

### 매칭 규칙
- **회피(알레르기) hit:** 상품 성분의 `nameKo/nameEn/purpose` 중 하나가 `allergies[]` 항목을 부분 포함하면 hit.
- **건강 고민 매칭:** 상품 `healthConcerns[]` 또는 성분 `purpose/nameKo/nameEn`이 고민 키워드를 포함하면 매칭.

---

## 4. 안전 하드캡 (신규 · 핵심 신뢰 규칙)

가중 합산만으로는 회피 성분이 있어도 다른 버킷 점수로 80점대가 나올 수 있다.
이를 막기 위해 **점수 상한**을 강제한다.

```
cap = 100
if allergyHits.length > 0:  cap = min(cap, ALLERGEN_SCORE_CAP = 55)
if dangerCount   > 0:       cap = min(cap, DANGER_SCORE_CAP   = 69)
total  = min(rawTotal, cap)
capped = total < rawTotal
```

- **회피 성분 포함 →** 최대 55점. 등급 C 이하로만 노출되어 절대 "추천(A/B)"되지 않는다.
- **위험 성분 포함 →** 최대 69점. A 등급 불가.
- `capped` 플래그로 UI에서 "안전 상한 적용됨"을 설명할 수 있다.

> 구현/검증: `src/utils/score.ts`, `src/utils/score.test.ts`(회피·위험·정상 케이스).

---

## 5. 출력 (`RecommendationBreakdown`)

```ts
{
  total,        // 하드캡 적용 최종 점수
  rawTotal,     // 캡 적용 전 원점수
  capped,       // 안전 상한으로 깎였는지
  grade,        // gradeFromScore(total)
  safety, concern, socialProof, value, petFit, verification,
  allergyHits[], matchedConcerns[], dangerCount, cautionCount,
  reasons[],    // 사람이 읽는 근거 문장
}
```

### 등급 매핑 (`gradeFromScore`) — 단일 진실 공급원
| 점수 | 등급 | 톤 |
|---|---|---|
| 85+ | **A** | 우수 |
| 70–84 | **B** | 양호 |
| 55–69 | **C** | 보통 |
| ~54 | **D** | 아쉬움 |

모든 화면(ProductCard / Detail / 분석 리포트 / 비교함 / 랭킹)은 이 함수를 단일 출처로 사용한다.

---

## 6. 근거(reasons) 카피 규칙 (UX 라이팅 연동)

| 조건 | 문장(예) |
|---|---|
| 회피 hit | `회피 성분 닭고기 포함` → UI에선 "베로는 닭고기를 피하는 게 좋아요" |
| 고민 매칭 | `관절·슬개골 고민과 연관` |
| 무위험 | `위험/주의 성분이 거의 없음` |
| 검수 | `운영 검수 완료 데이터` |

단정적 위험 표현 대신 보호자가 죄책감을 느끼지 않는 톤으로 변환해 노출한다.

---

## 7. 랭킹/추천 정렬 (`rankProductsForProfile`)

1. 종/카테고리 1차 필터 → 2. 프로필별 `total` 내림차순 → 3. `limit` 절단.
회피·위험 캡이 점수에 반영되므로, 위험 제품이 추천 상단에 오르지 않는다.

---

## 8. 알려진 한계 & 다음 개선

- **영양 균형(AAFCO/보증성분) 반영됨 (v2):** `nutrition` 버킷이 `guaranteedAnalysis`(조단백/지방/Ca:P)를 DMB로 환산해 AAFCO 최소 기준 충족 여부를 0–10점으로 반영한다 (`src/analysis/nutrition.ts` 활용). 데이터 없으면 0점(중립).
- **금지 성분 사용자 입력:** 프로필에 `bannedIngredients[]`를 추가하면 알레르기와 동일한 하드캡 어휘로 확장 가능.
- **활동량·중성화·체중:** 급여량(`FeedingGuideCalculator`)에는 쓰이나 궁합 점수에는 미반영. petFit 정교화 여지.
- **동의어 정규화:** 매칭이 부분 문자열 기반 → `src/analysis/normalize.ts`/사전 alias로 교체하면 오탐/누락 감소.
