import os
import re
import sys
import time
import random
import asyncio
import logging
from typing import List, Dict, Any, Callable
from functools import wraps
from urllib.parse import urljoin

# 1. HTTP 통신: TLS 핑거프린트 스푸퍼 (curl_cffi 기반)
# 2. 프록시 관리: 프록시 로테이션 매니저
# 3. 오류 처리: 지수적 백오프 재시도 (Decorator)
# 4. HTML 파싱: 검색 결과 리스트 추출기
# 5. HTML 파싱: 상세 이미지 URL 추출기
# 6. 분산 처리: Celery 비동기 큐 워커 설정 예제 포함
# 7. 분산 처리: S3 청크 이미지 다운로더 (aiohttp & boto3)
# 8. 고급 자동화: nodriver 기반 브라우저 로더
# 9. 스케줄링: 새벽 2시 크론 스케줄러
# 10. 로깅: Slack 알림 모니터링 모듈

# 필수 라이브러리 import 예외 방지 (모의/실제 호환 구조)
try:
    from curl_cffi import requests as curl_requests
except ImportError:
    curl_requests = None

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

try:
    import aiohttp
except ImportError:
    aiohttp = None

try:
    import boto3
except ImportError:
    boto3 = None

try:
    from celery import Celery
except ImportError:
    Celery = None

try:
    import nodriver as nd
except ImportError:
    nd = None

try:
    import schedule
except ImportError:
    schedule = None

# 로거 설정
logger = logging.getLogger("advanced_crawler")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(logging.Formatter("[%(asctime)s] [%(levelname)s] %(message)s"))
logger.addHandler(handler)

# --- 10. Slack Alert & Monitoring Module ---
class SlackAlertManager:
    """크롤링 상태 모니터링 및 Slack 경보 전송 모듈"""
    def __init__(self, webhook_url: str = None):
        self.webhook_url = webhook_url or os.environ.get("SLACK_WEBHOOK_URL", "")
        self.total_requests = 0
        self.blocked_requests = 0

    def record_request(self, is_blocked: bool):
        self.total_requests += 1
        if is_blocked:
            self.blocked_requests += 1
        
        # Akamai 차단율이 20%를 넘어서는지 실시간 모니터링 (최소 10번 요청 이상일 때 적용)
        if self.total_requests >= 10:
            block_rate = (self.blocked_requests / self.total_requests) * 100
            if block_rate >= 20.0:
                self.send_alert(
                    f"⚠️ [WARNING] Akamai 차단율 임계치 초과!\n"
                    f"- 현재 차단율: {block_rate:.2f}%\n"
                    f"- 전체 요청: {self.total_requests}건 / 차단 요청: {self.blocked_requests}건\n"
                    f"즉시 주거용 프록시 대역 점검 또는 브라우저 지터 재설정이 필요합니다."
                )
                # 리셋하여 경보 도배 방지
                self.total_requests = 0
                self.blocked_requests = 0

    def send_alert(self, message: str):
        if not self.webhook_url:
            logger.warning(f"[Slack 모의 송신]: {message}")
            return
        
        # aiohttp 등을 통한 실제 비동기 전송
        async def _post():
            try:
                async with aiohttp.ClientSession() as session:
                    payload = {"text": message}
                    async with session.post(self.webhook_url, json=payload, timeout=5) as resp:
                        if resp.status != 200:
                            logger.error(f"Slack 전송 실패: HTTP {resp.status}")
            except Exception as e:
                logger.error(f"Slack 전송 중 예외 발생: {e}")
        
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(_post())
        except RuntimeError:
            asyncio.run(_post())

slack_monitor = SlackAlertManager()


