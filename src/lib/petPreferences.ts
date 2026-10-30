import type { UserPetProfile } from '../types';

const selectionKey = (userId: string) => `veroro.activePet.v1.${encodeURIComponent(userId)}`;

/** Store only an account-scoped preference ID, never the pet's private profile. */
export function rememberSelectedPet(userId: string, petId: string | null): void {
  try {
    if (petId) localStorage.setItem(selectionKey(userId), petId);
    else localStorage.removeItem(selectionKey(userId));
  } catch { /* Storage can be blocked; selecting a pet must still work in memory. */ }
}

export function restoreSelectedPet(userId: string, pets: UserPetProfile[], currentId: string | null): UserPetProfile | null {
  let savedId: string | null = null;
  try { savedId = localStorage.getItem(selectionKey(userId)); } catch { /* Use current selection or the first registered pet. */ }
  // A stored ID is not profile data or authorization. Only use fetched owned pets.
  return pets.find(pet => pet.id === currentId) ?? pets.find(pet => pet.id === savedId) ?? pets[0] ?? null;
}

/** Registration order stays stable through edits and selection changes. */
export function sortPetsByRegistration(pets: UserPetProfile[]): UserPetProfile[] {
  const timestamp = (pet: UserPetProfile) => {
    const value = Date.parse(pet.createdAt ?? '');
    return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
  };
  return [...pets].sort((a, b) => {
    const aTime = timestamp(a), bTime = timestamp(b);
    if (aTime !== bTime) return aTime - bTime;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}
