import { MigrationInterface, QueryRunner } from 'typeorm';

export class ThemeSnapshots1710001000000 implements MigrationInterface {
  name = 'ThemeSnapshots1710001000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    // Ensure themes table exists (defensive for dev environments)
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS themes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "tenantId" uuid NOT NULL,
      name text NOT NULL,
      palette jsonb,
      "isDefault" boolean NOT NULL DEFAULT false,
      "activeSnapshotId" uuid,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      UNIQUE ("tenantId", name)
    )`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_themes_tenant ON themes ("tenantId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_themes_active_snapshot ON themes ("activeSnapshotId")`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS theme_snapshots (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "themeId" uuid NOT NULL,
      version int NOT NULL,
      tokens jsonb NOT NULL,
      label text,
      "isRollback" boolean NOT NULL DEFAULT false,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_theme_snapshots_theme_version ON theme_snapshots ("themeId", version)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_theme_snapshots_theme ON theme_snapshots ("themeId")`);
    const hasColumn = await queryRunner.query(`SELECT 1 FROM information_schema.columns WHERE table_name='themes' AND column_name='activeSnapshotId'`);
    if (!hasColumn.length) {
      await queryRunner.query(`ALTER TABLE themes ADD COLUMN "activeSnapshotId" uuid NULL`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE themes DROP COLUMN IF EXISTS "activeSnapshotId"`);
  // Do NOT drop themes table (other migrations/entities depend on it)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_theme_snapshots_theme`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_theme_snapshots_theme_version`);
    await queryRunner.query(`DROP TABLE IF EXISTS theme_snapshots`);
  }
}
