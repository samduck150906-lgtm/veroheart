# VeRoRo — 반려동물 먹거리 성분분석 앱 · UX/디자인 마스터 스펙

> "화해 + Yuka + OpenFoodFacts + Chewy + 네이버쇼핑"의 반려동물 버전.
> 목표 수준: Apple HIG / Material 3 / Awwwards / Red Dot.
> 실제 스택: **React 19 + Vite + Capacitor(iOS·Android) + Supabase + Zustand + recharts + lucide-react**, Toss풍 디자인(Pretendard, `--primary #FEE500`), 480px 모바일 셸.
> 문서 원칙: 디자이너가 Figma에서 바로 그리고 개발자가 그대로 구현할 수 있는 수준. Flutter(M3) 매핑 별도 제공.

---

## 0. 이 문서를 읽기 전에 — 코드베이스에서 발견한 사실(근거)

이 스펙은 추상론이 아니라 현재 `veroheart` 코드 기준으로 작성했다.

| 발견 | 파일 | 영향 |
|---|---|---|
| **가장 중요한 화면(분석 결과)이 깨져 있음** | `src/pages/AnalysisResult.tsx` | `report/score/grade/breakdown/hasPetProfile/displayIngredients/lifeStageString` **중복 선언**, 미정의 `selectedProduct·isLoggedIn·NutritionDonutChart·ToxicAlertList` 참조. `@ts-nocheck`로 가려짐. → **P0 최우선 복구 대상** |
| 스캔 탭 부재 | `src/components/BottomNav.tsx` | 탭이 홈/탐색/장바구니/랭킹/마이펫. 1순위 기능인 스캔 진입점이 IA에 없음 → **P0** |
| 좋은 자산 이미 존재 | `AnalysisSummaryHeader`, `ScoreGauge`(SVG 링 애니메이션), `BottomSheet`, `IngredientList`, `FeedingGuideCalculator`, `AnimatedNumber`, recharts Radar | 재사용/승격 대상 |
| 도메인 로직 이미 있음 | `utils/analysis.ts`, `utils/score.ts`(gradeFromScore, 하드캡 `breakdown.capped`), `analysis/nutrition.ts` | 화면만 정리하면 됨 |
| 토큰 존재하나 불완전 | `src/index.css` `:root` | radius/shadow/transition은 있으나 spacing scale·semantic color·dark tokens 없음 → 아래서 완성 |

**결론:** 신규 설계보다 "이미 있는 좋은 조각을 정리·승격 + 깨진 핵심 화면 복구 + 스캔 IA 신설"이 최단 임팩트 경로다.

---

## 1. 현재 UX 문제점 (Top 12)

1. **분석 결과 화면이 빌드 불능 상태** — 앱의 존재 이유인 화면이 half-refactor로 깨짐. (P0)
2. **스캔 진입점이 없음** — "바코드 스캔"이 1순위 기능인데 탭·홈 CTA에서 즉시 도달 불가. (P0)
3. **첫 화면 3초 규칙 미충족** — 홈이 커머스 피드 중심. "지금 무엇을 스캔/분석하지?"가 즉시 안 보임.
4. **점수의 의미 전달 부족** — 숫자(0~100)와 등급(A~F)은 있으나 "왜 이 점수인가"를 3초에 못 줌.
5. **정보 과잉/글 위주** — 기존 시장 문제(병원 느낌, 글씨만 많음)를 그대로 답습할 위험. 카드·시각화로 치환 필요.
6. **성분 상세의 근거(논문/출처) 미약** — Yuka·화해의 신뢰는 "출처"에서 나옴. 현재 source 링크가 산발적.
7. **맞춤성 약함** — 반려동물 프로필이 있어야 점수가 의미를 갖는데(`hasPetProfile`) 온보딩 유도가 약함. 프로필 없으면 고정 75점.
8. **비교 기능 얕음** — Comparison 126줄. "2~5개 Apple Compare 수준"과 거리.
9. **상태 UX 부재** — Empty / Error / Loading / Skeleton 컴포넌트 표준 없음(BottomSheet 외).
10. **다크모드·접근성 토큰 없음** — semantic/dark 토큰, 최소 44px 터치, 대비 기준 미정의.
11. **네비 5탭에 커머스가 과대** — 장바구니가 탭 1칸 차지. 핵심 여정(스캔→분석→대체추천)이 탭에 안 보임.
12. **모션이 일부 화면에만** — ScoreGauge 링 애니메이션은 훌륭하나, 앱 전역 모션 언어가 표준화 안 됨.

---

## 2. UX Audit (Heuristic Scorecard)

10점 만점, Nielsen 10원칙 + 모바일 커머스 기준.

| 항목 | 점수 | 근거 / 개선 방향 |
|---|---|---|
| 시스템 상태 가시성 | 4 | 로딩·진행 상태 표준 없음 → Skeleton/Progress 도입 |
| 실세계 일치(용어) | 7 | "자견·자묘/노령" 등 한국어 라벨 양호. 전문용어는 툴팁으로 |
| 사용자 제어/자유 | 6 | 뒤로가기 있음. BottomSheet 스와이프 닫기 표준화 필요 |
| 일관성/표준 | 5 | 인라인 스타일 산재, 컬러 하드코딩(`#15B36B` 등) → 토큰화 |
| 오류 예방 | 4 | 스캔 실패/미인식 플로우 없음 |
| 재인(recognition) | 6 | 등급 색/이모지 있음. 아이콘 라벨 병기 양호 |
| 유연성/효율 | 5 | 최근 분석·즐겨찾기 진입 약함 |
| 미학/미니멀 | 6 | Toss풍 기반 좋음. 정보 밀도 조절 필요 |
| 오류 복구 | 3 | 에러 UX 표준 없음 |
| 도움말/문서 | 5 | 성분 근거·출처 노출 강화 필요 |
| **평균** | **5.1/10** | **핵심 화면 복구 + 상태 UX + 토큰화가 최대 레버** |

