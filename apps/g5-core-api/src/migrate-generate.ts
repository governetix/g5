import { AppDataSource } from './data-source';
import { execSync } from 'child_process';

async function run() {
  const name = process.argv[2];
  if (!name) {
    console.error('Usage: pnpm migration:generate <Name>');
    process.exit(1);
  }
  await AppDataSource.initialize();
  await AppDataSource.destroy();
  const cmd = `node node_modules/typeorm/cli.js migration:generate src/migrations/${name} -d dist/src/data-source.js`;
  execSync(cmd, { stdio: 'inherit' });
}
void run();
