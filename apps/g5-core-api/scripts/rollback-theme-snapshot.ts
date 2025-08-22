import 'reflect-metadata';
import { AppDataSource } from '../src/data-source';
import { Theme } from '../src/entities/theme.entity';
import { ThemeSnapshot } from '../src/entities/theme-snapshot.entity';

async function main() {
  const [,, themeIdArg, snapshotIdArg] = process.argv;
  if (!themeIdArg || !snapshotIdArg) {
    console.error('Usage: pnpm -F g5-core-api theme:snapshot:rollback <THEME_ID> <SNAPSHOT_ID>');
    process.exit(1);
  }
  await AppDataSource.initialize();
  const themeRepo = AppDataSource.getRepository(Theme);
  const snapRepo = AppDataSource.getRepository(ThemeSnapshot);
  const theme = await themeRepo.findOne({ where: { id: themeIdArg } });
  if (!theme) { console.error('Theme not found'); process.exit(2); }
  const target = await snapRepo.findOne({ where: { id: snapshotIdArg, themeId: theme.id } });
  if (!target) { console.error('Snapshot not found for theme'); process.exit(3); }
  const last = await snapRepo.findOne({ where: { themeId: theme.id }, order: { version: 'DESC' } });
  const version = last ? last.version + 1 : 1;
  const newSnap = snapRepo.create({ themeId: theme.id, version, tokens: target.tokens, label: `rollback-to:${target.version}`, isRollback: true });
  const saved = await snapRepo.save(newSnap);
  theme.activeSnapshotId = saved.id;
  await themeRepo.save(theme);
  console.log(JSON.stringify({ rollbackCreated: saved }, null, 2));
  await AppDataSource.destroy();
}
main().catch(e => { console.error(e); process.exit(99); });
