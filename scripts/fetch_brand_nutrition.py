#!/usr/bin/env python3
"""
브랜드 공식몰에서 등록성분을 읽어 nutritional_profiles 에 채운다.

    pip install playwright && python -m playwright install chromium   # 최초 1회

    # 1) 브랜드 제품목록 페이지 주소를 넣고 미리보기 (DB 미반영)
    python scripts/fetch_brand_nutrition.py --brand 하림펫푸드 --list-url "https://..."

    # 2) 리포트가 납득되면 반영
    python scripts/fetch_brand_nutrition.py --brand 하림펫푸드 --list-url "https://..." --apply

    # 3) 잘 되는 주소는 scripts/brand_sites.json 에 적어 두고 한꺼번에
    python scripts/fetch_brand_nutrition.py --config scripts/brand_sites.json

왜 쿠팡이 아니라 브랜드 공식몰인가
    쿠팡 상세페이지는 CDN(Akamai) 단에서 자동 접근을 막는다 — 진짜 브라우저로 열어도
    Access Denied 였다. 뚫는 대신 성분표를 공개해 둔 곳으로 간다. 브랜드 공식몰은
    성분표를 글자로 올려두는 경우가 많고, 그 정도 차단도 없다.

매칭 — 여기가 이 스크립트에서 제일 조심스러운 부분이다
    공식몰 제품명과 우리 DB 제품명은 표기가 다르다. 그래서 한 브랜드 안에서만 맞춘다.
    '하림펫푸드' 13건 대 공식몰 제품들끼리 맞추는 문제라 범위가 좁고, 후보가 둘 이상이면
    합치지 않고 사람이 보도록 보류한다. 이름이 애매한데 값을 넣는 것보다 비워 두는 게 낫다.

안전장치 — fetch_coupang_nutrition.py 와 같다
    - 미리보기가 기본. --apply 없이는 DB 에 쓰지 않는다.
    - 조단백질·조지방이 없으면 넣지 않는다. 부분값을 0 으로 채우면 '단백질 0% 사료'가 된다.
    - 이미 영양정보가 있는 제품은 건드리지 않는다(--overwrite 로만).
    - 받아온 HTML 을 캐시에 남긴다. 파싱을 고칠 때 다시 받지 않아도 된다.
    - 브랜드 사이트의 이용약관·robots 정책은 실행 전에 직접 확인하시라.

환경 변수 (.env)
    DATABASE_URL 또는 SUPABASE_DB_URL : postgresql://...
"""
from __future__ import annotations

import argparse
import csv
import json
import logging
import os
import random
import re
import sys
import time
import urllib.parse
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from import_pet_food_nutrition import (  # noqa: E402
    NUTRIENT_COLUMNS,
    REQUIRED_FOR_ENERGY,
    REQUIRED_FOR_INSERT,
    assert_columns_nullable,
    calculate_kcal_per_100g,
    match_key,
    resolve_candidates,
)

# 파서와 브라우저는 쿠팡 스크립트와 같은 것을 쓴다. 페이지를 받아 표에서 성분을 찾는
# 일은 어느 사이트든 똑같아서, 두 벌로 나눠 두면 한쪽만 고쳐지는 사고가 난다.
from fetch_coupang_nutrition import (  # noqa: E402
    REPORT_COLUMNS,
    BrowserFetcher,
    find_nutrients,
    looks_blocked,
)

LOG = logging.getLogger("fetch_brand_nutrition")

# 제품 페이지가 아닌 게 뻔한 주소 — 목록에서 걸러낸다.
NON_PRODUCT_HINTS = (
    "login", "join", "member", "cart", "order", "mypage", "board", "notice",
    "faq", "qna", "review", "search", "policy", "privacy", "terms", "sitemap",
    "javascript:", "mailto:", "tel:", "#",
)

# 제품 '상세' 주소의 모양. 하나라도 맞으면 제품 페이지로 본다.
#
# 처음엔 주소에 '/product' 가 들어가면 제품으로 봤는데, 그건 틀렸다. 쇼핑몰들은
# 목록 페이지 주소에도 /product/ 를 쓴다(하림펫푸드: /product/list.html?cate_no=301,
# /product/event7_list.html). 그래서 261개를 뽑아 놓고 앞 40개가 전부 상단 메뉴였다.
# 지금은 '상세 페이지에는 제품 번호가 들어간다'는 것만 근거로 삼는다.
PRODUCT_DETAIL_PATTERNS = (
    re.compile(r"/product/[^/]+/\d+/", re.I),          # Cafe24 주소: /product/이름/1623/...
    re.compile(r"[?&]product_no=\d+", re.I),           # Cafe24 예전 주소
    re.compile(r"/product/detail", re.I),
    re.compile(r"/goods/(?:view|detail)", re.I),
    re.compile(r"[?&](?:goodsno|goods_no|prodno|prod_no|itemid)=\d+", re.I),
    re.compile(r"/(?:item|products?)/\d+", re.I),
)

