#!/usr/bin/env python3
"""
쿠팡 상품 상세페이지에서 등록성분을 읽어 nutritional_profiles 에 채운다.

    pip install playwright && python -m playwright install chromium   # 최초 1회

    python scripts/fetch_coupang_nutrition.py --self-test          # 파싱 자가검증 (네트워크 불필요)
    python scripts/fetch_coupang_nutrition.py --limit 20           # 20건만 미리보기
    python scripts/fetch_coupang_nutrition.py                      # 전체 미리보기 (DB 미반영)
    python scripts/fetch_coupang_nutrition.py --apply              # 실제 반영

왜 이 방식인가
    지자체 공공데이터로 채우려던 시도는 매칭에서 막혔다. 데이터가 "어떤 사료"인지
    이름으로 맞춰야 하는데, 판매처 제품명과 등록 사료명이 서로 다른 체계라 겹치지
    않았다(제주 115건 → 0건 매칭). 반면 상세페이지는 product_id 로 바로 찾아가므로
    매칭 문제 자체가 없다. 읽어낸 성분은 그 제품의 성분이 확실하다.

한계 — 미리 알고 시작한다
    성분표를 이미지로만 올린 상품이 많다. 그런 건 읽히지 않는다. 읽은 것만 넣고,
    못 읽은 건 리포트에 사유와 함께 남긴다. 추정해서 채우지 않는다.

안전장치
    - 미리보기가 기본이다. --apply 없이는 DB 에 쓰지 않는다.
    - 이미 영양정보가 있는 제품은 건드리지 않는다(--overwrite 로만 덮어쓴다).
    - 조단백질·조지방이 없으면 넣지 않는다. 부분값을 0 으로 채우면 '단백질 0% 사료'가 된다.
    - 받아온 HTML 을 캐시에 저장한다. 파싱을 고칠 때 다시 받지 않아도 된다.
    - 한 건씩 순서대로, 기본 3초 간격으로 받는다(--delay). 상대 서버를 두드리지 않기 위해서다.
      쿠팡 이용약관·robots 정책은 실행 전에 직접 확인하시라.

받아오는 방식
    파이썬이 직접 보낸 요청은 쿠팡이 403 으로 막는다(실측 20건 전부). 그래서 Playwright 로
    실제 Chromium 을 띄워 사람이 보는 것과 같은 페이지를 받는다. 브라우저 창을 눈으로
    보려면 --show-browser, 굳이 직접 요청을 쓰려면 --http-only(대개 403).

    한 건에 5~10초 걸린다. 458건이면 한 시간쯤 잡아야 한다. 중간에 끊겨도 받은 페이지는
    캐시에 남아 있어, 다시 실행하면 남은 것부터 이어서 받는다.

환경 변수 (.env)
    DATABASE_URL 또는 SUPABASE_DB_URL : postgresql://...
"""
from __future__ import annotations

import argparse
import csv
import gzip
import html as html_mod
import io
import logging
import os
import random
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from import_pet_food_nutrition import (  # noqa: E402
    NUTRIENT_ALIASES,
    NUTRIENT_COLUMNS,
    REQUIRED_FOR_ENERGY,
    REQUIRED_FOR_INSERT,
    assert_columns_nullable,
    calculate_kcal_per_100g,
    parse_percent_bound,
)

LOG = logging.getLogger("fetch_coupang_nutrition")

# 리포트 열 이름 → nutritional_profiles 컬럼.
REPORT_COLUMNS = {
    "조단백": "crude_protein",
    "조지방": "crude_fat",
    "조섬유": "crude_fiber",
    "조회분": "crude_ash",
    "수분": "moisture",
    "칼슘": "calcium",
    "인": "phosphorus",
}

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)

# 상세페이지가 막혔을 때 흔히 돌아오는 문구.
BLOCKED_MARKERS = ("Access Denied", "비정상적인 접근", "잠시 후 다시", "Request Rejected", "captcha")