# --- 2. Proxy Rotation Manager ---
class ProxyRotationManager:
    """ScrapFly 또는 BrightData 주거용 프록시 로테이션 매니저"""
    def __init__(self, proxy_list: List[str] = None):
        # 모의 주거용 프록시 리스트 세팅 (BrightData/ScrapFly 포트/IP 매핑 스키마)
        self.proxies = proxy_list or [
            "http://brd-customer-hl_abc123-zone-residential:pass456@zproxy.lum-superproxy.io:22225",
            "http://brd-customer-hl_abc123-zone-residential-country-us:pass456@zproxy.lum-superproxy.io:22225",
            "http://brd-customer-hl_abc123-zone-residential-country-kr:pass456@zproxy.lum-superproxy.io:22225"
        ]
        self.blacklist = set()
        self.current_idx = 0

    def get_next_proxy(self) -> str:
        active_proxies = [p for p in self.proxies if p not in self.blacklist]
        if not active_proxies:
            logger.error("🚫 가용한 활성 프록시가 전혀 없습니다! 블랙리스트를 초기화합니다.")
            self.blacklist.clear()
            active_proxies = self.proxies

        proxy = active_proxies[self.current_idx % len(active_proxies)]
        self.current_idx += 1
        return proxy

    def mark_bad_proxy(self, proxy: str, reason: str):
        logger.warning(f"❌ 프록시 차단 감지 및 블랙리스트 등록: {proxy} (사유: {reason})")
        self.blacklist.add(proxy)
        slack_monitor.record_request(is_blocked=True)

proxy_manager = ProxyRotationManager()


