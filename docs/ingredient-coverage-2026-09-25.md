# 원재료 커버리지 감사

- 감사 기준일: 2026-09-25
- 구현 브랜치: `fix/allergy-unknown-messaging`
- 감사 도구: `scripts/audit-ingredient-coverage.mjs`
- 데이터 접근: 읽기 전용 GET 요청만 허용하며 키와 회원 데이터는 출력하지 않음

## 검사 항목

- 현재 라벨의 고유 원료 표기 수와 matched / ambiguous / unmatched / unreviewed 수
- 현재 라벨이 있는 제품 중 전체 매칭 제품과 partial / blocked 제품 수
- 근거 없는 active 표준 원료
- 근거 없는 active 안전 규칙
- 둘 이상의 표준 원료가 소유한 정규화 별칭 충돌
- 발생 빈도순 미확인 원료 상위 25개
- 원재료 출처 등록부 SHA-256 체크섬

## 실패 기준

active 안전 규칙에 근거가 없거나 정규화 별칭 충돌이 하나라도 있으면 종료 코드 2를 반환한다. 운영 자격값이나 읽기 권한이 없으면 빈 결과를 성공으로 기록하지 않고 종료 코드 1로 중단한다.

## 실행 상태

현재 로컬 작업 환경에는 `VITE_SUPABASE_URL` / 공개 읽기 키 또는 서비스 역할 읽기 키가 없어 운영 수치 감사를 실행하지 못했다. 배포 전 권한이 있는 CI 또는 운영 셸에서 다음 명령으로 결과 JSON을 보존해야 한다.

```powershell
node scripts/audit-ingredient-coverage.mjs --output .artifacts/ingredient-coverage-production.json
```

운영 DB 쓰기와 스키마 적용은 수행하지 않았다.
