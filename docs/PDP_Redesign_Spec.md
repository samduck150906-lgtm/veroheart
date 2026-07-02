# 베로로 제품 상세 화면(PDP) 리디자인 스펙 v1

> Principal Product Designer 작성 · 대상: 강아지·고양이 먹거리 성분분석 앱 `veroheart`
> 목표: **사용자가 3초 안에 "이 제품 사도 되나?"를 판단**하게 하는 상세 화면
> 구현 기준: Flutter (Material 3) + Figma Auto Layout / 기존 React(`src/pages/Detail.tsx`) 매핑 병기
> 데이터 근거: `Product`, `Ingredient(riskLevel/isAllergy)`, `UserPetProfile(allergies/healthConcerns)`, `generateAnalysisReport().score`

---

## 0. 3초 판단 원칙 (설계 북극성)

한 화면(첫 스크린, 스크롤 0)에서 아래 3개만으로 의사결정이 끝나야 한다.

1. **점수 게이지** — 안전한가? (숫자+등급+색)
2. **한 줄 판정** — 우리 아이가 먹어도 되나? (프로필 기준 개인화 문장)
3. **Sticky CTA** — 지금 살 수 있나? (가격+구매)

나머지 20여 개 섹션은 "믿음의 근거(evidence)"로, 스크롤할수록 신뢰가 쌓이는 **역피라미드 구조**다.

---

## 1. UX Audit (현재 화면 진단)

`src/pages/Detail.tsx` 실측 기준. 점수는 5점 만점.

| 영역 | 현재 상태 | 점수 |
|---|---|---|
| 첫인상/판단 속도 | 점수(0~100)를 이미 계산(`generateAnalysisReport`)하나 **게이지로 노출하지 않음**. 상단은 결론 문구 카드 → 히어로 이미지 → 브랜드/이름 순. 핵심 숫자가 안 보임 | ★★☆☆☆ |
| 정보 우선순위(IA) | 결론 카드가 최상단이나 점수·성분·가격이 흩어져 있고 시각 위계 약함 | ★★☆☆☆ |
| 성분 시각화 | 위험/주의/알레르기 필터링 로직은 존재. 그러나 칩/게이지/근거 없이 리스트 위주 | ★★☆☆☆ |
| 개인화(우리 아이 적합도) | `headline`으로 알레르기·위험 카운트만. 프로필(견종·나이·질환) 반영 약함 | ★★☆☆☆ |
| 영양 밸런스 | **데이터·차트 없음**(과거 FeedingGuide는 dead code로 제거됨) | ☆☆☆☆☆ |
| 대체상품 | 같은 카테고리 1개만 조건부 노출. 캐러셀·유형(저렴/최고/수의사) 없음 | ★☆☆☆☆ |
| 가격비교 | `coupangLink` 단일 채널. 네이버/펫샵/최저가 비교 없음 | ★☆☆☆☆ |
| 리뷰 | 별점·태그·목록 존재. **AI 요약·별점분포·사진리뷰 없음** | ★★☆☆☆ |
| CTA | 비교/구매 버튼이 본문 인라인 → **하단 고정(sticky) 아님** → 스크롤 중 구매 유실 | ★★☆☆☆ |
| 상태 UX | Skeleton/Empty/Error/Offline 미비. 로딩은 스피너 1종 | ★☆☆☆☆ |
| 접근성 | 색만으로 위험 전달(색약 취약), 폰트 하드코딩, 대비 미검증 구간 존재 | ★★☆☆☆ |
| 신뢰 신호 | `verificationStatus` 배지 존재(좋음). 근거수준/신뢰도/출처는 없음 | ★★★☆☆ |

**총평:** 데이터·엔진은 이미 있으나 **"판단을 대신 내려주는 시각적 위계"가 부재**. 리스트를 읽게 만드는 화면 → 판단을 떠먹여 주는 화면으로 전환이 핵심.

---

## 2. 현재 화면의 문제점 (Top 12)

- P0-1. **점수가 안 보인다.** 이미 계산된 0~100/등급을 히어로로 승격하지 않음.
- P0-2. **CTA가 고정이 아니다.** 스크롤 시 구매 접근성 상실.
- P0-3. **개인화 판정이 약하다.** "우리 아이(견종·나이·질환·알레르기) 기준 적합도%"가 없음.
- P0-4. **위험을 색으로만 전달.** 색약/저시력 취약, 아이콘·라벨 이중 부호화 부재.
- P1-5. 영양 밸런스 시각화 전무(도넛/레이더).
- P1-6. 대체상품이 빈약(1개, 유형 구분 없음).
- P1-7. 가격비교 채널 단일.
- P1-8. 리뷰에 AI 요약·분포·사진 없음.
- P1-9. 성분에 근거수준/신뢰도/출처 없음 → 신뢰 저하.
- P2-10. Skeleton/Empty/Error/Offline 상태 미설계.
- P2-11. 스크롤 위치 감각(진행률)·Sticky Score 없음.
- P2-12. 모션/햅틱/마이크로 인터랙션 부재로 "프리미엄 감" 약함.

---

## 3. 개선 목표 (측정 가능 KPI)

| 목표 | 지표 | 타깃 |
|---|---|---|
| 3초 판단 | 첫 스크린 내 점수·판정·CTA 노출 | 100% (스크롤 0) |
| 판단 속도 | Time-to-decision (히트맵/세션) | 중앙값 < 3s |
| 구매 전환 | PDP→CTA 클릭률 | +30% |
| 신뢰 | "정보를 믿는다" 설문 | +25%p |
| 접근성 | WCAG 2.2 AA 자동검사 통과 | 100% |
| 스크롤 효율 | 핵심정보 도달까지 스크롤 | 1스크린 내 |

