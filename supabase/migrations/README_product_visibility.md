# 제품 노출 규칙 (서버 강제)

사용자에게 어떤 제품이 보이는지는 **RLS 정책**이 정한다. 클라이언트가 쿼리에
조건을 붙이지 않아도 서버가 걸러 낸다. anon 키는 공개된 값이라, 화면에서만
숨기는 방식으로는 막을 수 없다.

## 정책

`public.products` SELECT (anon, authenticated):

```
is_visible = true
AND (NOT hide_unverified_products_enabled() OR verification_status = 'verified')
```

- `is_visible = false` → 언제나 미노출
- 검수 게이트(`app_settings.hide_unverified_products`)가 켜지면 `verified` 만 노출

`service_role` 은 RLS 를 우회하므로 관리자 경로는 영향받지 않는다.

## 검수 게이트를 켜기 전에

지금은 **꺼져 있다.** 켜면 `verification_status = 'verified'` 인 제품만 남는데,
현재 459개가 전부 `pending` 이라 앱이 빈 화면이 된다.

순서:

1. 관리자 → 제품 관리에서 제품을 선택하고 **검수 완료** 일괄 처리
2. 충분히 채운 뒤 관리자 → 시스템 설정에서 `hide_unverified_products` 켜기
3. 켜는 즉시 서버가 적용한다 (앱 재배포 불필요)

## 관리자 화면이 제품을 읽는 경로

정책을 조이면 anon 으로는 비노출·검수대기 제품이 보이지 않는다. 정작 그
제품들을 관리하는 것이 관리자 화면의 일이므로, 관리자 제품 조회는 전부
`admin-products-read` Edge Function(service_role)을 거친다.

| 화면 | 함수 | view |
|---|---|---|
| 제품 관리 목록 | `fetchProductsPage` | `list` |
| 제품 편집(단건) | `fetchProductForEdit` | `full` |
| 제품명 정리 | `fetchProductNames` | `names` |
| 바코드·영양정보 입력 | `fetchProductFacts` | `facts` |
| 대시보드 카테고리 집계 | `fetchAllProductCategories` | `categories` |

컬럼은 `view` 이름으로만 고른다. 클라이언트가 보낸 문자열이 `select()` 에
그대로 들어가는 경로는 없다.

**새 관리자 제품 조회를 추가할 때 anon 클라이언트(`supabase.from('products')`)를
쓰지 말 것.** 비노출 제품이 조용히 빠져서, 채워야 할 제품이 목록에서 사라진다.
