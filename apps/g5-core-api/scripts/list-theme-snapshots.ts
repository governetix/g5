import 'reflect-metadata';
import { AppDataSource } from '../src/data-source';
import { Theme } from '../src/entities/theme.entity';
import { ThemeSnapshot } from '../src/entities/theme-snapshot.entity';

async function main() {
  const [,, themeIdArg] = process.argv;
  if (!themeIdArg) {
    console.error('Usage: pnpm -F g5-core-api theme:snapshots:list <THEME_ID>');
    process.exit(1);
  }
  await AppDataSource.initialize();
  const themeRepo = AppDataSource.getRepository(Theme);
  const snapRepo = AppDataSource.getRepository(ThemeSnapshot);
  const theme = await themeRepo.findOne({ where: { id: themeIdArg } });
  if (!theme) {
    console.error('Theme not found:', themeIdArg);
    process.exit(2);
  }
  const snaps = await snapRepo.find({ where: { themeId: theme.id }, order: { version: 'DESC' } });
  console.log(JSON.stringify({ theme: { id: theme.id, activeSnapshotId: theme.activeSnapshotId }, snapshots: snaps }, null, 2));
  await AppDataSource.destroy();
}
main().catch(e => { console.error(e); process.exit(99); });