---

## 4. 정보 구조 (IA)

역피라미드 · "판정 → 근거 → 대안 → 구매".

```
PDP
├─ A. Hero (이미지·브랜드·제품명·용량·가격·평점·리뷰수·즐겨찾기·공유)
├─ B. AI Safety Score (원형 게이지 · 등급 · 한 줄 요약)   ← 최상위 시선
├─ C. At-a-Glance 요약 그리드 (안전/위험/알레르기/추천·비추천/연령/칼로리/제조국)
├─ D. AI 한 줄 분석
├─ E. 우리 아이 적합도 (프로필 기준 %, 근거)
├─ F. 좋은 성분 (카드: 아이콘·효능·근거수준·신뢰도)
├─ G. 주의 성분 (Orange, 위험도·이유·장기섭취·권장량·민감견)
├─ H. 원재료 분석 (Chip/Tag/Stack → 탭 시 Bottom Sheet)
├─ I. 영양 밸런스 (도넛 + 레이더)
├─ J. AI 종합 의견 (3줄)
├─ K. 대체 상품 (가로 캐러셀: 더 건강/더 저렴/동가 최고/수의사추천)
├─ L. 가격 비교 (쿠팡·네이버·펫샵 · 최저가 강조)
├─ M. 리뷰 (AI 요약·별점분포·사진/영상)
├─ N. FAQ (Accordion)
├─ O. AI Q&A (질문→AI 답변)
└─ Floating: Sticky Score(collapse) · Floating AI · Compare · 하단 고정 CTA
```

**노출 규칙:** B·D·E는 데이터 없어도 스켈레톤/기본값으로 항상 노출. I·L·O는 데이터 의존 → 없으면 섹션 자체 숨김(빈 카드 금지).

---

## 5. 레이아웃 구조

- **캔버스:** 모바일 우선, 콘텐츠 최대폭 **480px** 중앙 정렬(현 앱과 동일), 데스크톱은 좌측 이미지/우측 정보 2컬럼(≥960px)로 확장.
- **그리드:** 4pt 베이스 · 8pt 그리드. 좌우 세이프 패딩 **20px**.
- **레이어(z-index):**
  - z0 콘텐츠 스크롤 · z10 Sticky Score(상단 pin) · z20 Floating AI/Compare(우하단) · z30 하단 고정 CTA · z40 Bottom Sheet/Scrim · z50 토스트/Dynamic-Island 상태.
- **세로 리듬:** 섹션 간 24px, 카드 내부 16px, 요소 간 8~12px.
- **Sticky 영역 높이:** 상단 Sticky Score 56px, 하단 CTA 72px(+세이프에어리어). 스크롤 콘텐츠는 `padding-bottom: 96px`로 CTA 겹침 방지.

---

## 6. Wireframe (텍스트 목업)

```
┌──────────────────────────────┐  ← Sticky Score (스크롤 시 등장, 56)
│ ‹  [92 A]  로얄캐닌 미니…   ♡ ⤴ │
├──────────────────────────────┤
│                              │
│      [   제품 이미지   ]      │  Hero (핀치 줌 / 탭 확대)
│                              │
│  로얄캐닌  ·  검수완료 ✓       │
│  미니 인도어 어덜트 2kg        │
│  ★4.7 (1,284)     29,900원   │
│                        ♡  ⤴  │
├──────────────────────────────┤
│      ◯  AI 안전점수           │
│    ╭─92─╮   A       매우 안전 │  ← 원형 게이지 (초록)
│    ╰────╯                     │
│  "대부분의 반려동물에게 추천" │
├──────────────────────────────┤
│ [🛡 안전 높음][⚠ 주의 1]      │  At-a-Glance 2열 그리드
│ [🚫 알레르기 없음][🎯 성견]   │
│ [🔥 372kcal/100g][🌍 프랑스]  │
├──────────────────────────────┤
│ 🤖 "알레르기 유발 성분이 없고 │  AI 한 줄
│     단백질 품질이 우수합니다." │
├──────────────────────────────┤
│ 🐶 우리 아이 적합도  95%      │  개인화
│ ✔말티즈 ✔4살 ✔슬개골 ✔닭알레│
│ [자세히 보기]                 │
├──────────────────────────────┤
│ ✅ 좋은 성분 (4)              │  카드 리스트
│ [닭고기 · 고품질 단백질 · ●●●│
│  근거 높음 · 신뢰 92%]        │
├──────────────────────────────┤
│ ⚠ 주의 성분 (1)  (Orange)    │
│ [산화방지제 · 장기섭취 주의…] │
├──────────────────────────────┤
│ 🧬 원재료  [닭][쌀][비트펄프]│  Chip → BottomSheet
├──────────────────────────────┤
│ 📊 영양 밸런스  (도넛+레이더) │
├──────────────────────────────┤
│ 🧠 AI 종합 (3줄)             │
├──────────────────────────────┤
│ 🔄 대체 상품  →→→ (캐러셀)    │
├──────────────────────────────┤
│ 💰 가격 비교 · 최저가 강조    │
├──────────────────────────────┤
│ 💬 리뷰 · AI요약 · 분포 · 사진│
├──────────────────────────────┤
│ ❓ FAQ (Accordion)           │
│ 🤖 AI에게 질문하기            │
└──────────────────────────────┘
[  ♡  |  비교  |  29,900원 · 구매하기  ]  ← 하단 고정 CTA
                                   ◎ AI  (Floating)
```

---

