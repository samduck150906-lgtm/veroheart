#!/usr/bin/env python3
"""
농림축산식품부·국립농산물품질관리원 사료검정 정보 CSV (+ feedRawMaterial.zip 내 CSV) →
Supabase(PostgreSQL) `products` / `ingredients` / `product_ingredients` 일괄 적재.

사용 예:
  python scripts/bulk_import_mafra_feed_inspection.py \\
    --csv "./data/농림축산식품부+국립농산물품질관리원_사료검정+정보_20260317.csv" \\
    --zip "./data/feedRawMaterial.zip"

환경 변수 (프로젝트 루트 .env 또는 .env.local 자동 로드):
  - DATABASE_URL 또는 SUPABASE_DB_URL: postgresql://... (직접 INSERT, RLS 우회·권장)
  - 없으면: VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 로 PostgREST JSON 삽입

  --dry-run: DB에 쓰지 않고 필터·매핑 건수만 출력
"""

from __future__ import annotations

import argparse
import csv
import io
import logging
import os
import re
import sys
import uuid
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterator

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None  # type: ignore[misc, assignment]

# ---------------------------------------------------------------------------
# 인코딩: UTF-8 / CP949 / EUC-KR 순으로 시도
# ---------------------------------------------------------------------------

ENCODING_CANDIDATES = ("utf-8-sig", "utf-8", "cp949", "euc-kr")


def read_text_file(path: Path) -> str:
    raw = path.read_bytes()
    last_err: Exception | None = None
    for enc in ENCODING_CANDIDATES:
        try:
            return raw.decode(enc)
        except UnicodeDecodeError as e:
            last_err = e
    raise UnicodeDecodeError(
        "unknown", b"", 0, 1, f"디코딩 실패 ({path}): {last_err}"
    ) from last_err


def sniff_encoding_from_bytes(raw: bytes) -> str:
    for enc in ENCODING_CANDIDATES:
        try:
            raw.decode(enc)
            return enc
        except UnicodeDecodeError:
            continue
    return "utf-8"


# ---------------------------------------------------------------------------
# 반려동물 행만 (축종/용도 등에 키워드 포함)
# ---------------------------------------------------------------------------

PET_FILTER_KEYWORDS = ("애완", "개", "고양이", "반려")


def row_matches_pet_filter(text: str | None) -> bool:
    if not text or not str(text).strip():
        return False
    t = str(text)
    return any(k in t for k in PET_FILTER_KEYWORDS)


# ---------------------------------------------------------------------------
# 열 이름 유연 매핑 (공공데이터 배포마다 표기가 조금씩 다를 수 있음)
# ---------------------------------------------------------------------------

NAME_ALIASES_PRODUCT = (
    "제품명",
    "품명",
    "사료명",
    "제 품 명",
    "제품 명",
)
NAME_ALIASES_COMPANY = (
    "업체명",
    "업체 명",
    "제조업체명",
    "제조업체",
    "회사명",
    "업소명",
    "신청인",
)
NAME_ALIASES_INGREDIENTS = (
    "사용한 원료(성분)",
    "사용한원료(성분)",
    "사용원료",
    "원료(성분)",
    "원료 및 성분",
    "원료성분",
    "배합원료",
    "주원료",
    "표시사항(원료)",
)
NAME_ALIASES_TARGET = (
    "대상 동물",
    "대상동물",
    "축종",
    "용도",
    "급여대상",
    "대상",
    "사료구분",
    "품목(용도)",
    "검정품목",
)


def _norm_header(s: str) -> str:
    return re.sub(r"\s+", "", (s or "").strip().replace("\ufeff", ""))


def _pick_column(headers: list[str], aliases: tuple[str, ...]) -> str | None:
    norm_map = {_norm_header(h): h for h in headers}
    for a in aliases:
        key = _norm_header(a)
        if key in norm_map:
            return norm_map[key]
    # 부분 일치 (예: '제품명(국문)' 등)
    for h in headers:
        hn = _norm_header(h)
        for a in aliases:
            if _norm_header(a) in hn:
                return h
    return None


