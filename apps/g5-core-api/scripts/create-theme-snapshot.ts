import 'reflect-metadata';
import { AppDataSource } from '../src/data-source';
import { Theme } from '../src/entities/theme.entity';
import { ThemeSnapshot } from '../src/entities/theme-snapshot.entity';

async function main() {
  const [,, themeIdArg, maybeTokensOrLabel, labelArg] = process.argv;
  if (!themeIdArg) {
    console.error('Usage: pnpm -F g5-core-api theme:snapshot:create <THEME_ID> [tokensJsonOrLabel] [label]');
    process.exit(1);
  }
  let tokensInput: any = { colorPrimary: '#3366ff' };
  let finalLabel: string | null = null;
  if (maybeTokensOrLabel) {
    // Try parse as JSON; if fails, treat as label
    try {
      tokensInput = JSON.parse(maybeTokensOrLabel);
      finalLabel = labelArg || null;
    } catch {
      finalLabel = maybeTokensOrLabel;
    }
  } else if (labelArg) {
    finalLabel = labelArg;
  }
  await AppDataSource.initialize();
  const themeRepo = AppDataSource.getRepository(Theme);
  const snapRepo = AppDataSource.getRepository(ThemeSnapshot);
  const theme = await themeRepo.findOne({ where: { id: themeIdArg } });
  if (!theme) {
    console.error('Theme not found:', themeIdArg);
    process.exit(2);
  }
  const last = await snapRepo.findOne({ where: { themeId: theme.id }, order: { version: 'DESC' } });
  const version = last ? last.version + 1 : 1;
  const snap = snapRepo.create({ themeId: theme.id, version, tokens: tokensInput, label: finalLabel });
  const saved = await snapRepo.save(snap);
  if (!theme.activeSnapshotId) {
    theme.activeSnapshotId = saved.id;
    await themeRepo.save(theme);
  }
  console.log(JSON.stringify({ created: saved }, null, 2));
  await AppDataSource.destroy();
}
main().catch(e => { console.error(e); process.exit(99); });
