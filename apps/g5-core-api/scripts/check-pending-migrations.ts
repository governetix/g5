import { AppDataSource } from '../src/data-source';

(async () => {
  await AppDataSource.initialize();
  const migrations = await AppDataSource.showMigrations();
  // showMigrations logs to console; to programmatically determine, we run query on migrations table
  const executed = await AppDataSource.query('SELECT name FROM migrations');
  const executedSet = new Set(executed.map((r: any) => r.name));
  const defined = (AppDataSource.migrations || []).map(m => (m as any).name || (m as any).fileName);
  const pending = defined.filter(n => !executedSet.has(n));
  if (pending.length) {
    console.error('Pending migrations detected:', pending);
    process.exit(1);
  } else {
    console.log('No pending migrations.');
  }
  await AppDataSource.destroy();
})().catch(err => { console.error(err); process.exit(1); });
