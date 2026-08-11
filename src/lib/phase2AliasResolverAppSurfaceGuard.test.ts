import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const guardedSurfacePaths = [
  'src/components/ProductCard.tsx',
  'src/components/AnalysisResult.tsx',
  'src/utils/analysis.ts',
  'src/utils/productConclusion.ts',
  'src/utils/displayVerdict.ts',
  'src/utils/score.ts',
];

const forbiddenImports = [
  'phase2AliasResolverShadowExecution',
  'phase2AliasResolverShadowReport',
  'phase2AliasResolverShadowResult',
  'phase2AliasResolverShadowMetadata',
];

describe('Phase 2 alias resolver app surface guard', () => {
  it('keeps shadow reporting modules out of app-visible scoring and UI surfaces', () => {
    for (const relativePath of guardedSurfacePaths) {
      const absolutePath = join(process.cwd(), relativePath);
      if (!existsSync(absolutePath)) continue;
      const source = readFileSync(absolutePath, 'utf8');
      for (const forbiddenImport of forbiddenImports) {
        expect(source, `${relativePath} must not import ${forbiddenImport}`).not.toContain(forbiddenImport);
      }
    }
  });

  it('keeps score.ts runtime flag free of a true marker', () => {
    const scoreSource = readFileSync(join(process.cwd(), 'src/utils/score.ts'), 'utf8');
    expect(scoreSource).toContain('isPhase2AliasResolverRuntimeEnabled()');
    expect(scoreSource).not.toContain('phase2AliasResolver: true');
  });
});