---

## 3. 사용자 행동 흐름 (Core Jobs-To-Be-Done)

- **JTBD-1 "이거 우리 애 먹여도 돼?"** → 스캔/촬영/검색 → 3초 판정(A~F + 신호등) → 근거 → 대체안.
- **JTBD-2 "뭐 사지?"** → 맞춤 추천 → 비교 → 최저가 구매.
- **JTBD-3 "우리 애한테 뭐가 안 맞지?"** → 프로필(알레르기/질병) → 위험 성분 경보.
- **JTBD-4 "믿을 만해?"** → 성분 상세(효능/부작용/논문) → 리뷰 요약.

**황금 경로(Golden Path):** 앱 실행 → (중앙 FAB) 스캔 → 자동 인식 → **판정 카드** → "대체 상품 3개" → 구매. 목표: **탭 3회 이내, 읽기 최소.**

---

## 4. 정보구조 (IA)

```
VeRoRo
├─ 홈(Today)            첫 3초 · 스캔 CTA · 최근분석 · 맞춤추천 · 위험알림 · 건강리포트
├─ 탐색(Discover)       검색 · 카테고리 · 랭킹 · 필터/정렬
├─ [스캔]  ← 중앙 FAB  바코드 / 사진 OCR / 직접검색  (탭이 아닌 상시 FAB)
├─ 저장(Saved)         즐겨찾기 · 최근 분석 · 비교함
├─ 마이펫(Pet)         프로필 · 알레르기/질병 · 건강점수 · 뱃지/미션 · 설정
│
├─ (스택) 분석결과 · 성분상세 · 제품상세 · 비교 · 추천 · 리뷰 · 구매 · 알림센터
└─ (관리자) Admin*      기존 유지
```

**탭 재편(현행→제안):** `홈/탐색/장바구니/랭킹/마이펫` → **`홈/탐색/●스캔●/저장/마이펫`**. 장바구니는 헤더 아이콘(현존)으로, 랭킹은 탐색 하위로 흡수. 스캔은 중앙 볼록 FAB.

---

## 5. Navigation

- **하단 탭 5 + 중앙 스캔 FAB**(볼록형, 브랜드 옐로우). 현재 `bottom-nav`(fixed, pill, 480px, `env(safe-area-inset-bottom)`) 구조 유지하고 중앙 슬롯만 FAB로 승격.
- **헤더:** 좌 로고/타이틀, 우 검색·알림·장바구니(현행 유지). 상세/결과는 back + 화면명(현행 `AnalysisResult` 헤더 패턴 재사용).
- **제스처:** BottomSheet 스와이프 다운 닫기, 상세 스크롤 시 헤더 축소, 결과 하단 sticky "대체상품/구매" 바.
- **딥링크:** `veroro://product/{id}`, `veroro://scan`, 공유 URL → 웹 폴백.

---

## 6. User Flow (핵심 4개)

**A. 스캔→판정 (황금 경로)**
```
FAB 탭 → 카메라(권한 요청 카드) → 바코드 자동인식(가이드 프레임+햅틱)
   ├─ 성공 → 분석 결과(A~F, 3초 판정)
   ├─ 미등록 상품 → "사진으로 성분 찍기(OCR)" 폴백
   └─ 인식 실패(5s) → 재시도 / 조명 팁 / 직접 검색 (Error UX)
```
**B. 검색→분석:** 탐색 → 자동완성/오타보정 → 결과 → 제품상세 → "성분 분석" → 결과.
**C. 온보딩→맞춤:** 첫 실행 → 반려동물 3스텝(종/나이·몸무게/알레르기) → 홈 맞춤화(점수 개인화 활성).
**D. 결과→대체→구매:** 결과 하단 "더 잘 맞는 3개" → 비교 → 최저가 → 외부 구매(쿠팡/네이버) 안내.

---

## 7. Wireframe (텍스트 와이어)

**홈**
```
┌───────────────────────────┐
│ 🐶 우리 아이 이름 · 오늘의 한마디   │  header(fixed)
│ [🔍 검색               ] [🔔]     │
├───────────────────────────┤
│  ╔═══ 지금 바로 확인 ═══╗          │  Scan Hero Card
│  ║ [📷 스캔]  [🖼 사진]  [🔎검색] ║ │  One Screen One Action
│  ╚═════════════════════╝          │
│  최근 분석  ▸                      │  가로 스크롤 카드
│  [🟢A+][🟡C][🔴D] ...             │
│  오늘의 위험 알림  ▸               │  danger tint 카드
│  🐾 맞춤 추천 (우리 애한테)  ▸      │  개인화 캐러셀
│  건강 리포트   ▓▓▓▓░ 82점          │  게이미피케이션
│  인기 간식 랭킹  ▸                 │
└─────── [홈][탐색](●스캔●)[저장][펫] ┘
```

**분석 결과(가장 중요)**
```
┌───────────────────────────┐
│ ←  프리미엄 영양 리포트          │
│ ┌ 제품 카드(이미지/브랜드/이름) ┐   │  AnalysisSummaryHeader(기존)
│ │  ◯ 87  A등급  "아주 잘 맞아요"  │   │  ScoreGauge(기존, 링 애니)
│ └───────────────────────┘   │
│ [⚠ 알레르기: 닭 들어있어요]        │  하드캡 배너(기존 breakdown.capped)
│ ─ 신호등 3줄 요약 ─                │  🟢좋은점 3 · 🟡주의 2 · 🔴위험 0
│ [종합][영양소][전성분]  ← 탭        │
│  🍖 영양 도넛 / 레이더             │  recharts
│  ✅ 좋은 성분   ⚠ 주의 성분        │  칩 그리드(탭→성분상세)
│  🎯 추천대상 / 🚫 비추천대상        │
│  🔥 100g당 kcal · 급여량 계산      │  FeedingGuideCalculator(기존)
├───────────────────────────┤
│ [더 잘 맞는 상품 3개 ▸] [최저가 구매]│  sticky bottom bar
└───────────────────────────┘
```

