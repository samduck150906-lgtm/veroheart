/**
 * 한국표준사료성분표 2022 상세 영양성분 로더.
 *
 * 번들에 늘 들어 있는 standard_feed_data.json 은 원료마다 5개 수치(수분·조단백질·
 * 조지방·조회분·조섬유)만 담아 어느 화면에서든 바로 쓴다. 이 로더가 읽는
 * standard_feed_2022.json 은 같은 원본의 74개 영양소 전부(에너지·아미노산 18종·
 * 미네랄 9종·비타민·축종별 이용성)를 담아 180kB 가 넘는다.
 *
 * 성분사전을 열어 본 사람에게만 필요한 자료라 첫 화면 번들에 섞지 않고, 모달을
 * 열 때 한 번만 내려받아 모듈에 쥐고 있는다(같은 세션에서 다시 열면 요청이 없다).
 */
import { useEffect, useState } from 'react';

/** 값의 기준. 소화율·분해율은 원본이 건물 기준으로만 싣는다. */
export type StandardFeedBasis = 'as_fed' | 'dry_matter';

export interface StandardFeedNutrient {
  key: string;
  basis: StandardFeedBasis;
}

export interface StandardFeedGroup {
  key: string;
  label: string;
  unit: string;
  nutrients: StandardFeedNutrient[];
}

export interface StandardFeedDetailItem {
  id: number;
  name_ko: string;
  name_en: string;
  /** 묶음 키 → 영양소 이름 → 값. 분석하지 않은 영양소는 아예 들어 있지 않다. */
  values: Record<string, Record<string, number>>;
}

export interface StandardFeedDetail {
  source: string;
  basis_label: string;
  groups: StandardFeedGroup[];
  items: StandardFeedDetailItem[];
  byId: Map<number, StandardFeedDetailItem>;
}

let cached: StandardFeedDetail | null = null;
let inFlight: Promise<StandardFeedDetail> | null = null;

/** 테스트 전용 — 캐시를 비운다. */
export function __resetStandardFeedDetailCache(): void {
  cached = null;
  inFlight = null;
}

export async function loadStandardFeedDetail(): Promise<StandardFeedDetail> {
  if (cached) return cached;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const module = await import('../data/standard_feed_2022.json');
    const payload = (module.default ?? module) as unknown as Omit<StandardFeedDetail, 'byId'>;
    const detail: StandardFeedDetail = {
      ...payload,
      byId: new Map(payload.items.map((item) => [item.id, item])),
    };
    cached = detail;
    return detail;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/**
 * 상세 성분표 훅.
 *
 * `enabled` 가 참이 되는 순간 한 번만 불러온다. 내려받기에 실패해도 화면이 죽지
 * 않도록 null 을 유지한다 — 호출부는 기본 5개 수치만 계속 보여 준다.
 */
export function useStandardFeedDetail(enabled: boolean): StandardFeedDetail | null {
  const [detail, setDetail] = useState<StandardFeedDetail | null>(cached);

  useEffect(() => {
    if (!enabled || detail) return;
    let cancelled = false;
    loadStandardFeedDetail()
      .then((loaded) => {
        if (!cancelled) setDetail(loaded);
      })
      .catch((err) => {
        console.error('표준사료 상세 성분을 불러오지 못했습니다:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, detail]);

  return detail;
}