# 목록·안내 페이지 주소. 제품 번호가 없어 위 규칙에 걸리지 않지만, 명시해 두는 편이 낫다.
LIST_PAGE_RE = re.compile(r"/[^/]*list[^/]*\.html", re.I)


def product_key(url: str) -> str:
    """
    같은 제품의 다른 주소를 하나로 본다.

    Cafe24 는 같은 제품을 카테고리마다 다른 주소로 내놓는다
    (.../1623/category/36/... 과 .../1623/category/24/...). 제품 번호가 같으면
    같은 제품이므로, 번호를 찾을 수 있으면 그걸 열쇠로 쓴다.
    """
    for pattern in (r"/product/[^/]+/(\d+)/", r"[?&]product_no=(\d+)",
                    r"[?&](?:goodsno|goods_no|prodno|prod_no)=(\d+)", r"/(?:item|products?)/(\d+)"):
        match = re.search(pattern, url, re.I)
        if match:
            return match.group(1)
    return url


def page_title(raw_html: str) -> str:
    """페이지가 말하는 제품명. og:title 을 먼저 보고, 없으면 <title> 을 쓴다."""
    for pattern in (
        r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:title["\']',
        r"<title[^>]*>(.*?)</title>",
        r"<h1[^>]*>(.*?)</h1>",
    ):
        match = re.search(pattern, raw_html, re.I | re.S)
        if match:
            title = re.sub(r"<[^>]+>", " ", match.group(1))
            title = re.sub(r"\s+", " ", title).strip()
            if title:
                return title
    return ""


def collect_product_links(html: str, base_url: str, link_pattern: str | None) -> list[str]:
    """
    목록 페이지에서 제품 상세 주소를 뽑는다.

    사이트마다 구조가 달라 CSS 선택자를 미리 알 수 없다. 그래서 같은 도메인의 링크 중
    제품 주소처럼 생긴 것만 남긴다. 잘 안 걸리면 --link-pattern 으로 직접 지정하면 된다.
    """
    base = urllib.parse.urlparse(base_url)
    found: list[str] = []
    seen: set[str] = set()

    for href in re.findall(r'<a[^>]+href=["\']([^"\']+)["\']', html, re.I):
        raw = href.strip()
        low = raw.lower()
        if any(hint in low for hint in NON_PRODUCT_HINTS):
            continue

        absolute = urllib.parse.urljoin(base_url, raw)
        parsed = urllib.parse.urlparse(absolute)
        if parsed.scheme not in ("http", "https") or parsed.netloc != base.netloc:
            continue

        if link_pattern:
            if link_pattern not in absolute:
                continue
        else:
            if LIST_PAGE_RE.search(urllib.parse.urlparse(absolute).path):
                continue
            if not any(pattern.search(absolute) for pattern in PRODUCT_DETAIL_PATTERNS):
                continue

        key = product_key(absolute)
        if key in seen:
            continue
        seen.add(key)
        found.append(absolute)

    return found


def load_brand_products(conn, brand: str, overwrite: bool) -> list[tuple[str, str]]:
    """(id, name) — 그 브랜드에서 영양정보가 없는 제품만."""
    cur = conn.cursor()
    cur.execute(
        """
        SELECT p.id::text, p.name
        FROM public.products p
        WHERE p.brand_name = %s
          AND (%s OR NOT EXISTS (SELECT 1 FROM public.nutritional_profiles n WHERE n.product_id = p.id))
        ORDER BY p.name
        """,
        (brand, overwrite),
    )
    rows = cur.fetchall()
    cur.close()
    return rows


def cache_path(cache_dir: Path, url: str) -> Path:
    """주소 하나당 파일 하나. 파일명에 못 쓰는 글자는 바꾼다."""
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", url)[-120:]
    return cache_dir / f"{safe}.html"


def run_self_test() -> int:
    """네트워크 없이 확인할 수 있는 것만 — 파싱 자체는 쿠팡 스크립트의 --self-test 가 본다."""
    failures: list[str] = []

    def check(label: str, actual: Any, expected: Any) -> None:
        if actual != expected:
            failures.append(f"{label}: {actual!r} != {expected!r}")

    # 하림펫푸드 공식몰에서 실제로 나온 주소들이다. 목록 페이지에도 /product/ 가 들어가서
    # 처음엔 261개 중 앞 40개가 전부 메뉴였다 — 그 실수를 여기서 고정해 둔다.
    listing = """
    <html><body>
      <a href="/product/event7_list.html">이벤트</a>
      <a href="/product/list_cal_dog.html">칼로리 안내</a>
      <a href="/product/list.html?cate_no=301">빠른배송</a>
      <a href="/product/더리얼-밀-강아지-화식-모음/1623/category/36/display/1/">더리얼 밀</a>
      <a href="/product/더리얼-밀-강아지-화식-모음/1623/category/24/display/1/">같은 제품 다른 카테고리</a>
      <a href="/product/detail.html?product_no=77">예전 주소</a>
      <a href="/member/login.html">로그인</a>
      <a href="https://other-site.com/product/9/">다른 사이트</a>
    </body></html>
    """
    links = collect_product_links(listing, "https://brand.example/list", None)
    check(
        "목록페이지는 빼고 제품 상세만",
        links,
        ["https://brand.example/product/더리얼-밀-강아지-화식-모음/1623/category/36/display/1/",
         "https://brand.example/product/detail.html?product_no=77"],
    )
    check("같은 제품 번호는 한 번만",
          product_key("https://x/product/a/1623/category/36/"),
          product_key("https://x/product/a/1623/category/24/"))

    check(
        "og:title 우선",
        page_title('<html><head><meta property="og:title" content="더리얼 오븐베이크드 2kg">'
                   "<title>하림펫푸드 공식몰</title></head></html>"),
        "더리얼 오븐베이크드 2kg",
    )
    check("title 폴백", page_title("<html><head><title> 밥이보약  오리 </title></head></html>"),
          "밥이보약 오리")
    check("제목 없음", page_title("<html><body>내용만</body></html>"), "")

    for line in failures:
        print(f"실패 {line}")
    if failures:
        return 1
    print("자가검증 통과")
    return 0


def brand_jobs(args: argparse.Namespace) -> list[tuple[str, list[str], str | None]]:
    """(브랜드, 목록주소들, 링크패턴) 목록 — --config 와 --brand 를 같은 모양으로 만든다."""
    if args.config:
        config = json.loads(Path(args.config).read_text(encoding="utf-8"))
        # '_' 로 시작하는 키는 설명·메모다. 주소를 아직 안 채운 브랜드는 건너뛴다.
        jobs = [
            (brand, entry.get("list_urls") or [], entry.get("link_pattern"))
            for brand, entry in config.items()
            if not brand.startswith("_") and isinstance(entry, dict)
        ]
        ready = [job for job in jobs if job[1]]
        skipped = [job[0] for job in jobs if not job[1]]
        if skipped:
            LOG.info("주소가 비어 건너뜁니다: %s", ", ".join(skipped))
        if not ready:
            raise SystemExit(
                f"{args.config} 에 목록 페이지 주소가 하나도 없습니다. "
                "브라우저에서 브랜드 공식몰의 '전체 제품' 페이지를 열고 주소를 복사해 넣으세요."
            )
        return ready
    if not args.brand or not args.list_url:
        raise SystemExit("--brand 와 --list-url 을 함께 주거나, --config 를 주세요.")
    return [(args.brand, list(args.list_url), args.link_pattern)]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--self-test", action="store_true", help="네트워크 없이 링크추출·제목추출을 검증한다")
    parser.add_argument("--brand", help="우리 DB 의 brand_name 과 같아야 한다 (예: 하림펫푸드)")
    parser.add_argument("--list-url", action="append", help="브랜드 제품목록 페이지 주소 (여러 번 줄 수 있음)")
    parser.add_argument("--link-pattern", help="제품 상세 주소에 반드시 들어가는 조각 (자동 판별이 안 될 때)")
    parser.add_argument("--config", help="브랜드별 주소를 적어 둔 JSON")
    parser.add_argument("--apply", action="store_true", help="실제로 DB 에 쓴다 (기본은 미반영)")
    parser.add_argument("--overwrite", action="store_true", help="이미 영양정보가 있는 제품도 다시 받는다")
    parser.add_argument("--max-products", type=int, default=200, help="브랜드당 열어 볼 제품 페이지 수 상한")
    parser.add_argument("--delay", type=float, default=2.0, help="요청 간격(초). 기본 2초")
    parser.add_argument("--timeout", type=int, default=30)
    parser.add_argument("--show-browser", action="store_true", help="브라우저 창을 띄워 진행을 눈으로 본다")
    parser.add_argument("--cache", type=Path, default=Path("./data/brand_cache"))
    parser.add_argument("--report", type=Path, default=Path("./data/brand_nutrition_report.csv"))
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s %(message)s",
    )

    if args.self_test:
        return run_self_test()

    jobs = brand_jobs(args)

    try:
        from dotenv import load_dotenv

        load_dotenv()
    except ImportError:
        pass

    import psycopg2

    dsn = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        raise SystemExit("DATABASE_URL / SUPABASE_DB_URL 이 필요합니다 (.env).")
    conn = psycopg2.connect(dsn)
    conn.autocommit = False

    args.cache.mkdir(parents=True, exist_ok=True)
    fetcher = BrowserFetcher(args.timeout, headless=not args.show_browser)

    report: list[dict[str, Any]] = []
    writes: list[tuple[str, dict[str, float], float | None]] = []

    try:
        for brand, list_urls, link_pattern in jobs:
            products = load_brand_products(conn, brand, args.overwrite)
            if not products:
                LOG.info("[%s] 채울 제품이 없습니다 (이미 있거나 브랜드명이 다릅니다)", brand)
                continue
            LOG.info("[%s] 채울 제품 %d건", brand, len(products))

            by_key: dict[str, list[tuple[str, str]]] = {}
            for pid, name in products:
                by_key.setdefault(match_key(name), []).append((pid, name))
            matched_ids: set[str] = set()

            # 1) 목록 페이지에서 제품 주소를 모은다
            product_links: list[str] = []
            for list_url in list_urls:
                try:
                    listing_html = fetcher.get(list_url)
                except Exception as exc:  # noqa: BLE001
                    LOG.error("[%s] 목록을 열지 못했습니다: %s", brand, exc)
                    continue
                links = collect_product_links(listing_html, list_url, link_pattern)
                # 뽑은 주소를 한두 개 보여 준다 — 목록 페이지를 제품으로 착각했는지
                # 로그만 보고 바로 알 수 있도록. 실제로 그 실수를 한 적이 있다.
                LOG.info("[%s] %s → 제품 링크 %d개%s", brand, list_url, len(links),
                         (" (예: " + ", ".join(links[:2]) + ")") if links else "")
                product_links.extend(links)
                time.sleep(args.delay)

            product_links = list(dict.fromkeys(product_links))[: args.max_products]
            if not product_links:
                report.append({"브랜드": brand, "결과": "실패",
                               "사유": "목록에서 제품 링크를 찾지 못함 — --link-pattern 으로 지정해 보세요"})
                continue

            # 2) 제품 페이지에서 성분을 읽고 우리 제품에 붙인다
            for url in product_links:
                cached = cache_path(args.cache, url)
                if cached.exists():
                    raw_html = cached.read_text(encoding="utf-8", errors="replace")
                else:
                    try:
                        raw_html = fetcher.get(url)
                    except Exception as exc:  # noqa: BLE001
                        report.append({"브랜드": brand, "결과": "실패", "출처주소": url,
                                       "사유": f"페이지를 받지 못함: {exc}"})
                        continue
                    cached.write_text(raw_html, encoding="utf-8")
                    time.sleep(args.delay + random.random())

                if looks_blocked(raw_html):
                    cached.unlink(missing_ok=True)
                    report.append({"브랜드": brand, "결과": "실패", "출처주소": url,
                                   "사유": "차단된 응답"})
                    continue

                title = page_title(raw_html)
                values, bounds = find_nutrients(raw_html)
                if not values:
                    report.append({"브랜드": brand, "결과": "못읽음", "공식몰_제품명": title,
                                   "출처주소": url, "사유": "성분표가 글자로 없음(이미지로 추정)"})
                    continue

                candidates, how = resolve_candidates(match_key(f"{brand} {title}"), by_key)
                if not candidates:
                    candidates, how = resolve_candidates(match_key(title), by_key)
                if not candidates:
                    report.append({"브랜드": brand, "결과": "매칭실패", "공식몰_제품명": title,
                                   "출처주소": url, "사유": "이름이 맞는 우리 제품 없음"})
                    continue
                if len(candidates) > 1:
                    names = ", ".join(c[1][:40] for c in candidates[:3])
                    report.append({"브랜드": brand, "결과": "보류", "공식몰_제품명": title, "출처주소": url,
                                   "사유": f"후보 {len(candidates)}건({how}) — 사람이 확인 필요: {names}"})
                    continue

                pid, our_name = candidates[0]
                if pid in matched_ids:
                    report.append({"브랜드": brand, "결과": "보류", "공식몰_제품명": title, "제품명": our_name,
                                   "출처주소": url, "사유": "같은 제품에 두 페이지가 걸림 — 사람이 확인 필요"})
                    continue

                missing_required = [c for c in REQUIRED_FOR_INSERT if values.get(c) is None]
                if missing_required:
                    report.append({"브랜드": brand, "결과": "제외", "공식몰_제품명": title, "제품명": our_name,
                                   "출처주소": url, "사유": f"필수 성분 없음: {', '.join(missing_required)}",
                                   **{k: values.get(v) for k, v in REPORT_COLUMNS.items()}})
                    continue

                total = sum(values[c] for c in REQUIRED_FOR_ENERGY if c in values)
                if total > 100:
                    report.append({"브랜드": brand, "결과": "제외", "공식몰_제품명": title, "제품명": our_name,
                                   "출처주소": url, "사유": f"성분 합계 {total:.1f}% > 100",
                                   **{k: values.get(v) for k, v in REPORT_COLUMNS.items()}})
                    continue

                kcal = calculate_kcal_per_100g({c: values.get(c) for c in REQUIRED_FOR_ENERGY})
                notes: list[str] = []
                if kcal is None:
                    notes.append("열량 계산 불가(성분 일부 없음)")
                elif any(bounds.get(c) in ("min", "max") for c in REQUIRED_FOR_ENERGY):
                    notes.append("열량은 보장 경계 기준 근사치")

                matched_ids.add(pid)
                writes.append((pid, values, kcal))
                report.append({
                    "브랜드": brand, "결과": "반영대상", "공식몰_제품명": title, "제품명": our_name,
                    "출처주소": url,
                    **{k: values.get(v) for k, v in REPORT_COLUMNS.items()},
                    "보장경계": " ".join(
                        f"{c}={bounds[c]}" for c in NUTRIENT_COLUMNS if bounds.get(c) in ("min", "max")
                    ),
                    "계산kcal_100g": kcal,
                    "사유": " · ".join(notes),
                })

            # 못 채운 제품도 남긴다 — 무엇이 빠졌는지 보이지 않으면 다음 판단을 할 수 없다.
            for pid, name in products:
                if pid not in matched_ids:
                    report.append({"브랜드": brand, "결과": "못채움", "제품명": name,
                                   "사유": "공식몰에서 이 제품에 해당하는 페이지를 찾지 못함"})
    finally:
        fetcher.close()

    args.report.parent.mkdir(parents=True, exist_ok=True)
    columns = ["결과", "브랜드", "제품명", "공식몰_제품명", *REPORT_COLUMNS.keys(),
               "보장경계", "계산kcal_100g", "출처주소", "사유"]
    with args.report.open("w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(report)

    counts: dict[str, int] = {}
    for entry in report:
        counts[entry["결과"]] = counts.get(entry["결과"], 0) + 1
    LOG.info("결과: %s", counts)
    LOG.info("리포트: %s", args.report)

    if not args.apply:
        LOG.info("미반영(dry-run)입니다. 리포트를 확인한 뒤 --apply 를 붙여 실행하세요.")
        conn.close()
        return 0

    assert_columns_nullable(conn)
    cur = conn.cursor()
    applied = 0
    for pid, values, kcal in writes:
        cols = list(values.keys())
        cur.execute("DELETE FROM public.nutritional_profiles WHERE product_id = %s", (pid,))
        cur.execute(
            f"INSERT INTO public.nutritional_profiles (product_id, {', '.join(cols)}) "
            f"VALUES (%s, {', '.join(['%s'] * len(cols))})",
            [pid, *[values[c] for c in cols]],
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
    raise SystemExit(main())