---

## 8. 화면별 상세 UX (핵심 화면)

### 8.1 HOME — "3초 안에 뭘 할지"
- **Scan Hero Card**를 최상단 1순위. 3버튼(스캔/사진/검색) = One Screen, One Action(세 갈래지만 목적 하나: 분석 시작).
- **최근 분석**: 등급 색 pill로 한눈에. 없으면 Empty("첫 스캔을 해보세요" + CTA).
- **오늘의 위험 알림**: 프로필 알레르기/리콜 매칭 시에만 danger tint. 없으면 숨김(빈 카드 금지).
- **맞춤 추천**: 프로필 있을 때만. 없으면 "프로필 완성하고 추천받기" 인라인 CTA(현행 Layout에 이미 유사 로직 존재 → 홈으로 승격).
- **건강 리포트**: 반려동물 건강점수(게이미피케이션) 프로그레스.

### 8.2 SCAN — Apple Camera 수준
- 진입 즉시 카메라 프리뷰(권한은 첫 1회 friendly 카드로). 바코드 **자동 인식**(수동 셔터 불필요).
- **가이드 프레임**: 코너 브래킷 + 스캔 라인 애니메이션(Lottie/CSS). 인식 순간 프레임 초록 + **햅틱**(Capacitor Haptics) + 짧은 성공음(옵션).
- **모드 토글**: [바코드] [성분표 촬영(OCR)] 세그먼트. OCR은 자동 문서 감지 + 자동 캡처.
- **실패 UX**: 5초 미인식 → 하단 시트 "조명을 밝게 / 바코드를 프레임 안에 / 직접 검색". 미등록 바코드 → "사진으로 성분 찍기" 원탭 전환.
- 손전등 토글, 최근 스캔 썸네일, 갤러리에서 불러오기.

### 8.3 검색 — 쿠팡/네이버/당근 수준
- 포커스 시: **추천 검색어**(트렌딩) + **최근 검색**(칩, 개별 삭제).
- 입력 중: **자동완성**(제품/브랜드/성분 구분), **오타 보정**("혹시 이거? …").
- 결과: 카테고리 칩 + 필터(생애주기/알레르기프리/등급 A이상/가격) + 정렬(추천/평점/가격/최신).
- 결과 카드: 썸네일 + 등급 pill + 한줄평 + 최저가. 무한스크롤 + Skeleton.
- Empty("검색 결과 없음" + 대체 카테고리 제안), 최근검색 없을 때 인기 카테고리.

### 8.4 분석 결과 — 상세는 §27. (핵심 화면, 3초 판정)

### 8.5 성분 상세 — Wikipedia처럼
- 상단: 성분명(한/영) + 안전도 배지 + 한줄 정의.
- 섹션: 효능 / 부작용 / 근거·논문(출처 링크) / 사용 이유(왜 이 사료에) / 주의 대상(특정 질환·알레르기).
- "우리 애 기준" 배지: 프로필과 충돌 시 상단 경고.

### 8.6 비교 — Apple Compare 수준
- 2~5개 고정 헤더(가로 스크롤), 행: 등급/점수/단백·지방/칼로리/주의성분수/알레르기/가격.
- **최고값 하이라이트**(초록), 최저 회색. "가장 잘 맞는 제품" 배지 자동.

### 8.7 마이펫 — 온보딩이 곧 개인화
- 종(강아지/고양이) → 품종·나이·몸무게·중성화 → 질병·알레르기 → 좋아하는 간식.
- 저장 즉시 홈/점수 개인화. 여러 마리 프로필 전환(상단 아바타 스위처).

---

## 9. 컴포넌트 시스템 (Atomic + 승격 대상)

**Primitive:** Button(4 variant), IconButton, Chip/Tag, Card, Badge(등급/신호등), Divider, Avatar, ProgressRing, Skeleton, Toast, Tooltip.
**Composite(기존 승격):** `AnalysisSummaryHeader`, `ScoreGauge`→`GradeRing`, `BottomSheet`, `IngredientList`→`IngredientChipGrid`, `FeedingGuideCalculator`, `AnimatedNumber`, `ProductCard`, `ProductImageSlider`, RadarChart wrapper.
**신규:** `TrafficLightSummary`(🟢🟡🔴 3줄), `ScanFrameOverlay`, `AltProductStrip`(대체3), `CompareTable`, `StateView`(empty/error/loading 통합), `PetSwitcher`.

각 컴포넌트 = props 명세 + 상태(default/press/disabled/loading) + 토큰 참조 + a11y(role/label).

---

## 10. Design System 개요
- **Foundation:** Color(§11) · Type(§12) · Spacing(§13) · Radius · Elevation · Motion(§15).
- **Brand:** VeRoRo 옐로우 유지하되, **판정 신호등(초록/노랑/빨강)을 기능 컬러로 승격**(옐로우와 분리해 위험 커뮤니케이션 명확화).
- 단일 진실원천: `tokens.css`(웹) + `AppTokens`(TS) + Figma Variables 동기화.

---

## 11. 컬러 시스템 (토큰)

기존 `:root`을 semantic 3계층으로 재편(Ref → Semantic → Component).

