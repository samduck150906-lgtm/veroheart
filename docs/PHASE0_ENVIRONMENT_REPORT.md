# Phase 0 — 환경 및 데이터 확정 보고서

> 작성일: 2026-06-23
> 성격: **읽기 전용 조사**. 운영 DB·배포 환경에 어떤 쓰기도 수행하지 않음.
> 후속: 이 보고 승인 후 Phase 1(비파괴 스키마 추가, 운영 미적용) 진행.
> 보안: 조회 중 운영 키(anon/service_role)를 확인했으나 **키 값은 본 문서에 기록하지 않음**. JWT에 포함된 프로젝트 `ref`만 대조 근거로 사용.

---

## 0. 요약

| 확인 항목 | 결과 |
|---|---|
| 운영 Supabase 프로젝트 | **확정: `nlutpmjloryqdomgbqrr` (이름 `veroro`, ap-south-1)** |
| 확정 신뢰도 | **높음 (배포 환경변수로 직접 확증)** |
| 운영 라벨 원문 보존 | **❌ 미보존** (병합 전 스냅샷 필수) |
| 캐시된 분석 결과 | **0건** (`analysis_reports` 비어 있음) |
| 별도 스테이징 DB | **없음 확인** (Phase 1은 Supabase 브랜치/별도 dev 프로젝트 필요) |

---

## 1. 운영 Supabase 프로젝트 확정 ✅

**결론: 서비스 운영 DB는 `nlutpmjloryqdomgbqrr` (veroro) 프로젝트가 맞다.**

### 증거 (배포 환경변수 — 가장 강력)
프로덕션 사이트 **`veroro-app`** (Netlify site_id `75373c42-1132-4716-8f64-d8391de18bc8`, `https://veroro-app.netlify.app`)의 환경변수:

| Key | 값 / ref | scope |
|---|---|---|
| `VITE_SUPABASE_URL` | **`https://nlutpmjloryqdomgbqrr.supabase.co`** | builds/functions/runtime |
| `VITE_SUPABASE_ANON_KEY` | JWT `ref=nlutpmjloryqdomgbqrr` (값 비공개) | builds/functions/runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | JWT `ref=nlutpmjloryqdomgbqrr` (값 비공개, secret) | builds/functions/runtime |

→ 브라우저 앱과 Edge Function 모두 동일 프로젝트(`nlutpmjloryqdomgbqrr`)를 가리킨다.

### 보강 증거
- **배포된 Edge Functions** (프로젝트 `nlutpmjloryqdomgbqrr`): `analyze-ingredients`(v1), `personalized-score`(v1), `admin-auth`(v1) 모두 ACTIVE. 엔트리포인트 경로가 본 저장소의 `supabase/functions/*/index.ts`와 일치.
- **저장소 설정**: `supabase/config.toml` → `project_id = "veroro"`. `netlify.toml` → `veroro-admin.netlify.app` 호스트 분기.
- **DB 스키마 일치**: 운영 DB의 `ingredients/product_ingredients/analysis_rules/ingredient_synonyms/unmatched_ingredients` 구조가 저장소 마이그레이션과 일치.

### 코드 측 참고
- 저장소에는 실제 URL이 하드코딩돼 있지 않음. 클라이언트는 `import.meta.env.VITE_SUPABASE_URL`(`src/lib/supabase.ts:14`), Edge는 `Deno.env.get('SUPABASE_URL')`로 주입받음. 실제 `.env`는 저장소에 없음(`.env.template`만 존재) → **값의 출처는 배포 환경변수**이며 위에서 확정함.

---

## 2. 운영 / 개발 / 로컬 환경 구분

| 환경 | Netlify 사이트 | 가리키는 Supabase | 비고 |
|---|---|---|---|
| 프로덕션 앱 | `veroro-app` (veroro-app.netlify.app) | **nlutpmjloryqdomgbqrr** | 본 서비스 |
| 관리자 콘솔 | `veroro-admin` (veroro-admin.netlify.app) | (동일 추정, 미확인)¹ | `/admin` 분기 |
| 랜딩 | `veroro-landing` (veroro.life) | 해당 없음(정적) | |
| 로컬 | Supabase CLI (`config.toml`) | 로컬 도커 스택(54321~) | `.env` 미커밋 |

¹ `veroro-admin`의 환경변수는 본 보고에서 별도 확인하지 않음(필요 시 추가 조회).

> ⚠️ **별도 스테이징/개발용 원격 Supabase 프로젝트는 확인되지 않았다.** 동일 조직에 다른 프로젝트(`eternalsix-core`, `o1t`, `aihandler`, `viberry`, `masuri`, `dalvit`)가 있으나, 명칭상 veroro 서비스용 스테이징으로 보이지 않음. → **Phase 1은 운영에 직접 적용하지 말고, Supabase 브랜치(preview) 또는 신규 dev 프로젝트에서 검증**해야 한다.

---

## 3. 백업 방법 확인

- 운영은 Supabase 관리형 Postgres 17. **마이그레이션 전 권장 백업 절차**:
  1. **Supabase 브랜치(preview) 생성** → 운영 스키마 복제본에서 Phase 1·드라이런 검증(운영 무영향).
  2. 운영 적용이 필요해지는 시점 전, **핵심 테이블 스냅샷**: `ingredients`, `product_ingredients`, `ingredient_synonyms`, `analysis_rules` 를 `*_bak_YYYYMMDD` 테이블로 복제.
  3. 가능 시 프로젝트 레벨 백업/PITR 활성 여부 확인(플랜 의존 — 본 조사에서 미확인, **확인 필요**).
- 현재 단계에서는 어떤 백업·쓰기도 실행하지 않음(설계·검증 전용).

---

