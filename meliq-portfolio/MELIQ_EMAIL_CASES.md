# 메일 본문용 초압축 사례

> 아래 블록을 메일 본문에 그대로 붙여 넣을 수 있습니다.

---

름랩은 사용자 화면만 제작하지 않고 회원·Backend·Database·Admin을 함께 구성하여 실제 운영 가능한 서비스를 구축해 왔습니다. MELIQ MVP와 구조적으로 유사한 사례 3건을 정리해 드립니다.

■ 학우너 (Hakwooner)
담당 범위: 사용자 앱(Flutter) · REST API(Express) · 원장 ERP(Next.js 126화면) · PostgreSQL 스키마 설계(222테이블/310마이그레이션) 전체
주요 구현: 소셜 로그인 포함 회원 인증, 8개 역할 권한 및 RLS 459정책, 거리·과목·목표·예산·리뷰 6개 축 가중치 기반 추천 엔진, 결제·구독·정산, 운영자 대시보드
MELIQ 관련성: MELIQ의 Recommendation Module·Fit Score·Why it fits와 동일한 구조 — 0~100 정규화 점수와 추천 사유 문장을 함께 반환하고, 검증 임계값으로 근거가 약한 신호를 배제
URL: https://hakwooner.kr (원장 ERP: https://owner.hakwooner.kr)

■ VeRoRo
담당 범위: 모바일 우선 사용자 웹(React 19) · 관리자 콘솔 10화면 · Supabase 스키마 및 Edge Function · iOS/Android 패키징
주요 구현: 제품·원재료 정규화 DB, 원재료 위험도·알레르기 교차반응·질환 규칙 기반 분석 엔진, 적합도 점수와 A~F 등급 산출, 검수 상태·정보 완성도 관리, 사용자 인증과 분리된 관리자 인증 체계
MELIQ 관련성: Product DB + 사용자 입력 기반 Fit Check + Risk Filter + Fit Score + 근거 문장화 + 결과 저장 + Admin CRUD가 이미 같은 형태로 구현되어 있어, 도메인만 K-beauty로 바뀌는 구조
URL: https://veroro-app.netlify.app

■ 세탁 서비스 앱 (A.care)
담당 범위: 거래처 주문 앱(Flutter) · 관리자 웹 12화면(React 19) · API 서버(Express 5) · PostgreSQL 29테이블/24마이그레이션 · OpenAPI 공용 계약
주요 구현: 주문 상태 5종과 이행 단계 4종 분리 및 허용 전이표 관리, 모든 상태 변경이 행 잠금·버전 확인을 거치는 단일 통로, 역할 6종×권한 31종 매트릭스, 예치금 원장과 PG 결제 대사, 기간별 통계
MELIQ 관련성: Admin Dashboard 권한 분리, 결과 상태·History 관리, 개인정보 대량 반출 권한 분리 등 실제 운영 단계에서 필요한 구조를 구축한 사례
URL: 거래처 전용 비공개 시스템 (앱·관리자 웹, 공개 URL 미제공)

세 사례 모두 사용자 서비스와 관리자 운영 화면이 동일한 Backend/Database를 기반으로 연결되는 구조로 구현했습니다. 상세 자료와 화면 캡처는 첨부 문서를 참고해 주시기 바랍니다.

---

<sub>URL 표기 원칙: 저장소의 설정 파일·문서에서 실제 서비스 주소로 확인된 경우에만 기재했습니다. 세탁앱은 거래처 전용 비공개 시스템이라 공개 URL을 넣지 않았습니다(저장소 문서에는 내부 주소가 있으나 대외 제안서 노출은 부적절하다고 판단).</sub>