```css
:root{
  /* Brand */
  --brand-500:#FEE500; --brand-600:#E5CE00; --brand-ink:#191F28;
  /* Neutral (Toss 계열 유지) */
  --gray-0:#FFFFFF; --gray-50:#F9FAFB; --gray-100:#F2F4F6; --gray-200:#E5E8EB;
  --gray-400:#B0B8C1; --gray-500:#8B95A1; --gray-700:#4E5968; --gray-900:#191F28;
  /* Semantic — 판정 신호등 (핵심) */
  --safe:#15B36B;    --safe-bg:#E7F8F0;
  --caution:#E8A800; --caution-bg:#FEF6E0;
  --danger:#F04452;  --danger-bg:#FDECEE;
  --info:#3182F6;    --info-bg:#E8F1FE;
  /* Grade */
  --grade-a:#15B36B; --grade-b:#6BB04E; --grade-c:#E8A800; --grade-d:#F04452; --grade-f:#8B95A1;
  /* Surface */
  --bg:var(--gray-0); --surface:var(--gray-0); --surface-alt:var(--gray-100);
  --text:var(--gray-900); --text-sub:var(--gray-500); --text-weak:var(--gray-400);
  --line:var(--gray-200);
}
```
- **대비:** 본문 텍스트 vs 배경 4.5:1 이상(WCAG AA). 옐로우 위 텍스트는 반드시 `--brand-ink`(검정)—흰 텍스트 금지.
- 하드코딩(`#15B36B` 등 AnalysisResult 내부) → 위 토큰으로 치환.

---

## 12. 타이포그래피 (Pretendard)

| Token | size/line | weight | 용도 |
|---|---|---|---|
| Display | 34/40 | 800 | 점수 숫자(ScoreGauge) |
| Title-1 | 22/28 | 700 | 화면 제목 |
| Title-2 | 18/24 | 700 | 섹션 헤더 |
| Body-L | 16/24 | 500 | 본문 |
| Body | 14/22 | 500 | 기본 |
| Label | 13/18 | 600 | 칩/버튼 |
| Caption | 12/16 | 600 | 보조 |
| Micro | 11/14 | 600 | 푸터/법적고지 |

- `letter-spacing:-0.02em`(제목), 숫자 `-0.03em`(현행 ScoreGauge와 일치).
- 최소 본문 14px, 접근성 "큰 글씨"에서 1.15× 스케일.

---

## 13. Spacing & Radius & Elevation

- **Spacing scale (4pt):** 2·4·8·12·16·20·24·32·40·56. 화면 좌우 gutter 16(현행 유지).
- **Radius:** sm 12 / md 20 / lg 28 (현행 유지) / pill 999 / full circle. 카드 md, 시트 상단 lg, 버튼 md.
- **Elevation:** e1 `0 2px 10px rgba(0,0,0,.03)` / e2 `0 10px 30px rgba(0,0,0,.06)` / e3 `0 20px 40px rgba(0,0,0,.08)`(현행 shadow 승격). FAB e3.
- **Touch target:** 최소 44×44(현재 app-icon-button 38px → 44 확대 권장).

---

## 14. Icon
- **lucide-react** 유지(SF Symbols 유사 라운드, 2px stroke = 규격 부합, 3D 아님 ✓).
- 규칙: 24 기본, 20 인라인, stroke 2(비활성)/2.25(활성)(현행 BottomNav 패턴). 항상 라벨/aria 병기.
- 도메인 아이콘 셋: 스캔(scan-line), 바코드, 알레르기(경고), 성분(flask/leaf), 등급(shield-check).

---

## 15. Motion
- **Easing:** standard `cubic-bezier(.4,0,.2,1)`(현행 --transition-fast), emphasized `cubic-bezier(.16,1,.3,1)`(현행 --transition-smooth, ScoreGauge에 사용중).
- **Duration:** micro 120ms / standard 200ms / enter 300ms / 링·게이지 900ms(현행).
- **원칙:** 위치=emphasized, 색/투명=standard, 페이지 전환 220ms fade+8px up(현행 `animate-fade-in` 승격).
- `prefers-reduced-motion` 존중(§32).

---

## 16. Interaction
- 탭: press 시 scale .97 + opacity .9(120ms). 카드 탭: 살짝 눌림 + 그림자 감소.
- 결과 탭 전환: 언더라인 슬라이드. 스캔 인식: 프레임 색전환 + 햅틱 + 카드 슬라이드업.
- Pull-to-refresh(홈/탐색), 무한스크롤, sticky 구매 바.

---

## 17. Micro Interaction (놀람 포인트)
- 점수 링 0→값 카운트업(현행 ScoreGauge) + 등급 배지 팝.
- 신호등 3줄 순차 페이드(stagger 60ms).
- 알레르기 감지 시 배너 shake 1회 + 햅틱 warning.
- 대체상품 등장 시 "짠" 카드 스택 펼침.
- 즐겨찾기 하트 버스트, 랭킹 상승 스파클.

---

## 18. Bottom Sheet 규칙 (기존 `BottomSheet.tsx` 표준화)
- 진입 300ms emphasized slide-up + 딤(0→.4). 상단 grabber(36×4, gray-200).
- Detent: content / half / full. 스와이프 다운으로 닫기, 딤 탭 닫기.
- 상단 radius lg(28), 좌우 full-bleed, 하단 safe-area 패딩. 스크롤 시 헤더 고정.
- 용도: 필터, 성분 상세 미리보기, 스캔 실패 도움말, 급여량 계산.

---

## 19. Dialog 규칙
- 파괴적/차단적 결정에만(삭제, 로그아웃, 외부 이동). 그 외는 Bottom Sheet/Toast.
- 구조: 타이틀(1줄) + 본문(2줄 이내) + [보조][주요]. 주요는 오른쪽, 파괴적은 danger.
- 딤 탭으로 취소 가능(파괴적 제외).

