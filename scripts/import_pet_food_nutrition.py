#!/usr/bin/env python3
"""
반려동물 사료 등록성분(보장성분) → Supabase `nutritional_profiles` / `products.kcal_per_100g` 적재.

배경
----
국내 유통 사료는 공급자가 등록성분 7가지를 신고한다.
  조단백질 · 조지방 · 조섬유 · 조회분 · 수분 · 칼슘 · 인
이 7가지가 `nutritional_profiles` 의 7개 컬럼과 그대로 대응한다.

운영 DB 기준 제품 458건 중 영양정보가 있는 제품은 3건, kcal 은 0건이다. 그래서
급여량 계산 · AAFCO 판정 · Ca:P 비율 · 영양 균형이 전부 막혀 있다.

열량(kcal)
---------
등록성분에는 열량이 없다. 수정 애트워터 공식으로 계산해서 채운다.
  ME(kcal/100g) = 3.5×조단백 + 8.5×조지방 + 3.5×NFE,  NFE = 100 − (단백+지방+섬유+회분+수분)
앱의 `src/analysis/nutrition.ts` 의 calculateCalories 와 같은 식이다. 계산값이므로
화면에서는 실측값(라벨 열량)과 구분해서 보여줘야 한다 — Detail 화면이 이미
'라벨 열량' / '추정 열량' 으로 나눠 표시한다.

사용 예
-------
  # 1) 파일로 받은 경우 (CSV/JSON) — 먼저 확인만
  python scripts/import_pet_food_nutrition.py --file ./data/pet_food_nutrition.csv --dry-run

  # 2) 공공데이터 오픈API 로 받는 경우
  export PUBLIC_DATA_SERVICE_KEY='발급받은 인증키'
  python scripts/import_pet_food_nutrition.py --api-url 'https://apis.data.go.kr/...' --dry-run

  # 3) 확인 끝나면 실제 반영
  python scripts/import_pet_food_nutrition.py --file ./data/pet_food_nutrition.csv --apply

환경 변수 (.env 자동 로드)
  - DATABASE_URL 또는 SUPABASE_DB_URL : postgresql://...  (직접 INSERT, 권장)
  - PUBLIC_DATA_SERVICE_KEY           : data.go.kr 인증키 (--api-url 사용 시)

안전 장치
--------
  * 기본은 dry-run 이다. --apply 를 줘야만 DB 에 쓴다.
  * 이미 값이 있는 제품은 건너뛴다 (--overwrite 로만 덮어쓴다).
  * 조단백·조지방이 없는 행은 넣지 않는다. 부분값을 0 으로 채우면
    "단백질 0% 사료" 가 되어 없느니만 못하다.
  * 합이 100을 넘는 등 앞뒤가 안 맞는 행은 넣지 않고 리포트에만 남긴다.
  * 매칭·스킵 내역을 항상 CSV 리포트로 남긴다. 눈으로 확인하고 반영하라는 뜻이다.
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
import os
import re
import sys
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable, Iterator

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - 선택 의존성
    load_dotenv = None  # type: ignore[assignment]

LOG = logging.getLogger("import_pet_food_nutrition")

ENCODING_CANDIDATES = ("utf-8-sig", "utf-8", "cp949", "euc-kr")

# ---------------------------------------------------------------------------
# 필드 이름 후보
#
# 공공데이터는 같은 값이라도 데이터셋마다 열 이름이 다르다("조단백질(%)",
# "crudeProtein", "CRUDE_PROTEIN" …). 실제 응답을 보기 전에는 확정할 수 없어
# 후보를 넉넉히 두고 정규화해서 맞춘다. 새 이름이 나오면 여기에만 더하면 된다.
# ---------------------------------------------------------------------------
NUTRIENT_ALIASES: dict[str, tuple[str, ...]] = {
    "crude_protein": ("조단백질", "조단백", "粗蛋白", "crudeprotein", "protein", "cp"),
    "crude_fat": ("조지방", "crudefat", "fat", "cf"),
    "crude_fiber": ("조섬유", "crudefiber", "crudefibre", "fiber", "fibre"),
    "crude_ash": ("조회분", "회분", "crudeash", "ash"),
    "moisture": ("수분", "moisture", "water"),
    "calcium": ("칼슘", "calcium", "ca"),
    "phosphorus": ("인", "인산", "phosphorus", "phosphorous", "p"),
}

NAME_ALIASES = ("제품명", "품명", "사료명", "productname", "prdlstnm", "name", "goodsname")
BRAND_ALIASES = ("업체명", "제조업체", "제조사", "회사명", "브랜드", "brand", "brandname", "company", "maker")

NUTRIENT_COLUMNS = tuple(NUTRIENT_ALIASES.keys())
# 이 둘이 없으면 열량도 못 구하고 분석도 못 한다 — 행을 버린다.
REQUIRED_FOR_INSERT = ("crude_protein", "crude_fat")
# 열량 계산에는 다섯 가지가 모두 필요하다.
REQUIRED_FOR_ENERGY = ("crude_protein", "crude_fat", "crude_fiber", "crude_ash", "moisture")


def normalize_key(raw: str) -> str:
    """열 이름을 비교용으로 정규화 — 공백·괄호·단위·대소문자를 지운다."""
    s = unicodedata.normalize("NFKC", raw or "").lower()
    s = re.sub(r"\([^)]*\)", "", s)          # (%) (g/kg) 등
    s = re.sub(r"[\s_\-/·,.%]", "", s)
    return s


def build_field_map(headers: Iterable[str]) -> dict[str, str]:
    """응답의 실제 열 이름 → 우리 컬럼 이름."""
    mapping: dict[str, str] = {}
    for header in headers:
        key = normalize_key(header)
        if not key:
            continue
        for column, aliases in NUTRIENT_ALIASES.items():
            if column in mapping.values():
                continue
            if any(key == normalize_key(alias) for alias in aliases):
                mapping[header] = column
                break
    return mapping


def find_header(headers: Iterable[str], aliases: tuple[str, ...]) -> str | None:
    normalized = {normalize_key(a) for a in aliases}
    # 정확히 일치하는 열을 먼저 찾고, 없으면 포함 관계로 넓힌다.
    for header in headers:
        if normalize_key(header) in normalized:
            return header
    for header in headers:
        key = normalize_key(header)
        if any(alias in key for alias in normalized):
            return header
    return None


# 보장성분은 '값' 이 아니라 '보장 경계' 로 신고된다.
#   조단백질 "50% 이상" → 최소 보장치, 실제는 그 이상
#   조지방   "30% 이하" → 최대 보장치, 실제는 그 이하
# 라벨에 적히는 값이 원래 이런 형태라 그대로 담되(전 세계 사료 표시 방식이 같다),
# 어느 쪽 경계인지 함께 남겨 화면·리포트에서 구분할 수 있게 한다.
BoundKind = str  # 'min' | 'max' | 'exact'

MIN_MARKERS = ("이상", "최소", "min")
MAX_MARKERS = ("이하", "미만", "최대", "max")


def parse_percent(raw: Any) -> float | None:
    """'27.0%', '27', '30% 이하' → 숫자만. 경계 방향은 parse_percent_bound 로."""
    value, _ = parse_percent_bound(raw)
    return value


def parse_percent_bound(raw: Any) -> tuple[float | None, BoundKind]:
    """
    '30% 이하' → (30.0, 'max'), '50% 이상' → (50.0, 'min'), '27' → (27.0, 'exact').

    값이 없거나 백분율 범위를 벗어나면 (None, 'exact').
    """
    if raw is None:
        return None, "exact"
    text = str(raw).strip()
    if not text or text in {"-", "—", "미표시", "비공개", "N/A", "해당없음"}:
        return None, "exact"

    lowered = text.lower()
    bound: BoundKind = "exact"
    if any(m in lowered for m in MAX_MARKERS):
        bound = "max"
    elif any(m in lowered for m in MIN_MARKERS):
        bound = "min"

    match = re.search(r"-?\d+(?:\.\d+)?", text.replace(",", ""))
    if not match:
        return None, bound
    value = float(match.group(0))
    if value < 0 or value > 100:
        return None, bound
    return value, bound


# ---------------------------------------------------------------------------
# 열량 — src/analysis/nutrition.ts 의 calculateCalories 와 같은 식(3.5/8.5/3.5)이다.
# 런타임이 달라 코드를 공유할 수 없으므로, 식을 바꿀 때는 반드시 두 곳을 함께 고친다.
# 다만 여기서는 값이 하나라도 없거나 합이 100을 넘으면 계산하지 않는다. 화면 계산기는
# 없는 값을 0 으로 두고 clamp 하지만, DB 에 남는 값은 그러면 안 되기 때문이다.
# ---------------------------------------------------------------------------
def calculate_kcal_per_100g(values: dict[str, float]) -> float | None:
    if any(values.get(c) is None for c in REQUIRED_FOR_ENERGY):
        return None
    total = sum(values[c] for c in REQUIRED_FOR_ENERGY)
    if total > 100:
        return None
    nfe = 100 - total
    kcal = 3.5 * values["crude_protein"] + 8.5 * values["crude_fat"] + 3.5 * nfe
    return round(kcal, 1)


@dataclass
class SourceRow:
    name: str
    brand: str
    values: dict[str, float | None] = field(default_factory=dict)
    """성분별 보장 경계 방향('min'/'max'/'exact'). 리포트에 그대로 보여 준다."""
    bounds: dict[str, BoundKind] = field(default_factory=dict)


def rows_from_csv(path: Path) -> list[SourceRow]:
    raw = path.read_bytes()
    text = None
    for enc in ENCODING_CANDIDATES:
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        raise SystemExit(f"디코딩 실패: {path}")

    reader = csv.DictReader(text.splitlines())
    headers = reader.fieldnames or []
    return _rows_from_dicts(list(reader), headers)


def rows_from_json(path: Path) -> list[SourceRow]:
    data = json.loads(path.read_text(encoding="utf-8"))
    records = _extract_records(data)
    headers = sorted({k for r in records for k in r.keys()})
    return _rows_from_dicts(records, headers)


def _extract_records(data: Any) -> list[dict[str, Any]]:
    """공공데이터 JSON 은 response.body.items[...] 처럼 겹겹이 싸여 있는 경우가 많다."""
    if isinstance(data, list):
        return [r for r in data if isinstance(r, dict)]
    if isinstance(data, dict):
        for key in ("items", "item", "row", "data", "records"):
            if key in data:
                return _extract_records(data[key])
        for value in data.values():
            if isinstance(value, (dict, list)):
                found = _extract_records(value)
                if found:
                    return found
    return []


# ---------------------------------------------------------------------------
# 세로형(long) 데이터
#
# 지자체 공개 데이터(예: 제주 반려동물사료성분정보)는 성분 하나가 한 행이다.
#   제조업체명 | 사료종류 | 성분등록번호 | 사료명 | 사료성분명 | 사료성분량
#   글리칸코드 | 단미사료 | PP6EP0002  | 육포1  | 조지방     | 30% 이하
#   글리칸코드 | 단미사료 | PP6EP0002  | 육포1  | 조단백질   | 50% 이상
# 사료 하나가 4~5행에 흩어져 있어, 가로형으로 접어야 제품 한 건이 된다.
# 같은 사료를 묶는 열쇠는 성분등록번호가 가장 정확하고, 없으면 업체+사료명을 쓴다.
# ---------------------------------------------------------------------------
COMPONENT_NAME_ALIASES = ("사료성분명", "성분명", "항목명", "성분")
COMPONENT_VALUE_ALIASES = ("사료성분량", "성분량", "함량", "성분값", "값")
REGISTRATION_NO_ALIASES = ("성분등록번호", "등록번호", "성분등록번호1")


def is_long_format(headers: list[str]) -> bool:
    """성분명/성분량 열이 따로 있으면 세로형이다."""
    return bool(
        find_header(headers, COMPONENT_NAME_ALIASES)
        and find_header(headers, COMPONENT_VALUE_ALIASES)
    )


def _rows_from_long_records(records: list[dict[str, Any]], headers: list[str]) -> list[SourceRow]:
    name_header = find_header(headers, NAME_ALIASES)
    brand_header = find_header(headers, BRAND_ALIASES)
    comp_header = find_header(headers, COMPONENT_NAME_ALIASES)
    value_header = find_header(headers, COMPONENT_VALUE_ALIASES)
    reg_header = find_header(headers, REGISTRATION_NO_ALIASES)

    if not name_header:
        raise SystemExit(f"사료명 열을 찾지 못했습니다. 헤더: {headers}")

    LOG.info(
        "세로형 데이터로 읽습니다 — 사료명=%s 업체=%s 성분명=%s 성분량=%s 등록번호=%s",
        name_header, brand_header, comp_header, value_header, reg_header,
    )

    grouped: dict[str, SourceRow] = {}
    unknown_components: set[str] = set()

    for record in records:
        name = str(record.get(name_header) or "").strip()
        if not name:
            continue
        brand = str(record.get(brand_header) or "").strip() if brand_header else ""
        reg_no = str(record.get(reg_header) or "").strip() if reg_header else ""
        group_key = reg_no or f"{brand}|{name}"

        row = grouped.get(group_key)
        if row is None:
            row = SourceRow(name=name, brand=brand, values={})
            grouped[group_key] = row

        component = str(record.get(comp_header) or "").strip()
        column = None
        key = normalize_key(component)
        for candidate, aliases in NUTRIENT_ALIASES.items():
            if any(key == normalize_key(alias) for alias in aliases):
                column = candidate
                break
        if column is None:
            if component:
                unknown_components.add(component)
            continue

        value, bound = parse_percent_bound(record.get(value_header))
        if value is None:
            continue
        row.values[column] = value
        row.bounds[column] = bound

    if unknown_components:
        # 칼슘·인처럼 우리가 쓰는 성분이 빠졌는지 확인할 수 있게 남긴다.
        LOG.info("매핑하지 않은 성분명: %s", ", ".join(sorted(unknown_components)[:20]))

    LOG.info("세로형 %d행 → 사료 %d건으로 묶음", len(records), len(grouped))
    return list(grouped.values())


def _rows_from_dicts(records: list[dict[str, Any]], headers: list[str]) -> list[SourceRow]:
    if is_long_format(headers):
        return _rows_from_long_records(records, headers)

    field_map = build_field_map(headers)
    name_header = find_header(headers, NAME_ALIASES)
    brand_header = find_header(headers, BRAND_ALIASES)

    if not name_header:
        raise SystemExit(
            f"제품명 열을 찾지 못했습니다. 헤더를 확인하세요: {headers}\n"
            f"열 이름이 다르면 NAME_ALIASES 에 추가하세요."
        )
    if not field_map:
        raise SystemExit(
            f"영양성분 열을 하나도 찾지 못했습니다. 헤더: {headers}\n"
            f"열 이름이 다르면 NUTRIENT_ALIASES 에 추가하세요."
        )

    LOG.info("열 매핑: 제품명=%s 업체=%s 성분=%s", name_header, brand_header, field_map)

    rows: list[SourceRow] = []
    for record in records:
        name = str(record.get(name_header) or "").strip()
        if not name:
            continue
        brand = str(record.get(brand_header) or "").strip() if brand_header else ""
        values: dict[str, float | None] = {}
        bounds: dict[str, BoundKind] = {}
        for header, column in field_map.items():
            value, bound = parse_percent_bound(record.get(header))
            values[column] = value
            bounds[column] = bound
        rows.append(SourceRow(name=name, brand=brand, values=values, bounds=bounds))
    return rows


def fetch_rows_from_api(api_url: str, service_key: str, page_size: int, max_pages: int) -> list[SourceRow]:
    import requests  # 지연 임포트 — 파일 모드에서는 필요 없다.

    records: list[dict[str, Any]] = []
    for page in range(1, max_pages + 1):
        params = {
            "serviceKey": service_key,
            "pageNo": page,
            "numOfRows": page_size,
            "type": "json",
            "returnType": "json",
        }
        response = requests.get(api_url, params=params, timeout=30)
        response.raise_for_status()
        try:
            payload = response.json()
        except ValueError:
            raise SystemExit(
                "JSON 이 아닌 응답입니다. 인증키가 잘못됐거나 XML 만 주는 API 일 수 있습니다.\n"
                f"응답 앞부분: {response.text[:300]}"
            )
        page_records = _extract_records(payload)
        if not page_records:
            break
        records.extend(page_records)
        LOG.info("%d 페이지 %d건 (누적 %d건)", page, len(page_records), len(records))
        if len(page_records) < page_size:
            break

    if not records:
        raise SystemExit("API 응답에서 데이터를 찾지 못했습니다. --api-url 과 인증키를 확인하세요.")
    headers = sorted({k for r in records for k in r.keys()})
    return _rows_from_dicts(records, headers)


# ---------------------------------------------------------------------------
# 제품 매칭
# ---------------------------------------------------------------------------
# 포함관계 매칭을 허용할 최소 키 길이.
#
# 너무 짧은 이름("육포1")은 아무 제품에나 걸려 오탐이 난다. 반대로 너무 길게 잡으면
# "강아지사료A"(7자) 같은 멀쩡한 이름까지 막힌다. 오탐의 실질적인 방어선은 길이가 아니라
# '후보가 유일할 때만 반영' 규칙이므로, 길이는 명백히 모호한 이름만 걸러내는 선에 둔다.
CONTAINMENT_MIN_KEY_LEN = 6


def match_key(text: str) -> str:
    """제품명 비교용 키 — 용량·수량·판촉 문구를 걷어낸다."""
    s = unicodedata.normalize("NFKC", text or "").lower()
    s = re.sub(r"\d+(\.\d+)?\s*(kg|g|ml|l|개입|개|팩|포|매|박스|box)", " ", s)
    s = re.sub(r"[^0-9a-z가-힣]", "", s)
    return s


def resolve_candidates(
    source_key: str,
    by_key: dict[str, list[tuple[str, str, str, bool]]],
) -> tuple[list[tuple[str, str, str, bool]], str]:
    """
    원본 제품명 키로 우리 제품을 찾는다.

    완전일치만 보면 거의 못 찾는다. 우리 제품명은 판매처 원문이라 맛·용량·수량이
    뒤에 붙어 있기 때문이다.
      DB     : "now 어덜트 ... 건식사료, 칠면조, 2kg, 1개"
      공공데이터: "now 어덜트 ... 건식사료"
    그래서 완전일치 → 포함관계 순으로 넓힌다. 다만 포함관계는 짧은 이름에서 엉뚱한
    제품을 물기 쉬워, 키가 충분히 길 때만 허용하고 후보가 둘 이상이면 사람에게 넘긴다.
    """
    exact = by_key.get(source_key)
    if exact:
        return exact, "완전일치"

    if len(source_key) < CONTAINMENT_MIN_KEY_LEN:
        return [], "이름이 짧아 포함검색 생략"

    matched: list[tuple[str, str, str, bool]] = []
    for product_key, entries in by_key.items():
        if len(product_key) < CONTAINMENT_MIN_KEY_LEN:
            continue
        if source_key in product_key or product_key in source_key:
            matched.extend(entries)
    return matched, "포함일치"


def assert_columns_nullable(conn) -> None:
    """
    등록성분 컬럼이 NULL 을 허용하는지 확인한다.

    원래 이 컬럼들은 NOT NULL DEFAULT 0.0 이었다. 그 상태로 이 스크립트를 돌리면
    값을 모르는 성분이 0 으로 채워져, 앱이 "칼슘 0%" 를 신고값으로 읽는다. 그래서
    마이그레이션(20260903120000_nutritional_profiles_allow_unknown)이 먼저 적용돼
    있어야 한다.
    """
    cur = conn.cursor()
    cur.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'nutritional_profiles'
          AND column_name = ANY(%s)
          AND (is_nullable = 'NO' OR column_default IS NOT NULL)
        """,
        (list(NUTRIENT_COLUMNS),),
    )
    offenders = [r[0] for r in cur.fetchall()]
    cur.close()
    if offenders:
        raise SystemExit(
            "중단: 다음 컬럼이 아직 NOT NULL 이거나 기본값이 있습니다 — "
            f"{', '.join(offenders)}\n"
            "이 상태로 넣으면 모르는 성분이 0 으로 저장돼 '칼슘 0%' 처럼 보입니다.\n"
            "먼저 supabase/migrations/20260903120000_nutritional_profiles_allow_unknown.sql "
            "을 적용하세요."
        )