def _target_columns_for_filter(headers: list[str]) -> list[str]:
    """필터에 쓸 수 있는 모든 후보 열."""
    cols: list[str] = []
    for h in headers:
        hn = _norm_header(h)
        if any(_norm_header(a) in hn for a in NAME_ALIASES_TARGET):
            cols.append(h)
    # 별칭으로 직접 찾은 열
    direct = _pick_column(headers, NAME_ALIASES_TARGET)
    if direct and direct not in cols:
        cols.insert(0, direct)
    if not cols:
        # 마지막 수단: 흔한 키워드가 들어간 열 이름
        for h in headers:
            if any(x in h for x in ("축종", "용도", "대상", "급여", "애완", "반려")):
                cols.append(h)
    return cols


def target_pet_type_from_text(text: str | None) -> str:
    """앱 스키마: dog | cat | all (인천 import 스크립트와 유사 규칙)"""
    if not text:
        return "all"
    t = (text or "").replace(" ", "")
    has_cat = "고양이" in t
    has_dog = "개" in t  # 필터 단계에서 가축-only 행은 제외된다고 가정
    if has_cat and has_dog:
        return "all"
    if has_cat:
        return "cat"
    if has_dog or "견" in t or "애완견" in t:
        return "dog"
    return "all"


def split_ingredient_names(raw: str | None) -> list[str]:
    if raw is None:
        return []
    s = str(raw).strip()
    if not s or s.lower() in ("null", "none", "-", "n/a"):
        return []
    parts = re.split(r"[,;/|]\s*|\s+[\n\r]+\s*", s)
    out: list[str] = []
    for p in parts:
        x = p.strip()
        if len(x) >= 1 and x not in out:
            out.append(x)
    return out


def stable_product_id(brand: str, product_name: str) -> uuid.UUID:
    seed = f"mafra-feed-inspection|{brand.strip()}|{product_name.strip()}"
    return uuid.uuid5(uuid.NAMESPACE_URL, seed)


# ---------------------------------------------------------------------------
# DB 적재
# ---------------------------------------------------------------------------

PLACEHOLDER_IMG = (
    "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80"
)


@dataclass
class MappedRow:
    product_id: uuid.UUID
    name: str
    brand_name: str
    manufacturer_name: str
    target_pet_type: str
    ingredients: list[str]
    source_file: str
    source_line: int


def map_csv_row(
    row: dict[str, str],
    headers: list[str],
    col_product: str,
    col_company: str,
    col_ingredients: str,
    col_targets: list[str],
    source_file: str,
    line_no: int,
    log: logging.Logger,
) -> MappedRow | None:
    try:
        pname = (row.get(col_product) or "").strip()
        company = (row.get(col_company) or "").strip()
        if not pname or not company:
            log.warning("[%s:%s] 제품명 또는 업체명 누락 — 건너뜀", source_file, line_no)
            return None

        target_blob = " ".join(
            (row.get(c) or "").strip() for c in col_targets if c in row
        )
        if not row_matches_pet_filter(target_blob):
            return None

        ing_raw = row.get(col_ingredients)
        ingredients = split_ingredient_names(ing_raw)
        pid = stable_product_id(company, pname)
        pet = target_pet_type_from_text(target_blob)

        return MappedRow(
            product_id=pid,
            name=pname,
            brand_name=company,
            manufacturer_name=company,
            target_pet_type=pet,
            ingredients=ingredients,
            source_file=source_file,
            source_line=line_no,
        )
    except Exception as e:
        log.exception("[%s:%s] 매핑 오류: %s", source_file, line_no, e)
        return None