---

## 20. Toast 규칙
- 위치: 하단 탭 위 16px, 자동 3s(성공)/4s(정보). 실행취소는 5s + [실행취소].
- 종류: success(safe), info, error(danger). 아이콘+1줄. 동시 1개(큐잉).
- 예: "즐겨찾기 추가됨 · 실행취소", "장바구니에 담았어요".

---

## 21. Empty State (`StateView` 통합)
- 구성: 일러스트(라인, 브랜드톤) + 1줄 제목 + 1줄 설명 + 1 CTA.
- 예: 최근분석 없음→"첫 스캔을 시작해요"[스캔], 검색 0건→"다른 키워드로"[인기 카테고리], 즐겨찾기 0→"마음에 든 사료를 저장하세요".

---

## 22. Error UX
- 유형별: 네트워크(재시도), 권한 거부(설정 이동 안내), 스캔 미인식(도움말 시트), 서버(잠시 후), 미등록 상품(OCR 폴백).
- 톤: 비난 금지·해결책 우선. "문제가 생겼어요" + [다시 시도]. 기술 코드는 접기.
- 전역 `ErrorBoundary.tsx` 존재 → StateView 스타일로 통일.

---

## 23. Loading UX
- 즉시 피드백(<100ms 스피너 금지, skeleton 우선). 스캔 인식은 진행 링.
- 성분 분석: 3단계 progress("성분 읽는 중 → 위험도 계산 → 우리 애와 매칭") — 대기시간을 스토리로.
- 버튼 로딩: 라벨 유지 + 인라인 스피너, 중복 제출 방지.

---

## 24. Skeleton
- 카드/리스트/결과 각각 전용 스켈레톤. Shimmer(1.2s, gray-100→gray-50 그라디언트 이동).
- 실제 레이아웃과 동일 높이(레이아웃 시프트 0). 최소 표시 300ms(깜빡임 방지).

---

## 25. 검색 UX (상세)
- **자동완성 랭킹:** 정확일치 > 브랜드 > 성분 > 인기순. 매칭 하이라이트.
- **오타 보정:** 한글 자모 유사도 + 사전. "'로얄캐닌'을 찾으셨나요?".
- **필터(Bottom Sheet):** 생애주기, 알레르기프리(프로필 자동 반영), 등급≥, 가격대, 형태(건식/습식/간식). 적용 개수 배지.
- **정렬:** 추천/평점/가격↑↓/최신. **최근검색**(칩·삭제), **인기검색어**(순위 변동 표시).
- Debounce 250ms, 결과 Skeleton, 무한스크롤, "검색결과 없음" Empty.

---

## 26. 스캔 UX (상세)
- 권한: 첫 진입 friendly 카드("바코드를 읽으려면 카메라가 필요해요")→시스템 권한.
- 자동 인식(ZXing/ML Kit via Capacitor 플러그인). 프레임 안 정렬 시 자동 캡처.
- 상태: 탐색중(라인 애니) → 인식(프레임 초록+햅틱) → 조회 → 결과.
- 폴백 사다리: 바코드 실패 → OCR 촬영 → 직접 검색. 어느 단계든 1탭 전환.
- 부가: 플래시, 갤러리, 연속 스캔(비교함에 담기), 최근 스캔.

---

## 27. 분석 UX (가장 중요) — 3초 판정 설계

**정보 위계(위→아래, 스캔 순서):**
1. **판정 히어로**: `ScoreGauge`(0→점수 카운트업) + 등급 배지(A~F) + 한줄 평가("아주 잘 맞아요"). 색=등급색.
2. **하드캡 배너**(조건부): 알레르기/위험 성분 시 상단 경고(기존 `breakdown.capped` 로직 활용).
3. **신호등 3줄 요약**(신규 `TrafficLightSummary`): 🟢 좋은점 N · 🟡 주의 N · 🔴 위험 N — **글 대신 색·수·아이콘.**
4. 탭 [종합][영양소][전성분]:
   - 종합: 좋은/주의 성분 칩, 추천/비추천 대상, 알레르기.
   - 영양소: 도넛(단백/지방/탄수/회분/수분) + 레이더(recharts, 기존) + 100g당 kcal + 급여량 계산(기존).
   - 전성분: `IngredientList` → 성분상세로 드릴다운.
5. **sticky 하단바**: [더 잘 맞는 3개] [최저가 구매].

**설계 규칙:** 첫 화면(스크롤 전)에 판정+한줄평+신호등까지. 나머지는 아래로. 텍스트 블록 최대 2줄, 이후 "더보기".

**즉시 할 일 = §0의 P0:** `AnalysisResult.tsx`의 중복 선언·미정의 참조 제거, `NutritionDonutChart`/`ToxicAlertList`를 실제 컴포넌트로 구현하거나 기존 recharts/`IngredientList`로 대체, `selectedProduct`→store selector, `isLoggedIn`→`useStore` 로 정리, `@ts-nocheck` 해제.

---

## 28. 추천 UX
- **대체상품 3종 프레임:** "더 잘 맞는 / 더 저렴한 / 알레르기 대체". 각 카드에 "왜?" 한 줄(예: "닭 대신 연어, 등급 A").
- 현재 제품 대비 델타 표시(점수 +12, 가격 -3,000원).
- "비슷한 제품" 캐러셀. 추천 근거 투명성(프로필 기반임을 명시) → 신뢰.

---

## 29. 비교 UX
- 진입: 검색/결과/스캔에서 "비교 담기". 비교함(저장 탭) 최대 5.
- 표: 고정 첫열(항목) + 제품열 가로스크롤. 셀은 값 + 미니 막대. 최고값 초록 하이라이트.
- 하단 "종합 추천" 1개 + 각 제품 구매 링크.

