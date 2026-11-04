import { describe, expect, it } from 'vitest';
import {
  normalizeDiaryCorrection,
  normalizePetCorrection,
  supportReason,
} from '../../supabase/functions/admin-write/supportValidation';
const pet = {
  name: '보리',
  pet_type: 'dog',
  age_group: 'adult',
  weight: 6.8,
  breed: '말티푸',
  allergies: [],
  conditions: [],
};
const log = {
  feeding_date: '2026-11-04',
  feeding_time: '12:30',
  meal_period: 'other',
  amount: 70.5,
  unit: 'g',
  preference_level: 4,
};
describe('support correction server validation', () => {
  it('keeps decimals and explicit no-allergy while excluding ownership fields', () => {
    expect(
      normalizePetCorrection({ ...pet, user_id: 'attack', id: 'attack' }),
    ).toEqual(pet);
    expect(normalizeDiaryCorrection({ ...log, user_id: 'attack' })).toEqual({
      ...log,
      memo: null,
      reaction_note: null,
    });
  });
  it.each([0, -1, Infinity, 'abc', 201])(
    'rejects invalid pet weights: %s',
    (weight) =>
      expect(() => normalizePetCorrection({ ...pet, weight })).toThrow(),
  );
  it.each(['2026-02-30', '2026-13-01', 'not-a-date'])(
    'rejects invalid calendar dates: %s',
    (feeding_date) =>
      expect(() =>
        normalizeDiaryCorrection({ ...log, feeding_date }),
      ).toThrow(),
  );
  it('rejects unsupported species, malformed arrays, invalid times and preferences', () => {
    expect(() => normalizePetCorrection({ ...pet, pet_type: 'all' })).toThrow();
    expect(() =>
      normalizePetCorrection({ ...pet, allergies: 'none' }),
    ).toThrow();
    expect(() =>
      normalizeDiaryCorrection({ ...log, feeding_time: '25:99' }),
    ).toThrow();
    expect(() =>
      normalizeDiaryCorrection({ ...log, preference_level: 4.5 }),
    ).toThrow();
    expect(() => supportReason('  ')).toThrow();
  });
});
