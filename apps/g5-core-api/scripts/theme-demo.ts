import 'reflect-metadata';
import { AppDataSource } from '../src/data-source';
import { Theme } from '../src/entities/theme.entity';
import { ThemeSnapshot } from '../src/entities/theme-snapshot.entity';

async function run() {
  const tenantId = process.argv[2] || '00000000-0000-0000-0000-000000000000';
  await AppDataSource.initialize();
  const themeRepo = AppDataSource.getRepository(Theme);
  const snapRepo = AppDataSource.getRepository(ThemeSnapshot);
  let theme = await themeRepo.findOne({ where: { tenantId, isDefault: true } });
  if (!theme) {
    theme = themeRepo.create({ tenantId, name: 'Default', isDefault: true });
    await themeRepo.save(theme);
    console.log('[demo] default theme created');
  } else {
    console.log('[demo] default theme exists');
  }
  const last = await snapRepo.findOne({ where: { themeId: theme.id }, order: { version: 'DESC' } });
  if (!last) {
    const snap = snapRepo.create({ themeId: theme.id, version: 1, tokens: { colorPrimary: '#3366ff' }, label: 'auto-demo' });
    await snapRepo.save(snap);
    theme.activeSnapshotId = snap.id;
    await themeRepo.save(theme);
    console.log('[demo] snapshot v1 created');
  } else {
    console.log('[demo] snapshot already present (latest version', last.version, ')');
  }
  const snaps = await snapRepo.find({ where: { themeId: theme.id }, order: { version: 'ASC' } });
  console.log(JSON.stringify({ theme: { id: theme.id, activeSnapshotId: theme.activeSnapshotId }, snapshots: snaps }, null, 2));
  await AppDataSource.destroy();
}
run().catch(e => { console.error(e); process.exit(99); });
