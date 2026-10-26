import { useEffect, useState } from 'react';
import type { UserPetProfile } from '../types';
import { isRealPetProfile } from '../utils/displayVerdict';
import { loadHomeRecommendations, type HomeRecommendation } from '../lib/homeRecommendations';

interface Result {
  profile: UserPetProfile;
  attempt: number;
  revision: number;
  items: HomeRecommendation[];
  status: 'ready' | 'error';
}

export function useHomeRecommendations(profile: UserPetProfile, isLoggedIn: boolean, revision = 0) {
  const enabled = isLoggedIn && isRealPetProfile(profile);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadHomeRecommendations(profile, () => cancelled).then(
      (items) => { if (!cancelled) setResult({ profile, attempt, revision, items, status: 'ready' }); },
      () => { if (!cancelled) setResult({ profile, attempt, revision, items: [], status: 'error' }); },
    );
    return () => { cancelled = true; };
  }, [profile, enabled, attempt, revision]);

  // Clear old-pet scores during render, before the replacement request finishes.
  const current = enabled && result?.profile === profile && result.attempt === attempt && result.revision === revision ? result : null;
  return {
    enabled,
    items: current?.items ?? [],
    status: current?.status ?? 'loading',
    retry: () => setAttempt((value) => value + 1),
  };
}
