# 제품 판정과 판매 상품·옵션 연결: 최소 구현 설계

작성: 2026-10-30. 상태: 설계 수정 및 격리 브랜치의 첫 서버 계약 구현. 운영 미적용.
상위 요구사항: [판정 제품과 판매 상품·옵션 대응 계약](veroro-ux-master-spec.md#purchase-link-identity-contract).

이 문서는 데이터 모델·검토·공개 제공·가격 연계를 설계하며, 9절은 격리 브랜치에서 구현한
초안 SQL·서버 계약·합성 테스트를 구분해 기록한다. 운영 데이터, 링크 제거/NULL 적용, 배포는
변경하지 않는다. 관리자 UI·공개 구매 CTA·가격 연계는 후속 작업이다.
코드 확인 기준은 `origin/main`의 `76979cc76c84ee50bca28e4193517ee08e188e30`이다.
후속 구현 검토에서 최신 main `62ce98350add75752e5a8da53901f47a36d7b50c`을 통합했다.
아래 기존 구조 설명은 최초 조사 기록이며, 신규 공개 RPC는 최신 main의 reviewed/verified 공개 정책을 따른다.
현재 운영 배포 소스·외부 예약 작업은 이번에 재검증하지 않았다. 아래 테이블/필드/엔드포인트 중
‘제안’이라고 표시한 것은 현재 존재하거나 실행 가능한 API가 아니다.

## 1. 현재 구조와 재사용 범위

| 기존 구조/코드 | 실제 역할 | 재사용 / 부족한 점 |
| --- | --- | --- |
| `products` | 내부 제품 ID, 이름·브랜드, `variant_name`, `net_weight_text`, `canonical_product_key`, `barcode`, `coupang_link`, `coupang_product_id`, `min_price`, `verification_status` | 판정 대상 ID와 현재 식별정보 사용. 이름/정규화 키/제품 검수 상태만으로 SKU 대응 검증 불가. 맛·포장 구성이 없는 행은 보류 |
| `product_observations` | 제품별 출처 관찰, `source_url`, `retrieved_at`, `extracted_data`, `field_confidence`, `package_version`, `is_current`, `supersedes_observation_id` | 제품 포장과 판매 옵션의 시점별 근거 재사용. 새 링크 검토는 관찰을 추가하고 이전 관찰을 덮어쓰지 않음 |
| `product_data_sources` | 제품별 URL·제목·신뢰도·`fields_verified`·메모. `(product_id, source_url)` 유일 | 기존 자료 탐색/참조에 사용. 신뢰도 `official`이나 자유 형식 `fields_verified`는 SKU 일치 승인이 아님. upsert되는 메모를 유일한 확정 증거로 삼지 않음 |
| `product_price_proposals` | 제품별 감지 가격·출처 URL/상품 ID·검토 상태. 제품당 pending 하나 | 제안·승인 이력/UI 재사용. 옵션 ID·검증 연결/버전이 없어 현재 구조만으로 해당 SKU 가격을 보장하지 못함 |
| `price_sync_runs` | 가격 확인 실행 결과 | 실행 추적 재사용. 실행 성공은 SKU 대응 성공이 아님 |
| `admin_audit_log` | 관리자 action·대상·detail·시각 | 연결 검토/보류/교체 이력 재사용. 일반 `audit()`는 실패를 삼키므로 확정/가격 승인은 트랜잭션 경로가 필요 |
| 관리자 인증·출처/가격 검토 UI | `admin-write`, `admin-products-read`, `admin-price-review` | 기존 인증과 UI 패턴 사용. 브라우저에 service-role 자격증명을 전달하거나 직접 RPC를 열지 않음 |

주요 근거 파일:
- `supabase/migrations/20260925100000_community_catalog_foundation.sql`: 제품 식별 필드·관찰 기록.
- `supabase/migrations/20260914144745_product_enrichment_workflow.sql`: 출처·보강 대기열.
- `supabase/migrations/20260915002845_product_price_proposals.sql`: 가격 제안·제품당 pending 유일성.
- `supabase/functions/coupang-price-sync/index.ts:149~186,234~270`: 검색 API에서 productId 일치 후 제안 생성.
- `supabase/functions/admin-price-review/index.ts:250~310`: 승인 시 `products.min_price` 변경.
- `supabase/functions/admin-write/index.ts:338~354,466~537,837~884`: 일반 저장·감사·출처 upsert의 경계.

현재 공개 검색·카드·홈 추천은 내부 상세로 이동하고, `Detail.tsx`에는 구매/장바구니 동선이 없다.
관리자 facts 화면의 ‘판매처’는 `coupang_link`를 여는 참고 anchor다. 공개 구매 CTA는 향후 추가 대상이다.
일반 검색 링크를 사용하는 자동 상품 수집 경로는 확인한 코드에 없다. 과거 일회성 업로더와 혼동하지 않는다.
가격 함수는 공유 링크를 탐색하지 않지만 productId만 비교하므로 세부 옵션 가격 확인에는 부족하다.

## 2. 범위 선택과 권고

| 선택 | 초기 권고 | 이유 / 확장 조건 |
| --- | --- | --- |
| 판매처 | 쿠팡 한 곳부터 | 다중 판매처 registry/범용 crawler를 만들지 않음. 다른 판매처는 동일 계약을 충족하는 별도 후속 작업 |
| 제품당 구매 연결 | 활성 verified 상품 연결 하나 | 기존 제품당 pending 가격 제안을 재사용. 검색/보류/과거 연결은 여러 개 보존 가능 |
| 데이터 추가 | 연결 테이블 하나 + 기존 가격 제안의 연결 참조 | 별도 상품 카탈로그·SKU 마스터·범용 증거 시스템을 중복 생성하지 않음 |
| 포장 식별정보 | 기존 제품값 + 고정 스키마의 관찰 스냅샷 | 제품 테이블에 영양/포장 입력 작업을 확대하지 않음. 부족한 정보는 추정 대신 보류 |
| 공개 구매 출시 | 유효한 상품·옵션 대응 근거가 있는 연결만 | 재고·가격 최신성과 분리. 재고 미확인은 보장 문구 없이 ‘판매처에서 확인’ 가능. 공개 UI는 후속 구현 |
| 원본 링크 | 보존 | 링크 분류와 구매 자격을 분리. 삭제/NULL 도구는 계속 보류 |

제품 행이 맛/용량/포장 단위를 특정하지 못하면 구매 연결 검증 대상도 특정할 수 없다.
이 경우 임의로 새로운 SKU 행을 만들거나 이름에 옵션을 붙이지 않고 별도 데이터 검토를 요청한다.

## 3. 최소 데이터 모델 (제안)

### 3.1 `product_purchase_links`: 판정 제품과 한 판매 연결

관계는 `products 1:N product_purchase_links`, 근거는 기존 `product_observations`를 참조한다.
새 테이블은 연결/검증 상태만 관리하고 제품 판정·성분·리뷰를 복제하지 않는다.

| 필드 묶음 | 제안 필드 | 의미/제약 |
| --- | --- | --- |
| 식별 | `id`, `product_id`, `merchant`, `revision`, `identity_revision` | revision은 모든 관리자 변경의 충돌 방지용, identity_revision은 상품 연결/옵션/검증 근거 변경용 |
| URL | `original_url`, `resolved_url` | 원본은 연결 행 내 불변. URL을 교체하면 새 연결을 만들고 기존 연결을 stale로 남김. 최종 URL은 확인 근거와 함께 기록 |
| 종류 | `link_kind`: `product / search / unknown` | 도착 페이지와 확인 근거로 분류. 단축 URL/도메인만으로 자동 결정하지 않음 |
| 판매 식별 | `seller_product_id`, `seller_item_id`, `seller_offer_id` | 쿠팡 productId/pageKey, itemId, vendorItemId를 구분. 판매자 offer 차이가 곧 SKU 차이라는 뜻은 아님 |
| 대응 근거 | `target_observation_id`, `seller_observation_id`, `identity_fingerprint` | 현재 판정 제품과 판매 옵션의 관찰 FK. 같은 product_id의 근거만 참조. 확인 당시 식별정보/관찰 내용의 fingerprint 보관 |
| 대응 상태 | `verification_status`: `unverified / verified / mismatch / stale` | 제품 자체 `verification_status`와 별개. search는 SKU verified 상태가 될 수 없음 |
| 검토 | `verified_at`, `verified_by`, `verification_valid_until`, `hold_reason` | 서버 검토 시각/담당자, 유효 시한, 기계 판독 가능한 보류 사유. 미확인에는 완료 시각을 임의 부여하지 않음 |
| 판매 가능성 | `availability`: `unknown / in_stock / out_of_stock`, `availability_valid_until` | 대응 검증과 분리. unknown은 판매처 확인 연결, 유효한 out_of_stock은 구매 가능 표시 금지 |
| 관리 | `created_at`, `updated_at` | 서버 시각. 이전 revision 전체 상태는 관찰·감사 기록으로 보존 |

`revision`은 재고를 포함한 관리자 변경마다 증가하며 expected_revision과 비교한다.
`identity_revision`은 재고 값/유효기간만 바뀌면 유지한다. 후속 가격 연동은 이 동일성 버전을 참조한다.
이를 구분해 재고 확인만으로 옵션 가격의 대응 버전이 불필요하게 무효화되지 않게 한다.

예정 제약:
- product별 `product + verified` 연결은 최대 하나. 다른 연결로 전환할 때 기존 연결을 먼저 stale로 바꾸고
  새 연결 검증을 같은 트랜잭션에서 처리한다. 품절 연결을 재고만 바꿔 다른 옵션으로 대체하지 않는다.
- verified에는 target/seller 관찰·확인자/시각·유효 시한·필수 식별 근거가 모두 있어야 한다.
- 판매처 ID는 문자열로 저장한다. 미제공 ID를 임의 숫자/UUID로 생성하지 않는다.
  ‘ID 미제공’, 근거상 ‘선택 옵션 없음’, ‘옵션 미확인’을 스냅샷에서 구분한다.
- 기존 `coupang_link`/`coupang_product_id`의 값으로 verified를 자동 생성하지 않는다.
  일반 검색 링크로 확인된 기존 자료도 명시적 검토로 종류만 search로 기록하며 원본 제품값은 보존한다.
- `product_data_sources`/기존 제품 `verification_status`는 연결 상태의 우회 승인 수단이 아니다.
- 근거 FK의 삭제 정책과 기존 제품 휴지통/복구 경로를 migration 설계 전에 대조한다.
  제품 물리 삭제 시 검증 이력까지 조용히 지워지는 cascade는 피하고, 기존 삭제 기능의 호환성은 회귀 게이트로 둔다.

### 3.2 관찰의 고정 식별 스키마

`product_observations.extracted_data.purchase_identity_v1`에 다음 항목을 기록하는 안을 권고한다.
자유 형식 메모 비교 대신 서버에서 고정 키·타입·필수값을 검증하고 원문 표시도 함께 보존한다.

| 항목 | 확인 내용 |
| --- | --- |
| 제품 계열 | 브랜드, 라인명, 제품/레시피 개정, 대상 동물·생애주기, 제형 |
| 내용물 | 맛/단백질원, 혼합 맛이면 구성별 내용. 원재료 처방의 동일성을 이름만으로 추정하지 않음 |
| 포장 | 개별 단위당 용량과 단위, 포장 수량, 세트/증정 구성, 선택 옵션 원문 |
| 외부 식별 | 판매처 상품/품목/offer ID, 바코드가 있으면 보조 근거. 바코드 부재 자체를 불일치로 보지 않음 |
| 확인 범위 | 각 항목의 known / not_applicable / unknown 및 근거. 빈값을 ‘동일’ 또는 ‘옵션 없음’으로 취급하지 않음 |

예를 들어 합성 fixture의 `12g x 15개`와 `180g 1개`는 총중량이 같아도 다른 구성이다.
판매처 ID가 같아도 맛이나 포장 옵션이 달라지면 mismatch/보류다.
단위 표기 정규화는 허용하되 수량·구성을 합산해서 SKU 차이를 지우지 않는다.

target 관찰은 현재 제품을 설명하는 승인된 근거여야 한다. 제품의 `name`, `brand_name`,
`variant_name`, `net_weight_text`, `barcode` 및 관련 current 관찰·package_version이 바뀌면
fingerprint를 다시 비교한다. 단순 공백 변경도 자동 재승인하지 않고 보수적으로 재검토할 수 있다.
관찰은 검증 후 새 기록으로 대체하고, 기존 관찰이 다른 경로에서 변경됐어도 checksum 불일치로 감지한다.

### 3.3 공개 데이터의 경계

새 연결 테이블의 원문 근거·검토자·원본 이력은 기본 관리자 전용으로 둔다.
기존 `product_observations`도 anon/authenticated 읽기가 금지되어 있으므로 브라우저에 직접 조인하지 않는다.
공개 화면은 제한된 서버 projection에서 구매 가능 여부·보류 사유·확인 시각·검증된 옵션 요약과
검색 동선만 받는다. service-role key나 관리자 인증정보를 공개 클라이언트에 전달하지 않는다.
검색 URL이 확인되지 않았다면 임의 검색 링크를 만들어 반환하지 않는다.

## 4. 관리자 검토와 상태 전이

1. 기존 제품 관리에서 ‘판매 연결 검토’를 연다. 제품 편집/원재료 저장과 분리하여 기존 정상 관리자 인증을 재사용한다.
2. 현재 판정 대상과 판매 페이지의 맛·용량·포장 수량·옵션을 나란히 표시한다.
   제품 측 식별정보가 부족하면 보강 필요로 보류하고 상품명/성분을 이 검토에서 임의 수정하지 않는다.
3. 정상 브라우저에서 도착 페이지와 실제 선택 옵션을 읽기 전용 확인한다. 구매/장바구니는 조작하지 않는다.
   검색 화면이면 search, 접근 실패면 unknown/보류, 다른 옵션이면 product/mismatch로 남긴다.
4. 관찰과 옵션 ID·근거·시각을 기록하고, 관리자는 확인한 항목만 대응 승인한다.
   원본 URL은 그대로 보존한다. ‘신뢰도 높음’ 체크 하나로 여러 식별항목을 일괄 채우지 않는다.
5. 서버가 expected revision과 현재 target fingerprint를 비교하고, 모든 검증을 다시 수행한다.
   연결 변경·관련 pending 가격 제안 처리·감사는 한 트랜잭션으로 저장한다.
   실패/감사 실패는 전부 롤백하며, 경쟁 수정은 conflict로 반환한다.
6. 같은 최종 상태를 재요청하면 실제 변경·감사가 중복되지 않아야 한다.
   네트워크 결과 불명확 시에는 정상 관리자 재조회로 상태부터 확인한다.

| 사건 | 결과 |
| --- | --- |
| 근거·옵션 확인 완료 | unverified/stale → verified. 재고/유효 시한 조건은 별도 확인 |
| 선택 옵션이 제품과 다름 | mismatch, 구매 보류. 제품 판정이나 이름을 판매 옵션에 맞춰 바꾸지 않음 |
| 원본 URL 교체 | 기존 행 원본 보존·stale, 새 행 unverified. 기존 승인 승계 금지 |
| 최종 URL·판매 ID·옵션 명세 또는 target fingerprint 변경 | stale/불일치 시 mismatch. revision 증가, 재검토 |
| 품절 | availability=out_of_stock, 구매 보류. SKU 대응 근거는 보존 |
| 재고 회복 | 재고 확인만으로 만료·옵션 mismatch를 해제하지 않음. 모든 자격을 다시 확인 |
| 접속 차단·관찰 실패·재검증 기한 경과 | 구매 보류. 기존 성공 상태/원본을 삭제하지 않고 사유 표시 |
| 검색 결과 랭킹 변화 | 오류/제품 변경으로 처리하지 않음. 검색 링크는 검색 동선으로만 유지 |

기존 `admin-write.audit()`의 실패 무시 동작과 일반 `saveProduct`의 전체 필드 저장을 이 검토에 재사용하지 않는다.
재사용하는 것은 인증·조회·감사 테이블이며, 대응 승인의 저장 경계는 별도 제한된 트랜잭션이어야 한다.
배포 시 신규 action은 기존 인증과 동일하게 검사하고, DB 함수 실행은 서버 역할로만 제한한다.

## 5. 공개 구매/검색 동작과 신선도

서버의 단일 자격 판정은 다음을 모두 만족해야 구매 연결을 제공한다.

```text
공개 접근 가능한 제품
AND link_kind = product
AND verification_status = verified
AND 검증된 target fingerprint = 현재 판정 제품의 식별정보
AND 맛·개별 용량·포장 수량·세트·선택 옵션 대응 근거 충족
AND 판매처 상품/옵션 식별과 최종 목적지 일치
AND verification_valid_until > 서버 현재 시각
```

현재 기존 상품에서 이 조건을 충족한다고 추정하지 않는다. 공개 구매 CTA는 새 기능이다.

| 자격/링크 | 공개 동작 |
| --- | --- |
| 동일성 자격 충족 + 유효한 재고 있음 근거 | ‘이 상품 구매하기’. 확인된 맛·용량·포장 옵션 요약을 함께 표시하되 실시간 재고 보장 문구 금지 |
| 동일성 자격 충족 + 재고 미확인/재고 근거 만료 | ‘판매처에서 확인’. SKU는 확인됐지만 재고는 미확인임을 구분. 이는 일반 검색 동선이 아님 |
| 동일성 자격 충족 + 유효한 품절 근거 | 구매 가능으로 표시하지 않고 품절 상태. 첫 서버 projection은 destination_url 없이 반환 |
| 확인된 일반 검색 링크 | 별도 ‘판매처에서 검색’. 구매/해당 SKU 최저가 버튼으로 꾸미지 않음 |
| 상품 링크이나 동일성 미확인·불일치·stale | 구매 연결 금지. 재고 있음이나 가격이 알려져 있어도 동일성 검증을 대신하지 못함 |
| 검색 링크도 확인되지 않음 | 검색 버튼도 없음. 제품 상세·성분·리뷰·기존 판정은 계속 제공 |

첫 단위는 동일성 확인 최대24시간, 알려진 재고 상태 최대1시간의 별도 유효기간을 적용한다.
이는 실시간 보장이 아닌 초기 보수적 정책이다. 판매처 외부 API를 클릭 직전에 호출하는 것은 필수가 아니다.
서버는 저장된 확인 상태·시한과 현재 제품/근거 fingerprint를 재평가한다. 동일성이 만료/불일치면
구매 연결을 제공하지 않고, 재고 근거만 만료됐으면 unknown으로 내려 ‘판매처에서 확인’할 수 있다.
외부 재확인을 시도했다가 실패하더라도 기존 근거의 동일성 시한을 연장하거나 재고 있음을 추정하지 않는다.
실패가 옵션/도착지 변경을 확인한 경우에는 stale/mismatch로 보류하고, 단순 재고 확인 실패는 unknown으로 취급한다.
오래된 화면의 직접 URL 사용 방지는 후속 공개 CTA의 서버 재조회/캐시 정책에서 검증한다.
페이지 상품 ID가 맞더라도 실제 도착 시 다른 기본 옵션이 선택되거나 옵션 파라미터가 유실되면 보류한다.
ID로 URL을 임의 조합한 뒤 해당 옵션이 선택됐다고 가정하지 않는다.

최소 공개 구현은 저장된 동일성 계약을 만족하는 projection만 소비하는 방식이다.
첫 단위는 외부 요청을 전혀 하지 않는다. 후속 재확인 수단도 임의 URL fetch, 내부망 접근,
로그인 추출, 차단 우회를 하지 않는다. 재고 자동 확인 수단이 없어도 유효한 동일성 연결은
‘판매처에서 확인’할 수 있다. TTL만으로 ‘지금도 같은 SKU/재고/가격’을 보장한다고 주장하지 않는다.
외부 판매처가 이동 이후 내용을 바꾸는 것까지 통제할 수 없으므로 확인 시각·옵션 요약을 사용자에게 제공한다.

24시간/1시간은 초안의 검증 상한이며 운영 적용 전에 확정한다. 기한이 지나도 원본·근거는 보존한다.
가격은 독립된 근거와 유효기간을 갖는다. 미확인·만료 가격은 표시하지 않으며 상품 연결을 대신 차단하지 않는다.

## 6. 가격 제안과 대응 상태의 연결

### 6.1 최소 확장

기존 `product_price_proposals`에 다음 참조를 추가하는 안이다. 이번에는 추가하지 않는다.

| 제안 필드 | 역할 |
| --- | --- |
| `purchase_link_id` | 이 가격을 관찰한 연결의 FK. legacy 제안은 NULL 허용하되 구매 가격 근거로 사용하지 않음 |
| `purchase_link_revision` | 감지 당시 identity_revision. 다른 옵션/새 연결로 가격 승인을 자동 승계하지 않음 |
| `price_observation_id` | 기존 observations에 보존한 옵션 ID·단위/포장 가격·시각·조건의 근거 |

기존 `source_url`, `source_product_id`, `detected_at`, 검토 이력은 보존한다.
source_product_id 한 개를 옵션 증거로 대신 사용하지 않는다. 가격 관찰에는 같은 옵션의 총 판매 가격인지,
단위 환산 가격인지와 배송/쿠폰/회원 조건을 명시한다. 옵션이 다른 단위 최저가를 혼합하지 않는다.

초기에는 활성 verified 연결 하나만 유지하므로 기존 제품당 pending 하나 제약을 그대로 사용한다.
연결 변경으로 오래된 pending이 남으면 해당 제안을 기존 `rejected` 상태와 명시적 시스템 보류/만료 사유로
닫고 감사한다. 이는 가격이 틀렸다는 판단이 아니라 연결 변경으로 승인 자격이 사라졌다는 기록이다.
새 옵션으로 기존 제안의 ID·근거를 덮어쓰지 않는다. 다중 동시 판매 제안 비교는 후속 범위다.

### 6.2 수집·승인·공개 가격

- 수집은 verified 연결에서 시작한다. 기존 `coupang_product_id IS NOT NULL`만으로 구매용 가격 제안을 만들지 않는다.
  현재 검색 API의 productId 일치는 후보 검색으로만 재사용한다. item/offer/포장 가격 대응을 확인할 수 없으면
  ‘옵션 가격 근거 부족’으로 남기고 승인 가능한 가격으로 생성하지 않는다. 검색 순위/첫 결과 fallback 금지.
- 수동 가격 제안도 예외가 아니다. `source=manual`로 링크 검증·옵션 가격 근거를 우회할 수 없다.
- 승인은 연결·제품·가격 제안의 현재 상태를 다시 확인한다. 같은 product_id, verified/동일성 시한,
  동일 revision/target fingerprint/옵션, 가격 근거와 표시 조건을 모두 검사한다.
- 제품·연결·제안 행 잠금 및 일관된 잠금 순서를 사용한다. 기존 현재 가격도 expected 값과 대조하여
  중간 수동 수정을 덮어쓰지 않는다. 승인 상태·감사·호환용 `products.min_price` 변경은 한 트랜잭션이다.
  현재 분리된 승인 UPDATE와 audit를 이 요구사항의 원자성 보장으로 표현하지 않는다.
- 공개 구매 가격은 자격이 유효한 동일 연결/옵션의 승인 제안에서만 제공한다.
  가격 근거의 유효 시한도 별도로 검사한다. 초기 권고는 감지 후 최대24시간과 연결 검증 만료 중
  이른 시각이며, 연결 재검증이 오래된 가격의 시한을 연장하지 않는다. 정확한 기간은 출시 전에 확정한다.
  기존 `products.min_price`는 호환 캐시일 뿐 SKU 증거가 아니다. 연결 변경/품절/만료 후 남은 캐시를
  ‘이 상품 최저가’로 fallback하지 않는다. 오래된 approved 제안은 이력으로 보존하되 공개 제공 조건에서 제외한다.
- 링크 또는 대응 상태가 변하면 pending 승인 자격과 공개 가격 자격을 즉시 다시 평가한다.
  TTL 캐시나 관리자 화면의 이전 녹색 상태만으로 승인을 계속 허용하지 않는다.

## 7. 필요한 테스트

| 층 | 필수 사례 |
| --- | --- |
| 식별 비교 단위 | 같은 productId/이미지/이름이어도 다른 맛·용량·개별 포장·수량·세트·개정이면 보류; unknown과 옵션 없음 구분; 총중량만 같은 포장 거부 |
| 링크 분류/자격 | 근거에 따른 product/search/unknown; URL 형식으로 verified 추정 금지; 불일치·동일성 만료·fingerprint 변경 시 URL 없음; 유효한 품절은 URL 없음; 재고 미확인/만료만으로 동일성 연결을 차단하지 않음 |
| 데이터 계약 | 관찰의 product_id 일치, 원본 불변/이력 보존, 제품당 활성 verified 하나, 낙관적 revision 충돌, 증거 변경 감지, 미허용 필드 거부 |
| 관리자 API/DB | 정상 인증/비관리자 거부, 승인과 감사 원자성, 감사 실패 롤백, 같은 상태 재요청의 변경/감사0, 동시 연결 전환/가격 승인 경합 |
| 가격 | productId만 맞는 다른 item/offer 거부, 검색/미연결 legacy 제안 승인 보류, 변경된 revision/target/가격의 오래된 승인 거부, 기한 경과/stale approved 가격의 공개 fallback 부재 |
| 공개 UI/endpoint | 구매와 ‘판매처에서 검색’ 분리, 검증 옵션 표시, 직접 원본 URL fallback 부재, 오래된 카드 클릭 재평가, 링크 보류 중 성분·리뷰·검색 접근 유지 |
| 회귀 | 관리자 제품명/브랜드 정리·원료/영양정보 저장·기존 판정/추천 점수와 공개 조회 불변. 링크 분류만으로 제품 비노출/삭제되지 않음 |

합성 제품/옵션으로 테스트하고 운영 제품 ID·판매 링크·보고서·인증정보를 공개 fixture에 넣지 않는다.
단일 연결 DB 테스트를 동시성 검증으로 표현하지 않는다. 실제 잠금 경합은 별도 두 연결 테스트로 확인한다.
브라우저 smoke는 허용된 읽기 전용 판매 페이지의 도착 옵션 확인까지만 하며 구매·장바구니는 조작하지 않는다.

## 8. 구현 순서와 출시 게이트

1. **설계 확정:** 하나의 판매처·활성 연결 하나, 식별 스키마, 재고 확인 수단, 검토 유효 시한을 결정한다.
2. **비운영 계약 테스트:** 합성 데이터로 식별/자격/가격 상태 전이를 먼저 고정한다. 기존 링크는 자동 verified 금지.
3. **별도 승인 후 데이터/API:** 추가형 모델·제약·권한과 제한된 관리자 트랜잭션을 구현/검증한다.
   기존 컬럼은 삭제하지 않고 데이터 이관/운영 적용은 별도로 승인받는다.
4. **관리자 검토:** 링크 종류/옵션/근거를 개별 검토한다. 제품명·성분·브랜드 수정과 분리한다.
5. **가격 연계:** 기존 수집/승인 흐름에 연결 revision/옵션 근거·원자성 게이트를 붙인다.
   아직 연결되지 않은 legacy 제안을 몰래 승인하거나 가격 캐시를 덮어쓰지 않는다.
6. **공개 projection/자격 판정:** 동일성은 fail-closed, 재고·가격은 독립적 unknown/만료 표시를 검증한다. 클릭 직전 외부 API는 필수가 아니다.
7. **공개 CTA:** 확인된 상품의 ‘이 상품 구매하기’와 확인된 일반 검색의 ‘판매처에서 검색’을 별도로 구현한다.
   신규 기능이며 현재 공개 동선이 이미 있다고 가정하지 않는다.
8. **별도 운영 승인:** 소량 검토/읽기 smoke 후 활성화. 링크 NULL/삭제는 이 계획에 포함하지 않는다.

이 문서만으로 migration 실행, 신규 자동 수집, 구매 CTA 활성화, 운영 제품 변경을 승인하지 않는다.
첫 서버 구현의 로컬 검증은 아래에 기록하며, 운영 적용과 UI 출시는 별도 승인 대상이다.

## 9. 첫 구현 단위의 실제 범위와 한계

- `supabase/migration_drafts/20261030090000_product_purchase_links.sql`: 자동 migrations 경로 밖의 초안.
  연결 테이블, 서버 전용 원자적 저장 RPC, 검증된 연결만 반환하는 공개 projection을 제공한다.
- 기존 admin-write 인증/라우터에 `saveProductPurchaseLink`만 추가한다. 클라이언트 actor/증거 본문은
  받지 않고 기존 관찰 ID를 참조하며, actor는 인증된 서버 값만 전달한다. UI·클라이언트 호출은 아직 없다.
- 첫 단위의 `purchase_identity_v1`은 brand/line/flavor/unit_size/pack_count/composition/option/edition
  8개 문자열을 엄격히 대조한다. 의미적 단위 변환은 구현하지 않으며 표기가 다르면 보수적으로 보류한다.
  unknown·필드 누락·다른 맛/포장·다른 제품의 근거는 거부한다. target raw_name/raw_brand와 현재 제품도 비교한다.
- 쿠팡 검증에는 product/item/offer 3개 ID와 seller 관찰의 일치가 필요하다. ID 미제공은 가짜 ID를 만들지 않고
  unverified로 보존한다. 일반 검색·unknown·기존 coupang_link는 자동 verified로 승격하지 않는다.
- verified 목적지는 쿠팡의 `/vp/products/{productId}`와 단일 `itemId`/`vendorItemId`가 관찰 ID들과
  일치하는 직접 상품 URL만 받는다. 일반 검색·단축 URL은 원본으로 보존할 수 있으나 검증된 목적지가 아니다.
  URL 구조 일치는 필요조건일 뿐 포장·옵션 동일성의 증거를 대신하지 않는다. 공백/제어문자 URL은 거부한다.
  공개 목적지에는 두 옵션 ID query만 허용하며, 원본의 추적·내부 근거·인증 관련 추가 query는 전달하지 않는다.
  원본을 자동 정리/교체하지 않고 관리자가 근거와 일치하는 직접 상품 URL을 별도로 확인해야 한다.
- 공개 함수는 제품 노출과 reviewed/verified 상태, 미검수 숨김 정책, 동일성 시한·관찰 current·fingerprint를 검사한다.
  반환값은 연결/제품 ID, 판매처, 목적 URL, action, 동일성 확인 시각/시한, 유효 재고 상태뿐이다.
  원본 URL·관찰 내용·확인자·actor·감사·내부 fingerprint는 노출하지 않는다. 가격 필드는 아예 제공하지 않는다.
- 감사 실패는 연결 저장도 롤백한다. expected revision 충돌과 동일 요청 재전송을 구분하며 기존 제품 행은 갱신하지 않는다.
- 재전송은 **상태 기반**이다. 정규화 요청(expected_revision 제외)과 현재 저장 요청 및 식별 fingerprint가
  같고 근거·유효기간 검사를 계속 통과할 때만 already_applied로 쓰기/감사 추가를 생략한다.
  영구 요청 ID나 과거 성공 영수증을 저장하는 중복 제거는 아니다. 중간 수정 뒤 오래된 요청은 conflict이며,
  근거가 만료되거나 달라지면 재검증 실패가 될 수 있다. 현재 상태와 동일한 새 요청도 같은 방식으로 생략한다.
- 제품명/브랜드/표시명/variant/중량/바코드/canonical key/대상동물/생애주기/제형과 관찰 내용을 fingerprint에
  포함한다. 현재 스냅샷 비교이므로 외부 수정이 원상 복구되면 기존 스냅샷과 다시 같아질 수 있다.
  재고만 바뀌어도 revision은 증가하지만 identity_revision과 동일성 확인자/시각은 갱신하지 않는다.
  seller 관찰 시각은 재고·동일성의 별도 연령 제한에 사용하며, stock 변경만으로 동일성을 추정하거나 연장하지 않는다.
- 관리자 UI·공개 CTA·가격 제안 연동은 후속 단위다. 신규 함수/초안 SQL은 운영에 적용·배포하지 않았다.
- 합성 테스트는 실제 admin-write 인증/라우터/검증과 PGlite의 실제 SQL을 실행한다.
  외부 Deno HTTP 및 Supabase SDK 수송만 대체한다. 실제 운영 인증/배포나 다중 연결 동시성 검증은 아니다.

### 로컬 검증 기록 (2026-10-31)

- `npm run test:purchase-links`: 대응하는 Node 테스트 명령으로 22개 통과(기존17개 포함). 현재 로컬에서는
  기존에 무결성을 대조한 PGlite 0.5.8 임시 모듈로 호환 검증했다. 최신 main이 이미 채택한
  PGlite 0.5.11을 CI에서 재사용하며 이 PR은 의존성/lockfile을 변경하지 않는다.
- `tsc -b --pretty false` 및 새 서버 모듈의 strict `tsc --noEmit`: 통과.
- 새 서버 검증 모듈 ESLint와 Node 테스트의 명시적 Node/ESLint recommended 검사: 통과.
- `git diff --check` 및 신규 파일의 공백 검사: 통과.
- 기존 admin-write/cleanup/migration-ledger Vitest 회귀 검사는 테스트 시작 전에
  기존 `@rollup/rollup-darwin-arm64` 4.62.2 모듈의 macOS Team ID/코드서명 불일치로 중단됐다.
  전체 Vitest·production build 성공으로 표현하지 않으며 보안 설정 변경·재설치·반복 실행하지 않았다.
- PGlite 테스트 DB는 최소 합성 스키마와 단일 연결이다. 별도 `test:purchase-links:concurrency`는
  CI의 빈 PostgreSQL 17 로컬 서비스에서 두 실제 연결을 사용한다. 첫 트랜잭션을 미커밋 상태로 유지하고,
  두 번째 연결의 실제 Lock 대기를 확인한 후 첫 연결을 커밋한다. 서로 다른 verified 연결 생성과 같은
  revision 수정 경합에서 승자1/충돌1 및 감사 건수를 검사한다. DB/제품 자료는 모두 합성이다.
  로컬에는 psql/Docker가 없어 이 테스트를 실행하지 않았으며 Linux CI에서 실행한다.
- 최신 main의 `.github/workflows/release-checks.yml` web job을 확장하고 중복 workflow를 추가하지 않는다.
  기존 Node24/npm11.13/npm ci, lint/전체 Vitest/build/기타 release 검사를 보존하고 신규 계약·동시성·관련 Vitest 및
  명시적 타입 검사를 추가했다. contents:read만 허용하며 신규 테스트는 production secret/DB/배포를 사용하지 않는다.
- 전체 운영 스키마 replay, 운영 인증·실제 판매처 SKU 대응은 검증하지 않는다.

### 배포 의존성과 보류 조건

1. 이 PR의 SQL은 `migration_drafts`에만 있으며 merge해도 Supabase 자동 migration 대상이 아니다.
2. 새 `saveProductPurchaseLink` action은 아직 없는 `admin_save_product_purchase_link` RPC에 의존한다.
   이 상태에서 함수를 먼저 배포해 호출하면 검증/저장 오류가 반환된다. 일반 action 경로는 변경하지 않았다.
3. 별도 승인된 후속 작업에서 전체 스키마·정책 호환성 및 백업을 확인하고, 최신 timestamp로 초안을
   정식 migration으로 승격/검토한 뒤 DB 테이블·RPC·권한을 먼저 적용한다. 이번 PR은 이를 실행하지 않는다.
4. service_role 전용 쓰기, anon/authenticated private read/write 차단, 최소 공개 projection과 감사 실패 롤백을
   실제 격리 Supabase에서 확인한 다음 admin-write를 배포한다. UI/CTA/가격 연계는 그 이후 별도 단위다.
5. 단일 활성 연결은 제품 행 잠금과 부분 unique index로 보장한다. 만료된 verified 행도 새 연결 전에
   명시적으로 stale로 전환해야 하며, 원본/이력은 삭제하지 않는다. 동시성 검증은 기본 READ COMMITTED 범위다.
