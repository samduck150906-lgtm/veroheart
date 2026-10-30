import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repository = fileURLToPath(new URL('../', import.meta.url));
export const LEGACY_LABEL_MIGRATION = '20260611151005_supplement_image_label_ingredients.sql';

/** Prepare a separate unlinked project. This function never connects to a database. */
export async function prepareLocalSupabase(destination) {
  const target = path.resolve(destination);
  const migrations = (await readdir(path.join(repository, 'supabase/migrations'))).filter((name) => /^\d{14}_.+\.sql$/.test(name)).sort();
  if (!migrations.includes(LEGACY_LABEL_MIGRATION)) throw new Error('Expected historical label migration is missing');
  // Refuse an existing destination, including a linked or populated local project.
  await mkdir(target, { recursive: false });
  const output = path.join(target, 'supabase');
  await mkdir(path.join(output, 'migrations'), { recursive: true });
  const checksums = {};
  for (const name of migrations) {
    const source = path.join(repository, 'supabase/migrations', name);
    const contents = await readFile(source);
    checksums[name] = createHash('sha256').update(contents).digest('hex');
    await writeFile(path.join(output, 'migrations', name), contents);
  }
  for (const [source, name] of [
    ['before-legacy-labels.sql', '20260611151004_local_missing_product_guard.sql'],
    ['after-legacy-labels.sql', '20260611151006_remove_local_missing_product_guard.sql'],
  ]) {
    await copyFile(path.join(repository, 'supabase/local-bootstrap', source), path.join(output, 'migrations', name));
  }
  const config = (await readFile(path.join(repository, 'supabase/config.toml'), 'utf8'))
    .replace(/^project_id\s*=.*$/m, 'project_id = "veroro-empty-local"');
  await writeFile(path.join(output, 'config.toml'), config);
  await writeFile(path.join(output, 'seed.sql'), '-- Empty on purpose. Import attributable product evidence separately.\n');
  async function copyFunctionSources(source, targetDirectory) {
    await mkdir(targetDirectory, { recursive: true });
    for (const entry of await readdir(source, { withFileTypes: true })) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await copyFunctionSources(path.join(source, entry.name), path.join(targetDirectory, entry.name));
      } else if (entry.isFile() && /\.(ts|json)$/.test(entry.name) && !entry.name.startsWith('.')) {
        await copyFile(path.join(source, entry.name), path.join(targetDirectory, entry.name));
      }
    }
  }
  await copyFunctionSources(path.join(repository, 'supabase/functions'), path.join(output, 'functions'));
  await writeFile(path.join(target, 'historical-migration-checksums.json'), JSON.stringify(checksums, null, 2) + '\n');
  return { directory: target, historicalMigrations: migrations.length, localMigrations: migrations.length + 2 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const argument = process.argv.indexOf('--output');
  const destination = argument >= 0 ? process.argv[argument + 1] : path.join(repository, '.artifacts/local-supabase');
  if (!destination) throw new Error('--output requires a new directory path');
  await mkdir(path.dirname(path.resolve(destination)), { recursive: true });
  const result = await prepareLocalSupabase(destination);
  console.log(JSON.stringify(result, null, 2));
  console.log('Prepared files only; no database connection or production ledger change was made.');
  console.log('Use the generated directory only with the Supabase CLI --workdir option and local commands; never link or push this generated ledger.');
}
