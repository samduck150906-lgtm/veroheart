# 예전 Supabase 프로젝트에서 원재료·영양정보 가져오기 — 인수인계

작성 2026-09-22. 이 문서는 **로컬 PC 의 Claude Code 세션**이 읽고 그대로 수행하기 위한 것이다.
원격(클라우드) 세션은 옛 프로젝트에 접근할 수 없어서 여기까지만 준비해 둔다.

## 왜 이 작업을 하는가

운영 DB(`nlutpmjloryqdomgbqrr`, veroro)에 제품 정보가 비어 있다.

| 항목 | 현재 |
| --- | --- |
| 노출 제품 | 459개 |
| 원재료 링크 없는 제품 | **145개** (사료 75 · 간식 70) |
| 영양정보(`nutritional_profiles`) 있는 제품 | **4개** |

지워진 것이 아니라 **처음부터 들어온 적이 없다.** 근거:

- `product_ingredients` 누적 INSERT 4,270 · DELETE 3 (현재 4,269)
- `nutritional_profiles` 누적 INSERT 6 · DELETE 2 (현재 4)
- `pg_stat_database.stats_reset` = 2026-03-30 → 위 숫자는 데이터 적재 이전부터의 전체 누적
- `product_ingredient_label_sets/items`, `product_data_sources`, `admin_trash` 모두 0건
- `admin_audit_log` 20건 전부 테스트 제품·성분 4개 수정

제품 생성일로 보면 2026-05-19 일괄 적재가 415개 중 313개만 채웠고, 05-24 에 추가된 43개는
이름만 들어왔다.

운영자는 "예전에 전부 넣었다"고 기억하며, 다른 계정의 프로젝트
**`zddsnabeaenwvczilxeb`** 를 지목했다. 거기에 있으면 가져온다.

## 두 프로젝트의 역할

| 프로젝트 | 역할 | 접근 |
| --- | --- | --- |
| `zddsnabeaenwvczilxeb` (다른 계정) | **읽기 전용 원본** | 이 저장소 `.mcp.json` 의 `supabase-veroheart-old` |
| `nlutpmjloryqdomgbqrr` (veroro) | 운영 DB, 최종 적재 대상 | 기존 Supabase 커넥터 |

**옛 프로젝트에는 아무것도 쓰지 않는다.** 남의 계정 데이터이고, 원본은 원본으로 둔다.

## 로컬에서 할 일

```bash
git pull
claude            # 이 저장소에서 실행
```

프로젝트 MCP 서버를 신뢰할지 물으면 승인하고, 인증한다.

```
/mcp            → supabase-veroheart-old → Authenticate
```

### 1단계 — 데이터가 거기 있는지 확인

```sql
select
  (select count(*) from products)             as 제품,
  (select count(*) from ingredients)          as 성분사전,
  (select count(*) from product_ingredients)  as 원재료링크,
  (select count(*) from nutritional_profiles) as 영양정보;
```

`원재료링크 > 4267` 이거나 `영양정보`가 수백 건이면 찾은 것이다.
아니면 여기서 멈추고 결과만 보고한다 — 다른 곳을 찾아야 한다.

스키마가 다를 수 있다(옛 버전). 테이블·컬럼이 없으면 먼저
`information_schema.columns` 로 실제 구조를 확인하고 아래 쿼리를 맞춰 고친다.

### 2단계 — 내보내기

성분을 **UUID 가 아니라 이름으로** 뽑는다. 두 프로젝트의 성분 사전 ID 가 다르므로,
veroro 의 사전(544개)에 이름으로 다시 매칭해야 한다.

```sql
-- data/legacy-export/ingredient-links.csv
select p.name as product_name, p.brand_name, p.barcode,
       i.name_ko as ingredient_ko, i.name_en as ingredient_en, pi.sort_order
from product_ingredients pi
  join products p    on p.id = pi.product_id
  join ingredients i on i.id = pi.ingredient_id
order by p.name, pi.sort_order;
```

```sql
-- data/legacy-export/nutrition.csv
select p.name as product_name, p.brand_name, p.barcode,
       np.crude_protein, np.crude_fat, np.crude_fiber, np.crude_ash,
       np.moisture, np.calcium, np.phosphorus, p.kcal_per_100g
from nutritional_profiles np
  join products p on p.id = np.product_id
order by p.name;
```

```sql
-- data/legacy-export/ingredients.csv  (사전에 없는 성분을 등록할 때 쓸 원본)
select name_ko, name_en, risk_level, description, category
from ingredients order by name_ko;
```

`sort_order` 는 반드시 포함한다. 분석 엔진이 첫 번째 원료로 '제1원료'를 판정한다.

### 3단계 — 저장소에 올리기

```bash
mkdir -p data/legacy-export
# 위 결과를 CSV 로 저장한 뒤
git add data/legacy-export
git commit -m "예전 프로젝트 원재료·영양정보 내보내기"
git push
```

푸시했다고 알려주면, 원격 세션이 이어서 매칭·검증·적재한다.

## 적재는 원격 세션이 한다 (이 문서 범위 밖)

적재 시 지킬 것 — 옮기는 쪽도 같은 규칙을 따른다.

1. **제품 매칭**: 바코드 우선 → 없으면 제품명+브랜드를 정규화해 대조. 애매하면 남겨 두고 보고한다.
2. **성분 매칭**: `src/utils/ingredientDictionaryMatch.ts` 로 정식명·영문명·별칭 **정확 일치만**.
   못 찾은 이름은 연결하지 않고 목록으로 보고한다.
3. **dry-run 먼저**: 매칭 건수·미매칭 목록을 먼저 보여 주고 승인받은 뒤에 쓴다.
4. **없는 값은 만들지 않는다.** 사료 라벨은 반려동물이 먹는 것을 판단하는 근거다.
5. `products.ingredient_count` 는 손대지 않는다 — `product_ingredients` 트리거가 따라간다.

## 하지 말 것

- 옛 프로젝트에 INSERT/UPDATE/DELETE
- service role 키·DB 접속 문자열을 대화에 붙여넣기 (기록에 남는다)
- 비슷해 보인다고 성분을 골라 연결하기

## 끝나면

`.mcp.json` 의 `supabase-veroheart-old` 항목은 지워도 된다. 이 이전 작업만을 위한 설정이다.