def load_rows_from_csv_text(
    content: str,
    source_label: str,
    log: logging.Logger,
) -> tuple[list[MappedRow], dict[str, Any]]:
    stream = io.StringIO(content)
    reader = csv.DictReader(stream)
    headers = [h.strip() if h else "" for h in (reader.fieldnames or [])]

    col_product = _pick_column(headers, NAME_ALIASES_PRODUCT)
    col_company = _pick_column(headers, NAME_ALIASES_COMPANY)
    col_ingredients = _pick_column(headers, NAME_ALIASES_INGREDIENTS)
    col_targets = _target_columns_for_filter(headers)

    meta = {
        "headers": headers,
        "col_product": col_product,
        "col_company": col_company,
        "col_ingredients": col_ingredients,
        "col_targets": col_targets,
    }

    if not col_product or not col_company:
        log.error(
            "[%s] 필수 열을 찾지 못했습니다. 제품명열=%s 업체명열=%s (헤더: %s)",
            source_label,
            col_product,
            col_company,
            headers,
        )
        return [], meta

    if not col_ingredients:
        log.warning(
            "[%s] 원료/성분 열을 자동 인식하지 못했습니다. 헤더를 확인하세요: %s",
            source_label,
            headers,
        )

    out: list[MappedRow] = []
    stream.seek(0)
    reader = csv.DictReader(stream)
    for line_no, row in enumerate(reader, start=2):
        try:
            clean = {k: (v if v is not None else "") for k, v in row.items()}
            if not col_ingredients:
                mr = None
            else:
                mr = map_csv_row(
                    clean,
                    headers,
                    col_product,
                    col_company,
                    col_ingredients,
                    col_targets,
                    source_label,
                    line_no,
                    log,
                )
            if mr is not None:
                out.append(mr)
        except Exception as e:
            log.exception("[%s:%s] 행 처리 중 오류(건너뜀): %s", source_label, line_no, e)
    return out, meta


def iter_zip_csvs(zip_path: Path, log: logging.Logger) -> Iterator[tuple[str, str]]:
    with zipfile.ZipFile(zip_path, "r") as zf:
        for info in zf.infolist():
            if info.is_dir():
                continue
            n = info.filename
            if "__MACOSX" in n or n.startswith("."):
                continue
            if not n.lower().endswith(".csv"):
                continue
            try:
                raw = zf.read(info)
                enc = sniff_encoding_from_bytes(raw)
                text = raw.decode(enc)
            except Exception as e:
                log.error("ZIP 내 파일 읽기 실패 %s: %s", n, e)
                continue
            yield n, text


def load_dotenv_files() -> None:
    if not load_dotenv:
        return
    root = Path(__file__).resolve().parent.parent
    for name in (".env.local", ".env"):
        p = root / name
        if p.is_file():
            load_dotenv(p)


# --- psycopg2 path ---------------------------------------------------------

def merge_mapped_rows(rows: list[MappedRow]) -> list[MappedRow]:
    """동일 제품(브랜드+품명 → UUID)이 여러 파일/행에 있으면 성분 목록을 합칩니다."""
    by_id: dict[uuid.UUID, MappedRow] = {}
    for mr in rows:
        cur = by_id.get(mr.product_id)
        if cur is None:
            by_id[mr.product_id] = mr
            continue
        seen = set(cur.ingredients)
        for x in mr.ingredients:
            if x not in seen:
                cur.ingredients.append(x)
                seen.add(x)
    return list(by_id.values())


