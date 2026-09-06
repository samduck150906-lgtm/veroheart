import { resolveHealthConcernId } from './concerns';

export interface LegacyIngredientConcernEvidenceInput {
  nameKo?: string | null;
  nameEn?: string | null;
  purpose?: string | null;
}

export interface LegacyIngredientConcernEvidenceBoundary {
  concernId: ReturnType<typeof resolveHealthConcernId>;
  purposeMatches: boolean;
  rawNameMatches: boolean;
  anatomicalHeartNameCollision: boolean;
  eligibleNameMatches: boolean;
  matches: boolean;
}

const KOREAN_ANIMAL_SOURCES = [
  '닭고기',
  '닭',
  '토끼',
  '소고기',
  '소',
  '돼지고기',
  '돼지',
  '양고기',
  '양',
  '오리고기',
  '오리',
  '칠면조',
  '사슴',
  '염소',
  '말',
  '캥거루',
] as const;

const ENGLISH_ANIMAL_SOURCES = [
  'chicken',
  'rabbit',
  'beef',
  'bovine',
  'cow',
  'pork',
  'pig',
  'lamb',
  'sheep',
  'duck',
  'turkey',
  'venison',
  'deer',
  'goat',
  'horse',
  'kangaroo',
] as const;

function normalizeLegacyMatch(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\s()[\]·,./_-]/g, '');
}

function normalizeWords(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ');
}

export function isAnatomicalHeartSourcePartName(
  nameKo: string | null | undefined,
  nameEn: string | null | undefined,
): boolean {
  const compactKorean = normalizeLegacyMatch(nameKo);
  const koreanMatch = KOREAN_ANIMAL_SOURCES.some((source) =>
    compactKorean.includes(`${source}심장`) || compactKorean.includes(`${source}의심장`));
  if (koreanMatch) return true;

  const englishWords = normalizeWords(nameEn);
  return ENGLISH_ANIMAL_SOURCES.some((source) =>
    new RegExp(`(?:^| )${source} hearts?(?: |$)`, 'u').test(englishWords));
}

export function classifyLegacyIngredientConcernEvidence(
  concern: string,
  ingredient: LegacyIngredientConcernEvidenceInput,
): LegacyIngredientConcernEvidenceBoundary {
  const normalizedConcern = normalizeLegacyMatch(concern);
  const concernId = resolveHealthConcernId(concern.normalize('NFKC'));
  const purposeMatches = normalizedConcern.length > 0
    && normalizeLegacyMatch(ingredient.purpose).includes(normalizedConcern);
  const nameKoMatches = normalizedConcern.length > 0
    && normalizeLegacyMatch(ingredient.nameKo).includes(normalizedConcern);
  const nameEnMatches = normalizedConcern.length > 0
    && normalizeLegacyMatch(ingredient.nameEn).includes(normalizedConcern);
  const rawNameMatches = nameKoMatches || nameEnMatches;
  const anatomicalHeartNameCollision = concernId === 'heart'
    && rawNameMatches
    && isAnatomicalHeartSourcePartName(ingredient.nameKo, ingredient.nameEn);
  const eligibleNameMatches = rawNameMatches && !anatomicalHeartNameCollision;

  return {
    concernId,
    purposeMatches,
    rawNameMatches,
    anatomicalHeartNameCollision,
    eligibleNameMatches,
    matches: purposeMatches || eligibleNameMatches,
  };
}
