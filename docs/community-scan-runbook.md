# 커뮤니티 제품 스캔 운영 가이드

## 기능 범위

로그인 사용자가 제품 전면, 원재료명, 영양·등록성분 사진을 제출하면 라벨 사실만 추출합니다. 추출기는 위험도, 알레르기 판정, 추천, 점수를 만들지 않습니다. 사용자가 라벨 내용을 확인한 뒤 제품이 공개되며, 바코드 충돌이나 불명확한 중복은 `needs_review` 대기열로 이동합니다.

## 배포 전 설정

1. Supabase 마이그레이션을 순서대로 적용합니다.
2. Netlify AI Gateway에서 Google Gemini를 활성화합니다. 함수 런타임에 `GEMINI_API_KEY`와 `GOOGLE_GEMINI_BASE_URL`이 제공되는지 확인합니다.
3. Netlify 함수 전용 환경변수를 설정합니다.
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SCAN_RATE_LIMIT_SECRET`: 32바이트 이상의 무작위 값
4. Supabase 관리자 함수 환경변수 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SESSION_SECRET`, `CORS_ALLOWED_ORIGINS`를 확인합니다.
5. `system_settings.community_scan_enabled`를 `true`로 바꾸기 전 미리보기 환경에서 세 종류의 사진으로 한 건을 끝까지 처리합니다.

서버 키는 `VITE_` 접두사를 붙이지 않으며 브라우저 번들에 넣지 않습니다.

## 제한과 보관

- 사용자당 최근 1시간 새 제출: 5건
- IP 해시당 1시간 생성/업로드 요청: 각 20건
- 원본 파일: 장당 최대 5MB, 서버 저장 형식 WebP
- `published`, `rejected`, `cancelled` 상태가 30일 지난 원본 사진은 매일 삭제합니다.
- 삭제 후에도 추출 텍스트, 사용자 확인값, 제품 관측 기록, 공개 제품, 감사 기록은 유지합니다.
- 일부 사진 삭제가 실패하면 실패한 경로만 남겨 다음 실행에서 재시도합니다.

## 오류 코드

| 코드 | 의미 | 처리 |
|---|---|---|
| `community_scan_disabled` | 신규 접수 중지 | 설정 확인 |
| `user_rate_limited`, `ip_rate_limited` | 제출 제한 초과 | 제한 창 종료 후 재시도 |
| `extraction_failed`, `invalid_extraction` | 라벨 추출 실패 | 사진 품질 확인 후 재시도 |
| `barcode_conflict` | 스캔값과 인쇄값 불일치 | 포장 사진 확인 후 병합 또는 반려 |
| `ambiguous_duplicate` | 중복 후보가 둘 이상 | 정확한 제품 ID 확인 후 병합 |
| `stale_duplicate_decision` | 처리 중 제품 정보 변경 | 목록 새로고침 후 재검토 |

## 검토 대기열 처리

`관리자 > 스캔 검토`에서 상태, 오류 코드, 날짜로 찾습니다. 사진은 행을 연 경우에만 5분짜리 서명 URL로 표시됩니다.

- 병합: 정확한 기존 제품 UUID와 근거를 입력합니다.
- 반려: 사유를 입력합니다.
- 재시도: 실패 또는 검토 필요 상태에서만 사용합니다. 다음 처리 요청 시 보관된 사진으로 다시 분석합니다.

모든 변경에는 관리자, 제출 ID, 제품 ID, 전후 상태, 사유가 감사 로그에 기록됩니다. 기여자 이메일과 비공개 저장 경로는 목록 응답에 포함하지 않습니다.

## 중지 스위치

긴급 중지는 `system_settings.community_scan_enabled=false`로 설정합니다. 새 제출과 새 업로드만 차단되며 이미 공개된 제품은 숨기거나 삭제하지 않습니다. 원인 해결 후 미리보기에서 생성·업로드·추출을 확인하고 다시 활성화합니다.