# 라벨 뒤에 흔히 붙는 꾸밈말 — 떼고 비교한다.
LABEL_SUFFIXES = ("함량", "비율", "성분", "이상", "이하")


def normalize_label(raw: str) -> str:
    """표의 라벨을 비교용으로 정규화 — 공백·괄호·단위·꾸밈말을 지운다."""
    s = unicodedata.normalize("NFKC", raw or "").lower()
    s = re.sub(r"[\s()\[\]{}%:·・,]", "", s)
    for suffix in LABEL_SUFFIXES:
        if len(s) > len(suffix) and s.endswith(suffix):
            s = s[: -len(suffix)]
    return s


# 라벨 → 컬럼. 짧은 별칭('p','ca')은 오탐이 많아 표 라벨로는 쓰지 않는다.
LABEL_TO_COLUMN: dict[str, str] = {}
for _column, _aliases in NUTRIENT_ALIASES.items():
    for _alias in _aliases:
        if len(_alias) < 2 and _alias != "인":
            continue
        LABEL_TO_COLUMN[normalize_label(_alias)] = _column


def compact(raw: str) -> str:
    """공백만 지운 비교용 문자열 — '%' 와 '이상/이하' 는 성분의 근거라 남긴다."""
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", raw or "").lower())


def html_to_segments(raw_html: str) -> list[str]:
    """
    HTML 을 '칸' 단위 문자열로 자른다.

    표가 <th>조단백질</th><td>28% 이상</td> 로 오든, 한 칸에 "조단백질 28% 이상" 으로
    오든, JSON 조각으로 오든 같은 모양이 되도록 태그·따옴표를 경계로만 쓴다.
    """
    s = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", raw_html)
    s = re.sub(r"(?s)<[^>]+>", "\x01", s)
    s = html_mod.unescape(s)
    s = s.replace('"', "\x01").replace("\\u003c", "\x01")
    return [seg.strip() for seg in s.split("\x01") if seg.strip()]


def find_nutrients(raw_html: str) -> tuple[dict[str, float], dict[str, str]]:
    """
    상세페이지에서 등록성분을 뽑는다. 못 찾은 성분은 넣지 않는다(추정하지 않는다).

    한 성분이 여러 번 나오면 처음 값을 쓴다. 상세페이지 위쪽의 '상품정보제공고시'
    표가 판매자 입력값이라 가장 믿을 만하고, 아래쪽 홍보 문구에 섞인 숫자는
    같은 성분이라도 다른 제품(세트 구성품) 것일 수 있다.
    """
    segments = html_to_segments(raw_html)
    values: dict[str, float] = {}
    bounds: dict[str, str] = {}

    def remember(column: str, raw_value: str) -> None:
        if column in values:
            return
        value, bound = parse_percent_bound(raw_value)
        if value is None:
            return
        values[column] = value
        bounds[column] = bound

    for i, segment in enumerate(segments):
        label = normalize_label(segment)

        # (1) 라벨 칸과 값 칸이 나뉜 경우: <th>조단백질</th><td>28% 이상</td>
        column = LABEL_TO_COLUMN.get(label)
        if column:
            for nxt in segments[i + 1 : i + 3]:
                if re.search(r"\d", nxt):
                    remember(column, nxt)
                    break
            continue

        # (2) 한 칸에 라벨과 값이 같이 있는 경우: "조단백질 28% 이상"
        if not re.search(r"\d", segment):
            continue
        for alias_label, alias_column in LABEL_TO_COLUMN.items():
            if alias_column in values or len(alias_label) < 2:
                continue
            # 한 칸에 섞여 있을 때는 근거를 더 요구한다. 등록성분은 늘 백분율로 신고되므로,
            # 숫자 뒤에 '%' 나 '이상/이하' 가 붙은 것만 성분으로 본다. 이게 없으면
            # "수분감 있는 식감으로 8개월" 같은 후기 문구를 성분으로 읽게 된다.
            match = re.search(
                re.escape(alias_label) + r"[^0-9]{0,4}(\d+(?:\.\d+)?)(%|이상|이하|미만|최소|최대)",
                compact(segment),
            )
            if match:
                remember(alias_column, match.group(1))

    return values, bounds


