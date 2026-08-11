# VERORO App 디자인 이식 노트

출처: Claude Design 핸드오프 `VERORO App.dc.html` (프로젝트 `VERORO 앱 디자인 시스템`)
관련 파일: `android-frame.jsx`(디바이스 프레임 — 프로토타입 전용), `logo.png`, `support.js`(런타임 — 이식 대상 아님)

프로토타입은 단일 HTML 안에서 `route` 상태로 15개 화면을 전환하는 목업이다.
실제 앱은 React Router + Supabase 기반이므로, **화면의 시각 결과물만** 옮기고
데이터·로직은 기존 것을 그대로 쓴다.

## 1. 디자인 토큰

`src/styles/veroro-design.css` — `index.css` 다음에 로드되어 레거시 토큰을 새 팔레트로 재타게팅한다.

| 프로토타입 상수 | 값 | 토큰 |
| --- | --- | --- |
| `INK` | `#15150F` | `--vr-ink` (텍스트/테두리), `--vr-inverse` (어두운 패널) |
| `YEL` | `#FFD90A` | `--vr-yellow` |
| `SUB` | `#8A8A7C` | `--vr-sub` |
| `LINE` | `#E3E1D8` | `--vr-line` |
| 카드 테두리 | `#EDEBE3` | `--vr-card-line` |
| 연한 면 | `#F7F6F1` | `--vr-soft` |
| `GC` (등급) | A `#0E8A46` … F `#C2302B` | `--vr-grade-*-fg/bg` |
| `LVL` (신호등) | 좋음/보통/위험 | `--vr-signal-*-fg/bg` |

- 서체는 Pretendard 단일 스택으로 통일했다(`index.html`의 Plus Jakarta Sans 링크 제거).
- 프로토타입 키프레임(`vFade` `vUp` `vSheet` `vRing` `vSheen` `vPulse` `vLaser` `vBlink`)을
  이름 그대로 옮겼고, `prefers-reduced-motion`에서 모두 정지한다.
- 코드에서 쓰는 토큰 참조·헬퍼는 `src/lib/veroroDesign.ts` (`gradePalette`, `gradeVerdict`,
  `fitShortLabel`, `monogram`).

## 2. 셸 크롬

| 요소 | 구현 |
| --- | --- |
| 스플래시 | `src/App.tsx` — 잉크 배경 + 워드마크 + 노란 점 3개 펄스 |
| 첫 진입 게이트 | `src/components/EntryGate.tsx` — 하단 시트 + 3단계 안내 |
| 헤더 | `src/components/AppHeader.tsx` — 로고 헤더 / 뒤로 헤더 분기, 8px 스크롤 시 그림자 |
| 라우트 → 크롬 매핑 | `src/lib/routeChrome.ts` (`showLogoHeader`/`showBackHeader`/`showNav` 표) |
| 하단 탭바 | `src/components/BottomNav.tsx` — 꽉 찬 바 + 56px 노란 스캔 FAB(-26px 돌출) |
| 워드마크 | `src/components/Wordmark.tsx` — `public/veroro-wordmark.png`에서 글자 영역 크롭 |

헤더·탭바는 더 이상 `position: fixed`가 아니라 셸 플로우 안에 들어간다
(`.app-header` / `.bottom-nav` 오버라이드). 화면 컴포넌트에서 고정 헤더 보정용
`paddingTop`을 넣지 말 것.

## 3. 화면별 이식 범위

| 프로토타입 화면 | 앱 경로 | 상태 |
| --- | --- | --- |
| Home | `/` | 전면 재작성 (히어로·스캔 CTA·카테고리·주의 성분 카드·최근 본·추천·이벤트 배너) |
| Search | `/search` | 검색 필드·필터/카테고리 칩·결과 카드(`ProductRow`)·비교함 바 이식 |
| Detail | `/product/:id` | 풀블리드 히어로 + 찜 버튼, 잉크 등급 배너, 하단 CTA 바 |
| Analysis | `/analysis` | 잉크 헤더 + 등급 링(`ReportHero`) + A~F 스케일 |
| Comparison | `/comparison` | 전면 재작성 (비교표 + 요약 카드) |
| Login | `/login` | 전면 재작성 (워드마크·입력·비밀번호 규칙 2열) |
| Scan | `/scan` | 전면 재작성 (뷰파인더 프레임·레이저·힌트) |
| ViralEvent | `/event/viral` | 전면 재작성 (노란 히어로 + 3단계) |
| NotFound | `*` | 전면 재작성 |
| Terms / Privacy / Refund | `/terms` 등 | 타이포 재조정(법적 문구는 그대로) |
| MyPet / Diary / Brand / Quiz | `/profile`, `/brand/:name`, `/event/personality-quiz` | 토큰 재타게팅으로 새 팔레트 적용, 구조는 기존 유지 |
| Admin | `/admin/*` | 프로토타입의 데스크톱 목업은 이식하지 않음(기존 관리자 화면 유지) |

## 4. 의도적으로 다르게 간 부분

- **가격**: 프로토타입은 카드·상세에 가격을 노출하지만 `Product` 모델에 가격 필드가 없다.
  값을 지어내지 않고, 대신 평점·리뷰 수를 같은 자리에 넣었다.
- **소셜 로그인**: 프로토타입에는 카카오/구글 버튼이 있으나 앱은 이메일 인증만 지원한다
  (`Login`에 명시). 동작하지 않는 버튼을 만들지 않았고, 그 자리에 인증 메일 재전송을 뒀다.
- **다크 모드**: 프로토타입의 토글은 "다음 버전" 토스트만 띄우지만, 앱에는 실제 테마 기능이
  이미 있어 유지했다. 새 팔레트의 다크 페어링을 `veroro-design.css`에 추가했다.
- **상세 하단 CTA**: 프로토타입 문구는 "분석 리포트 보기"지만, 앱의 CTA는 급여 기록
  ("우리 아이가 먹었어요")이고 테스트도 이를 검증한다. 문구·동작은 유지하고 형태만 맞췄다.
  분석 리포트 진입은 상세 상단의 잉크 등급 배너가 담당한다.
- **초대 현황(3/5명)**: 백엔드 카운터가 없어 실제 리워드 안내로 대체했다.
- **푸터**: 프로토타입에는 없지만 법적 링크가 필요해 유지했다.
