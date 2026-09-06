import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const productionShadowModules = [
  'src/lib/healthConcernProductionShadow.ts',
  'src/lib/healthConcernProductionShadowInput.ts',
  'src/lib/healthConcernProductionShadowMarkdown.ts',
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

describe('health-concern production shadow surface guard', () => {
  it('keeps local production-shadow modules out of runtime, stores, and UI surfaces', () => {
    const guardedPaths = [
      'src/utils/score.ts',
      'src/utils/displayVerdict.ts',
      'src/utils/productConclusion.ts',
      'src/utils/analysis.ts',
      'src/utils/rankingFilters.ts',
      ...sourceFilesUnder('src/pages'),
      ...sourceFilesUnder('src/components'),
      ...sourceFilesUnder('src/store'),
    ];
    for (const relativePath of guardedPaths) {
      const source = readFileSync(join(process.cwd(), relativePath), 'utf8');
      expect(source, `${relativePath} must not import the local production shadow`)
        .not.toContain('healthConcernProductionShadow');
    }
  });

  it('keeps the implementation free of network, Supabase, environment, and SQL execution', () => {
    for (const relativePath of productionShadowModules) {
      const source = readFileSync(join(process.cwd(), relativePath), 'utf8');
      expect(source, `${relativePath} must not use a Supabase client`).not.toMatch(/from ['"].*supabase|createClient\s*\(/i);
      expect(source, `${relativePath} must not use network APIs`).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|WebSocket/);
      expect(source, `${relativePath} must not read environment values`).not.toMatch(/process\.env|import\.meta\.env/);
      expect(source, `${relativePath} must not execute SQL`).not.toMatch(/\.(query|rpc)\s*\(|\b(INSERT|UPDATE|DELETE|MERGE|UPSERT)\b/i);
    }
  });
});
