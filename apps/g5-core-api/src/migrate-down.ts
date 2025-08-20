import { AppDataSource } from './data-source';

/*
 * Migration rollback helper.
 * Usage examples:
 *   pnpm -F g5-core-api migration:down             -> revert the latest migration
 *   pnpm -F g5-core-api migration:down 2           -> revert the latest 2 migrations
 *   pnpm -F g5-core-api migration:down to 1709999  -> revert down to (and including) first migration whose name contains '1709999'
 *   pnpm -F g5-core-api migration:down all         -> revert all applied migrations (danger)
 */

async function run() {
  const mode = process.argv[2];
  await AppDataSource.initialize();
  try {
    const queryRunner = AppDataSource.createQueryRunner();
    const rows = await queryRunner.query('SELECT * FROM "migrations" ORDER BY "timestamp" DESC');
    if (!rows.length) {
      console.log('No migrations applied.');
      return;
    }

    const revertOne = async () => {
      await AppDataSource.undoLastMigration();
    };

    if (!mode) {
      console.log('Reverting latest migration:', rows[0].name);
      await revertOne();
      console.log('Reverted:', rows[0].name);
      return;
    }

    if (mode === 'all') {
      console.log('Reverting ALL migrations...');
      for (const r of rows) {
        console.log('Reverting', r.name);
        await revertOne();
      }
      console.log('All migrations reverted.');
      return;
    }

    if (mode === 'to') {
      const target = process.argv[3];
      if (!target) {
        console.error('Specify target after "to"');
        process.exit(1);
      }
      const applied = rows.map((r: any) => r.name);
      const idx = applied.findIndex((n: string) => n.includes(target));
      if (idx === -1) {
        console.error('Target not found among applied migrations:', target);
        process.exit(2);
      }
      console.log('Reverting down to (inclusive):', applied[idx]);
      for (let i = 0; i <= idx; i++) {
        console.log('Reverting', applied[i]);
        await revertOne();
      }
      console.log('Rollback complete.');
      return;
    }

    const count = parseInt(mode, 10);
    if (!isNaN(count) && count > 0) {
      console.log(`Reverting latest ${count} migration(s)...`);
      for (let i = 0; i < count && i < rows.length; i++) {
        console.log('Reverting', rows[i].name);
        await revertOne();
      }
      console.log('Requested rollback complete.');
      return;
    }

    console.error('Unrecognized mode. See file header for usage.');
    process.exit(3);
  } finally {
    await AppDataSource.destroy();
  }
}

void run();