def insert_via_psycopg2(rows: list[MappedRow], log: logging.Logger) -> None:
    import psycopg2
    from psycopg2.extras import execute_batch

    dsn = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        raise RuntimeError("DATABASE_URL / SUPABASE_DB_URL 없음")

    conn = psycopg2.connect(dsn)
    conn.autocommit = False
    cur = conn.cursor()

    product_sql = """
        INSERT INTO public.products (
            id, name, brand_name, manufacturer_name,
            product_type, target_pet_type,
            main_category, sub_category,
            min_price, image_url,
            verification_status,
            avg_rating, review_count
        ) VALUES (
            %s, %s, %s, %s,
            'food', %s,
            '사료', %s,
            0, %s,
            'pending',
            0, 0
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            brand_name = EXCLUDED.brand_name,
            manufacturer_name = EXCLUDED.manufacturer_name,
            target_pet_type = EXCLUDED.target_pet_type,
            sub_category = EXCLUDED.sub_category
    """

    ingredient_sql = """
        INSERT INTO public.ingredients (name_ko, risk_level)
        VALUES (%s, 'safe')
        ON CONFLICT (name_ko) DO UPDATE SET name_ko = EXCLUDED.name_ko
        RETURNING id
    """

    link_sql = """
        INSERT INTO public.product_ingredients (product_id, ingredient_id, sort_order)
        VALUES (%s, %s, %s)
        ON CONFLICT (product_id, ingredient_id) DO NOTHING
    """

    product_batch: list[tuple[Any, ...]] = []
    for mr in rows:
        try:
            sub = f"공공데이터(사료검정) · {mr.source_file} · line {mr.source_line}"
            product_batch.append(
                (
                    str(mr.product_id),
                    mr.name,
                    mr.brand_name,
                    mr.manufacturer_name,
                    mr.target_pet_type,
                    sub[:500],
                    PLACEHOLDER_IMG,
                )
            )
        except Exception as e:
            log.exception("제품 배치 준비 실패 %s: %s", mr.product_id, e)

    try:
        try:
            execute_batch(cur, product_sql, product_batch, page_size=100)
        except Exception as e:
            log.exception("제품 execute_batch 실패(개별 시도로 폴백): %s", e)
            for tup in product_batch:
                try:
                    cur.execute(product_sql, tup)
                except Exception as e2:
                    log.exception("제품 INSERT 실패 row=%s: %s", tup[0], e2)

        for mr in rows:
            for order, ing_name in enumerate(mr.ingredients):
                try:
                    if not ing_name or len(ing_name) > 500:
                        log.warning(
                            "성분명 스킵(비어있거나 너무 김) product=%s order=%s",
                            mr.product_id,
                            order,
                        )
                        continue
                    cur.execute(ingredient_sql, (ing_name,))
                    r = cur.fetchone()
                    if not r:
                        continue
                    ing_id = r[0]
                    cur.execute(
                        link_sql, (str(mr.product_id), str(ing_id), order)
                    )
                except Exception as e:
                    log.exception(
                        "성분/연결 실패 product=%s ingredient=%s: %s",
                        mr.product_id,
                        ing_name,
                        e,
                    )
        conn.commit()
        log.info("psycopg2 커밋 완료 (제품 %s건)", len(product_batch))
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


# --- Supabase REST fallback ------------------------------------------------

def insert_via_supabase_rest(rows: list[MappedRow], log: logging.Logger) -> None:
    import requests

    url = (os.environ.get("VITE_SUPABASE_URL") or os.environ.get("SUPABASE_URL") or "").rstrip(
        "/"
    )
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get(
        "VITE_SUPABASE_ANON_KEY"
    )
    if not url or not key:
        raise RuntimeError("VITE_SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY 필요")

    api = f"{url}/rest/v1"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal,resolution=merge-duplicates",
    }

    for mr in rows:
        try:
            sub = f"공공데이터(사료검정) · {mr.source_file} · line {mr.source_line}"
            payload = {
                "id": str(mr.product_id),
                "name": mr.name,
                "brand_name": mr.brand_name,
                "manufacturer_name": mr.manufacturer_name,
                "product_type": "food",
                "target_pet_type": mr.target_pet_type,
                "main_category": "사료",
                "sub_category": sub[:500],
                "min_price": 0,
                "image_url": PLACEHOLDER_IMG,
                "verification_status": "pending",
                "avg_rating": 0,
                "review_count": 0,
            }
            r = requests.post(f"{api}/products", headers=headers, json=payload, timeout=60)
            if r.status_code not in (200, 201):
                log.error("products POST 실패 %s: %s", mr.product_id, r.text)
                continue
        except Exception as e:
            log.exception("products REST 오류 %s: %s", mr.product_id, e)
            continue

        for order, ing_name in enumerate(mr.ingredients):
            try:
                if not ing_name or len(ing_name) > 500:
                    continue
                gr = requests.get(
                    f"{api}/ingredients",
                    headers=headers,
                    params={"name_ko": f"eq.{ing_name}", "select": "id"},
                    timeout=30,
                )
                gr.raise_for_status()
                js = gr.json()
                if js and len(js) > 0:
                    ing_id = js[0]["id"]
                else:
                    cr = requests.post(
                        f"{api}/ingredients",
                        headers={**headers, "Prefer": "return=representation"},
                        json={"name_ko": ing_name, "risk_level": "safe"},
                        timeout=30,
                    )
                    if cr.status_code not in (200, 201):
                        log.error("ingredient 생성 실패 %s: %s", ing_name, cr.text)
                        continue
                    body = cr.json()
                    ing_id = body[0]["id"] if isinstance(body, list) else body.get("id")

                lr = requests.post(
                    f"{api}/product_ingredients",
                    headers=headers,
                    json={
                        "product_id": str(mr.product_id),
                        "ingredient_id": str(ing_id),
                        "sort_order": order,
                    },
                    timeout=30,
                )
                if lr.status_code not in (200, 201) and lr.status_code != 409:
                    log.error("product_ingredients POST 실패: %s", lr.text)
            except Exception as e:
                log.exception(
                    "성분 REST 오류 product=%s ing=%s: %s",
                    mr.product_id,
                    ing_name,
                    e,
                )


