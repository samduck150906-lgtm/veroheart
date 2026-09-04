import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const explicitRuntimeFiles = [
  'src/utils/score.ts',
  'src/utils/displayVerdict.ts',
  'src/utils/productConclusion.ts',
  'src/utils/analysis.ts',
  'src/utils/rankingFilters.ts',
];

function sourceFilesUnder(relativeDirectory: string): string[] {
  const directory = join(process.cwd(), relativeDirectory);
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((entry) => {
    const relativePath = join(relativeDirectory, entry);
    const absolutePath = join(process.cwd(), relativePath);
    if (statSync(absolutePath).isDirectory()) return sourceFilesUnder(relativePath);
    return /\.(ts|tsx)$/.test(entry) ? [relativePath] : [];
  });
}

describe('health-concern score shadow surface guard', () => {
  it('keeps health shadow modules out of runtime score, verdict, ranking, analysis, and UI surfaces', () => {
    const guardedPaths = [
      ...explicitRuntimeFiles,
      ...sourceFilesUnder('src/pages'),
      ...sourceFilesUnder('src/components'),
    ];

    for (const relativePath of guardedPaths) {
      const source = readFileSync(join(process.cwd(), relativePath), 'utf8');
      expect(source, `${relativePath} must not import the health-concern shadow sidecar`)
        .not.toContain('healthConcernScoreShadow');
    }
  });
});
