/**
 * Phase 2 관찰 모드 빌드 플래그.
 *
 * 별도 모듈로 분리한 이유: 플래그가 꺼져 있을 때 관찰 모듈(phase2Observation)을
 * 아예 로드하지 않기 위해서다. 호출부는 이 값을 먼저 확인한 뒤에만 동적 import 한다.
 *
 * 기본값은 false다. 문자열 'true' 만 활성으로 인정한다(오타로 켜지지 않게).
 */
export function isPhase2ObservationBuildEnabled(): boolean {
  const raw = import.meta.env.VITE_ENABLE_PHASE2_ALIAS_OBSERVATION;
  return String(raw ?? '').trim().toLowerCase() === 'true';
}