---

## 30. 분석 UX
- **설명가능성:** 점수·경고에 항상 "왜"(성분·프로필 근거). 블랙박스 금지.
- **신뢰 표식:** 출처/논문 링크, "AAFCO 기준", 마지막 업데이트일.
- **의료 디스클레이머**(기존 `MEDICAL_DISCLAIMER`) 결과·성분 하단 상시.
- **리뷰 요약:** 리뷰 다수 → "장점 3 / 단점 2" 요약 + 원문 링크.
- 불확실성 정직 표기: 데이터 부족 시 "정보가 부족해 정확도가 낮아요".

---

## 31. 성능 최적화
- 코드 스플리팅(라우트별 lazy), recharts 등 무거운 청크 동적 import.
- 이미지: `ProductImage` lazy + srcset + blur placeholder, Capacitor 캐시.
- 리스트 가상화(탐색/랭킹), Zustand selector 최소 리렌더.
- Supabase: 필요한 컬럼만 select, 성분/제품 인덱스, 검색 RPC/pg_trgm, 결과 캐시.
- 스캔 인식 온디바이스(ML Kit)로 왕복 제거. 목표 LCP<2.5s, 인터랙션<100ms.

---

## 32. 접근성 (WCAG AA)
- 대비 4.5:1(본문)/3:1(큰텍스트·아이콘). 옐로우 위 검정 텍스트 강제.
- 터치 44×44, 포커스 링, 논리적 포커스 순서.
- VoiceOver/TalkBack: 모든 아이콘 버튼 aria-label(현행 일부 존재), 등급을 "A등급, 아주 잘 맞아요"로 읽기.
- 색만으로 정보 금지 → 신호등에 아이콘/텍스트 병기.
- 큰 글씨 모드(Dynamic Type) 대응, `prefers-reduced-motion` 시 애니 축소.

---

## 33. 다크모드
```css
:root[data-theme="dark"]{
  --bg:#0F1115; --surface:#161A20; --surface-alt:#1E232B;
  --text:#F2F4F6; --text-sub:#A7B0BC; --line:#2A303A;
  --safe:#3AD08A; --safe-bg:#0E2A1E;
  --caution:#F5C24B; --caution-bg:#2A2410;
  --danger:#FF6B75; --danger-bg:#2A1416; --info:#5AA0FF;
}
```
- 순수 검정 대신 딥 그레이(눈부심↓). 그림자 대신 border/surface 대비로 elevation.
- 브랜드 옐로우는 채도 약간↓. 이미지 카드 배경 surface-alt.

---

## 34. 2026 UX Trend 반영
- **스캔 우선 진입**: 홈 최상단 "스캔 = 즉답". 대기시간을 설명형 progress로.
- **Spatial/Soft depth**: 유리·소프트 그림자·라운드(현행 톤 유지, 과한 글래스는 성능 고려 절제).
- **Adaptive personalization**: 프로필·시간대 기반 홈 재구성.
- **Haptic-rich micro-feedback**, **정직한 분석(불확실성 표기)**, **웰빙형 게이미피케이션**(강박 아닌 습관).
- 큰 타이포 + 넉넉한 여백, 신호등 컬러 시맨틱.

---

## 35. Figma Auto Layout 구조 (개발가능 수준)
- **Page:** 01 Foundations / 02 Components / 03 Patterns / 04 Screens / 05 Prototype.
- **Variables:** color/{ref,semantic}, number/{space,radius}, string/{font}. Mode: Light/Dark, Density: Default/Large.
- **컴포넌트 예 — AnalysisResultCard(Auto Layout):**
  - Frame(vertical, gap 16, padding 16, fill surface, radius 20)
    - Header(horizontal, space-between): ProductThumb(64, hug) · Title(fill)
    - GradeRing(instance, fixed 128) + GradeMeta(vertical, fill)
    - TrafficLightSummary(horizontal, gap 8, wrap)
    - Tabs(horizontal, fill) → Content(fill, vertical)
    - StickyBar(horizontal, gap 8): AltBtn(fill) · BuyBtn(hug)
  - 모든 텍스트=Text Style, 색=Variable, 간격=space var. Constraints: 좌우 stretch.
- 인터랙티브: variant(state=default/press/loading), prototype(스캔→결과 smart animate).

---

## 36. Flutter(Material 3) 위젯 구조 (요청 매핑)

> 현 코드는 React지만, 요청대로 M3 매핑 제공(디자인 팀 참고용).

```dart
// tokens → ThemeData(useMaterial3: true, colorScheme: ...)
Scaffold(
  bottomNavigationBar: NavigationBar( ... 홈/탐색/저장/펫 ),
  floatingActionButton: FloatingActionButton.large( // 중앙 스캔
    child: Icon(Icons.qr_code_scanner)),
  floatingActionButtonLocation: docked,
  body: CustomScrollView(slivers: [
    SliverAppBar.medium(...),
    SliverList( AnalysisResultView(...) ),
  ]),
)

// 분석 결과
Column(children:[
  ProductSummaryCard(...),          // Card + Row
  GradeRing(score, grade),          // CustomPaint (arc) + TweenAnimationBuilder
  TrafficLightSummary(...),         // Wrap of Chip
  SegmentedButton(tabs),            // 종합/영양소/전성분
  IndexedStack(...),                // 탭 콘텐츠
])
```
- Chart: `fl_chart`(Radar/Pie) ↔ 웹 recharts. BottomSheet: `showModalBottomSheet(showDragHandle:true)`. Haptic: `HapticFeedback`. Skeleton: `shimmer`.
- 위젯↔React 대응: NavigationBar↔BottomNav, FAB↔ScanFAB, Card↔Card, SegmentedButton↔Tabs, showModalBottomSheet↔BottomSheet.