# --- 3. Exponential Backoff Decorator ---
def safe_retry(max_retries: int = 5, base_delay: float = 2.0):
    """지수적 백오프 + 랜덤 지터가 적용된 재시도 데코레이터"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            retries = 0
            while retries < max_retries:
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    retries += 1
                    if retries >= max_retries:
                        logger.error(f"❌ [최종 실패] {func.__name__} {max_retries}회 재시도 초과. 에러: {e}")
                        slack_monitor.send_alert(f"🚨 [CRITICAL] {func.__name__} 크롤링 작업 최종 실패!\n오류 상세: {e}")
                        raise e
                    
                    # 지수 백오프 식: base_delay * 2^retries + random jitter (0~1초)
                    jitter = random.uniform(0.1, 1.0)
                    delay = (base_delay * (2 ** (retries - 1))) + jitter
                    logger.warning(
                        f"⚠️ [경고] {func.__name__} 실패 (시도 {retries}/{max_retries}). "
                        f"{delay:.2f}초 후 재시도 예정... 에러: {e}"
                    )
                    await asyncio.sleep(delay)
        return wrapper
    return decorator


# --- 1. TLS Fingerprint Spoofer (curl_cffi) ---
class TLSSpoofClient:
    """최신 Chrome 브라우저의 TLS 핑거프린트(JA3/JA4) 및 HTTP/2 헤더를 모방하는 HTTP 클라이언트"""
    def __init__(self):
        if not curl_requests:
            logger.warning("curl_cffi 라이브러리가 로드되지 않아 일반 HTTP 호출로 백필 처리합니다.")

    def generate_dynamic_headers(self) -> Dict[str, str]:
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        ]
        return {
            "User-Agent": random.choice(user_agents),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Sec-Ch-Ua": '"Not A(Brand";v="99", "Google Chrome";v="120", "Chromium";v="120"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1",
            "Connection": "keep-alive"
        }

    @safe_retry(max_retries=5, base_delay=2.0)
    async def get_html(self, url: str, use_proxy: bool = True) -> str:
        headers = self.generate_dynamic_headers()
        proxy = proxy_manager.get_next_proxy() if use_proxy else None

        if not curl_requests:
            # Fallback to aiohttp if curl_cffi is missing
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, proxy=proxy, timeout=15) as resp:
                    if resp.status in (403, 429):
                        if proxy:
                            proxy_manager.mark_bad_proxy(proxy, f"HTTP Status {resp.status}")
                        raise RuntimeError(f"접근 차단됨 (HTTP {resp.status})")
                    return await resp.text()

        # curl_cffi 비동기 세션을 이용한 Chrome 120 TLS 핑거프린트 스푸핑
        # JA3/JA4 지문을 완벽하게 브라우저 규격으로 흉내 냅니다.
        try:
            async with curl_requests.AsyncSession(impersonate="chrome120") as session:
                proxies_dict = {"http": proxy, "https": proxy} if proxy else None
                response = await session.get(url, headers=headers, proxies=proxies_dict, timeout=15)
                
                # 차단 페이지 및 봇 탐지 시그니처 감색 검증
                html_lower = response.text.lower()
                if "pardon our interruption" in html_lower or "captcha" in html_lower or response.status_code in (403, 429):
                    if proxy:
                        proxy_manager.mark_bad_proxy(proxy, "Akamai Block / Status 403-429")
                    raise RuntimeError(f"Akamai 차단 봇 탐지 감지 (Status {response.status_code})")

                slack_monitor.record_request(is_blocked=False)
                return response.text
        except Exception as e:
            if proxy:
                proxy_manager.mark_bad_proxy(proxy, f"Network Exception: {str(e)[:50]}")
            raise e

tls_client = TLSSpoofClient()


# --- 4. BeautifulSoup Search Scraper ---
class CoupangSearchScraper:
    """BeautifulSoup 기반 쿠팡 사료 검색 결과 리스트 추출기"""
    @staticmethod
    def parse_search_results(html: str, base_url: str = "https://www.coupang.com") -> List[Dict[str, Any]]:
        if not BeautifulSoup:
            logger.error("BeautifulSoup4 라이브러리가 존재하지 않습니다.")
            return []

        soup = BeautifulSoup(html, "html.parser")
        products = []
        
        # 쿠팡 검색 페이지의 개별 상품 목록 DOM 타겟팅 (class="search-product")
        items = soup.find_all("li", class_="search-product")
        
        for item in items:
            try:
                # 1. 상품 ID
                product_id = item.get("id", "").strip() or item.get("data-product-id", "").strip()
                if not product_id:
                    continue
                
                # 2. 상품명 (class="name")
                name_elem = item.find("div", class_="name")
                name = name_elem.get_text().strip() if name_elem else "이름 없음"
                
                # 3. 가격 (class="price-value")
                price_elem = item.find("strong", class_="price-value")
                price = int(re.sub(r"[^\d]", "", price_elem.get_text())) if price_elem else 0
                
                # 4. 썸네일 이미지 URL (지연 로딩 대응 data-img-src 또는 src)
                img_elem = item.find("img", class_="search-product-wrap-img")
                img_url = ""
                if img_elem:
                    img_url = img_elem.get("data-img-src") or img_elem.get("src") or ""
                    if img_url.startswith("//"):
                        img_url = "https:" + img_url

                # 5. 상세 페이지 링크 URL (a 태그 href)
                a_elem = item.find("a", class_="search-product-link")
                href = a_elem.get("href", "") if a_elem else ""
                link_url = urljoin(base_url, href) if href else ""

                products.append({
                    "product_id": product_id,
                    "name": name,
                    "price": price,
                    "thumbnail_url": img_url,
                    "detail_url": link_url
                })
            except Exception as e:
                logger.warning(f"검색 아이템 파싱 중 단일 예외 스킵: {e}")
                continue
        
        logger.info(f"파싱 완료: 총 {len(products)}개의 쿠팡 상품 파싱 성공.")
        return products


# --- 5. PDP Image Parser (상세 이미지 추출기) ---
class CoupangPDPImageParser:
    """BeautifulSoup + 정규식을 결합한 상세 설명(PDP) 이미지 추출기"""
    @staticmethod
    def extract_pdp_images(html: str) -> List[str]:
        if not BeautifulSoup:
            return []

        soup = BeautifulSoup(html, "html.parser")
        extracted_images = []

        # 1. 쿠팡 상세 정보 섹션 컨테이너 범위 좁히기
        # 상세 이미지가 렌더링되는 주요 div 컨테이너 매핑
        detail_container = (
            soup.find("div", class_="subType-IMAGE") or 
            soup.find("div", class_="product-detail-content") or
            soup.find("div", id="productDetail")
        )
        
        target_root = detail_container if detail_container else soup

        # 2. BeautifulSoup을 이용해 모든 img 태그 탐색
        img_tags = target_root.find_all("img")
        for img in img_tags:
            # 지연 로딩 속성(data-src, lazy-src, data-original-src 등) 우선 추출
            src = (
                img.get("data-src") or 
                img.get("data-original-src") or 
                img.get("lazy-src") or 
                img.get("src") or ""
            ).strip()

            if src:
                # '//'로 시작하는 프로토콜 없는 주소 전처리
                if src.startswith("//"):
                    src = "https:" + src
                
                # 이미지 확장자 검증 및 유효 URL 필터
                if any(ext in src.lower() for ext in [".jpg", ".jpeg", ".png", ".gif", ".webp"]):
                    if src not in extracted_images:
                        extracted_images.append(src)

        # 3. BeautifulSoup으로 잡히지 않는 스크립트나 동적 데이터 내의 이미지 주소 정규식 2차 크롤링
        # CDN 상세 이미지 패턴 정규식 매핑
        img_pattern = re.compile(r'https?://[^\s"\']+\.(?:jpg|jpeg|png|gif|webp)', re.IGNORECASE)
        found_urls = img_pattern.findall(html)
        for url in found_urls:
            # 상세 이미지 보관 CDN 도메인 필터링 (쿠팡 이미지 서버 등)
            if "thumbnail.image.coupangcdn.com" in url or "img1a.coupangcdn.com" in url:
                if url not in extracted_images:
                    extracted_images.append(url)

        logger.info(f"상세 이미지 추출 완료: 총 {len(extracted_images)}개 이미지 파싱 성공.")
        return extracted_images


# --- 7. S3 Stream Image Downloader ---
class S3ImageDownloader:
    """비동기 병렬 이미지 다운로드 및 AWS S3 청크 스트리밍 업로드 모듈"""
    def __init__(self, s3_bucket: str = "veroro-product-images"):
        self.bucket = s3_bucket
        # AWS 자격 증명 체크 후 Mock/실제 세션 연동
        if boto3:
            self.s3_client = boto3.client("s3")
        else:
            self.s3_client = None

    async def download_and_upload_single(self, image_url: str, s3_key: str):
        if not aiohttp:
            logger.error("aiohttp 라이브러리가 없어 다운로드를 스킵합니다.")
            return False

        # 메모리 절약을 위한 청크 단위 스트림 파일 및 파이프라인
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(image_url, timeout=30) as resp:
                    if resp.status != 200:
                        logger.error(f"이미지 다운 실패 (HTTP {resp.status}): {image_url}")
                        return False
                    
                    # 로컬 임시 메모리 사용 없이 S3 스트리밍(청크) 쓰기 처리
                    # 프로덕션에서는 boto3 s3 multipart upload 또는 io.BytesIO를 사용
                    if self.s3_client:
                        # boto3 Multipart Upload 활용한 스트리밍 업로드 모의
                        loop = asyncio.get_running_loop()
                        upload_id = await loop.run_in_executor(
                            None, 
                            lambda: self.s3_client.create_multipart_upload(Bucket=self.bucket, Key=s3_key)["UploadId"]
                        )
                        
                        parts = []
                        part_num = 1
                        chunk_size = 1024 * 1024  # 1MB 청크 단위 스트림
                        
                        while True:
                            chunk = await resp.content.read(chunk_size)
                            if not chunk:
                                break
                            
                            # 비동기로 각 파트 업로드 진행
                            part = await loop.run_in_executor(
                                None,
                                lambda: self.s3_client.upload_part(
                                    Bucket=self.bucket, Key=s3_key, UploadId=upload_id,
                                    PartNumber=part_num, Body=chunk
                                )
                            )
                            parts.append({"PartNumber": part_num, "ETag": part["ETag"]})
                            part_num += 1

                        # 업로드 완료 조치
                        await loop.run_in_executor(
                            None,
                            lambda: self.s3_client.complete_multipart_upload(
                                Bucket=self.bucket, Key=s3_key, UploadId=upload_id,
                                MultipartUpload={"Parts": parts}
                            )
                        )
                        logger.info(f"S3 업로드 완료: {s3_key}")
                        return True
                    else:
                        # Mock 모드로 청크 크기 체크만 비동기로 구동
                        total_bytes = 0
                        while True:
                            chunk = await resp.content.read(1024 * 64)
                            if not chunk:
                                break
                            total_bytes += len(chunk)
                        logger.info(f"[Mock S3 업로드]: {image_url} -> s3://{self.bucket}/{s3_key} (용량: {total_bytes} bytes)")
                        return True
        except Exception as e:
            logger.error(f"이미지 {image_url} 스트리밍 처리 오류: {e}")
            return False

    async def parallel_download_pipeline(self, urls: List[str], prefix: str = "products/"):
        tasks = []
        for i, url in enumerate(urls):
            s3_key = f"{prefix}img_{int(time.time())}_{i}.jpg"
            tasks.append(self.download_and_upload_single(url, s3_key))
        
        # 세마포어를 걸어 지나친 동시 다운로드로 인한 밴 예방
        sem = asyncio.Semaphore(5)
        async def sem_task(task):
            async with sem:
                return await task

        results = await asyncio.gather(*(sem_task(t) for t in tasks), return_exceptions=True)
        success_count = sum(1 for r in results if r is True)
        logger.info(f"병렬 스트리밍 다운 완료: {success_count}/{len(urls)}개 이미지 업로드 성공.")


# --- 8. Undetected Browser (nodriver 기반 동적 로더) ---
class UndetectedBrowserLoader:
    """Akamai 정적 차단 우회를 위한 최후의 수단: nodriver 기반 헤드리스 브라우저 로더"""
    @staticmethod
    async def get_rendered_html(url: str) -> str:
        if not nd:
            logger.error("nodriver 라이브러리가 로드되지 않았습니다. 동적 렌더링을 스킵합니다.")
            return ""

        logger.info(f"🕵️ nodriver를 기동하여 Akamai 탐지를 회피합니다: {url}")
        
        # 브라우저 시작 (봇 감지 방지 패치가 적용된 undetected 크롬 드라이버)
        browser = await nd.start(
            browser_args=[
                "--disable-gpu",
                "--no-sandbox",
                "--window-size=1920,1080"
            ]
        )
        try:
            page = await browser.get(url)
            # 페이지 로드 안정성 대기
            await page.wait(5.0)

            # Lazy Loading 이미지들의 렌더링을 유도하기 위해 하단 스크롤 점진 수행
            logger.info("⏬ 동적 이미지 트리거를 위해 웹 페이지 스크롤 다운을 수행합니다...")
            for step in range(5):
                # 0.5초 대기와 함께 점진적으로 윈도우 스크롤 하향 이동
                scroll_y = (step + 1) * 1500
                await page.evaluate(f"window.scrollTo(0, {scroll_y})")
                await page.wait(1.2) # Jitter 모션 모방
            
            # 페이지 끝으로 완전 이동하여 Footer 영역 로드 대기
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait(3.0)

            # 렌더링이 완료된 최종 HTML 반환
            html_content = await page.get_content()
            return html_content
        except Exception as e:
            logger.error(f"nodriver 동적 렌더링 실패: {e}")
            raise e
        finally:
            browser.stop()


# --- 6. Celery 비동기 분산 큐 아키텍처 (Celery Worker) ---
# Celery 및 Redis를 백엔드로 한 분산 워커 파이프라인 매핑
if Celery:
    # broker: Redis, backend: Redis
    celery_app = Celery(
        "veroro_crawler_tasks",
        broker=os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
        backend=os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    )
    
    celery_app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="Asia/Seoul",
        enable_utc=False,
        task_acks_late=True, # 실패 시 태스크 손실 방지를 위한 late ack
        worker_prefetch_multiplier=1 # 동등 분배를 위한 프리페치 조정
    )

    @celery_app.task(name="tasks.crawl_product_pdp_task", bind=True, max_retries=3)
    def crawl_product_pdp_task(self, detail_url: str):
        """Celery 비동기 상품 상세 파싱 및 이미지 S3 업로드 워커"""
        logger.info(f"[Celery Worker] 작업 시작 URL: {detail_url}")
        
        async def _run():
            # 1. HTML 가져오기 (TLS 핑거프린트 스푸퍼 활성)
            html = await tls_client.get_html(detail_url, use_proxy=True)
            
            # 2. 상세 이미지 리스트 파싱
            images = CoupangPDPImageParser.extract_pdp_images(html)
            if not images:
                logger.warning(f"상세 이미지가 없습니다. nodriver로 2차 시도합니다.")
                html = await UndetectedBrowserLoader.get_rendered_html(detail_url)
                images = CoupangPDPImageParser.extract_pdp_images(html)

            # 3. 이미지 S3 스트리밍 업로드 실행
            downloader = S3ImageDownloader()
            await downloader.parallel_download_pipeline(images, prefix=f"pdp/{detail_url.split('/')[-1]}/")
            
            # 4. 완료 데이터 반환 (결과 백엔드 DB 저장)
            return {"url": detail_url, "image_count": len(images)}

        try:
            # 동기 Celery 컨텍스트 내부에서 비동기 파이프라인 구동
            return asyncio.run(_run())
        except Exception as exc:
            # 실패 시 지수적 재시도 백오프 적용
            logger.error(f"[Celery Task Fail] 재시도를 대기합니다: {exc}")
            raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
else:
    celery_app = None


# --- 9. 새벽 2시 크론 스케줄러 & 진입점 ---
class VeroroCronScheduler:
    """새벽 2시 신상품 수집 파이프라인 스케줄러"""
    def __init__(self):
        self.dog_food_search = "https://www.coupang.com/np/search?q=%EA%B0%95%EC%95%84%EC%A7%80%EC%82%AC%EB%A3%8C"
        self.cat_food_search = "https://www.coupang.com/np/search?q=%EA%B3%A0%EC%96%91%EC%9D%B4%EC%82%AC%EB%A3%8C"

    async def execute_daily_pipeline(self):
        logger.info("🔔 [Cron Job] 새벽 2시 일일 신제품 크롤러 파이프라인을 기동합니다.")
        slack_monitor.send_alert("🚀 [DAILY CRAWL] 매일 새벽 2시 정기 수집 파이프라인 작동을 시작합니다.")

        for category, search_url in [("Dog Food", self.dog_food_search), ("Cat Food", self.cat_food_search)]:
            try:
                # 1. 검색 인덱스 획득 (TLS Spoofer)
                logger.info(f"[{category}] 검색 결과 수집 시작...")
                html = await tls_client.get_html(search_url, use_proxy=True)
                
                # 2. 리스트 추출
                products = CoupangSearchScraper.parse_search_results(html)
                logger.info(f"[{category}] 총 {len(products)}개의 상품 인덱싱 완료.")

                # 3. 분산 큐(Celery) 적재 또는 다이렉트 비동기 수집
                for prod in products[:5]: # 테스트를 위해 상위 5개만 로컬 파이프라인 구동
                    detail_url = prod["detail_url"]
                    if not detail_url:
                        continue
                    
                    if celery_app:
                        # Celery 분산 큐에 상세 페이지 파싱 위임
                        crawl_product_pdp_task.delay(detail_url)
                        logger.info(f"Celery 큐 적재 완료: {detail_url}")
                    else:
                        # 로컬 즉시 수집
                        logger.info(f"로컬 즉시 수집 가동: {detail_url}")
                        pdp_html = await tls_client.get_html(detail_url, use_proxy=True)
                        images = CoupangPDPImageParser.extract_pdp_images(pdp_html)
                        downloader = S3ImageDownloader()
                        await downloader.parallel_download_pipeline(images, prefix=f"local_pdp/{prod['product_id']}/")

            except Exception as e:
                logger.error(f"{category} 수집 중 예외 발생: {e}")
                slack_monitor.send_alert(f"🚨 [CRITICAL] {category} 새벽 수집 프로세스 도중 에러 발생: {e}")

    def run_scheduler_loop(self):
        if not schedule:
            logger.error("schedule 라이브러리가 없어 루프를 구동할 수 없습니다.")
            return

        # 매일 새벽 2시에 실행되도록 매핑
        def job():
            asyncio.run(self.execute_daily_pipeline())

        schedule.every().day.at("02:00").do(job)
        logger.info("⏰ 크론 스케줄러가 활성화되었습니다. 매일 새벽 2시 쿠팡 카테고리를 스캔합니다.")

        # 무한 스케줄 루프 실행 (별도 스레드 구동 권장)
        try:
            while True:
                schedule.run_pending()
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("크론 스케줄러를 수동 종료합니다.")


# --- 로컬 실행 및 시뮬레이션 동작 테스트 ---
if __name__ == "__main__":
    async def main_test():
        logger.info("=========================================")
        logger.info("베로로 프리미엄 크롤러 시스템 자가 시뮬레이션 시작")
        logger.info("=========================================")
        
        # 1. TLS Spoofer & Proxy 로테이션 테스트
        test_url = "https://httpbin.org/headers"
        logger.info(f"HTTP/2 TLS 핑거프린트 스푸퍼 자가진단 (대상: {test_url})")
        try:
            res_html = await tls_client.get_html(test_url, use_proxy=False)
            logger.info(f"결과 헤더 수집 성공:\n{res_html[:400]}")
        except Exception as e:
            logger.warning(f"네트워크 및 curl_cffi 모의 로드 테스트 예외 (가상 환경): {e}")

        # 2. BeautifulSoup 파싱 모의 테스트
        mock_search_html = """
        <li class="search-product" id="prod_888999" data-product-id="888999">
            <a class="search-product-link" href="/vp/products/888999">
                <img class="search-product-wrap-img" data-img-src="//thumbnail10.coupangcdn.com/img/888999_thumbnail.jpg" />
                <div class="name">로얄캐닌 인도어 캣 10kg</div>
                <strong class="price-value">49,000</strong>
            </a>
        </li>
        """
        logger.info("BeautifulSoup 검색 Scraper 시뮬레이션")
        results = CoupangSearchScraper.parse_search_results(mock_search_html)
        logger.info(f"추출 데이터: {results}")

        # 3. 상세 이미지 data-src 및 CDN 추출 테스트
        mock_pdp_html = """
        <div class="subType-IMAGE">
            <img class="pdp-img" data-src="//img1a.coupangcdn.com/images/detail/888_01.jpg" />
            <img class="pdp-img" src="//img1a.coupangcdn.com/images/detail/888_02.png" />
        </div>
        <script>
            var main_banner = "https://thumbnail.image.coupangcdn.com/banner_ad_99.jpg";
        </script>
        """
        logger.info("상세 이미지 PDP Parser 시뮬레이션")
        images = CoupangPDPImageParser.extract_pdp_images(mock_pdp_html)
        logger.info(f"추출 이미지: {images}")

        # 4. S3 비동기 스트리밍 다운로드 모의 가동
        logger.info("S3 청크 단위 이미지 병렬 다운로드 시뮬레이션")
        downloader = S3ImageDownloader()
        await downloader.parallel_download_pipeline(images)
        
        logger.info("=========================================")
        logger.info("시뮬레이션 완료. 모든 모듈이 유기적으로 완성되었습니다.")
        logger.info("=========================================")

    # 1회 시뮬레이터 가동
    asyncio.run(main_test())
