# Phase 2 Canonical Mapping Dry-Run Runbook

이 문서는 Phase 1 canonical schema가 운영 Supabase에 적용된 뒤, 기존 성분 데이터가 새 canonical 구조로 얼마나 안전하게 매핑될 수 있는지 읽기 전용으로 확인하는 절차입니다.

이 단계는 실제 데이터 이관이 아닙니다. 결과를 보고 canonical 성분, 별칭, 알러지 그룹, 판정 규칙의 매핑 정책을 확정하기 위한 사전 분석입니다.

## 실행 전 확인

1. Supabase 대시보드에서 현재 프로젝트가 운영 프로젝트인지 확인합니다.
   - 운영 project ref: `nlutpmjloryqdomgbqrr`
2. Phase 1 production migration과 post-migration verification이 완료됐는지 확인합니다.
   - 확인된 최종 상태: `POST_MIGRATION_VERIFIED`
3. 이 dry-run은 비밀키가 필요하지 않습니다.
   - SQL Editor에 이미 로그인된 관리자 세션만 사용합니다.
   - anon key, service role key, access token, database password를 복사하거나 저장하지 않습니다.
4. SQL Editor에서 다른 SQL과 이어 붙이지 않습니다.
   - 반드시 새 쿼리 창에서 아래 파일 하나만 단독 실행합니다.

실행 파일:

```text
supabase/tests/manual/phase2_canonical_mapping_dryrun.sql
```

## 실행 방법

1. GitHub에서 `supabase/tests/manual/phase2_canonical_mapping_dryrun.sql` 파일을 엽니다.
2. 전체 SQL을 복사합니다.
3. Supabase 대시보드의 SQL Editor에서 새 쿼리를 만듭니다.
4. 현재 프로젝트 ref가 `nlutpmjloryqdomgbqrr`인지 다시 확인합니다.
5. dry-run SQL만 붙여 넣고 실행합니다.
6. 결과 표를 CSV 또는 텍스트로 저장합니다.
7. 결과를 제품/성분 정책 리뷰 자료로 공유합니다.

## 결과 컬럼

결과는 사람이 읽기 쉬운 표로 반환됩니다.

| 컬럼 | 의미 |
| --- | --- |
| `section` | 요약, 연결 무결성, 후보 그룹, substring 위험, 알러지/주의 검토, 최종 판정 영역 |
| `severity` | `PASS`, `WARN`, `BLOCK` |
| `metric_name` | 점검 항목 이름 |
| `metric_value` | 숫자, 후보 이름, 또는 최종 판정 |
| `detail` | 사람이 검토할 설명 |
| `recommended_action` | 다음 조치 |

## 주요 지표 해석

- `legacy_ingredient_count`: 기존 `ingredients` 전체 성분 수입니다.
- `product_ingredient_link_count`: 기존 `product_ingredients` 연결 row 수입니다.
- `product_ingredients_with_ingredient_id`: `ingredient_id`가 채워진 연결 row 수입니다.
- `broken_or_empty_product_ingredient_links`: `product_id` 또는 `ingredient_id`가 비어 있거나, 참조 대상 제품/성분을 찾지 못하는 row 수입니다.
- `normalized_key_candidate_group_count`: 단순 정규화 key가 같은 성분 그룹 수입니다.
- `manual_review_candidate_count`: 정규화 key 후보 그룹에 포함된 성분 row 수입니다.
- `dangerous_substring_pair_count`: `포도`와 `포도씨유`처럼 substring 방식으로 잘못 묶일 수 있는 후보 쌍 수입니다.
- `risk_or_allergen_review_count`: 기존 위험도, 고위험 단어, 알러지 이름 매칭으로 사람이 확인해야 하는 성분 수입니다.
- `DRYRUN_ASSESSMENT`: 이 dry-run의 최종 자동 판정입니다.

## 최종 판정 기준

- `DRYRUN_BLOCKED`
  - 깨진 `product_ingredients` 연결이 있습니다.
  - 자동 매핑 정책을 논의하기 전에 연결 무결성을 먼저 검토해야 합니다.

- `DRYRUN_REVIEW_REQUIRED`
  - 깨진 연결은 없지만 중복/별칭 후보, substring 위험 후보, 알러지/주의 성분 후보가 있습니다.
  - 이 상태가 가장 일반적인 정상 결과일 수 있습니다.
  - 다음 단계는 실제 이관이 아니라 리뷰와 매핑 정책 확정입니다.

- `DRYRUN_READY`
  - 이 dry-run이 보는 범위에서는 blocking 또는 review 후보가 없습니다.
  - 그래도 즉시 이관하지 않습니다. 사람이 결과를 저장하고 별도 승인 후 다음 Phase를 설계해야 합니다.

## 중단 조건

다음 중 하나라도 해당하면 실제 이관 설계로 넘어가지 않습니다.

- SQL 실행 오류가 발생함
- `DRYRUN_BLOCKED`가 표시됨
- `broken_or_empty_product_ingredient_links`가 0보다 큼
- `dangerous_substring_pair_count`가 0보다 큰데 substring-only 매핑 정책을 사용하려 함
- `risk_or_allergen_review_count` 결과를 사람이 검토하지 않음
- 결과 CSV 또는 텍스트가 저장되지 않음

## 다음 단계

이 dry-run 다음 단계는 데이터 이관이 아닙니다.

1. 결과 표를 저장합니다.
2. normalized key 후보 그룹을 사람이 검토합니다.
3. substring 위험 후보는 exact alias 또는 수동 검토 대상으로 분리합니다.
4. 알러지/주의 성분 후보는 canonical rule 및 allergen group 정책과 함께 검토합니다.
5. canonical mapping 정책이 확정된 뒤, 별도 PR에서 실제 이관 계획 또는 추가 dry-run을 설계합니다.

이번 runbook은 운영 DB 쓰기 작업, migration, Edge Function 배포, 점수 로직 변경을 포함하지 않습니다.