def looks_blocked(raw_html: str) -> bool:
    if len(raw_html) < 2000:
        return True
    return any(marker.lower() in raw_html.lower() for marker in BLOCKED_MARKERS)


def product_url(page_key: str | None, link: str | None) -> str | None:
    """
    받아올 주소를 고른다.

    coupang_product_id 가 있으면 그것으로 상세페이지 주소를 만든다. 파트너 단축링크는
    리다이렉트를 따라가야 하고 추적 파라미터가 붙어 있어, 있는 경우엔 쓰지 않는다.
    옵션(itemId)까지 있으면 함께 넘긴다 — 같은 상품이라도 옵션마다 성분이 다를 수 있다.
    """
    if page_key:
        params = {}
        if link:
            query = urllib.parse.parse_qs(urllib.parse.urlparse(link).query)
            for key in ("itemId", "vendorItemId"):
                if query.get(key):
                    params[key] = query[key][0]
        suffix = ("?" + urllib.parse.urlencode(params)) if params else ""
        return f"https://www.coupang.com/vp/products/{page_key}{suffix}"
    return link or None


def fetch(url: str, timeout: int, retries: int = 2) -> str:
    """상세페이지 HTML. 실패하면 사유를 그대로 올린다 — 조용히 빈 값으로 넘기지 않는다."""
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "ko-KR,ko;q=0.9",
            "Accept-Encoding": "gzip",
        },
    )
    last_error: Exception | None = None
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                payload = response.read()
                if response.headers.get("Content-Encoding") == "gzip":
                    payload = gzip.GzipFile(fileobj=io.BytesIO(payload)).read()
                return payload.decode("utf-8", errors="replace")
        except Exception as exc:  # noqa: BLE001 - 사유를 리포트에 남기는 게 목적
            last_error = exc
            if attempt < retries:
                time.sleep(2 ** attempt + random.random())
    raise RuntimeError(str(last_error))


class BrowserFetcher:
    """
    진짜 브라우저(Playwright + Chromium)로 상세페이지를 연다.

    파이썬이 직접 보낸 요청은 쿠팡이 403 으로 막는다(실측: 20건 전부 403). 사람이 쓰는
    브라우저와 구별해서 거르기 때문이라, 헤더를 흉내 내는 것으로는 넘어가지 않는다.

    브라우저와 세션을 한 번만 만들어 끝까지 쓴다. 매번 새로 열면 느릴 뿐 아니라,
    첫 방문자로 계속 보여 오히려 더 잘 막힌다.
    """

    def __init__(self, timeout: int, headless: bool = True) -> None:
        try:
            from playwright.sync_api import sync_playwright
        except ImportError as exc:  # pragma: no cover - 설치 안내가 목적
            raise SystemExit(
                "브라우저 수집에는 Playwright 가 필요합니다:\n"
                "    pip install playwright\n"
                "    python -m playwright install chromium"
            ) from exc

        self._timeout_ms = timeout * 1000
        self._playwright = sync_playwright().start()
        self._browser = self._playwright.chromium.launch(headless=headless)
        self._context = self._browser.new_context(
            user_agent=USER_AGENT,
            locale="ko-KR",
            timezone_id="Asia/Seoul",
            viewport={"width": 1440, "height": 900},
        )
        self._page = self._context.new_page()
        # 상품 페이지로 바로 들어가면 첫 방문으로 걸러진다. 첫 화면을 먼저 열어 쿠키를 받는다.
        try:
            self._page.goto("https://www.coupang.com/", wait_until="domcontentloaded",
                            timeout=self._timeout_ms)
            self._page.wait_for_timeout(2000)
        except Exception as exc:  # noqa: BLE001
            LOG.warning("첫 화면을 열지 못했습니다(계속 진행): %s", exc)

    def get(self, url: str) -> str:
        response = self._page.goto(url, wait_until="domcontentloaded", timeout=self._timeout_ms)
        if response is not None and response.status >= 400:
            raise RuntimeError(f"HTTP {response.status}")
        # 등록성분표는 아래쪽 '상품정보제공고시' 영역에 있고, 스크롤해야 그려지는 경우가 많다.
        for _ in range(4):
            self._page.mouse.wheel(0, 4000)
            self._page.wait_for_timeout(600)
        return self._page.content()

    def close(self) -> None:
        for closer in (self._context.close, self._browser.close, self._playwright.stop):
            try:
                closer()
            except Exception:  # noqa: BLE001 - 정리 실패로 결과를 잃지 않는다
                pass


