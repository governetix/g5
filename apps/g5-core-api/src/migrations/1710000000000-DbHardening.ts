import { MigrationInterface, QueryRunner } from 'typeorm';

export class DbHardening1710000000000 implements MigrationInterface {
  name = 'DbHardening1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure pgcrypto for gen_random_uuid()
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    // Add indexes (correct table names)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_memberships_tenant_user ON memberships ("tenantId", "userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects ("tenantId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_assets_project ON assets ("projectId")`,
    );
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_assets_tenant ON assets ("tenantId")`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_active ON api_keys ("tenantId") WHERE "revokedAt" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_webhooks_tenant ON webhooks ("tenantId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_revoked ON api_keys ("tenantId","revokedAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_webhooks_tenant_circuit ON webhooks ("tenantId","circuitOpenedAt")`,
    );

    // CHECK constraints (idempotent via DO blocks)
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memberships_role_chk') THEN
        ALTER TABLE memberships ADD CONSTRAINT memberships_role_chk CHECK (role IN ('OWNER','ADMIN','EDITOR','VIEWER'));
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memberships_status_chk') THEN
        ALTER TABLE memberships ADD CONSTRAINT memberships_status_chk CHECK (status IN ('ACTIVE','INVITED'));
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'webhooks_events_len_chk') THEN
        ALTER TABLE webhooks ADD CONSTRAINT webhooks_events_len_chk CHECK (array_length(events,1) <= 32);
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'webhooks_failurecount_nonneg_chk') THEN
        ALTER TABLE webhooks ADD CONSTRAINT webhooks_failurecount_nonneg_chk CHECK ("failureCount" >= 0);
      END IF;
    END $$;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_webhooks_tenant_circuit`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_webhooks_tenant`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_api_keys_tenant_revoked`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_api_keys_tenant_active`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_assets_tenant`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_assets_project`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_projects_tenant`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_memberships_tenant_user`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_email_lower`);
    await queryRunner.query(
      `ALTER TABLE webhooks DROP CONSTRAINT IF EXISTS webhooks_failurecount_nonneg_chk`,
    );
    await queryRunner.query(
      `ALTER TABLE webhooks DROP CONSTRAINT IF EXISTS webhooks_events_len_chk`,
    );
    await queryRunner.query(
      `ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_status_chk`,
    );
    await queryRunner.query(
      `ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_role_chk`,
    );
  }
}
