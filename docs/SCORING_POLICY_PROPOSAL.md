# 판정·적합도 점수 정책 제안서 (승인 전 초안)

> 작성일: 2026-06-23
> 성격: **정책 제안서.** 코드·DB 변경 없음. 본 문서의 모든 수치는 **제안값(미확정)**이며,
>        테스트 사례·서비스 정책 검토 후 **별도 승인**되어야 엔진에 반영한다.
> 선행: 감사 보고서 · 통합 설계서 · Phase 0/1 보고서.
> 적용 대상: 통합 엔진(`analysis-core`)이 산출하는 `UnifiedAnalysisResult`.

---

## 0. 원칙 (수치보다 우선하는 불변 규칙)

이 규칙들은 가중치와 무관하게 **항상 성립**해야 한다. 가중치 합산이 위반할 수 없다.

1. **안전 우선**: 독성·알러지 충돌은 인기·가격·리뷰·기능성·원료 개수로 **상쇄 불가**.
2. **정보 부족 ≠ 안전**: 미등록·미검수 성분은 `safe`로 처리하지 않는다.
3. **검수 게이트**: `inference_status ∈ {auto_suggested, rejected}` 또는 `review_status='draft'`인 데이터는 **확정 위험 판정에 사용하지 않는다**(정보 부족으로 처리).
4. **출처 없는 확정 위험 금지**: 확정적 `danger` 판정은 연결된 `sources`가 있어야 한다(없으면 `caution`/정보부족으로 강등).
5. **종 분리**: 개/고양이 판정은 `dog_risk`/`cat_risk`를 각각 사용. `unknown`은 안전으로 표시하지 않는다.

---

## 1. 독성 성분 판정 우선순위 (요청 #3-1)

`verdict`는 가중합 이전에 **우선순위 결정트리**로 먼저 정해진다(합산은 그 다음, 캡 안에서).

```
우선순위 (위에서 아래로, 먼저 걸리면 확정):
  P1. 종별 명확한 독성·금기        → verdict=NOT_RECOMMENDED, suitability=null 또는 ≤ HARD_TOXIC_CAP
  P2. 등록 알러지와 exact 충돌      → verdict≥CAUTION, suitability ≤ ALLERGEN_EXACT_CAP
  P3. 종·연령·건강 조건부 주의      → verdict≥CAUTION (해당 감점)
  P4. 정보 부족(핵심 원료 미해석)   → verdict=INSUFFICIENT_DATA, suitability=null
  P5. 일반 영양·기능성(가점만)      → verdict=SUITABLE 가능, 가점은 캡 내에서만
```

- **P1(독성)**: `dog_risk='danger'`(개) 또는 `cat_risk='danger'`(고양이)이고 출처가 있는 성분. 예: 자일리톨(개), 양파·마늘, 포도(개), 초콜릿/카페인, 프로필렌글리콜(고양이).
- P1과 P4가 동시면 **P1 우선**(독성이 정보부족보다 우선).
- 독성 1건이라도 있으면 기능성·영양 가점으로 **등급 상승 불가**(원칙 1).

---

## 2. 알러지 exact / trace / derived 판정 차이 (요청 #3-2)