def load_targets(conn, overwrite: bool) -> list[tuple[str, str, str, str | None, str | None]]:
    """(id, name, brand, coupang_product_id, coupang_link) — 영양정보가 없는 제품만."""
    cur = conn.cursor()
    cur.execute(
        """
        SELECT p.id::text, p.name, COALESCE(p.brand_name, ''), p.coupang_product_id, p.coupang_link
        FROM public.products p
        WHERE p.coupang_link IS NOT NULL
          AND (%s OR NOT EXISTS (SELECT 1 FROM public.nutritional_profiles n WHERE n.product_id = p.id))
        ORDER BY p.name
        """,
        (overwrite,),
    )
    rows = cur.fetchall()
    cur.close()
    return rows


# ---------------------------------------------------------------------------
# 자가검증 — 저장소에 파이썬 테스트 도구가 없어 스크립트 안에 둔다.
# 운영 DB 에 값을 쓰는 스크립트라, 고친 뒤에는 이걸 먼저 돌려 보라는 뜻이다.
# ---------------------------------------------------------------------------
TABLE_HTML = """
<html><body>
<table class="prod-attr">
  <tr><th>등록성분량</th><td>아래 참조</td></tr>
  <tr><th>조단백질</th><td>28.0 % 이상</td></tr>
  <tr><th>조지방</th><td>16% 이상</td></tr>
  <tr><th>조섬유</th><td>4% 이하</td></tr>
  <tr><th>조회분</th><td>8% 이하</td></tr>
  <tr><th>수분</th><td>10% 이하</td></tr>
  <tr><th>칼슘</th><td>1.2% 이상</td></tr>
  <tr><th>인</th><td>0.9% 이상</td></tr>
</table>
</body></html>
"""

INLINE_HTML = """
<html><body><div class="product-etc">
<p>조단백질 30% 이상, 조지방 12% 이상, 조섬유 5% 이하, 조회분 9% 이하, 수분 8% 이하</p>
</div></body></html>
"""

IMAGE_ONLY_HTML = (
    "<html><body><div class='prod-image'>"
    + "<img src='https://img.coupang.com/detail/1.jpg'>" * 40
    + "<p>자세한 성분은 상세 이미지를 참고하세요.</p></div></body></html>"
)

BLOCKED_HTML = "<html><body><h1>Access Denied</h1></body></html>"

# 숫자와 '인'·'수분' 같은 글자가 섞인 홍보/후기 문구. 성분으로 오인하면 안 된다.
NOISE_HTML = """
<html><body>
<span>오늘 28% 할인</span><span>인기순위 3위</span><span>리뷰 1,204개</span>
<p>수분감 있는 식감으로 8개월 아기 강아지도 잘 먹어요</p>
<p>조단백질 걱정 없이 3개월째 급여 중입니다</p>
<p>칼슘 2개 세트로 배송돼요</p>
<p>단백질이 풍부하다고 해서 샀어요</p>
</body></html>
"""


