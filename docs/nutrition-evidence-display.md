# 영양 근거 부족 시 평가 범위 표시

이 변경은 계산식/추천 순위/점수/임계값을 바꾸지 않는다. 구매 기능·운영 데이터·DB·배포와 독립적이다.

## 변경 전후

합성 원료(닭고기·연어·타우린·유산균·글루코사민)만 있고 영양 수치가 없는 경우:

| 항목 | 변경 전 | 변경 후 |
| --- | --- | --- |
| 사료 분석 점수/등급 | 82/A | 82/A 그대로 |
| 배지 | A등급 · 우수 | 원료 기준 참고 A등급 |
| 요약 | 동물성 단백질 중심의 균형 잡힌 우수한 사료 | 영양정보 부족으로 영양 균형을 평가할 수 없습니다. |
| 범위 | 원료·영양 분석 | 영양 균형 미평가; 원료 중심의 참고 점수이며 종합 안전·영양 적합성 등급 아님 |

조단백질만 있는 경우도 같은 제한을 둔다. 위험/알레르기는 요약 첫머리와 기존 주의 항목에 유지하고
영양 부족 안내를 함께 표시한다. 부족 정보를 이유로 경고를 숨기거나 임의로 위험을 추가하지 않는다.

## 판정 기준

`nutritionReadiness`는 기존 계산기의 입력 조건을 공유한다. 임의의 필드 개수나 존재 여부로 정하지 않는다.

- 단백질/지방 건물기준 평가: 유효한 단백질·지방·수분, 수분100 미만, 셋의 합100 이하.
- 열량/추정 탄수화물 구성: 유효한 단백질·지방·섬유·회분·수분과 합100 이하.
- NULL·누락·빈 문자열·비유한/범위 밖 값은 미확인이다. 유효한0은 값으로 유지한다.
- 셋만 있으면 단백질·지방은 평가할 수 있으나 전체 구성은 미평가다. 점수에 일부 영양 항목이 반영될 수 있으므로
  이 경우 '일부 영양 포함 참고'라고 구분한다. 라벨 열량만 있다고 전체 영양 근거가 생기지 않는다.
- 모든 기초 수치가 있어도 완전한 영양 적합성/질병 효과를 보장하지 않는다. 정상 긍정 요약도 등록된 기초 지표 기준으로 한정한다.

검색/상품 카드·홈 추천·상세/분석 리포트·비교표는 같은 범위/부족 안내를 사용한다.
추천 자격/정렬, 호환성 계산/하드캡, 원료 readiness에 따른 점수 비노출은 변경하지 않는다.
분석 점수82와 궁합 점수는 서로 다른 기존 계산값이며 이 변경이 두 점수를 동일하게 만드는 것은 아니다.

## 검증 범위

기존 검토용 재현을 `scripts/feed-nutrition-evidence.test.mjs`로 옮겨 CI 회귀로 포함했다.
실제 순수 앱 모듈/사전을 transpile해 실행하며 네트워크/운영 DB는 사용하지 않는다.
새 Vitest는 입력 조건, 정상/부분/0, 경고 보존, DOM의 카드·검색·상세·추천 범위를 검증한다.
기존 프로필 전환/게스트 검사는 참고 평가의 명칭·단위를 반영한다.

로컬 native binding 로딩 오류로 Vitest가 시작하지 못했으므로 재설치/보안 우회/반복 실행하지 않는다.
타입·린트·순수 Node 재현은 로컬, 전체 Vitest/production build는 기존 Linux CI에서 확인한다.
CI의 기존 audit gate를 낮추지 않는다. 성공/실패 결과는 PR 본문에 실제 실행 기준으로 기록한다.
운영 화면/실제품 영향 수·실제 영양 정확성은 이번 합성 회귀 검증 범위가 아니다.
# Registered ingredients versus analysis readiness

The pre-existing analysis heading translated stored `unavailable` readiness as
"등록된 원료 정보가 없습니다", even when the same detail response contained
registered ingredients. A synthetic example reproduces this on main and on this
PR before the presentation correction. This is not evidence of a query failure,
nor does the existence of ingredient rows establish completed matching or analysis.

For unavailable analysis, the analysis heading now reuses the detail page's
`describeIngredientAvailability` copy. Loaded empty lists, unloaded ingredient
projections, and registered ingredients awaiting label/analysis review remain
distinct. Partial and conflicting matching keep their existing warnings. The
stored readiness, score eligibility, formulas, ranks and matching rules are
unchanged; a pending analysis is not promoted to ready. Query failures retain
the separate error screen rather than being translated to ingredient absence.

Synthetic UI regressions cover these distinctions and retain danger/allergy
warnings while withholding scores. Normal-ready, nutrient insufficiency and
species-warning coverage remains in the existing regression suite. Public
case identities and operating evidence are kept outside this document and tests.
