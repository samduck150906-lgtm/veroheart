import { useEffect, useState } from 'react';
import type { UserPetProfile } from '../types';
import { isRealPetProfile } from '../utils/displayVerdict';
import { loadHomeRecommendations, type HomeRecommendation } from '../lib/homeRecommendations';

interface Result {
  profile: UserPetProfile;
  attempt: number;
  items: HomeRecommendation[];
  status: 'ready' | 'error';
}

export function useHomeRecommendations(profile: UserPetProfile, isLoggedIn: boolean) {
  const enabled = isLoggedIn && isRealPetProfile(profile);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadHomeRecommendations(profile, () => cancelled).then(
      (items) => { if (!cancelled) setResult({ profile, attempt, items, status: 'ready' }); },
      () => { if (!cancelled) setResult({ profile, attempt, items: [], status: 'error' }); },
    );
    return () => { cancelled = true; };
  }, [profile, enabled, attempt]);

  // Clear old-pet scores during render, before the replacement request finishes.
  const current = enabled && result?.profile === profile && result.attempt === attempt ? result : null;
  return {
    enabled,
    items: current?.items ?? [],
    status: current?.status ?? 'loading',
    retry: () => setAttempt((value) => value + 1),
  };
}