## 7. 컴포넌트 목록 (재사용 단위)

| 컴포넌트 | 설명 | Flutter 위젯 기반 | 기존 React 매핑 |
|---|---|---|---|
| `ScoreGauge` | 원형 게이지+등급+라벨 | CustomPaint / `CircularProgressIndicator` 커스텀 | 신규 |
| `StickyScoreBar` | 상단 압축 점수 | SliverPersistentHeader | 신규 |
| `GlanceGrid` / `GlanceTile` | 요약 타일 | GridView + Card | 신규 |
| `AiInsightCard` | AI 한 줄/3줄 | Card + Row(icon) | `conclusion` 재활용 |
| `FitForPetCard` | 적합도%+칩 | Card + Wrap(Chip) | `headline` 확장 |
| `IngredientCard` (good) | 성분 카드 | Card | 신규 |
| `CautionIngredientCard` | 주의 성분 | Card(amber) | 부분 존재 |
| `IngredientChip` | 원재료 칩 | ActionChip | 부분 존재 |
| `IngredientSheet` | 성분 상세 | showModalBottomSheet | `BottomSheet.tsx` |
| `NutritionDonut` / `NutritionRadar` | 영양 | fl_chart | 신규(recharts 미설치) |
| `AltProductCarousel` / `AltCard` | 대체상품 | ListView(horizontal) | `alternativeProduct` 확장 |
| `PriceCompareRow` | 가격 채널 | Card + Row | `coupangLink` 확장 |
| `ReviewSummary` / `RatingDistribution` / `PhotoReviewStrip` | 리뷰 | 다양 | 목록만 존재 |
| `FaqAccordion` | FAQ | ExpansionTile | 신규 |
| `AiQnA` | AI 질문 | TextField + 카드 | 신규 |
| `StickyCtaBar` | 하단 CTA | bottomNavigationBar | 인라인→고정 |
| `FloatingAi` / `CompareFab` | 플로팅 | FloatingActionButton | 부분 존재 |
| `SectionHeader` | 섹션 제목 | Row(icon+title+count) | 존재 |
| `EvidenceBadge` | 근거수준/신뢰도 | Badge | 신규 |
| `Skeleton*` | 로딩 | Shimmer | 신규 |

---

## 8. 카드 디자인 규칙 (Large Card System)