알러지 충돌은 성분의 `relation_type`(→ `ingredient_allergen_map.confidence`)에 따라 강도가 다르다. **`source_group`만 보고 동일 적용 금지**(요청 결정 #2).

| confidence | 해당 form/relation | 분류 | suitability 영향(제안) | verdict |
|---|---|---|---|---|
| **exact** | muscle/meal/protein/장기(liver·heart·gizzard·cartilage·bone·feet) | `conflicts` | 하드캡 `ALLERGEN_EXACT_CAP` | ≥ CAUTION (직접 충돌) |
| **trace** | broth(육수)·possible_trace | `warnings` | 중간 감점, 캡 `ALLERGEN_TRACE_CAP` | CAUTION |
| **derived** | fat(지방)·oil(기름)·extract·flavor | `warnings`(경고만) | 소폭 감점, 하드캡 미적용 | SUITABLE 가능 + 경고 |

예시(닭 알러지):
- `닭고기`/`닭고기 분말`/`닭 간` → **exact** → 직접 충돌, 강등.
- `닭 육수` → **trace** → 주의 경고.
- `닭 지방`/`치킨 오일` → **derived** → "지방 정제품이라 단백질 함량은 적지만, 닭 기원입니다" 경고만(하드 차단 X).

> 정제 지방은 알레르겐(단백질) 잔류가 매우 낮다는 일반론에 근거하되, 이 경계(특히 trace/derived 강도)는 **수의 자문 + 출처 연결** 후 확정한다.

---

## 3. 종·연령 부적합 처리 (요청 #3-3)

- **종 부적합**(예: 고양이 전용을 개 프로필로): 영양 불균형 위험 → `warnings`, 감점(제안 `SPECIES_MISMATCH_PENALTY`). 단, 독성·알러지보다 **하위 우선**(P3).
- **연령 부적합**(예: 자견용을 노령견에): `watch` 수준 주의, 소폭 감점. 적합(`all_life_stages`)이면 가점 소폭.
- 종 위험은 `dog_risk`/`cat_risk`에서 종별로 분리 평가. 한 종에서 `danger`라도 **다른 종 판정에 전이하지 않는다**.

---

## 4. 정보 부족과 적합도의 분리 (요청 #3-4)

**두 축을 분리**한다. 적합도 점수에 정보 부족을 섞지 않는다.

- `analysisConfidence`(0~100): 원재료 공개 수준 + 미등록 성분 수 + 보증성분·열량 유무 + 출처·검수 상태.
- `suitabilityScore`: 안전/적합 축. **정보가 부족하면 점수를 만들지 않고 `null` + `verdict=INSUFFICIENT_DATA`**.

판정 게이트(제안):
```
if 핵심원료 미해석 비율 > UNRESOLVED_CORE_THRESHOLD  → INSUFFICIENT_DATA, suitability=null
elif analysisConfidence < CONF_MIN_FOR_SCORE          → INSUFFICIENT_DATA, suitability=null
else → 정상 판정(P1~P5)
```
- 표시 문구: "제품이 위험하다는 뜻이 아니라, 공개된 정보가 부족하여 판단하기 어렵습니다."(요청 #5)
- 성분 미연결 제품(운영 145개) → 기본 `INSUFFICIENT_DATA`.

---

## 5. 점수 상한(하드캡) 규칙 (요청 #3-5)

가중합(`rawTotal`)이 아무리 높아도 아래 상한을 넘지 못한다. **상한은 안전 사유로만 발동**한다.

| 캡 이름 | 발동 조건 | 제안값(미확정) | 효과 |
|---|---|---|---|
| `HARD_TOXIC_CAP` | 종별 독성(P1) 1건+ | 매우 낮음 / 또는 suitability=null | 추천 불가 |
| `ALLERGEN_EXACT_CAP` | 등록 알러지 exact 충돌 | 낮음 | 추천 등급 불가 |
| `ALLERGEN_TRACE_CAP` | 알러지 trace 충돌 | 중하 | 상위 등급 제한 |
| `DERIVED_WARN`(캡 아님) | 알러지 derived | — | 경고만, 캡 미적용 |

- 캡은 `suitabilityScore`에만 적용. `popularity`/`value`/`productTrust`는 캡 대상 아님(애초에 적합도와 분리).
- **구체 수치는 테스트 사례(8장 설계서 11장) 통과 + 정책 승인 후 확정.** 본 문서는 캡의 *존재와 발동 조건*만 제안한다.

---

## 6. 중복 성분 감점 방지 (요청 #3-6)

표면형 폭증(닭 47행) 환경에서 **같은 기원이 여러 번 나열돼도 중복 감점/가점 금지**.

- 집계 단위는 **표면형이 아니라 canonical(`merged_into`/`source_group`+`form`)**.
- 알러지 충돌은 **(allergen_tag) 단위로 1회**만 카운트(같은 닭 성분 5개 → 닭 충돌 1건).
- 가점도 canonical 단위 1회(예: 오메가-3 공급원이 2개여도 +1회).
- 위험 성분 감점은 **고유 canonical 위험 1건당 1회**.
- "곡물 분할(splitting)" 같은 *의도적* 중복은 별도 규칙으로 다루되(투명도/품질 축), 알러지·독성 중복 카운트와 분리.

---

## 7. 기능성 원료의 상쇄 불가 (요청 #3-7)

- 기능성(글루코사민·오메가-3·유산균 등)·리뷰·평점·가격·인기·원료 개수는 **독성/알러지 충돌의 verdict·하드캡을 절대 상향시키지 못한다**(원칙 1).
- 기능성은 `positives`에만 기록되고, 가점은 **하드캡 한도 내에서만** 반영.
- 구현 보장: verdict는 P1~P4에서 먼저 결정 → 가점은 그 후 캡 내 가산. 순서상 상쇄 불가가 강제됨.

---

## 8. 규칙 우선순위 (요청 본문 #5, 명시적 보장)

엔진은 다음 순서를 **명시적으로** 적용한다(2~7장이 이를 구체화).

```
1) 종별 명확한 독성·금기        (P1) — 최우선, 상쇄 불가
2) 등록 알러지와의 명확한 충돌    (P2, exact)
3) 종·연령·건강 조건부 주의       (P3, trace/derived/미스매치 포함)
4) 정보 부족                     (P4, INSUFFICIENT_DATA)
5) 일반 영양·기능성(가점)         (P5, 캡 내 가산)
```

---

## 9. 적합도(suitability) 구성요소 — 제안 (가중치 미확정)

> 아래 배점은 **상대적 비중의 제안**일 뿐, 합·개별값은 승인 후 확정. 표는 "무엇을 보는가"를 합의하기 위한 것.

| 구성요소 | 보는 것 | 방향 |
|---|---|---|
| 독성 안전 | 종별 danger 성분 유무(출처 有) | 하드캡/큰 감점 |
| 알러지 안전 | 등록 알러지 exact/trace/derived | confidence별 차등 |
| 종 적합 | dog/cat 일치 | 불일치 감점 |
| 연령 적합 | life stage 일치 | 불일치 소폭 감점 |
| 프로필 주의 | 건강고민 관련 caution_conditions | 감점/주의 |

**적합도에서 제외(분리 축)**: 리뷰·평점(`popularity`), 가격·중량·급여비용(`value`), 제조사 검수·최신성(`productTrust`). 이들은 랭킹에서만 별도 조합(설계서 2장).

---

## 10. 분석 신뢰도(confidence) 구성요소 — 제안

| 구성요소 | 보는 것 | 방향 |
|---|---|---|
| 원재료 공개 수준 | 표시 원료 수/해석 비율 | 높을수록 + |
| 미등록 성분 수 | `unknownIngredients` | 많을수록 − |
| 보증성분·열량 유무 | `nutritional_profiles` 존재 | 있으면 + |
| 출처·검수 상태 | 관련 성분의 `review_status`/`sources` | verified+ |

- confidence가 낮으면 4장 게이트로 `INSUFFICIENT_DATA` 가능.

---

## 11. 승인 절차 (수치 확정 전 필수)

1. 본 정책(원칙·우선순위·캡 존재)에 대한 합의.
2. 설계서 11장 테스트 사례 11종 + 통합/파리티 테스트 작성.
3. 제안 수치(캡·임계·가중치) 1차 셋 입력 → 테스트 사례로 **회귀 검증**.
4. shadow 모드로 구·신 결과 비교, 차이 큰 표본 수의/운영 검수.
5. 수치 승인 → 엔진 반영.

---

## 12. 미해결/확인 필요

- exact/trace/derived 알러지 강도 경계(특히 지방/육수)의 **수의 자문 + 출처**.
- 종별 독성 목록의 출처 연결(P1 발동은 출처 필수).
- `UNRESOLVED_CORE_THRESHOLD`/`CONF_MIN_FOR_SCORE` 등 게이트 임계의 데이터 기반 설정.
- 캡 수치(테스트·정책 승인 대기).

---

*본 문서는 제안이다. 어떤 가중치·하드캡도 본 문서로 확정되지 않으며, 11장 절차 승인 후에만 엔진에 반영한다.*