def load_products(conn) -> list[tuple[str, str, str, bool]]:
    """(id, name, brand_name, 영양정보 있음) 목록."""
    cur = conn.cursor()
    cur.execute(
        """
        SELECT p.id::text, p.name, COALESCE(p.brand_name, ''),
               EXISTS (SELECT 1 FROM public.nutritional_profiles n WHERE n.product_id = p.id)
        FROM public.products p
        """
    )
    rows = cur.fetchall()
    cur.close()
    return rows


def run_self_test() -> int:
    """
    파싱 로직 자가검증 — `python scripts/import_pet_food_nutrition.py --self-test`.

    저장소에 파이썬 테스트 도구가 없어 스크립트 안에 넣었다. 운영 DB 에 값을 쓰는
    스크립트라, 고친 뒤에는 이걸 먼저 돌려 보라는 뜻이다.
    """
    failures: list[str] = []

    def check(label: str, actual: Any, expected: Any) -> None:
        if actual != expected:
            failures.append(f"{label}: {actual!r} != {expected!r}")

    # 보장 경계 파싱 — 지자체 데이터는 '30% 이하' 같은 문자열로 신고된다.
    check("30% 이하", parse_percent_bound("30% 이하"), (30.0, "max"))
    check("50% 이상", parse_percent_bound("50% 이상"), (50.0, "min"))
    check("20% 미만", parse_percent_bound("20% 미만"), (20.0, "max"))
    check("27", parse_percent_bound("27"), (27.0, "exact"))
    check("27.5%", parse_percent_bound("27.5%"), (27.5, "exact"))
    check("비공개", parse_percent_bound("비공개"), (None, "exact"))
    check("범위밖", parse_percent_bound("150% 이하")[0], None)

    # 열 이름 표기가 달라도 같은 컬럼으로 모인다.
    for headers in (
        ["제품명", "업체명", "조단백질(%)", "조지방(%)", "조섬유(%)", "조회분(%)", "수분(%)", "칼슘(%)", "인(%)"],
        ["productName", "brandName", "crudeProtein", "crudeFat", "crudeFiber", "crudeAsh", "moisture", "calcium", "phosphorus"],
        ["품명", "제조사", "조단백", "조 지방", "조섬유", "회분", "수분", "칼슘", "인산"],
    ):
        check(f"열매핑 {headers[2]}", len(set(build_field_map(headers).values())), 7)

    # 세로형 판별
    check("세로형 판별", is_long_format(["제조업체명", "사료명", "사료성분명", "사료성분량"]), True)
    check("가로형 판별", is_long_format(["제품명", "조단백질", "조지방"]), False)

    # 세로형 → 가로형 접기
    long_records = [
        {"제조업체명": "글리칸코드", "성분등록번호": "PP6EP0002", "사료명": "육포1", "사료성분명": "조단백질", "사료성분량": "50% 이상"},
        {"제조업체명": "글리칸코드", "성분등록번호": "PP6EP0002", "사료명": "육포1", "사료성분명": "조지방", "사료성분량": "30% 이하"},
        {"제조업체명": "행복사료", "성분등록번호": "PP6EP0003", "사료명": "사료A", "사료성분명": "조단백질", "사료성분량": "26% 이상"},
    ]
    folded = _rows_from_long_records(long_records, list(long_records[0].keys()))
    check("세로형 묶음 건수", len(folded), 2)
    check("세로형 값", folded[0].values.get("crude_protein"), 50.0)
    check("세로형 경계", folded[0].bounds.get("crude_fat"), "max")

    # 열량 — 화면 계산기(src/analysis/nutrition.ts)와 같은 식
    check("열량", calculate_kcal_per_100g(
        {"crude_protein": 27, "crude_fat": 13, "crude_fiber": 4.5, "crude_ash": 7.5, "moisture": 10}), 338.0)
    # 보장 경계가 섞이면 합이 100을 넘어 계산을 거부한다(단미사료에서 흔하다).
    check("열량(합>100)", calculate_kcal_per_100g(
        {"crude_protein": 50, "crude_fat": 30, "crude_fiber": 1, "crude_ash": 2, "moisture": 20}), None)
    check("열량(값없음)", calculate_kcal_per_100g(
        {"crude_protein": 27, "crude_fat": None, "crude_fiber": 4, "crude_ash": 7, "moisture": 10}), None)

    # 제품명 매칭 — 용량·수량은 무시하되, 짧은 이름은 포함검색을 하지 않는다.
    by_key = {match_key("행복사료 강아지사료A 2kg"): [("p", "행복사료 강아지사료A 2kg", "", False)]}
    check("포함일치", resolve_candidates(match_key("강아지사료A"), by_key)[0] != [], True)
    check("짧은이름 보호", resolve_candidates(match_key("육포1"), by_key)[0], [])

    if failures:
        for f in failures:
            print(f"FAIL {f}")
        print(f"\n실패 {len(failures)}건")
        return 1
    print("자가검증 통과")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--self-test", action="store_true", help="파싱 로직 자가검증만 하고 끝낸다")
    source.add_argument("--file", type=Path, help="공공데이터 CSV 또는 JSON 파일")
    source.add_argument("--api-url", help="공공데이터 오픈API 엔드포인트")
    parser.add_argument("--page-size", type=int, default=500)
    parser.add_argument("--max-pages", type=int, default=50)
    parser.add_argument("--apply", action="store_true", help="실제로 DB 에 쓴다 (기본은 미반영)")
    parser.add_argument("--overwrite", action="store_true", help="이미 영양정보가 있는 제품도 덮어쓴다")
    parser.add_argument("--report", type=Path, default=Path("./data/nutrition_import_report.csv"))
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s %(message)s",
    )
    if args.self_test:
        return run_self_test()

    if load_dotenv:
        for candidate in (".env", ".env.local"):
            if Path(candidate).exists():
                load_dotenv(candidate)

    # 1) 원본 읽기
    if args.file:
        if not args.file.exists():
            raise SystemExit(f"파일이 없습니다: {args.file}")
        rows = rows_from_json(args.file) if args.file.suffix.lower() == ".json" else rows_from_csv(args.file)
    else:
        key = os.environ.get("PUBLIC_DATA_SERVICE_KEY", "").strip()
        if not key:
            raise SystemExit("PUBLIC_DATA_SERVICE_KEY 환경변수가 필요합니다 (.env 에 넣으세요).")
        rows = fetch_rows_from_api(args.api_url, key, args.page_size, args.max_pages)

    LOG.info("원본 %d행", len(rows))

    # 2) 우리 제품과 매칭
    import psycopg2

    dsn = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        raise SystemExit("DATABASE_URL / SUPABASE_DB_URL 이 필요합니다.")
    conn = psycopg2.connect(dsn)
    conn.autocommit = False

    products = load_products(conn)
    LOG.info("DB 제품 %d건", len(products))

    by_key: dict[str, list[tuple[str, str, str, bool]]] = {}
    for pid, name, brand, has_nutrition in products:
        by_key.setdefault(match_key(name), []).append((pid, name, brand, has_nutrition))

    report: list[dict[str, Any]] = []
    writes: list[tuple[str, dict[str, float], float | None]] = []

    for row in rows:
        # 브랜드를 붙인 키를 먼저 보고, 안 되면 제품명만으로 본다.
        candidates, how = resolve_candidates(match_key(f"{row.brand} {row.name}"), by_key)
        if not candidates:
            candidates, how = resolve_candidates(match_key(row.name), by_key)

        if not candidates:
            report.append({"결과": "매칭실패", "원본제품명": row.name, "업체": row.brand, "사유": "이름이 맞는 제품 없음"})
            continue
        if len(candidates) > 1:
            names = ", ".join(c[1][:40] for c in candidates[:3])
            report.append({"결과": "보류", "원본제품명": row.name, "업체": row.brand,
                           "사유": f"후보 {len(candidates)}건({how}) — 사람이 확인 필요: {names}"})
            continue

        pid, pname, _brand, has_nutrition = candidates[0]
        if has_nutrition and not args.overwrite:
            report.append({"결과": "건너뜀", "원본제품명": row.name, "제품명": pname, "사유": "이미 영양정보 있음"})
            continue

        values = {c: row.values.get(c) for c in NUTRIENT_COLUMNS}
        missing_required = [c for c in REQUIRED_FOR_INSERT if values.get(c) is None]
        if missing_required:
            # 부분값을 0 으로 채우면 '단백질 0% 사료' 가 된다 — 없느니만 못하다.
            report.append({"결과": "제외", "원본제품명": row.name, "제품명": pname,
                           "사유": f"필수 성분 없음: {', '.join(missing_required)}"})
            continue

        present = {c: v for c, v in values.items() if v is not None}
        total = sum(present.get(c, 0.0) for c in REQUIRED_FOR_ENERGY if c in present)
        if total > 100:
            bounded_note = (
                " (보장 경계 '이상'/'이하' 가 섞여 합이 100을 넘음 — 단미사료에서 흔함)"
                if any(row.bounds.get(c) in ("min", "max") for c in REQUIRED_FOR_ENERGY) else ""
            )
            report.append({"결과": "제외", "원본제품명": row.name, "제품명": pname,
                           "사유": f"성분 합계 {total:.1f}% > 100{bounded_note}"})
            continue

        kcal = calculate_kcal_per_100g({c: present.get(c) for c in REQUIRED_FOR_ENERGY})

        # 보장 경계('이상'/'이하')로 신고된 값이 섞여 있으면 열량은 근사치다.
        # 최소치와 최대치를 함께 더하기 때문이다. 리포트에 그대로 드러낸다.
        bounded = [c for c in REQUIRED_FOR_ENERGY if row.bounds.get(c) in ("min", "max")]
        notes: list[str] = []
        if kcal is None:
            notes.append(
                f"열량 계산 불가(성분 합계 {total:.1f}%)" if total > 100 else "열량 계산 불가(성분 일부 없음)"
            )
        elif bounded:
            notes.append("열량은 보장 경계 기준 근사치")

        writes.append((pid, present, kcal))
        report.append({
            "결과": "반영대상", "원본제품명": row.name, "제품명": pname,
            "조단백": present.get("crude_protein"), "조지방": present.get("crude_fat"),
            "조섬유": present.get("crude_fiber"), "조회분": present.get("crude_ash"),
            "수분": present.get("moisture"), "칼슘": present.get("calcium"), "인": present.get("phosphorus"),
            "보장경계": " ".join(
                f"{c}={row.bounds[c]}" for c in NUTRIENT_COLUMNS if row.bounds.get(c) in ("min", "max")
            ),
            "계산kcal_100g": kcal,
            "사유": " · ".join(notes),
        })

    # 3) 리포트
    args.report.parent.mkdir(parents=True, exist_ok=True)
    columns = ["결과", "원본제품명", "업체", "제품명", "조단백", "조지방", "조섬유",
               "조회분", "수분", "칼슘", "인", "보장경계", "계산kcal_100g", "사유"]
    with args.report.open("w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(report)

    counts: dict[str, int] = {}
    for r in report:
        counts[r["결과"]] = counts.get(r["결과"], 0) + 1
    LOG.info("결과: %s", counts)
    LOG.info("리포트: %s", args.report)

    if not args.apply:
        LOG.info("미반영(dry-run)입니다. 리포트를 확인한 뒤 --apply 를 붙여 실행하세요.")
        conn.close()
        return 0

    # 4) 반영 — 스키마가 '모름'을 담을 수 있는 상태인지 먼저 확인한다.
    assert_columns_nullable(conn)
    cur = conn.cursor()
    applied = 0
    for pid, present, kcal in writes:
        cols = list(present.keys())
        cur.execute("DELETE FROM public.nutritional_profiles WHERE product_id = %s", (pid,))
        cur.execute(
            f"INSERT INTO public.nutritional_profiles (product_id, {', '.join(cols)}) "
            f"VALUES (%s, {', '.join(['%s'] * len(cols))})",
            [pid, *[present[c] for c in cols]],
        )
        if kcal is not None:
            cur.execute("UPDATE public.products SET kcal_per_100g = %s WHERE id = %s", (kcal, pid))
        applied += 1
    conn.commit()
    cur.close()
    conn.close()
    LOG.info("반영 완료: %d건", applied)
    return 0


if __name__ == "__main__":
    sys.exit(main())