---

## 37. Supabase 데이터 모델 (화면 설계 반영)

```sql
pets(id, user_id, species, breed, birth_date, weight_kg, neutered,
     diseases text[], allergies text[], created_at)
products(id, barcode, name, brand_id, category, formulation,
         image_url, target_life_stage text[], calories_per_100g,
         guaranteed_analysis jsonb, price_min, buy_links jsonb)
ingredients(id, name_ko, name_en, purpose, risk_level, description,
            efficacy, side_effects, sources jsonb)
product_ingredients(product_id, ingredient_id, position, ratio)
analyses(id, user_id, pet_id, product_id, score, grade,
         breakdown jsonb, created_at)   -- 최근분석/캐시
favorites(user_id, product_id)
reviews(id, product_id, user_id, rating, body, media jsonb,
        ai_summary jsonb, helpful_count)
alerts(id, user_id, type, product_id, payload jsonb, read_at)
```
- **RLS:** pets/favorites/analyses/alerts는 `user_id = auth.uid()`.
- **화면-쿼리 매핑:** 홈 최근분석=`analyses order by created_at`; 결과=`products + product_ingredients + ingredients` join; 검색=`products` pg_trgm; 추천=score RPC(pet 기준); 대체=동일 category·상위 score.
- **Edge Function:** `analyze(product_id, pet_id)` → score/grade/breakdown 계산(기존 `utils/score.ts` 로직 이관), `alerts` 리콜 크론.

---

## 38. 디자인 토큰 (Color/Radius/Spacing/Elevation) — 배포용

```json
{
  "color": { "brand":{"500":"#FEE500","600":"#E5CE00"},
    "safe":"#15B36B","caution":"#E8A800","danger":"#F04452","info":"#3182F6",
    "grade":{"a":"#15B36B","b":"#6BB04E","c":"#E8A800","d":"#F04452","f":"#8B95A1"},
    "text":{"strong":"#191F28","sub":"#8B95A1","weak":"#B0B8C1"},
    "surface":{"base":"#FFFFFF","alt":"#F2F4F6"},"line":"#E5E8EB" },
  "radius": {"sm":12,"md":20,"lg":28,"pill":999},
  "space": {"1":4,"2":8,"3":12,"4":16,"5":20,"6":24,"7":32,"8":40,"9":56},
  "elevation": {"e1":"0 2px 10px rgba(0,0,0,.03)","e2":"0 10px 30px rgba(0,0,0,.06)","e3":"0 20px 40px rgba(0,0,0,.08)"},
  "motion": {"fast":"120ms","base":"200ms","enter":"300ms","gauge":"900ms",
    "ease-standard":"cubic-bezier(.4,0,.2,1)","ease-emphasized":"cubic-bezier(.16,1,.3,1)"}
}
```
Style Dictionary로 `tokens.css`(var) + `tokens.ts`(TS) + Figma Variables 3-way sync.

---

## 39. 디자인 QA 체크리스트
- [ ] 모든 색이 토큰(하드코딩 0). 인라인 스타일 → 클래스/토큰.
- [ ] 대비 AA 통과(특히 옐로우 위 텍스트=검정).
- [ ] 터치 타깃 ≥44, 포커스 표시.
- [ ] 상태 4종(default/press/disabled/loading) 정의.
- [ ] Empty/Error/Loading/Skeleton 존재.
- [ ] 라이트/다크 양쪽 스냅샷.
- [ ] 320px(iPhone SE)~480px 반응. 텍스트 오버플로우 ellipsis.
- [ ] 모션 `prefers-reduced-motion` 대응, safe-area 패딩.
- [ ] 결과 화면: 스크롤 전에 판정+한줄평+신호등 노출.
- [ ] aria-label/role, 색 외 정보 병기.

---

## 40. 즉시 개발 가능한 Screen Spec — 분석 결과(예시 완본)

**Route:** `/analysis` (state: `{productId}`) · **파일:** `src/pages/AnalysisResult.tsx`(복구)
**데이터:** `useStore(products, profile, isLoggedIn)` + `generateAnalysisReport` + `getRecommendationBreakdown` + `calculateCalories`.

**레이아웃(top→bottom, gutter 16):**
| # | 컴포넌트 | props | 토큰/규칙 | a11y |
|---|---|---|---|---|
| 1 | Header | back, "프리미엄 영양 리포트" | Title-1, line bottom | back aria "뒤로" |
| 2 | AnalysisSummaryHeader | image,name,brand,grade,score,lifeStage | Card md, e1 | — |
| 3 | GradeRing(ScoreGauge) | score,grade | 링 900ms, 색=grade-* | "N점 A등급 아주 잘 맞아요" |
| 4 | HardCapBanner(조건) | breakdown.capped, allergyHits | danger/caution-bg | role=alert |
| 5 | TrafficLightSummary | safeN,cautionN,dangerN | 칩, stagger 60ms | 각 칩 텍스트 |
| 6 | SegmentedTabs | ['종합','영양소','전성분'] | 언더라인 슬라이드 | role=tablist |
| 7a | 종합 | positives[],cautions[],targets | 칩 그리드 | — |
| 7b | 영양소 | NutritionDonut+Radar+kcal+FeedingGuide | recharts | 값 표 대체 텍스트 |
| 7c | 전성분 | IngredientList→성분상세 | 리스트 | 각 항목 링크 |
| 8 | StickyBottomBar | [대체3][최저가구매] | e3, safe-area | 버튼 라벨 |

