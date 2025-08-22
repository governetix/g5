import { MigrationInterface, QueryRunner } from 'typeorm';

export class ThemesTable1710001001000 implements MigrationInterface {
  name = 'ThemesTable1710001001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_themes_active_snapshot`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_themes_tenant`);
    await queryRunner.query(`DROP TABLE IF EXISTS themes`);
  }
}
