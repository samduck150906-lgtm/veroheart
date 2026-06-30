# Phase 1 — 비파괴 스키마 추가 보고서

> 작성일: 2026-06-23
> 성격: **마이그레이션 파일 작성 + 읽기 전용 검증**. 운영 DB에 어떤 쓰기·DDL도 적용하지 않음.
> 선행: `docs/PHASE0_ENVIRONMENT_REPORT.md` (운영 DB = `nlutpmjloryqdomgbqrr` 확정)
> 금지 준수: 데이터 삭제·FK 재지정·539 병합·판정 변경·앱 화면 변경·운영 직접 적용 — **모두 미수행**.

---

## 1. 실제 운영 환경 확인 결과 (재확인)

- 운영 Supabase: **`nlutpmjloryqdomgbqrr`(veroro)** — `veroro-app` Netlify 환경변수 `VITE_SUPABASE_URL`로 확정(Phase 0).
- 본 Phase에서 운영 DB에는 **읽기 전용 SELECT만** 수행(충돌 점검·드라이런). DDL/INSERT/UPDATE 없음.

---

## 2. 생성한 마이그레이션 파일 목록

위치: **`supabase/migrations_phase1_pending/`** (라이브 `supabase/migrations/`가 **아님** → `supabase db push`로 자동 적용되지 않음. 검수 후 승격).

| 파일 | 내용 |
|---|---|
| `01_ingredients_columns.sql` | `ingredients` 신규 컬럼(canonical/source_group/form/dog_risk/cat_risk/태그/검수상태/legacy_risk_level 등) + CHECK + 인덱스 |
| `02_ingredient_aliases.sql` | `ingredient_aliases` 테이블(relation_type/match_priority/review_status) + UNIQUE + RLS |
| `03_sources.sql` | `sources` + `ingredient_sources` + `rule_sources` + RLS |
| `04_engine_versions.sql` | `engine_versions`(ingredient_db/rule/scoring 버전 시드) + RLS |
| `05_allergen_confidence.sql` | `ingredient_allergen_map` confidence에 `trace` 추가 + relation_type/source_id/review_status 컬럼 |
| `06_product_ingredient_inputs.sql` | **원재료 원문 보존 테이블** + RLS (+ 07 백필 스크립트 주석) |
| `99_rollback.sql` | Phase 1 추가분 전체 비파괴 롤백 |
| `dryrun_canonical_mapping.sql` | 539행 canonical 병합 **드라이런 SELECT**(읽기 전용) |

TypeScript: `src/types/analysisSchemaV2.ts` — 신규 DB 행 타입 + `UnifiedAnalysisResult` 등 **순수 타입만**(런타임/화면 무영향).

---

## 3. 신규 DB 스키마 (요약)

