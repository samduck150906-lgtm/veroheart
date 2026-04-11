# 베로로 (VeRoRo)

React 19 + Vite + TypeScript 기반의 반려동물 사료·용품 탐색·성분 분석 웹 앱입니다. 구매 전환은 **쿠팡(파트너스)** 연동을 전제로 하며, 앱 내 결제(토스페이먼츠 등)는 사용하지 않습니다. 데이터는 Supabase(Postgres + Auth + Edge Functions)를 사용합니다.

## 요구 환경

- Node.js 20+
- npm 10+

## 환경 변수

루트에 `.env`를 두고 Vite 접두사 `VITE_` 변수를 설정합니다.

| 변수 | 용도 |
|------|------|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon(공개) 키 |
| `VITE_KAKAO_JAVASCRIPT_KEY` | (선택) 카카오 공유 |
| `VITE_ADMIN_EMAILS` | (선택) 관리자 콘솔 접근 허용 이메일, 쉼표로 구분. 비어 있으면 `/admin`은 로그인해도 열리지 않음 |

**Supabase Edge (선택)**

- `CORS_ALLOWED_ORIGINS` — Edge Function CORS. 비어 있으면 `*`. 운영 시 허용 도메인을 쉼표로 지정하세요.

**쿠팡파트너스**

- 쿠팡에서 발급한 파트너스 링크·태그를 쓰려면 별도 정책에 맞춰 `externalPurchase` 또는 랜딩 URL을 조정하면 됩니다. 현재는 상품 ID·검색어 기준 일반 쿠팡 URL로 연결합니다.

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
- **Supabase**: `analyze-ingredients`, `personalized-score` 등 AI·점수 관련 Edge Function.

## 관리자 콘솔

`/admin`은 Supabase Auth로 로그인한 사용자의 이메일이 `VITE_ADMIN_EMAILS`에 포함될 때만 접근 가능합니다.

## 라이선스

비공개 저장소(`private: true`)입니다.