- **컨테이너:** `surface` #FFFFFF, radius **24**(대형)/16(중형)/12(칩), 패딩 **20**(대형)/16(중형).
- **테두리:** 기본 무테 + `elevation e2`. 위험/주의 카드만 1px 세만틱 라인(주의 #FDE68A / 위험 #FECACA)로 최소 강조.
- **그림자(soft):**
  - e1 `0 1 2 rgba(15,23,42,.04)` — 칩/타일
  - e2 `0 8 24 rgba(15,23,42,.06)` — 카드(기본)
  - e3 `0 16 40 rgba(15,23,42,.10)` — Sticky/모달
- **내부 구조:** `[아이콘 40] [타이틀 17/600] … [우측 값/배지]` → 본문 15/500 → 메타 13/500(faint).
- **터치 타깃:** 최소 **44×44**. 카드 전체 탭 가능 시 좌측 8px 인디케이터 대신 우측 chevron.
- **금지:** 카드 안 카드 3중 중첩 금지, 위험 정보에 순수 red 배경 금지(텍스트만 위험색), 그라디언트 남용 금지.
- **일관 규칙:** 모든 섹션은 `SectionHeader(아이콘+제목+카운트)` + 콘텐츠 카드로 통일.

---

## 9. 컬러 시스템 (White 기반 · Dynamic · WCAG AA)

### 9.1 뉴트럴
| 토큰 | HEX | 용도 |
|---|---|---|
| `ink` | #0F172A | 본문/제목 (on white 대비 16.1:1) |
| `ink-muted` | #475569 | 보조 텍스트 (7.5:1) |
| `ink-faint` | #94A3B8 | 메타/캡션 (min 크기 13+에서 사용) |
| `line` | #E5E8EB | 구분선 |
| `surface` | #FFFFFF | 카드 |
| `surface-soft` | #F7F8FA | 페이지 배경 |
| `surface-sunken`| #F1F3F5 | 칩/입력 |

### 9.2 세만틱 안전 스케일 (핵심)
| 등급 | 텍스트/아이콘 | 배경 tint | 의미 |
|---|---|---|---|
| Excellent | #15803D | #ECFDF5 | 매우 안전 (A+/A) |
| Good | #16A34A | #F0FDF4 | 안전 (B) |
| Caution | #B45309 (텍스트) / #F59E0B (아이콘) | #FFFBEB | 주의 (C) — **Orange, 공포 아님** |
| Danger | #B91C1C | #FEF2F2 | 위험 (D 이하) — 최소·핀포인트 |
| Info | #1D4ED8 | #EFF6FF | 중립 정보 |

> 대비: 모든 텍스트-배경 조합 ≥ 4.5:1(본문)/3:1(대형·아이콘). Caution은 노랑 배경 위 갈색텍스트로 대비 확보(순수 amber 텍스트 금지).

### 9.3 Dynamic Color (점수 연동)
게이지·Sticky Score·At-a-Glance 헤더 색은 점수 밴드로 자동 매핑:
`≥90 Excellent · 75–89 Good · 60–74 Caution · <60 Danger`.
브랜드 액센트(veroro yellow #FFC928)는 CTA·즐겨찾기 등 **행동 유도에만** 제한 사용(정보색과 분리).

### 9.4 다크모드 페어링 (§25 상세)
`ink→#F8FAFC`, `surface→#151A21`, tint는 명도 낮춘 8~12% 오버레이.

---

## 10. 타이포그래피

폰트: **SF Pro / Pretendard(KR) / Roboto(Flutter fallback)**. 숫자는 tabular-figures(점수·가격 정렬).

| 토큰 | size/line | weight | 용도 |
|---|---|---|---|
| Display | 34/40 | 900 | 게이지 점수 숫자 |
| Title1 | 28/34 | 800 | 제품명 |
| Title2 | 22/28 | 800 | 섹션 대제목 |
| Title3 | 20/26 | 700 | 카드 타이틀 강조 |
| Headline | 17/24 | 600 | 카드 타이틀/버튼 |
| Body | 16/24 | 500 | 본문 |
| Callout | 15/22 | 500 | 카드 본문 |
| Subhead | 14/20 | 600 | 라벨/칩 |
| Footnote | 13/18 | 500 | 메타 |
| Caption | 11/14 | 600 | 배지(대문자 트래킹 +2%) |

규칙: 한 화면 최대 3 위계, letter-spacing 제목 −2%, 본문 0, 최소 폰트 13(법적 고지 11 예외), 사용자 Dynamic Type +200%까지 레이아웃 붕괴 없음.

---

## 11. 간격 시스템 (8pt Grid)

```
space-1 4   space-2 8   space-3 12  space-4 16
space-5 20  space-6 24  space-8 32  space-10 40  space-12 48
```
- 화면 좌우 패딩: 20 · 카드 패딩: 20 · 섹션 간: 24 · 카드 간: 12 · 요소 간: 8~12
- 아이콘-텍스트 갭: 8 · 칩 내부: 8×12 · 리스트 행 높이: 최소 56
- 터치 타깃 44, 인접 타깃 간 최소 8.

---

## 12. 아이콘 시스템

- 라이브러리: **lucide**(현 앱과 동일) — line, 2px stroke, 24 기본(작게 16/20, 크게 28).
- 세만틱 매핑: 안전 `shield-check`, 주의 `alert-triangle`, 위험 `octagon-alert`, 알레르기 `ban`, 칼로리 `flame`, 제조국 `globe`, 연령 `calendar`, 단백질 `beef`, 곡물 `wheat`, 지방 `droplet`, 수의사 `stethoscope`, AI `sparkles`, 가격 `tag`, 최저가 `badge-percent`.
- 색약 대응: 아이콘 형태 자체로 의미 구분(색 의존 금지) — 안전=방패, 주의=삼각, 위험=팔각.
- 컨테이너 아이콘은 40 원형 tint 배경 + 20 아이콘.

---

## 13. 애니메이션 (Motion Guidelines)

| 상황 | 지속 | 이징 | 비고 |
|---|---|---|---|
| 표준 전환 | 200ms | `cubic-bezier(0.2,0,0,1)` (M3 emphasized) | 카드/시트 |
| 점수 카운트업 | 800ms | ease-out | 0→92 숫자 롤링 |
| 게이지 스윕 | 1000ms | emphasized-decelerate | 0%→92% 호 |
| Hero 진입 | 480ms | spring(damping .82) | 이미지 scale 1.02→1 |
| Sticky Score 등장 | 240ms | standard | fade+slide(−8→0) |
| Bottom Sheet | 320/260ms(열/닫) | emphasized | scrim 0→40% |
| 탭 피드백 | 120ms | ease-out | scale .97 + 햅틱 |
| Skeleton shimmer | 1400ms loop | linear | −20%→120% |

원칙: 60fps 유지, `prefers-reduced-motion` 시 모든 이동/카운트업 → 즉시값+페이드로 대체(현 앱 `useCountUp`가 이미 reduced-motion 처리).

---

## 14. Micro Interaction

- **Score reveal:** 진입 시 게이지 호가 채워지며 숫자 롤업, 완료 순간 등급 배지 팝(scale 0.8→1) + 성공 햅틱(light).
- **Ingredient highlight:** 원재료 칩 탭 → 해당 칩 320ms 하이라이트 펄스 후 시트 오픈. 주의 성분은 본문에서 형광 언더라인.
- **Favorite:** 하트 탭 → 파티클 버스트 + medium 햅틱 + Dynamic-Island형 토스트 "찜했어요".
- **Compare add:** 비교 담기 → 우하단 Compare FAB 배지 +1 카운트 스프링.
- **Pull-to-refresh:** 상단 당기면 점수 재계산 로더(게이지 미니 회전).
- **Price 최저가:** 최저가 행 로드 시 badge-percent 살짝 흔들림(1회).
- **CTA press:** 눌림 scale .98 + 가격 숫자 subtle glow.

모든 인터랙션: 시각 + 햅틱 + (필요시)사운드 3중 피드백, 100ms 내 반응.

---

## 15. Bottom Sheet 설계 (Smart Sheet)

- **트리거:** 원재료 칩/성분 카드 탭.
- **형태:** 상단 라운드 28, 드래그 핸들 40×4, 최대 높이 90vh, 스크롤 내부. Scrim 40% + 탭·다운드래그로 닫힘.
- **디텐트(detent):** `[peek 40%] · [full 90%]` 2단(M3 표준). 콘텐츠 짧으면 wrap-content.
- **구조:**
  ```
  [핸들]
  성분명(KR)              [안전 배지]
  영문명 · 분류
  ── 효능(2~3줄) ──
  근거수준 ●●● · 신뢰도 92% · 출처
  ── 주의(있으면 Orange 블록) ──
  장기섭취 / 권장량 / 민감견 주의
  [이 성분 포함 다른 제품 보기]
  ```
- **접근성:** 오픈 시 포커스 트랩, 첫 헤딩에 포커스, VoiceOver "성분 상세 시트".
- **기존 자산:** `src/components/BottomSheet.tsx` 재사용(enter/exit 트랜지션 이미 구현) → 디텐트/핸들 드래그만 추가.

---

## 16. AI 분석 카드 설계

두 종류.

**(a) AI 한 줄 카드 (섹션 D)**
```
[✨] "알레르기 유발 성분이 없고 단백질 품질이 우수한 프리미엄 간식입니다."
```
- 배경 surface, 좌측 sparkles 40 원형 tint, 텍스트 Callout 15/600, 1~2줄.
- 톤 다이내믹: 안전=green tint / 주의=amber tint / 위험=red tint.

**(b) AI 종합 의견 (섹션 J, 3줄)**
```
🧠 AI 종합
1. 안전성: 위험 성분 0, 주의 1(산화방지제) — 대부분 반려동물에 적합.
2. 영양: 단백질 32% 우수, 지방 적정, 곡물 free.
3. 결론: 말티즈·성견·슬개골 케어에 추천. 닭 알레르기견은 대체상품 확인.
```
- 각 줄 아이콘 불릿, 최대 3줄, "왜"까지 한 문장. 근거는 §8 EvidenceBadge로.
- 데이터 소스: `generateAnalysisReport()`(score/highlights/summary) + 프로필 매칭 규칙. LLM 사용 시 스트리밍 타이핑 애니메이션(reduced-motion 시 즉시).

---

## 17. 성분 카드 설계

**좋은 성분 (Good)**
```
┌───────────────────────────────┐
│ [🥩]  닭고기            [안전 ✓]│
│ 고품질 동물성 단백질            │
│ 근육 유지·포만감에 도움         │
│ 근거 ●●● 높음 · 신뢰도 92% →   │
└───────────────────────────────┘
```
필드: 아이콘 · 이름(KR/EN) · 효능 · **왜 좋은지 1줄** · 근거수준(●○○/●●○/●●●) · 신뢰도% · 탭 시 시트.

**주의 성분 (Caution — Orange)**
```
┌───────────────────────────────┐  (1px #FDE68A)
│ [⚠]  BHA/BHT          [주의]   │
│ 합성 산화방지제                 │
│ 이유: 장기 다량 섭취 시 부담 우려│
│ 장기섭취 ⚠ · 권장량 이하 안전    │
│ 민감견 주의 · 근거 ●●○         │
└───────────────────────────────┘
```
필드: 위험도(Low/Med/High 도트) · 이유 · 장기섭취 여부 · 권장량 · 민감견 주의 · 근거수준.
**규칙:** 빨강 배경 금지(불안 O, 공포 X). 텍스트 위험색 + amber tint. `riskLevel==='danger'`만 red 텍스트 허용, 그 외 amber.

데이터: `Ingredient.riskLevel`(safe/caution/danger)·`isAllergy`·`purpose` 직접 매핑. 근거/신뢰도는 `ingredientDictionary`/`ingredientQuality` 확장 필드로 추가.

---

## 18. 대체상품 UX

- **형태:** 가로 스냅 캐러셀(카드 폭 260, peek 다음카드 24).
- **유형 탭/라벨:** `더 건강해요` · `더 저렴해요` · `같은 가격 최고점` · `수의사 추천`.
- **카드:** 썸네일 · 브랜드/이름 · **점수 배지(차이 강조: +8점)** · 가격(현재 대비 −3,000원) · "이래서 추천" 1줄 · 담기/비교.
- **로직:** 동일 카테고리 + `targetPetType` 매칭 → `generateAnalysisReport().score` 정렬(현 코드 확장). 없으면 섹션 숨김.
- **인터랙션:** 카드 탭=상세 이동, 롱프레스=빠른 비교 프리뷰 시트.

---

## 19. 가격 비교 UX

- **행 구조:** `[채널로고] 채널명 · 배송(무료/2,500) · 할인율 | 가격 | [이동]`.
- **채널:** 쿠팡 / 네이버 / 펫샵(제휴). 데이터 없으면 해당 행 숨김, 최소 1채널만 있으면 단일 카드로.
- **최저가 강조:** 최저가 행 green tint + `최저가` 배지 + 상단 고정. 가격 tabular-figures 우측 정렬.
- **투명성:** 파트너스 고지 문구(현 `COUPANG_PARTNERS_DISCLOSURE`) 하단 캡션 유지.
- **가격 이력(P2):** 미니 스파크라인 "지난 30일 최저 28,500".

---

## 20. 리뷰 UX

- **AI 리뷰 요약:** 상단 카드 "리뷰 1,284개 요약: 기호성 좋음 82%, 배변 개선 언급 다수, 알갱이 크다는 의견 소수." (감성 태그 chip)
- **별점 분포:** 5→1 가로 바 + 비율%. 평균 별점 큰 숫자.
- **필터:** 전체 / 사진 / 우리 견종 / 최신 / 별점.
- **사진·영상 리뷰:** 가로 썸네일 스트립, 탭 시 풀스크린 갤러리(반려동물 사진 크게). 영상은 인라인 뮤트 오토프리뷰.
- **리뷰 카드:** 작성자·견종/나이 칩·별점·태그(현 `REVIEW_QUICK_TAGS`)·본문·도움돼요.
- **작성:** 현 `createReview` 유지, 사진 업로드 추가(P1).

---

## 21. CTA UX

- **하단 고정 바(72+safe):** `[♡ 찜] [비교] [ 29,900원 · 구매하기 ]` — 구매 버튼 flex:2, 브랜드 옐로/딥.
- **동작:** 구매=최저가 채널로(없으면 coupangLink), 스크롤 방향 반응(내릴 때 축소, 올릴 때 확장 — Dynamic Island 감성).
- **상태:** 품절 시 "재입고 알림", 비로그인 찜 시 `/login` 유도(§ 앱 라우팅과 정합).
- **상단 Sticky Score와 페어:** 위(점수)·아래(구매)로 화면을 감싸 판단-행동 루프 완성.

---

## 22. Skeleton

- 히어로: 이미지 블록 + 2줄 텍스트 shimmer.
- 게이지: 회색 링 + 중앙 점 펄스(숫자 자리 유지).
- 요약 그리드: 6타일 회색.
- 성분/리뷰: 카드 3개 라인 플레이스홀더.
- 규칙: 레이아웃 시프트 0(최종과 동일 높이 예약), shimmer 1.4s, 400ms 이상 로딩에만 노출(그 이하는 즉시 렌더).

---

## 23. Empty State

| 상황 | 카피 | 액션 |
|---|---|---|
| 성분 정보 없음 | "이 제품은 성분 검수 대기 중이에요." | [검수 요청 알림받기] |
| 리뷰 0 | "첫 후기를 남겨주세요 🐾" | [리뷰 작성] |
| 대체상품 없음 | 섹션 자체 숨김(빈 카드 금지) | — |
| 프로필 미등록 | "우리 아이를 등록하면 맞춤 적합도를 볼 수 있어요." | [프로필 만들기] |
| 가격정보 없음 | "판매처 연결 준비 중" | 섹션 숨김 |

일러스트 1개(브랜드 마스코트) + 1줄 카피 + 1개 CTA 원칙.

---

## 24. Error State

- **데이터 로드 실패:** "정보를 불러오지 못했어요." + [다시 시도](retry) + 캐시 있으면 캐시 표시 배지.
- **부분 실패(성분만 실패):** 해당 섹션만 인라인 에러, 나머지 정상 렌더(전체 화면 폴백 금지).
- **전역 크래시:** 앱 `ErrorBoundary`(이미 연결됨)로 복구 화면 → [홈으로]/[다시 시도].
- **Offline:** 상단 Dynamic-Island형 배너 "오프라인 · 저장된 정보 표시 중", CTA는 비활성+툴팁, 복구 시 자동 새로고침 토스트.
- 원칙: 사용자 탓 카피 금지, 항상 다음 행동 제시, 위험정보는 오류 시 "확인 불가"로 명시(안전 fail-safe).

---

## 25. 다크모드

| 토큰 | Light | Dark |
|---|---|---|
| surface | #FFFFFF | #151A21 |
| surface-soft | #F7F8FA | #0E1217 |
| ink | #0F172A | #F1F5F9 |
| line | #E5E8EB | #232B36 |
| safe tint | #ECFDF5 | rgba(34,197,94,.14) |
| caution tint | #FFFBEB | rgba(245,158,11,.16) |
| danger tint | #FEF2F2 | rgba(239,68,68,.16) |

규칙: tint는 명도↓·채도 유지, 그림자→미묘한 상단 하이라이트+테두리(다크에선 그림자 약함). 게이지 트랙 #232B36. 이미지 위 텍스트는 스크림. `prefers-color-scheme` 자동 + 수동 토글(현 `ThemeProvider` 확장). 대비 재검증(AA).

---

## 26. Flutter 위젯 구조 (Material 3)

```dart
Scaffold(
  extendBody: true,
  bottomNavigationBar: StickyCtaBar(product: p),      // 하단 고정 CTA
  floatingActionButton: FloatingAiButton(),           // Floating AI
  body: RefreshIndicator(                              // Pull-to-refresh
    onRefresh: rescore,
    child: CustomScrollView(
      slivers: [
        SliverAppBar(                                  // Hero + collapse
          pinned: true, expandedHeight: 360,
          flexibleSpace: FlexibleSpaceBar(background: HeroImage(p)),
          bottom: StickyScoreBar(score: s),            // 접히면 점수 노출
        ),
        SliverToBoxAdapter(child: ScoreGauge(score: s, grade: g)),
        SliverToBoxAdapter(child: GlanceGrid(tiles)),  // GridView.count 2열
        SliverToBoxAdapter(child: AiInsightCard.oneLine(text)),
        SliverToBoxAdapter(child: FitForPetCard(profile, fit)),
        SliverList(delegate: ...GoodIngredientCards),
        SliverList(delegate: ...CautionIngredientCards),
        SliverToBoxAdapter(child: IngredientChipWrap(onTap: openSheet)),
        SliverToBoxAdapter(child: NutritionCharts()),  // fl_chart 도넛+레이더
        SliverToBoxAdapter(child: AiVerdictCard(threeLines)),
        SliverToBoxAdapter(child: AltProductCarousel()),// ListView horizontal
        SliverToBoxAdapter(child: PriceCompareList()),
        SliverToBoxAdapter(child: ReviewSection()),
        SliverToBoxAdapter(child: FaqAccordion()),      // ExpansionTile
        SliverToBoxAdapter(child: AiQnA()),
        SliverPadding(padding: EdgeInsets.only(bottom: 96)),
      ],
    ),
  ),
)

// 성분 시트
void openSheet(i) => showModalBottomSheet(
  context, isScrollControlled: true, showDragHandle: true,
  shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
  builder: (_) => IngredientSheet(i),
);
```
- 상태관리: Riverpod/Bloc — `pdpProvider(productId)` → `AsyncValue<PdpData>`(skeleton/error/데이터).
- 차트: `fl_chart`(PieChart/RadarChart). 게이지: `CustomPaint`.
- 햅틱: `HapticFeedback.lightImpact/mediumImpact`.
- 접근성: `Semantics(label:...)` 모든 배지/게이지, `MergeSemantics`로 카드 그룹핑.

---

## 27. Figma Auto Layout 구조

```
📄 Page: PDP
└─ 🖼 Frame: PDP / 390×auto  [Auto Layout ↓, gap 24, padding 20, fill surface-soft]
   ├─ ▸ StickyScore/Bar        [pin top, fixed 56]  (Component, variants: safe/good/caution/danger)
   ├─ ▸ Hero                    [AL ↓ gap 12] : Image(ratio 1:1, corner 24) / Brand+Verify / Name / MetaRow(★·리뷰·가격) / Actions(♡ ⤴)
   ├─ ▸ ScoreGauge              [AL ↓ center] : Gauge(Component, prop: score 0-100 → color token) / GradeBadge / Label
   ├─ ▸ GlanceGrid              [AL wrap, 2col, gap 8] : GlanceTile ×6~8 (Component, prop: icon/label/tone)
   ├─ ▸ AiInsight/OneLine
   ├─ ▸ FitForPet
   ├─ ▸ Section/GoodIngredients [AL ↓] : SectionHeader / IngredientCard ×n
   ├─ ▸ Section/Caution
   ├─ ▸ IngredientChips         [AL wrap] : Chip ×n
   ├─ ▸ Nutrition               : Donut / Radar
   ├─ ▸ AiVerdict/3Line
   ├─ ▸ AltCarousel             [AL →, clip, gap 12] : AltCard ×n
   ├─ ▸ PriceCompare
   ├─ ▸ Reviews
   ├─ ▸ FAQ / AiQnA
   └─ ▸ Spacer 96
   ⌾ Overlay: StickyCTA(pin bottom) · FloatingAI · Compare
```
규칙: 모든 컴포넌트 **Variants + Component Properties**(tone=safe/good/caution/danger, size, state), 색·간격·타이포는 **Variables(모드: Light/Dark)** 로 토큰화, 텍스트 truncate & Hug/Fill 명시. 반응형: 컨테이너 min 320 / max 480, 이미지 fill.

---

## 28. Design Token (JSON)

```json
{
  "color": {
    "ink": "#0F172A", "ink-muted": "#475569", "ink-faint": "#94A3B8",
    "line": "#E5E8EB", "surface": "#FFFFFF", "surface-soft": "#F7F8FA", "surface-sunken": "#F1F3F5",
    "safe-fg": "#15803D", "safe-bg": "#ECFDF5",
    "good-fg": "#16A34A", "good-bg": "#F0FDF4",
    "caution-fg": "#B45309", "caution-icon": "#F59E0B", "caution-bg": "#FFFBEB",
    "danger-fg": "#B91C1C", "danger-bg": "#FEF2F2",
    "info-fg": "#1D4ED8", "info-bg": "#EFF6FF",
    "brand": "#FFC928", "brand-deep": "#B8860B", "on-brand": "#191919"
  },
  "radius": { "chip": 12, "md": 16, "lg": 24, "sheet": 28, "pill": 999 },
  "space": { "1":4,"2":8,"3":12,"4":16,"5":20,"6":24,"8":32,"10":40,"12":48 },
  "elevation": {
    "e1": "0 1 2 rgba(15,23,42,.04)",
    "e2": "0 8 24 rgba(15,23,42,.06)",
    "e3": "0 16 40 rgba(15,23,42,.10)"
  },
  "type": {
    "display": {"size":34,"line":40,"weight":900},
    "title1": {"size":28,"line":34,"weight":800},
    "title2": {"size":22,"line":28,"weight":800},
    "headline": {"size":17,"line":24,"weight":600},
    "body": {"size":16,"line":24,"weight":500},
    "callout": {"size":15,"line":22,"weight":500},
    "subhead": {"size":14,"line":20,"weight":600},
    "footnote": {"size":13,"line":18,"weight":500},
    "caption": {"size":11,"line":14,"weight":600}
  },
  "motion": {
    "fast":120, "base":200, "slow":320, "score":800, "gauge":1000,
    "easing-standard": "cubic-bezier(0.2,0,0,1)",
    "easing-decelerate": "cubic-bezier(0.05,0.7,0.1,1)"
  },
  "scoreBand": { "excellent":90, "good":75, "caution":60 }
}
```
> 기존 앱은 CSS 변수(`--ink`, `--brand` 등)를 쓰므로 이 토큰을 `:root`/`ThemeProvider`에 1:1 주입 → React·Flutter·Figma 3면 단일 소스.

---

## 29. 개발 명세 (Screen Spec)

| 항목 | 스펙 |
|---|---|
| 라우트 | `/product/:id` (기존 유지) |
| 데이터 | `Product`(+ingredients) · `UserPetProfile` · `getReviews(id)` · `generateAnalysisReport(product, profile)` |
| 신규 필드 필요 | 성분 `evidenceLevel`,`confidence`,`sourceUrl`; 제품 `nutrition{protein,fat,fiber,moisture,ash,carb}`, `originCountry`, `kcalPer100g`, `volume`, `priceChannels[]` |
| 점수→등급 | ≥90 A+ · 85 A · 75 B · 65 C · 55 D · <55 F (밴드는 토큰 `scoreBand`) |
| 게이지 색 | 점수 밴드 → safe/good/caution/danger 자동 |
| 적합도% | 프로필 매칭: 알레르기 hit(−), 질환 케어 성분 hit(+), 생애주기/견종 적합(+) → 0~100 정규화 |
| 상태 | loading(skeleton) / empty(섹션별) / error(섹션 인라인+전역 boundary) / offline(배너) |
| 성능 | 초기 페인트 < 1.5s, 게이지 애니메 60fps, 이미지 lazy+blur-up, 리뷰/차트 지연 로드, 코드스플리팅(라우트 lazy 권장) |
| 접근성 | 모든 인터랙티브 44+, Semantics 라벨, 대비 AA, reduced-motion, Dynamic Type |
| 분석 | 이벤트: `pdp_view`, `score_seen`, `ingredient_open`, `alt_click`, `price_click`, `cta_click`, `ai_qna_ask` |
| 재사용 | `BottomSheet`, `TossCard`, `Analyzer`, `useCountUp`(reduced-motion), `ErrorBoundary` 기연결 |

---

## 30. 경쟁 우위 UX 개선 아이디어 50 (P0/P1/P2)

### P0 — 3초 판단·전환 직결 (반드시)
1. **AI Safety Score 게이지 히어로 승격**(계산값 즉시 시각화).
2. **하단 고정 CTA**(가격+구매+찜+비교).
3. **상단 Sticky Score**(스크롤 시 점수 상시 노출).
4. **우리 아이 적합도 %** + 근거 칩(프로필 연동).
5. **위험 이중 부호화**(색+아이콘형태+라벨) — 색약 안전.
6. **At-a-Glance 요약 그리드**(핵심 8지표 1스크린).
7. **AI 한 줄 판정**(톤 다이내믹).
8. 주의성분 **Orange 규칙**(공포 아닌 주의).
9. **Skeleton + 레이아웃시프트 0**.
10. **섹션 인라인 에러 + 안전 fail-safe**("확인 불가" 명시).
11. 점수 **카운트업+게이지 스윕**(첫인상 임팩트).
12. **프로필 미등록 시 적합도 CTA**(활성 유저 전환).
13. 구매 버튼을 **최저가 채널로**(coupangLink fallback).
14. **찜/비교 즉시 피드백**(햅틱+토스트).
15. 이미지 **탭 확대/핀치 줌**.

### P1 — 신뢰·풍부함 (다음)
16. **성분 근거수준(●●●)+신뢰도%**+출처(EvidenceBadge).
17. **영양 도넛+레이더**(fl_chart).
18. **대체상품 캐러셀 4유형**(건강/저렴/동가최고/수의사).
19. **가격비교 3채널+최저가 강조**.
20. **리뷰 AI 요약**(감성 태그).
21. **별점 분포 바** + 필터(우리 견종).
22. **사진/영상 리뷰 갤러리**(반려동물 크게).
23. **AI 종합 3줄**(왜까지).
24. **성분 Smart Bottom Sheet 2디텐트**.
25. **Ingredient Highlight**(칩↔본문 연동 하이라이트).
26. **원재료 Chip/Tag/Stack** 시각화.
27. **Floating AI 버튼**(어디서든 질문).
28. **AI Q&A**("신장질환도 되나요?").
29. **FAQ Accordion**(질환·급여·보관).
30. **검수/근거 신뢰 배지**(verificationStatus 확장).
31. **알레르기 개인 경고 배너**(프로필 알레르기 hit 시 상단 고정).
32. **급여량 계산기 복원**(RER×활동계수, 프로필 체중 연동).
33. **가격 이력 스파크라인**(30일 최저).
34. **동일 브랜드 라인업** 링크(현 브랜드 페이지 연결).
35. **비교 Floating(최대 5개)** + 담기 애니메이션.
36. **다크모드 완전 대응**(토큰 페어링).
37. **Pull-to-refresh 재채점**.
38. **리뷰에 견종/나이 칩**(동질감).
39. **"이 성분 포함 다른 제품"** 역탐색(시트 내).
40. **Dynamic-Island형 상태**(찜/오프라인/재입고).

### P2 — 차별화·리텐션 (여유)
41. **성분 스캔 연동**(카메라 OCR → 이 화면으로).
42. **수의사 코멘트/감수 배지**.
43. **개인화 위험 시뮬레이터**("우리 아이가 매일 먹으면?").
44. **가격 하락 알림/재입고 알림** 구독.
45. **리뷰 신뢰도 스코어**(사진·구매인증 가중).
46. **성분 위키 딥링크**(지식 페이지 연결).
47. **공유 카드 자동생성**(점수 인포그래픽 이미지, 카카오 공유).
48. **오프라인 캐시 열람**(마지막 조회 제품).
49. **접근성 프로필**(큰 글씨/고대비 모드 원탭).
50. **AI 개인 추천 피드로 회귀**(비추천 시 대체 3종 홈 노출).

---

### 부록 A. 이 스펙과 현재 코드의 연결(실행 관점)
- 즉시 착수(P0) 가능 자산: 점수(`generateAnalysisReport`), 성분 위험도(`riskLevel/isAllergy`), 프로필(`allergies/healthConcerns`), 시트(`BottomSheet`), 카운트업(`useCountUp` reduced-motion), 에러경계(`ErrorBoundary`), 라우팅(`/product/:id`, `/login`, `/compare`).
- 데이터 추가 필요(P1): 영양 필드, 가격 채널, 성분 근거/신뢰/출처, 제조국/칼로리/용량.
- 라이브러리: 차트=`fl_chart`(Flutter)/`recharts`(React 재도입 시). 현재 recharts 미설치.
```
```
