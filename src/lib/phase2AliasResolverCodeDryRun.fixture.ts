import { resolvePhase2Alias, type Phase2AliasResolverResult, type Phase2AliasSeed } from './phase2AliasResolver';

export const phase2CodeDryRunCanonicals = [
  { canonicalName: '건조비트펄프', canonicalId: 'fixture-canonical-dried-beet-pulp' },
  { canonicalName: '오메가3지방산', canonicalId: 'fixture-canonical-omega-3' },
  { canonicalName: '감자전분', canonicalId: 'fixture-canonical-potato-starch' },
  { canonicalName: '건조맥주효모', canonicalId: 'fixture-canonical-dried-brewers-yeast' },
  { canonicalName: '녹차추출물', canonicalId: 'fixture-canonical-green-tea-extract' },
  { canonicalName: '맥주효모', canonicalId: 'fixture-canonical-brewers-yeast' },
  { canonicalName: '비타민e', canonicalId: 'fixture-canonical-vitamin-e' },
  { canonicalName: '비트펄프', canonicalId: 'fixture-canonical-beet-pulp' },
  { canonicalName: '오메가6지방산', canonicalId: 'fixture-canonical-omega-6' },
  { canonicalName: '코코넛오일', canonicalId: 'fixture-canonical-coconut-oil' },
  { canonicalName: '타피오카전분', canonicalId: 'fixture-canonical-tapioca-starch' },
  { canonicalName: '토마토박', canonicalId: 'fixture-canonical-tomato-pomace' },
  { canonicalName: '프락토올리고당', canonicalId: 'fixture-canonical-fructooligosaccharide' },
  { canonicalName: '혼합토코페롤', canonicalId: 'fixture-canonical-mixed-tocopherols' },
];

export const phase2CodeDryRunAliases: Phase2AliasSeed[] = [
  { alias: '건조 비트 펄프', canonicalName: '건조비트펄프', canonicalId: 'fixture-canonical-dried-beet-pulp' },
  { alias: '오메가-3 지방산', canonicalName: '오메가3지방산', canonicalId: 'fixture-canonical-omega-3' },
  { alias: '오메가 3 지방산', canonicalName: '오메가3지방산', canonicalId: 'fixture-canonical-omega-3' },
  { alias: '감자 전분', canonicalName: '감자전분', canonicalId: 'fixture-canonical-potato-starch' },
  { alias: '건조 맥주 효모', canonicalName: '건조맥주효모', canonicalId: 'fixture-canonical-dried-brewers-yeast' },
  { alias: '녹차 추출물', canonicalName: '녹차추출물', canonicalId: 'fixture-canonical-green-tea-extract' },
  { alias: '맥주 효모', canonicalName: '맥주효모', canonicalId: 'fixture-canonical-brewers-yeast' },
  { alias: '비타민 E', canonicalName: '비타민e', canonicalId: 'fixture-canonical-vitamin-e' },
  { alias: '비타민E', canonicalName: '비타민e', canonicalId: 'fixture-canonical-vitamin-e' },
  { alias: '비트 펄프', canonicalName: '비트펄프', canonicalId: 'fixture-canonical-beet-pulp' },
  { alias: '오메가-6 지방산', canonicalName: '오메가6지방산', canonicalId: 'fixture-canonical-omega-6' },
  { alias: '코코넛 오일', canonicalName: '코코넛오일', canonicalId: 'fixture-canonical-coconut-oil' },
  { alias: '타피오카 전분', canonicalName: '타피오카전분', canonicalId: 'fixture-canonical-tapioca-starch' },
  { alias: '토마토 박', canonicalName: '토마토박', canonicalId: 'fixture-canonical-tomato-pomace' },
  { alias: '프락토 올리고당', canonicalName: '프락토올리고당', canonicalId: 'fixture-canonical-fructooligosaccharide' },
  { alias: '혼합 토코페롤', canonicalName: '혼합토코페롤', canonicalId: 'fixture-canonical-mixed-tocopherols' },
];

export const phase2CodeDryRunBlockedTerms = [
  '닭간',
  '닭간분말',
  '닭연골',
  '닭지방',
  '동물성지방',
  '소르빈산칼륨',
  '증점다당류',
  '천연색소',
  '프로필렌글리콜',
  '향미증진제',
];

export const phase2CodeDryRunLabels = [
  '건조 비트 펄프',
  '오메가-3 지방산',
  '감자 전분',
  '건조 맥주 효모',
  '녹차 추출물',
  '맥주 효모',
  '비타민 E',
  '비트펄프',
  '오메가6지방산',
  '코코넛오일',
  '타피오카 전분',
  '토마토 박',
  '프락토 올리고당',
  '혼합토코페롤',
  '닭고기',
  '닭고기 분말',
  '로즈마리 추출물',
  '타우린',
  '현미',
  '닭간',
  '닭 지방',
  '동물성 지방',
  '소르빈산 칼륨',
  '향미증진제',
];

export type Phase2AliasResolverCodeDryRunSummary = Record<
  Phase2AliasResolverResult['status'],
  number
> & {
  total: number;
};

export function runPhase2AliasResolverCodeDryRun(labels = phase2CodeDryRunLabels) {
  const results = labels.map((label) =>
    resolvePhase2Alias({
      label,
      aliases: phase2CodeDryRunAliases,
      canonicals: phase2CodeDryRunCanonicals,
      blockedTerms: phase2CodeDryRunBlockedTerms,
    }),
  );

  const summary: Phase2AliasResolverCodeDryRunSummary = {
    total: results.length,
    matched: 0,
    unmatched: 0,
    ambiguous: 0,
    blocked: 0,
  };

  for (const result of results) {
    summary[result.status] += 1;
  }

  return { results, summary };
}
