# Migrations

Baseline migration: `1724170000000-InitSchema.ts` (manual snapshot of current entities).

## Applying

Development (already configured `migrationsRun: true` in `TypeOrmModule`):
- Remove any accidental `DB_SYNC_ONCE` usage.
- Start the server normally; if tables absent, TypeORM will run this migration.

Manual run (one-off):
```
pnpm -F g5-core-api migration:run
```

## Generating Future Migrations
1. Make entity changes (do **not** enable synchronize in shared environments).
2. Build project: `pnpm -F g5-core-api build`.
3. Use generation helper (if configured) or run TypeORM CLI pointing to compiled data-source.
4. Review generated file: ensure no destructive ops slipped in unexpectedly.

## Rollback
```
pnpm -F g5-core-api migration:down
```
(Will revert the latest migration; baseline down drops all tables defined.)

## Notes
- Extension `uuid-ossp` is ensured in `up()`; safe if already present.
- All tables use `uuid` PK with `uuid_generate_v4()` default.
- Indices replicate entity decorators; uniqueness constraints mirror `@Unique` and composite indexes.
- `themes.activeSnapshotId` has no FK constraint (intentional for now to avoid circular reference while snapshots evolve).

Last updated: 2025-08-20
