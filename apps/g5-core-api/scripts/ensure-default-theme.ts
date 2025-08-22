import 'reflect-metadata';
import { AppDataSource } from '../src/data-source';
import { Theme } from '../src/entities/theme.entity';

async function main() {
  const [,, tenantIdArg] = process.argv;
  const tenantId = tenantIdArg || '00000000-0000-0000-0000-000000000000';
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(Theme);
  let theme = await repo.findOne({ where: { tenantId, isDefault: true } });
  if (!theme) {
    theme = repo.create({ tenantId, name: 'Default', isDefault: true });
    await repo.save(theme);
    console.log(JSON.stringify({ created: true, theme }, null, 2));
  } else {
    console.log(JSON.stringify({ created: false, theme }, null, 2));
  }
  await AppDataSource.destroy();
}
main().catch(e => { console.error(e); process.exit(99); });