**상태:** loading=결과 스켈레톤(히어로+3섹션) · empty(제품없음, 현행 유지) · error=StateView[다시시도].
**모션:** 진입 fade+up 220ms → 링 900ms → 신호등 stagger. 탭 200ms.
**성능:** recharts 동적 import, 이미지 lazy.
**QA:** §39 + "스크롤 전 판정 노출" 필수.

**복구 작업(P0, 개발 티켓):**
1. 중복 `const`(report/score/grade/breakdown/hasPetProfile/displayIngredients/lifeStageString) 제거 — 상단 1회 선언만.
2. `selectedProduct`→store selector, `isLoggedIn`→`useStore`.
3. `NutritionDonutChart`/`ToxicAlertList` → 신규 구현 or recharts/`IngredientList`로 대체.
4. `@ts-nocheck` 삭제 후 타입 통과.
5. 색 하드코딩 → 토큰.

---

## 부록 A. 벤치마크에서 가져올 "장점만"
| 앱 | 훔칠 장점 | VeRoRo 적용 |
|---|---|---|
| Yuka | 즉답 신호등 점수 + 대체상품 | 결과 히어로 + AltProductStrip |
| 화해 | 성분 사전·EWG식 등급·랭킹 | 성분상세·등급·랭킹 |
| OpenFoodFacts | 오픈 데이터·바코드·출처 | Supabase products + 출처 링크 |
| Chewy | 반려동물 프로필 기반 추천·재구매 | 마이펫·맞춤추천 |
| Amazon/쿠팡 | 검색 자동완성·필터·최저가 | §25 검색·구매 |
| 네이버쇼핑 | 가격비교·리뷰 | 구매·리뷰 |
| 당근 | 가벼운 톤·최근검색 | 카피 톤·검색 |
| 토스 | 미니멀·큰 숫자·마이크로카피·모션 | 디자인 시스템 전반(현행 계승) |
| Airbnb | 카드·필터 시트·일관 컴포넌트 | 컴포넌트 시스템 |
| Apple Health | 링·리포트·주간 요약 | 건강점수·리포트 |
| MyFitnessPal | 바코드 스캔·영양 로그 | 스캔·급여 로그 |

## 부록 B. UX 개선 100+ (P0/P1/P2)

### P0 — 지금 (기능 성립 조건)
1. AnalysisResult.tsx 복구(빌드/런타임) 2. 스캔 IA 신설(중앙 FAB) 3. 스캔 화면 자동인식 4. 결과 3초 판정 위계 5. 신호등 3줄 요약 6. 하드캡 경고 배너 7. 알레르기 감지 경보 8. 온보딩(반려동물 3스텝) 9. semantic/dark 토큰화 10. StateView(Empty/Error/Loading) 11. Skeleton 표준 12. 색 하드코딩 제거 13. 터치 44px 14. 옐로우 위 텍스트 대비 수정 15. 검색 자동완성 16. 최근 분석 홈 노출 17. 대체상품 3종 18. 성분상세 출처 링크 19. 의료 디스클레이머 상시 20. 결과 sticky 구매/대체 바.

### P1 — 다음 (경쟁력)
21. 오타 보정 22. 필터 시트 23. 정렬 24. 비교표 고도화 25. 최저가 비교 26. 리뷰 요약 27. 즐겨찾기 버스트 28. Toast 표준 29. BottomSheet detent 30. Pull-to-refresh 31. 무한스크롤 가상화 32. OCR 폴백 33. 플래시/갤러리 34. 연속 스캔→비교 35. 건강점수 리포트 36. 뱃지/미션 37. 알림센터(리콜/할인/유통기한) 38. 여러 마리 프로필 39. 프로필 스위처 40. 분석 progress 스토리 41. 다크모드 완성 42. Dynamic Type 43. VoiceOver 라벨 44. reduced-motion 45. 페이지 전환 모션 46. 카드 press 피드백 47. 검색 인기어 순위 48. 카테고리 칩 49. 급여량 계산 노출 50. 레이더/도넛 정리 51. 성분 "우리애 기준" 배지 52. 추천 근거 투명화 53. 델타 표시 54. 공유(PDF/의사에게) 55. 최근 스캔 히스토리 56~70. 마이크로: 링 카운트업·신호등 stagger·shake·스파클·grabber·shimmer·언더라인 슬라이드·스켈레톤 최소표시·토스트 큐·딤 페이드·FAB 그림자·hero 축소헤더·칩 wrap·이미지 blur-up·버튼 로딩.

### P2 — 고도화 (감동/리텐션)
71. 온디바이스 인식 속도 72. 위젯(오늘의 위험) 73. 홈 시간대 개인화 74. 재구매 알림 75. 유통기한 트래커 76. 다마리 대시보드 77. 커뮤니티(기존 Community 승격) 78. 전문가 Q&A 79. 성분 즐겨찾기 80. 리포트 주간 다이제스트 81. 스캔 스트릭 82. 시즌 테마 83. Lottie 성공 84. 음성 검색 85. 접근성 고대비 모드 86. 다국어 87. 오프라인 캐시 88. 스마트 대체(가격/알레르기/등급 3축) 89. 가격 히스토리 그래프 90. 브랜드 신뢰도 지표 91. 리콜 푸시 92. 급여 로그→성장곡선 93. 수의사 공유 링크 94. 비교 저장/공유 95. 질문 챗 "이거 먹여도 돼?" 96. 카메라 실시간 오버레이 판정 97. 위험성분 학습 카드 98. 성취 캘린더 99. 리뷰 신뢰도 스코어 100. 개인화 홈 재정렬 101. 스캔→장바구니 원탭 102. 다크모드 자동전환.

---

_문서 버전 v1 · 대상 스택: React 19 + Vite + Capacitor + Supabase (+ Flutter M3 매핑) · 최우선 액션: §0/§27/§40의 P0._
