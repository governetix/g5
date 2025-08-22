import 'reflect-metadata';
import { AppDataSource } from '../src/data-source';
import { Theme } from '../src/entities/theme.entity';

async function main() {
  const [,, tenantIdArg] = process.argv;
  const tenantId = tenantIdArg || '00000000-0000-0000-0000-000000000000';
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(Theme);
  const themes = await repo.find({ where: { tenantId } });
  console.log(JSON.stringify({ count: themes.length, themes }, null, 2));
  await AppDataSource.destroy();
}
main().catch(e => { console.error(e); process.exit(99); });