def main() -> int:
    parser = argparse.ArgumentParser(description="사료검정 공공데이터 → Supabase 벌크 적재")
    parser.add_argument("--csv", action="append", default=[], help="CSV 파일 경로 (여러 번 지정 가능)")
    parser.add_argument("--zip", action="append", default=[], help="ZIP(내부 CSV 병합) 경로")
    parser.add_argument("--dry-run", action="store_true", help="DB 쓰기 없이 통계만")
    parser.add_argument(
        "--log-file",
        default="",
        help="추가 로그 파일 (예: import_errors.log)",
    )
    args = parser.parse_args()

    log = logging.getLogger("mafra_import")
    log.setLevel(logging.INFO)
    h = logging.StreamHandler(sys.stdout)
    h.setFormatter(logging.Formatter("%(levelname)s %(message)s"))
    log.addHandler(h)
    if args.log_file:
        fh = logging.FileHandler(args.log_file, encoding="utf-8")
        fh.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)s %(message)s")
        )
        log.addHandler(fh)

    load_dotenv_files()

    all_rows: list[MappedRow] = []
    file_reports: list[tuple[str, dict[str, Any], int]] = []

    for csv_arg in args.csv:
        p = Path(csv_arg).expanduser().resolve()
        if not p.is_file():
            log.error("CSV 없음: %s", p)
            continue
        try:
            text = read_text_file(p)
            mapped, meta = load_rows_from_csv_text(text, str(p), log)
            all_rows.extend(mapped)
            file_reports.append((str(p), meta, len(mapped)))
        except Exception as e:
            log.exception("CSV 읽기 실패 %s: %s", p, e)

    for zip_arg in args.zip:
        zp = Path(zip_arg).expanduser().resolve()
        if not zp.is_file():
            log.error("ZIP 없음: %s", zp)
            continue
        try:
            for inner_name, text in iter_zip_csvs(zp, log):
                label = f"{zp}!{inner_name}"
                mapped, meta = load_rows_from_csv_text(text, label, log)
                all_rows.extend(mapped)
                file_reports.append((label, meta, len(mapped)))
        except Exception as e:
            log.exception("ZIP 처리 실패 %s: %s", zp, e)

    log.info("--- 파일별 요약 ---")
    for path, meta, cnt in file_reports:
        log.info(
            "%s → 반려필터 매핑 %s건 (제품열=%s 업체열=%s 원료열=%s)",
            path,
            cnt,
            meta.get("col_product"),
            meta.get("col_company"),
            meta.get("col_ingredients"),
        )
    log.info("총 매핑 행: %s", len(all_rows))

    if args.dry_run:
        log.info("dry-run 이므로 DB 미적재")
        return 0

    merged = merge_mapped_rows(all_rows)
    log.info("병합 후 제품 건수: %s (원본 매핑 행 %s)", len(merged), len(all_rows))

    if not merged:
        log.warning("적재할 행이 없습니다. 열 이름·필터 조건을 확인하세요.")
        return 1

    try:
        if os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL"):
            insert_via_psycopg2(merged, log)
        else:
            insert_via_supabase_rest(merged, log)
    except Exception as e:
        log.exception("DB 적재 단계 실패: %s", e)
        return 1

    log.info("완료")
    return 0


if __name__ == "__main__":
    sys.exit(main())
