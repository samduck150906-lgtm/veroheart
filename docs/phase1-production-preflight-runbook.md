# Phase 1 Production Preflight Runbook

이 문서는 Phase 1 migration 적용 전에 운영 Supabase의 메타데이터만 읽어 사전점검하는 절차입니다. 이 절차 자체는 migration 적용 승인이나 배포 승인이 아닙니다.

> 운영 프로젝트 ref는 반드시 `nlutpmjloryqdomgbqrr`이어야 합니다. 다른 프로젝트에서 얻은 결과를 운영 점검 결과로 간주하지 마세요.

## 안전 원칙

- 실행 파일은 `supabase/tests/manual/phase1_production_preflight.sql` 하나뿐입니다.
- SQL은 카탈로그 메타데이터만 조회하며 운영 테이블의 실제 행이나 개인정보를 조회하지 않습니다.
- 비밀번호, Supabase access token, anon key, service-role key가 필요하지 않습니다.
- `.env`, GitHub Secrets, 배포 설정을 변경하지 않습니다.
- Phase 1 migration을 같은 SQL Editor 쿼리에 붙이지 않습니다.
- preflight 성공 여부와 관계없이 이 절차에서 migration을 실행하지 않습니다.

## 1. 운영 프로젝트 확인

1. Supabase Dashboard에서 대상 프로젝트를 엽니다.
2. **Project Settings > General**에서 Reference ID를 확인합니다.
3. Reference ID가 정확히 `nlutpmjloryqdomgbqrr`인지 확인합니다.
4. **Project Settings > API**의 Project URL이 `https://nlutpmjloryqdomgbqrr.supabase.co`인지 함께 확인합니다.

두 값 중 하나라도 다르거나 확인할 수 없으면 중단합니다.

## 2. 새 SQL Editor 쿼리 열기

운영 프로젝트의 SQL Editor에서 빈 새 쿼리를 엽니다. 기존 쿼리, migration SQL, rollback SQL과 같은 화면을 재사용하지 마세요.

`supabase/tests/manual/phase1_production_preflight.sql`의 내용만 넣습니다. 다른 SQL을 앞이나 뒤에 이어 붙이지 않습니다.

## 3. Preflight 단독 실행

쿼리를 한 번 실행합니다. 이 SQL은 다음 항목만 점검합니다.

- `products`, `ingredients`, `allergens` 존재 여부
- 세 테이블의 `id` UUID 타입과 단일 컬럼 primary/unique key 적합성
- `gen_random_uuid()` 가용성
- Supabase migration history relation과 version 컬럼 가시성
- Phase 1 대상 테이블 11개 이름 충돌
- index 13개 이름 충돌
- SELECT policy 10개 이름 충돌
- primary/unique constraint가 만들 backing relation 이름 18개 충돌

운영 데이터 행 수, 제품, 성분, 사용자, 반려동물, 주문 등 실제 row data는 조회하지 않습니다.

## 4. 결과 보관

결과 표의 다음 열을 포함해 전체를 CSV 또는 텍스트로 저장합니다.

- `check_order`
- `severity`
- `check_name`
- `detail`
- `recommended_action`

일부 행만 캡처하거나 최종 행만 복사하지 마세요. 적용 검토자는 전체 결과를 확인해야 합니다.

## 5. 결과 판정

마지막 `FINAL_ASSESSMENT` 행을 확인합니다.

### `NOT_READY`

하나 이상의 `BLOCK`이 있습니다. Phase 1 migration을 실행하면 안 됩니다. 모든 BLOCK의 원인과 객체 소유권을 확인한 뒤 별도 변경 계획을 세워야 합니다.

### `REVIEW_REQUIRED`

BLOCK은 없지만 하나 이상의 `WARN`이 있습니다. 사람이 각 WARN을 검토하고 근거를 문서화하기 전에는 migration을 실행하면 안 됩니다.

### `PREFLIGHT_PASS`

자동 메타데이터 검사가 모두 통과했습니다. 그래도 migration을 바로 실행하면 안 됩니다. 운영 백업, 복구 가능성, 적용 담당자 승인, 실행 시간, 모니터링 및 중단 계획을 별도로 확인해야 합니다.

## Migration history 제한

엄격한 metadata-only SQL은 선택적 history relation이 없는 환경에서도 오류 없이 실행되어야 합니다. PostgreSQL은 존재하지 않을 수 있는 relation의 행을 정적 쿼리에서 조건부로 읽을 수 없으므로, preflight는 다음만 자동 확인합니다.

- `supabase_migrations.schema_migrations` relation 존재 여부
- `version` 컬럼 존재 여부

version `20260630090000` 행의 실제 기록 여부는 의도적으로 `WARN`으로 남습니다. 권한 있는 사람이 Supabase의 migration history 화면 또는 별도 승인된 읽기 절차로 중복 적용 여부를 확인해야 합니다. 이 runbook은 추가 SQL이나 우회 쿼리를 제공하지 않습니다.

## PASS 이후에도 필요한 별도 승인

- 운영 DB 백업 또는 PITR 복구 지점 확인
- 현재 운영 migration history와 저장소 migration 순서 대조
- 기존 객체의 소유자와 RLS 정책 검토
- 실행 담당자와 승인자 분리
- 예상 실행 시간과 장애 시 중단 기준 합의
- 적용 후 검증 및 rollback 판단 절차 준비

이 항목이 완료되지 않으면 `PREFLIGHT_PASS`가 나와도 Phase 1 migration을 실행하지 마세요.
