import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { ExcelImportService, PresentationService, templateSeeds, createRuleDefinition, findDefaultTemplate } from '@kidase/shared';
import type { TemplateDefinition } from '@kidase/shared';
import { loadConfig } from './config';
import { connectMongo } from './db/mongo';
import { createMongoRepositories, ensureIndexes } from './repositories/mongo';
import { importKidaseBackup, KidaseBackup } from './importer/kidaseImporter';
import { bumpContentVersion } from './contentVersion';

/**
 * Seed local MongoDB so the API has data to serve.
 *   pnpm --filter api seed path/to/backup.kidase   # restore a desktop backup
 *   pnpm --filter api seed path/to/slides.xlsx      # import an Excel workbook
 */
async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: pnpm --filter api seed <file.kidase|.json|.xlsx>');
    process.exit(1);
  }

  const cfg = loadConfig();
  const { client, db } = await connectMongo(cfg.mongoUri, cfg.mongoDb);
  await ensureIndexes(db);
  const repos = createMongoRepositories(db);
  const ext = extname(file).toLowerCase();

  try {
    if (ext === '.kidase' || ext === '.json') {
      const backup = JSON.parse(await readFile(file, 'utf8')) as KidaseBackup;
      const counts = await importKidaseBackup(db, backup);
      console.log('Restored backup:', counts);
    } else if (ext === '.xlsx') {
      // Ensure default templates exist (mirrors desktop bootstrap).
      for (const seed of templateSeeds) {
        const existing = await repos.template.getByName(seed.name);
        if (!existing) {
          await repos.template.create({
            name: seed.name,
            maxLangCount: seed.maxLangCount,
            definitionJson: seed.definitionJson as unknown as TemplateDefinition,
          });
        } else if (JSON.stringify(existing.definitionJson) !== JSON.stringify(seed.definitionJson)) {
          await repos.template.update(existing.id, {
            maxLangCount: seed.maxLangCount,
            definitionJson: seed.definitionJson as unknown as TemplateDefinition,
          });
        }
      }
      const templates = await repos.template.getAll();
      const templateId = findDefaultTemplate(templates)!.id;

      const excel = new ExcelImportService(repos);
      const presentationService = new PresentationService(repos, excel);
      const buf = await readFile(file);
      const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      const loaded = await presentationService.importFromArrayBuffer(arrayBuffer, templateId);
      console.log(`Imported presentation "${loaded.presentation.name}" with ${loaded.slides.length} slides.`);

      // Reference data: gitsawes (+ selection rules) and verses — needed for
      // gitsawe selection, readings, and dynamic (verse) slide expansion.
      try {
        const { gitsawes } = await excel.importGitsaweFromArrayBuffer(arrayBuffer);
        for (const g of gitsawes) {
          const created = await repos.gitsawe.create(g.gitsawe);
          if (g.selectionRule) {
            await repos.rule.create(createRuleDefinition(g.selectionRule.name, 'gitsawe', g.selectionRule.ruleJson, { gitsaweId: created.id, isEnabled: true }));
          }
        }
        console.log(`Imported ${gitsawes.length} gitsawes (+ selection rules).`);
      } catch (e) {
        console.log(`No Gitsawe sheet: ${(e as Error).message}`);
      }
      try {
        const { verses } = await excel.importVersesFromArrayBuffer(arrayBuffer);
        await repos.verse.upsertMany(verses);
        console.log(`Imported ${verses.length} verses.`);
      } catch (e) {
        console.log(`No Verses sheet: ${(e as Error).message}`);
      }
    } else {
      throw new Error(`Unsupported file type: ${ext} (expected .kidase, .json, or .xlsx)`);
    }

    const version = await bumpContentVersion(db);
    console.log(`Content version is now ${version}. Seed complete.`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