- `ingredients`(+컬럼): `canonical_name_ko/en`, `category`, `source_group`, `ingredient_form`, `dog_risk`/`cat_risk`(기본 **`unknown`**), `allergen_tags[]`, `nutrition_tags[]`, `risk_tags[]`, `default_severity`(`unknown`), `evidence_level`, `review_status`(`draft`), `inference_status`(`auto_suggested`), `is_canonical`, `merged_into`, `legacy_risk_level`(기존 risk_level 보존), `updated_at`.
- `ingredient_aliases`: `ingredient_id`, `raw_alias`, `normalized_alias`(UNIQUE), `language`, `relation_type`(10종 CHECK), `match_priority`, `review_status`.
- `sources`/`ingredient_sources`/`rule_sources`: 출처 마스터 + 성분/규칙 연결(출처 ID·기관·제목·URL/DOI·유형·발행일·확인일·신뢰도·적용종·적용조건·검토상태).
- `engine_versions`: `kind`(ingredient_db/rule/scoring) → `version`.
- `ingredient_allergen_map`(+): `confidence`(exact/derived/**trace**), `relation_type`, `source_id`, `review_status`.
- `product_ingredient_inputs`: `raw_ingredient_name`/`normalized_input`/`canonical_ingredient_id`/`display_order`/`source_text`/`match_type`/`match_confidence`/`review_status`/`legacy_ingredient_id`.

설계 준수 포인트:
- **종별 위험 미확정**: `dog_risk`/`cat_risk`는 기존 값을 복제하지 않고 `unknown`으로 시작. 기존 `risk_level`은 `legacy_risk_level`로 보존. `unknown ≠ safe`.
- **자동추론 격리**: 모든 추론 컬럼 상태 `auto_suggested` → 검수(`manually_reviewed`/`expert_reviewed`) 전 판정 사용 금지.
- **출처 없는 확정 위험 금지**: `sources` 연결 구조 선마련(엔진이 강제하도록).

---

## 4. RLS 정책

- 신규 테이블 모두 `ENABLE ROW LEVEL SECURITY`.
- **읽기**: `FOR SELECT USING (true)`(기존 `ingredients`/`products` 공개 읽기 패턴과 동일).
- **쓰기**: anon/authenticated용 INSERT/UPDATE/DELETE 정책 **없음** → `service_role`(관리자 백엔드)만 RLS 우회. 사용자 클라이언트는 성분/별칭/출처를 쓸 수 없음.
- 사용자 PII 없음(성분·제품 메타데이터). `product_ingredient_inputs`도 공개 읽기 허용.

---

## 5. 기존 스키마와의 충돌 가능성 (읽기 전용 점검 완료)

| 점검 | 결과 |
|---|---|
| `ingredients` 신규 컬럼명 중복 | 기존엔 `allergen_group`/`functional_benefit`만 존재 → **신규 컬럼명과 충돌 없음** |
| 신규 테이블 중복 | `ingredient_aliases`/`sources`/`ingredient_sources`/`rule_sources`/`engine_versions`/`product_ingredient_inputs` 모두 **미존재** → `CREATE IF NOT EXISTS` 안전 |
| `ingredient_allergen_map` confidence CHECK | 기존 `('exact','derived')` → DROP 후 `('exact','derived','trace')` 재생성(행 0개 → 영향 없음) |
| `ingredient_synonyms`(121행) | **유지**(삭제 안 함). Phase 2에서 aliases로 이관 |
| `analysis_rules`(12행) | `rule_sources` FK가 존재 시에만 부착(멱등) |
| `gen_random_uuid()` 가용성 | 스키마에 `pgcrypto` 확장 사용 중 → 사용 가능 |

→ **충돌 위험 없음.** 모든 파일은 `IF NOT EXISTS`/`IF NOT`/`DROP ... IF EXISTS` 가드로 멱등.

---

## 6. 로컬/개발 환경 적용 결과

- **정적 검증 완료**: 운영 스키마와 충돌 점검 통과(5장), 가드 멱등성·롤백 대칭성 코드 검토 완료.
- **실적용 미수행(의도적)**: 사용자 지침("운영 직접 적용 금지", "쓰기 별도 승인")에 따라 운영에 적용하지 않음. 별도 스테이징 Supabase가 없으므로(Phase 0), 실적용 검증은 **Supabase 브랜치(preview) 또는 신규 dev 프로젝트** 생성 후 진행해야 함 → **승인 대기**.
  - 승인 시 절차: 브랜치 생성 → `01~06` 적용 → 스모크 쿼리 → `99_rollback` 적용/재적용으로 멱등·롤백 확인.

---

## 7. 롤백 절차

- `99_rollback.sql` 단독 실행으로 Phase 1 추가분(테이블·컬럼·제약·인덱스) 전부 제거, `ingredient_allergen_map.confidence` CHECK를 원래 `('exact','derived')`로 복원.
- 기존 컬럼/데이터는 손대지 않았으므로 롤백 후 **원상복구 100%**(legacy_risk_level은 신규 컬럼이라 함께 제거).
- 운영 적용 단계에서는 적용 직전 `ingredients`/`product_ingredients`/`ingredient_synonyms`/`analysis_rules`를 `*_bak_YYYYMMDD`로 스냅샷 권장.

---

## 8. Canonical 병합 드라이런 결과 (읽기 전용)

`dryrun_canonical_mapping.sql`를 운영 DB에 SELECT로 실행한 결과.

### 8-1. source_group 분포 (539행)

| 그룹 | 행 | 제품링크 | 비고 |
|---|---|---|---|
| **unknown** | 395 | 3,124 | 비-동물/곡물(비타민·미네랄·첨가물·채소·과일 등). 그룹 병합 대상 아님, **개별 canonical 유지 + 검수** |
| chicken | 52 | 577 | |
| fish | 12 | 37 | |
| salmon | 12 | 108 | |
| soy | 10 | 74 | |
| duck | 9 | 15 | |
| milk | 8 | 19 | |
| egg | 7 | 74 | |
| corn | 7 | 28 | |
| beef | 6 | 25 | |
| rice | 6 | 129 | |
| turkey/wheat/lamb/tuna/pork | 15 | 55 | |

→ 동물·곡물 그룹 **144행**이 병합 후보, 나머지 395행은 개별 유지(대량 자동병합 금지).

### 8-2. 닭 52행 form/relation 검증 (요청 핵심)

| form | relation_type | 알러지 신뢰도 | 행 | 예시 |
|---|---|---|---|---|
| muscle | same_ingredient | **exact** | 14 | 닭고기 / 건조 닭고기 / 동결건조 닭고기 / 가수분해 닭고기 |
| fat | fat_derivative | **derived** | 8 | 닭 지방 / 닭고기 기름 / 닭고기 지방 / 치킨 지방 |
| meal | meal | exact | 7 | 닭고기 분말 / 닭고기육분 / 닭고기 식사 |
| liver | protein_derivative | exact | 6 | 닭 간 / 닭간 분말 / 닭고기 간 |
| bone | protein_derivative | exact | 4 | 닭고기 뼈 / 뼈없는 닭고기 ⚠ |
| cartilage | protein_derivative | exact | 4 | 닭 연골 / 닭연골 |
| protein | protein_derivative | exact | 3 | 닭고기 단백질 / 가수분해 닭고기 단백질 |
| broth | broth | **trace** | 2 | 닭고기 육수 / 닭육수 |
| heart/gizzard/feet | protein_derivative | exact | 3 | 닭고기 심장 / 닭고기 근위 / 닭발 |
| oil | oil | derived | 1 | 치킨 오일 |

**검증 성공**: 닭 지방(derived)·닭 육수(trace)가 닭고기 단백질/근육(exact)과 **다른 알러지 강도**로 분리됨 → 요청 결정사항 #2 충족.

### 8-3. 자동추론이 노출한 검수 필요 케이스 (검수 게이트 정당성)

자동추론은 다음을 **오분류 후보로 플래그**했다(`needs_manual_review` 또는 예시에서 확인). 이들은 사람 승인 전 판정 미사용:

- **`뼈없는 닭고기`/`도축 전 뼈 제거한 닭고기`** → '뼈' 부분문자열로 `bone` 오분류(실제는 **muscle**). 한국어 단어경계 부재의 대표 오탐.
- **`치킨 플레이버`/`치킨 파우더`** → `muscle`로 분류(실제는 `flavor`/`meal`). 추론 규칙에 `플레이버`/`파우더` 누락.
- **`계육 부산물`** → `muscle`(실제는 by-product → caution).
- **`육류 (닭고기, 소고기, 생선 등)`** / **`동물성 지방 (닭지방 등)`** → 복합표기(괄호·쉼표) → 단일 canonical 부적합, 분해 필요.

→ **결론: 자동추론은 시작점일 뿐, 539행(특히 unknown 395 + 위 플래그)은 관리자/수의 검수 승인 후에만 병합·판정에 사용**해야 함이 데이터로 입증됨.

---

## 9. 아직 실행하지 않은 작업 (다음 단계, 모두 별도 승인 필요)

1. Supabase 브랜치/ dev 프로젝트 생성 후 `01~06` **실적용 검증** + 롤백 검증.
2. `07` 원문 백필(`product_ingredients` → `product_ingredient_inputs`) 실행.
3. 드라이런 매핑 **전체 539행 검수**(특히 unknown 395 + 플래그 케이스) → canonical 확정.
4. `ingredient_synonyms` → `ingredient_aliases` 이관(relation_type 부여).
5. 종별 위험(`dog_risk`/`cat_risk`) 근거 기반 확정(출처 연결 포함).
6. 점수식·하드캡·우선순위 정책 문서화(별도 승인) — 본 Phase에서 가중치 임의 확정하지 않음.
7. 공통 엔진 코드 공유 방식(모노레포/공용 패키지 우선) 소규모 검증 모듈 PoC.
8. canonical 병합 + `product_ingredients` FK 재지정(원문 보존·shadow 비교 완료 후).

---

## 10. 미해결/확인 필요

- 운영 백업/PITR 플랜 상태(Phase 0에서 미확인).
- 공통 엔진 Vite↔Deno 공유 PoC 결과(미착수).
- `personalized-score` Edge 실사용 여부(저장소에 호출부 없음 → 폐기 후보 검토).
- 점수 가중치·하드캡 수치(정책 승인 대기).

---

*본 Phase는 파일·타입 추가와 읽기 전용 검증까지만 수행했다. 운영 DB 쓰기·canonical 병합·FK 재지정은 별도 승인 전까지 진행하지 않는다.*
