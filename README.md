# 베로로 (VeRoRo)

React 19 + Vite + TypeScript 기반의 반려동물 사료·용품 탐색·성분 분석·결제 흐름을 포함한 웹 앱입니다. 데이터는 Supabase(Postgres + Auth + Edge Functions)를 사용합니다.

## 요구 환경

- Node.js 20+
- npm 10+

## 환경 변수

루트에 `.env`를 두고 Vite 접두사 `VITE_` 변수를 설정합니다.

| 변수 | 용도 |
|------|------|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon(공개) 키 |
| `VITE_TOSS_WIDGET_CLIENT_KEY` | 토스페이먼츠 결제 위젯 클라이언트 키 |
| `VITE_KAKAO_JAVASCRIPT_KEY` | (선택) 카카오 공유 |
| `VITE_ADMIN_EMAILS` | (선택) 관리자 콘솔 접근 허용 이메일, 쉼표로 구분. 비어 있으면 `/admin`은 로그인해도 열리지 않음 |

**서버/Edge (Supabase Secrets, Netlify 등)**

- `TOSS_SECRET_KEY` — 결제 승인 API용 시크릿 키
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Netlify `confirm-payment`에서 주문 금액 검증 시 사용
- `CORS_ALLOWED_ORIGINS` — (선택) Supabase Edge Function CORS. 비어 있으면 `*` (개발 편의). 운영 시 `https://app.example.com,https://www.example.com` 형식 권장

## 스크립트

```bash
npm ci
npm run dev      # 개발 서버
npm run build    # 타입체크 + 프로덕션 빌드
npm run lint     # ESLint
npm run test     # Vitest 단위 테스트
```

## 배포 개요

- **프론트**: Vite 정적 빌드(`dist`). Netlify 사용 시 `netlify.toml`의 SPA 폴백과 관리자 호스트 리다이렉트를 참고하세요.
- **Supabase**: Edge Function `confirm-payment`가 DB `total_amount`와 클라이언트 `amount`를 대조한 뒤 토스 승인을 호출합니다.
- **Netlify Functions**: `netlify/functions/confirm-payment.js`는 Supabase와 동일한 주문 검증 로직을 사용합니다. 배포 시 위 Supabase 서비스 롤 키와 URL을 환경 변수로 넣어야 합니다.

## 관리자 콘솔

`/admin`은 Supabase Auth로 로그인한 사용자의 이메일이 `VITE_ADMIN_EMAILS`에 포함될 때만 접근 가능합니다. 클라이언트에 비밀번호를 두지 않습니다. RLS로 실제 데이터 보호를 강화하는 것을 권장합니다.

## 라이선스

비공개 저장소(`private: true`)입니다.