## 4. 제품 원재료 원문·순서 보존 여부 ⚠️ (중요)

운영 `product_ingredients` 컬럼: **`product_id`, `ingredient_id`, `sort_order`** — **이게 전부다.**

- **순서**: `sort_order`로 보존됨 ✅
- **라벨 원문 문자열**: **별도 보존 컬럼 없음 ❌**
- `products` 테이블에도 원재료 원문 컬럼 없음(전 컬럼 확인). 전체 public 스키마에서 원문 텍스트 컬럼은 `analysis_reports.raw_text`(스캐너 OCR 저장용, 현재 0행)뿐.

**의미 (사용자 보완사항 #1 직접 충족 근거):**
현재 "라벨 원문"은 **오직 연결된 `ingredients.name_ko`(표면형 행)로만 존재**한다. 즉 표면형 539행을 canonical로 병합하는 순간, "동결건조 유기농 닭고기" 같은 **원문이 영구 소실**된다(`sort_order`로 순서만 남음).

**→ 병합보다 먼저, 아래를 반드시 선행해야 한다(복구·백업 방안):**
신규 보존 테이블 `product_ingredient_inputs`를 만들고, 병합 **이전에** 현재 상태를 스냅샷한다.

```sql
-- (Phase 1에서 생성, 병합 전 채움) — 원문 보존 + 향후 재해석 기준
create table public.product_ingredient_inputs (
  id                    uuid primary key default gen_random_uuid(),
  product_id            uuid not null references public.products(id) on delete cascade,
  raw_ingredient_name   text not null,     -- 현재 ingredients.name_ko 스냅샷(=라벨 표면형)
  normalized_input      text,              -- 정규화 키(나중에 채움)
  canonical_ingredient_id uuid references public.ingredients(id),
  display_order         integer not null,  -- 현재 sort_order 보존
  source_text           text,             -- (가능 시) 원문 라벨 전체
  match_type            text default 'legacy_link', -- legacy_link/exact/alias/fuzzy/unmatched
  match_confidence      numeric,
  review_status         text default 'auto_suggested',
  created_at            timestamptz default now()
);
-- 채움(예시, Phase 1 검증 후): product_ingredients ⨝ ingredients
-- insert ... select pi.product_id, i.name_ko, pi.sort_order, pi.ingredient_id ...
```

> 기존 `product_ingredients`(FK 4,265개)는 **재지정하지 않고 그대로 둔다.** 위 보존 테이블이 원문을 안전하게 확보한 뒤에야(별도 승인) 병합·재지정을 논의한다.

---

## 5. 현재 운영 분석 경로 및 Edge Function 버전

| 경로 | 실제 동작 | Edge |
|---|---|---|
| 카탈로그 적합도(헤드라인 %) | 클라이언트 `src/utils/score.ts` (DB 미경유 판정) | 없음 |
| 상세 리포트/품질 패널 | 클라이언트 규칙 엔진/`scoringPipeline` | 없음 |
| 스캐너(텍스트/사진) | `analyze-ingredients` 호출(`Analyzer.tsx:250`) | **v1** |
| 개인화 점수 | 배포돼 있으나 **저장소에 호출부 없음**(미사용 추정) | `personalized-score` **v1** |
| 관리자 인증 | `admin-auth` | **v1** |

- 모든 Edge Function이 **버전 1**(초기 배포 후 미갱신).
- **핵심**: 사용자에게 보이는 적합도는 Edge가 아니라 **클라이언트 `score.ts`**가 만든다(부분문자열 알러지). Edge는 스캐너 전용.

---

## 6. 캐시된 분석 결과 위치·개수

- `analysis_reports` 테이블: **0행** (운영). `raw_text`, `analysis_json`, `product_id`, `user_id` 컬럼 보유.
- → **현재 캐시된 분석 결과가 없으므로 재계산 부담 없음.** 통합 후 신규 저장분부터 `*Version` 스탬프 적용하면 됨.

---

## 7. 운영 데이터 실측 재확정 (감사 보고서 수치 갱신)

| 항목 | 값 |
|---|---|
| `ingredients` | 539 (그중 닭 계열 표면형 **47**) |
| `allergy_triggers` 채워진 행 | **0 / 539** |
| `allergen_group` / `functional_benefit` 채워진 행 | **0 / 539** |
| `risk_level` 분포 | safe 474 / caution 57 / danger 8 |
| `products` | 458 (성분 미연결 **145**) |
| `product_ingredients` | 4,265 |
| `analysis_rules` | 12 (런타임 미사용) |
| `ingredient_synonyms` | 121 (런타임 미사용) |
| `allergens` | 15 |
| `ingredient_allergen_map` | 0 |
| `unmatched_ingredients` | 0 |
| `analysis_reports` | 0 |

---

## 8. Phase 0 결론 및 Phase 1 진입 조건

1. **운영 DB 확정**: `nlutpmjloryqdomgbqrr`(veroro). ✅
2. **차단 위험 식별**: 라벨 원문 미보존 → 병합 전 `product_ingredient_inputs` 스냅샷 **선행 필수**.
3. **스테이징 부재**: Phase 1 검증은 **Supabase 브랜치 또는 신규 dev 프로젝트**에서. 운영 직접 적용 금지(사용자 지침과 일치).
4. **캐시 0건**: 재계산 부담 없음.
5. **확인 필요(미해결)**: 운영 PITR/백업 플랜 상태, `veroro-admin` 환경변수, `personalized-score` 실사용 여부.

> Phase 1(비파괴 스키마 추가)은 **운영 미적용 마이그레이션 파일 작성 + 브랜치/로컬 검증**까지만 수행하며, 실제 운영 적용·canonical 병합·FK 재지정은 별도 승인 전까지 하지 않는다.