def run_self_test() -> int:
    failures: list[str] = []

    def check(label: str, actual: Any, expected: Any) -> None:
        if actual != expected:
            failures.append(f"{label}: {actual!r} != {expected!r}")

    values, bounds = find_nutrients(TABLE_HTML)
    check("표 조단백질", values.get("crude_protein"), 28.0)
    check("표 조지방", values.get("crude_fat"), 16.0)
    check("표 조섬유", values.get("crude_fiber"), 4.0)
    check("표 조회분", values.get("crude_ash"), 8.0)
    check("표 수분", values.get("moisture"), 10.0)
    check("표 칼슘", values.get("calcium"), 1.2)
    check("표 인", values.get("phosphorus"), 0.9)
    check("표 경계-이상", bounds.get("crude_protein"), "min")
    check("표 경계-이하", bounds.get("crude_fiber"), "max")

    inline_values, _ = find_nutrients(INLINE_HTML)
    check("한칸 조단백질", inline_values.get("crude_protein"), 30.0)
    check("한칸 수분", inline_values.get("moisture"), 8.0)
    check("한칸 칼슘없음", inline_values.get("calcium"), None)

    image_values, _ = find_nutrients(IMAGE_ONLY_HTML)
    check("이미지만-성분없음", image_values, {})

    # 숫자가 널린 홍보·후기 문구에서 성분을 지어내지 않는지 — 오탐이 제일 위험하다.
    noise_values, _ = find_nutrients(NOISE_HTML)
    check("홍보문구-성분없음", noise_values, {})

    # 열량: 28+16+4+8+10 = 66 → NFE 34 → 3.5*28 + 8.5*16 + 3.5*34 = 353.0
    kcal = calculate_kcal_per_100g({c: values[c] for c in REQUIRED_FOR_ENERGY})
    check("열량", kcal, 353.0)

    check("차단감지", looks_blocked(BLOCKED_HTML), True)
    check("정상페이지", looks_blocked(TABLE_HTML + "x" * 3000), False)

    check(
        "주소-옵션포함",
        product_url("123", "https://link.coupang.com/re/AFFSDP?pageKey=123&itemId=9&vendorItemId=7&traceid=z"),
        "https://www.coupang.com/vp/products/123?itemId=9&vendorItemId=7",
    )
    check("주소-단축링크", product_url(None, "https://link.coupang.com/a/abc"), "https://link.coupang.com/a/abc")

    if failures:
        for line in failures:
            print(f"실패 {line}")
        return 1
    print("자가검증 통과")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--self-test", action="store_true", help="파싱 자가검증만 하고 끝낸다 (네트워크 불필요)")
    parser.add_argument("--apply", action="store_true", help="실제로 DB 에 쓴다 (기본은 미반영)")
    parser.add_argument("--overwrite", action="store_true", help="이미 영양정보가 있는 제품도 다시 받는다")
    parser.add_argument("--limit", type=int, help="이 건수만 처리한다 (먼저 소량으로 확인할 때)")
    parser.add_argument("--delay", type=float, default=3.0, help="요청 간격(초). 기본 3초")
    parser.add_argument("--timeout", type=int, default=30)
    parser.add_argument(
        "--http-only",
        action="store_true",
        help="브라우저 없이 직접 요청한다. 쿠팡은 이 방식을 403 으로 막으므로 보통 쓸 일이 없다.",
    )
    parser.add_argument("--show-browser", action="store_true", help="브라우저 창을 띄워 진행을 눈으로 본다")
    parser.add_argument("--cache", type=Path, default=Path("./data/coupang_cache"), help="받아온 HTML 보관 위치")
    parser.add_argument("--report", type=Path, default=Path("./data/coupang_nutrition_report.csv"))
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s %(message)s",
    )

    if args.self_test:
        return run_self_test()

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

    targets = load_targets(conn, args.overwrite)
    if args.limit:
        targets = targets[: args.limit]
    LOG.info("대상 %d건", len(targets))

    args.cache.mkdir(parents=True, exist_ok=True)
    # 캐시에 다 있으면 브라우저를 띄울 이유가 없다.
    need_network = any(not (args.cache / f"{t[0]}.html").exists() for t in targets)
    fetcher = None
    if need_network and not args.http_only:
        LOG.info("브라우저를 준비합니다 (Playwright + Chromium)")
        fetcher = BrowserFetcher(args.timeout, headless=not args.show_browser)

    report: list[dict[str, Any]] = []
    writes: list[tuple[str, dict[str, float], float | None]] = []
    blocked_streak = 0

    for index, (pid, name, brand, page_key, link) in enumerate(targets, start=1):
        row: dict[str, Any] = {"제품명": name, "브랜드": brand}
        url = product_url(page_key, link)
        if not url:
            row.update({"결과": "제외", "사유": "받아올 주소가 없음"})
            report.append(row)
            continue

        cached = args.cache / f"{pid}.html"
        if cached.exists():
            raw_html = cached.read_text(encoding="utf-8", errors="replace")
        else:
            try:
                raw_html = fetcher.get(url) if fetcher else fetch(url, args.timeout)
            except Exception as exc:  # noqa: BLE001
                row.update({"결과": "실패", "사유": f"페이지를 받지 못함: {exc}"})
                report.append(row)
                time.sleep(args.delay)
                continue
            cached.write_text(raw_html, encoding="utf-8")
            time.sleep(args.delay + random.random())

        if looks_blocked(raw_html):
            cached.unlink(missing_ok=True)
            blocked_streak += 1
            row.update({"결과": "실패", "사유": "차단된 응답(로그인/캡차 화면으로 보임)"})
            report.append(row)
            if blocked_streak >= 5:
                LOG.error("연속 5건이 차단됐습니다. 여기서 멈춥니다 — 간격(--delay)을 늘리거나 시간을 두고 다시 시도하세요.")
                break
            continue
        blocked_streak = 0

        values, bounds = find_nutrients(raw_html)
        if not values:
            row.update({"결과": "못읽음", "사유": "성분표가 글자로 없음(이미지에만 있는 것으로 보임)"})
            report.append(row)
            continue

        missing_required = [c for c in REQUIRED_FOR_INSERT if values.get(c) is None]
        if missing_required:
            names = ", ".join(missing_required)
            row.update({"결과": "제외", "사유": f"필수 성분 없음: {names}",
                        **{k: values.get(v) for k, v in REPORT_COLUMNS.items()}})
            report.append(row)
            continue

        total = sum(values[c] for c in REQUIRED_FOR_ENERGY if c in values)
        if total > 100:
            row.update({"결과": "제외", "사유": f"성분 합계 {total:.1f}% > 100",
                        **{k: values.get(v) for k, v in REPORT_COLUMNS.items()}})
            report.append(row)
            continue

        kcal = calculate_kcal_per_100g({c: values.get(c) for c in REQUIRED_FOR_ENERGY})
        notes: list[str] = []
        if kcal is None:
            notes.append("열량 계산 불가(성분 일부 없음)")
        elif any(bounds.get(c) in ("min", "max") for c in REQUIRED_FOR_ENERGY):
            notes.append("열량은 보장 경계 기준 근사치")

        writes.append((pid, values, kcal))
        row.update({
            "결과": "반영대상",
            **{k: values.get(v) for k, v in REPORT_COLUMNS.items()},
            "보장경계": " ".join(f"{c}={bounds[c]}" for c in NUTRIENT_COLUMNS if bounds.get(c) in ("min", "max")),
            "계산kcal_100g": kcal,
            "사유": " · ".join(notes),
        })
        report.append(row)

        if index % 25 == 0:
            LOG.info("%d/%d 진행", index, len(targets))

    if fetcher:
        fetcher.close()

    args.report.parent.mkdir(parents=True, exist_ok=True)
    columns = ["결과", "제품명", "브랜드", *REPORT_COLUMNS.keys(), "보장경계", "계산kcal_100g", "사유"]
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
