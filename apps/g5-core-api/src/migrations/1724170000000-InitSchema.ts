import { MigrationInterface, QueryRunner } from 'typeorm';

// Baseline schema migration generated manually (frozen snapshot of current entities)
export class InitSchema1724170000000 implements MigrationInterface {
  name = 'InitSchema1724170000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS tenants (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      slug varchar NOT NULL UNIQUE,
      name varchar NOT NULL,
      metadata jsonb,
      themeSettings jsonb,
      createdAt timestamptz NOT NULL DEFAULT now(),
      updatedAt timestamptz NOT NULL DEFAULT now()
    )`);

    // Users table: handle possible pre-existing legacy snake_case table from earlier dev syncs.
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenantId uuid NOT NULL,
      email varchar NOT NULL,
      name varchar,
      passwordHash text,
      isActive boolean NOT NULL DEFAULT true,
      createdAt timestamptz NOT NULL DEFAULT now(),
      updatedAt timestamptz NOT NULL DEFAULT now()
    )`);
    // Normalize legacy columns if they exist (snake_case) and add missing columns.
    // Add tenantId if missing
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='tenantid'
      ) THEN
        ALTER TABLE users ADD COLUMN "tenantId" uuid;
      END IF;
    END $$;`);
    // Rename created_at -> createdAt
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='created_at'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='createdat'
      ) THEN
        ALTER TABLE users RENAME COLUMN created_at TO "createdAt";
      END IF;
    END $$;`);
    // Rename updated_at -> updatedAt
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='updated_at'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='updatedat'
      ) THEN
        ALTER TABLE users RENAME COLUMN updated_at TO "updatedAt";
      END IF;
    END $$;`);
    // Rename password_hash -> passwordHash
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='passwordhash'
      ) THEN
        ALTER TABLE users RENAME COLUMN password_hash TO "passwordHash";
      END IF;
    END $$;`);
    // Rename is_active -> isActive
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_active'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='isactive'
      ) THEN
        ALTER TABLE users RENAME COLUMN is_active TO "isActive";
      END IF;
    END $$;`);
    // Add isActive if still missing
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='isactive'
      ) THEN
        ALTER TABLE users ADD COLUMN "isActive" boolean NOT NULL DEFAULT true;
      END IF;
    END $$;`);
    // Enforce constraints (may fail harmlessly if already exist)
    await queryRunner.query(`DO $$ BEGIN
      BEGIN
        ALTER TABLE users ADD CONSTRAINT fk_users_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN
        ALTER TABLE users ADD CONSTRAINT uq_users_tenant_email UNIQUE ("tenantId", email);
      EXCEPTION WHEN duplicate_object THEN NULL; END;
    END $$;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_users_tenantId ON users("tenantId")`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS projects (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenantId uuid NOT NULL,
      key varchar NOT NULL,
      name varchar NOT NULL,
      description text,
      createdAt timestamptz NOT NULL DEFAULT now(),
      updatedAt timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT uq_projects_tenant_key UNIQUE(tenantId,key),
      CONSTRAINT fk_projects_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
    )`);
    // Legacy adaptation: normalize existing 'projects' table variants (missing tenantId / snake_case)
    await queryRunner.query(`DO $$ DECLARE
      hasTenantId boolean;
      hasSnake boolean;
      hasKey boolean;
      anyTenant uuid;
    BEGIN
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='tenantId'
      ) INTO hasTenantId;
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='tenant_id'
      ) INTO hasSnake;
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='key'
      ) INTO hasKey;
      IF hasSnake AND NOT hasTenantId THEN
        EXECUTE 'ALTER TABLE projects RENAME COLUMN tenant_id TO "tenantId"';
        hasTenantId := true;
      END IF;
      IF NOT hasTenantId THEN
        EXECUTE 'ALTER TABLE projects ADD COLUMN "tenantId" uuid';
        hasTenantId := true;
      END IF;
      IF NOT hasKey THEN
        EXECUTE 'ALTER TABLE projects ADD COLUMN "key" varchar';
        hasKey := true;
      END IF;
      -- Backfill tenantId if null
      IF hasTenantId THEN
        SELECT id FROM tenants LIMIT 1 INTO anyTenant;
        IF anyTenant IS NOT NULL THEN
          EXECUTE 'UPDATE projects SET "tenantId" = ' || quote_literal(anyTenant::text) || ' WHERE "tenantId" IS NULL';
        END IF;
        BEGIN
          PERFORM 1 FROM projects WHERE "tenantId" IS NULL LIMIT 1;
          IF NOT FOUND THEN
            EXECUTE 'ALTER TABLE projects ALTER COLUMN "tenantId" SET NOT NULL';
          END IF;
        EXCEPTION WHEN others THEN NULL; END;
      END IF;
      -- Backfill key if null (generate deterministic-ish slug from id)
      IF hasKey THEN
        BEGIN
          EXECUTE 'UPDATE projects SET "key" = SUBSTRING(md5(COALESCE("key", id::text)||id::text),1,12) WHERE "key" IS NULL OR "key" = ''''';
          PERFORM 1 FROM projects WHERE "key" IS NULL OR "key" = '' LIMIT 1;
          IF NOT FOUND THEN
            EXECUTE 'ALTER TABLE projects ALTER COLUMN "key" SET NOT NULL';
          END IF;
        EXCEPTION WHEN others THEN NULL; END;
      END IF;
      -- Constraints
      IF hasTenantId AND hasKey THEN
        BEGIN
          EXECUTE 'ALTER TABLE projects ADD CONSTRAINT fk_projects_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE';
        EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN
          EXECUTE 'ALTER TABLE projects ADD CONSTRAINT uq_projects_tenant_key UNIQUE("tenantId", "key")';
        EXCEPTION WHEN duplicate_object THEN NULL; END;
      END IF;
    END $$;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_projects_tenantId ON projects("tenantId")`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS assets (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenantId uuid NOT NULL,
      projectId uuid NOT NULL,
      name varchar NOT NULL,
      type varchar(32) NOT NULL,
      target text,
      metadata jsonb,
      createdAt timestamptz NOT NULL DEFAULT now(),
      updatedAt timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT uq_assets_tenant_project_name UNIQUE(tenantId,projectId,name),
      CONSTRAINT fk_assets_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_assets_project FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    )`);
    // Legacy adaptation: normalize tenantId in assets
    await queryRunner.query(`DO $$ DECLARE
  hasTenantId boolean;
  hasSnake boolean;
  hasIsActive boolean;
  hasSnakeIsActive boolean;
  anyTenant uuid;
    BEGIN
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='assets' AND column_name='tenantId'
      ) INTO hasTenantId;
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='assets' AND column_name='tenant_id'
      ) INTO hasSnake;
      IF hasSnake AND NOT hasTenantId THEN
        EXECUTE 'ALTER TABLE assets RENAME COLUMN tenant_id TO "tenantId"';
        hasTenantId := true;
      END IF;
      IF NOT hasTenantId THEN
        EXECUTE 'ALTER TABLE assets ADD COLUMN "tenantId" uuid';
        hasTenantId := true;
      END IF;
      IF hasTenantId THEN
        SELECT id FROM tenants LIMIT 1 INTO anyTenant;
        IF anyTenant IS NOT NULL THEN
          EXECUTE 'UPDATE assets SET "tenantId" = ' || quote_literal(anyTenant::text) || ' WHERE "tenantId" IS NULL';
        END IF;
        BEGIN
          PERFORM 1 FROM assets WHERE "tenantId" IS NULL LIMIT 1;
          IF NOT FOUND THEN
            EXECUTE 'ALTER TABLE assets ALTER COLUMN "tenantId" SET NOT NULL';
          END IF;
        EXCEPTION WHEN others THEN NULL; END;
      END IF;
      -- Constraints
      IF hasTenantId THEN
        BEGIN
          EXECUTE 'ALTER TABLE assets ADD CONSTRAINT fk_assets_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE';
        EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN
          EXECUTE 'ALTER TABLE assets ADD CONSTRAINT uq_assets_tenant_project_name UNIQUE("tenantId", "projectId", name)';
        EXCEPTION WHEN duplicate_object THEN NULL; END;
      END IF;
    END $$;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_assets_tenantId ON assets("tenantId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_assets_projectId ON assets("projectId")`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS scans (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenantId uuid NOT NULL,
      assetId uuid NOT NULL,
      status varchar(32) NOT NULL,
      startedAt timestamptz,
      finishedAt timestamptz,
      metrics jsonb,
      error text,
      createdAt timestamptz NOT NULL DEFAULT now(),
      updatedAt timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT fk_scans_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_scans_asset FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE
    )`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_scans_tenantId ON scans(tenantId)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_scans_assetId ON scans(assetId)`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS findings (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenantId uuid NOT NULL,
      scanId uuid NOT NULL,
      code varchar NOT NULL,
      severity varchar(16) NOT NULL,
      title text,
      description text,
      metadata jsonb,
      createdAt timestamptz NOT NULL DEFAULT now(),
      updatedAt timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT fk_findings_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_findings_scan FOREIGN KEY (scanId) REFERENCES scans(id) ON DELETE CASCADE
    )`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_findings_tenantId ON findings(tenantId)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_findings_scanId ON findings(scanId)`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS memberships (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenantId uuid NOT NULL,
      userId uuid NOT NULL,
      role varchar(16) NOT NULL,
      status varchar(16) NOT NULL DEFAULT 'ACTIVE',
      inviteToken varchar(64),
      inviteExpiresAt timestamptz,
      createdAt timestamptz NOT NULL DEFAULT now(),
      updatedAt timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT uq_memberships_tenant_user UNIQUE(tenantId,userId),
      CONSTRAINT fk_memberships_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_memberships_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )`);
    // Legacy adaptation: normalize tenantId in memberships
    await queryRunner.query(`DO $$ DECLARE
  hasTenantId boolean;
  hasSnake boolean;
  hasIsActive boolean;
  hasSnakeIsActive boolean;
  anyTenant uuid;
    BEGIN
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='memberships' AND column_name='tenantId'
      ) INTO hasTenantId;
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='memberships' AND column_name='tenant_id'
      ) INTO hasSnake;
      IF hasSnake AND NOT hasTenantId THEN
        EXECUTE 'ALTER TABLE memberships RENAME COLUMN tenant_id TO "tenantId"';
        hasTenantId := true;
      END IF;
      IF NOT hasTenantId THEN
        EXECUTE 'ALTER TABLE memberships ADD COLUMN "tenantId" uuid';
        hasTenantId := true;
      END IF;
      IF hasTenantId THEN
        SELECT id FROM tenants LIMIT 1 INTO anyTenant;
        IF anyTenant IS NOT NULL THEN
          EXECUTE 'UPDATE memberships SET "tenantId" = ' || quote_literal(anyTenant::text) || ' WHERE "tenantId" IS NULL';
        END IF;
        BEGIN
          PERFORM 1 FROM memberships WHERE "tenantId" IS NULL LIMIT 1;
          IF NOT FOUND THEN
            EXECUTE 'ALTER TABLE memberships ALTER COLUMN "tenantId" SET NOT NULL';
          END IF;
        EXCEPTION WHEN others THEN NULL; END;
      END IF;
      -- Constraints
      IF hasTenantId THEN
        BEGIN
          EXECUTE 'ALTER TABLE memberships ADD CONSTRAINT fk_memberships_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE';
        EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN
          EXECUTE 'ALTER TABLE memberships ADD CONSTRAINT uq_memberships_tenant_user UNIQUE("tenantId", "userId")';
        EXCEPTION WHEN duplicate_object THEN NULL; END;
      END IF;
    END $$;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_memberships_tenantId_role ON memberships("tenantId",role)`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS api_keys (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenantId uuid NOT NULL,
      name varchar NOT NULL,
      keyHash varchar NOT NULL UNIQUE,
      lastUsedAt timestamptz,
      revokedAt timestamptz,
      metadata jsonb,
      createdAt timestamptz NOT NULL DEFAULT now(),
      updatedAt timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT uq_api_keys_tenant_name UNIQUE(tenantId,name),
      CONSTRAINT fk_api_keys_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
    )`);
    // Legacy adaptation: normalize tenantId in api_keys
    await queryRunner.query(`DO $$ DECLARE
      hasTenantId boolean;
      hasSnake boolean;
      hasName boolean;
      anyTenant uuid;
    BEGIN
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='api_keys' AND column_name='tenantId'
      ) INTO hasTenantId;
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='api_keys' AND column_name='tenant_id'
      ) INTO hasSnake;
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='api_keys' AND column_name='name'
      ) INTO hasName;
      IF hasSnake AND NOT hasTenantId THEN
        EXECUTE 'ALTER TABLE api_keys RENAME COLUMN tenant_id TO "tenantId"';
        hasTenantId := true;
      END IF;
      IF NOT hasTenantId THEN
        EXECUTE 'ALTER TABLE api_keys ADD COLUMN "tenantId" uuid';
        hasTenantId := true;
      END IF;
      IF NOT hasName THEN
        EXECUTE 'ALTER TABLE api_keys ADD COLUMN "name" varchar';
        hasName := true;
      END IF;
      IF hasTenantId THEN
        SELECT id FROM tenants LIMIT 1 INTO anyTenant;
        IF anyTenant IS NOT NULL THEN
          EXECUTE 'UPDATE api_keys SET "tenantId" = ' || quote_literal(anyTenant::text) || ' WHERE "tenantId" IS NULL';
        END IF;
        BEGIN
          PERFORM 1 FROM api_keys WHERE "tenantId" IS NULL LIMIT 1;
          IF NOT FOUND THEN
            EXECUTE 'ALTER TABLE api_keys ALTER COLUMN "tenantId" SET NOT NULL';
          END IF;
        EXCEPTION WHEN others THEN NULL; END;
      END IF;
      IF hasName THEN
        BEGIN
          EXECUTE 'UPDATE api_keys SET "name" = SUBSTRING(md5(COALESCE("name", id::text)||id::text),1,12) WHERE "name" IS NULL OR "name" = ''''';
          PERFORM 1 FROM api_keys WHERE "name" IS NULL OR "name" = '' LIMIT 1;
          IF NOT FOUND THEN
            EXECUTE 'ALTER TABLE api_keys ALTER COLUMN "name" SET NOT NULL';
          END IF;
        EXCEPTION WHEN others THEN NULL; END;
      END IF;
      -- Constraints
      IF hasTenantId AND hasName THEN
        BEGIN
          EXECUTE 'ALTER TABLE api_keys ADD CONSTRAINT fk_api_keys_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE';
        EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN
          EXECUTE 'ALTER TABLE api_keys ADD CONSTRAINT uq_api_keys_tenant_name UNIQUE("tenantId", "name")';
        EXCEPTION WHEN duplicate_object THEN NULL; END;
      END IF;
    END $$;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_tenantId ON api_keys("tenantId")`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS audit_logs (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenantId uuid NOT NULL,
      actorUserId uuid,
      action varchar NOT NULL,
      entityType varchar(64),
      entityId uuid,
      metadata jsonb,
      createdAt timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT fk_audit_logs_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actorUserId) REFERENCES users(id) ON DELETE SET NULL
    )`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_createdAt ON audit_logs(tenantId,createdAt)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_action_createdAt ON audit_logs(tenantId,action,createdAt)`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS themes (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenantId uuid NOT NULL,
      name varchar NOT NULL,
      palette jsonb,
      isDefault boolean NOT NULL DEFAULT false,
      activeSnapshotId uuid,
      createdAt timestamptz NOT NULL DEFAULT now(),
      updatedAt timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT uq_themes_tenant_name UNIQUE(tenantId,name),
      CONSTRAINT fk_themes_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
    )`);
    // Legacy adaptation: normalize tenantId in themes
    await queryRunner.query(`DO $$ DECLARE
      hasTenantId boolean;
      hasSnake boolean;
      anyTenant uuid;
    BEGIN
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='themes' AND column_name='tenantId'
      ) INTO hasTenantId;
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='themes' AND column_name='tenant_id'
      ) INTO hasSnake;
      IF hasSnake AND NOT hasTenantId THEN
        EXECUTE 'ALTER TABLE themes RENAME COLUMN tenant_id TO "tenantId"';
        hasTenantId := true;
      END IF;
      IF NOT hasTenantId THEN
        EXECUTE 'ALTER TABLE themes ADD COLUMN "tenantId" uuid';
        hasTenantId := true;
      END IF;
      IF hasTenantId THEN
        SELECT id FROM tenants LIMIT 1 INTO anyTenant;
        IF anyTenant IS NOT NULL THEN
          EXECUTE 'UPDATE themes SET "tenantId" = ' || quote_literal(anyTenant::text) || ' WHERE "tenantId" IS NULL';
        END IF;
        BEGIN
          PERFORM 1 FROM themes WHERE "tenantId" IS NULL LIMIT 1;
          IF NOT FOUND THEN
            EXECUTE 'ALTER TABLE themes ALTER COLUMN "tenantId" SET NOT NULL';
          END IF;
        EXCEPTION WHEN others THEN NULL; END;
      END IF;
      -- Constraints
      IF hasTenantId THEN
        BEGIN
          EXECUTE 'ALTER TABLE themes ADD CONSTRAINT fk_themes_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE';
        EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN
          EXECUTE 'ALTER TABLE themes ADD CONSTRAINT uq_themes_tenant_name UNIQUE("tenantId", name)';
        EXCEPTION WHEN duplicate_object THEN NULL; END;
      END IF;
    END $$;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_themes_tenantId ON themes("tenantId")`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS theme_snapshots (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      themeId uuid NOT NULL,
      version int NOT NULL,
      tokens jsonb NOT NULL,
      label text,
      isRollback boolean NOT NULL DEFAULT false,
      createdAt timestamptz NOT NULL DEFAULT now(),
      updatedAt timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT uq_theme_snapshots_theme_version UNIQUE(themeId,version),
      CONSTRAINT fk_theme_snapshots_theme FOREIGN KEY (themeId) REFERENCES themes(id) ON DELETE CASCADE
    )`);
    // Create password_reset_tokens before webhooks (remove broken leftovers)
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenantId uuid NOT NULL,
      userId uuid NOT NULL,
      tokenHash varchar NOT NULL UNIQUE,
      expiresAt timestamptz NOT NULL,
      usedAt timestamptz,
      createdAt timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT fk_password_reset_tokens_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_tenant_user ON password_reset_tokens(tenantId,userId)`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS webhooks (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenantId uuid NOT NULL,
      url varchar NOT NULL,
      events text[] NOT NULL,
      secretHash text,
      isActive boolean NOT NULL DEFAULT true,
      failureCount int NOT NULL DEFAULT 0,
      circuitOpenedAt timestamptz,
      nextRetryAt timestamptz,
      createdAt timestamptz NOT NULL DEFAULT now(),
      updatedAt timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT fk_webhooks_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
    )`);
    // Idempotent legacy normalization for webhooks
    await queryRunner.query(`DO $$ BEGIN
      -- tenantId adjustments
      BEGIN ALTER TABLE webhooks RENAME COLUMN tenant_id TO "tenantId"; EXCEPTION WHEN undefined_column THEN NULL; END;
      BEGIN ALTER TABLE webhooks ADD COLUMN "tenantId" uuid; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN UPDATE webhooks SET "tenantId" = (SELECT id FROM tenants LIMIT 1) WHERE "tenantId" IS NULL; EXCEPTION WHEN undefined_column THEN NULL; END;
      BEGIN ALTER TABLE webhooks ALTER COLUMN "tenantId" SET NOT NULL; EXCEPTION WHEN others THEN NULL; END;
      -- isActive adjustments
      BEGIN ALTER TABLE webhooks RENAME COLUMN is_active TO "isActive"; EXCEPTION WHEN undefined_column THEN NULL; END;
      BEGIN ALTER TABLE webhooks ADD COLUMN "isActive" boolean DEFAULT true; EXCEPTION WHEN duplicate_column THEN NULL; END;
      -- FK constraint
      BEGIN ALTER TABLE webhooks ADD CONSTRAINT fk_webhooks_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; END;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='webhooks' AND column_name='tenantId')
         AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='webhooks' AND column_name='isActive') THEN
        BEGIN EXECUTE 'CREATE INDEX IF NOT EXISTS idx_webhooks_tenant_isActive ON webhooks("tenantId","isActive")'; EXCEPTION WHEN others THEN NULL; END;
      END IF;
    END $$;`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS idempotency_keys (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenantId uuid NOT NULL,
      key varchar NOT NULL,
      responseHash text NOT NULL,
      responseBody jsonb NOT NULL,
      createdAt timestamptz NOT NULL DEFAULT now(),
      expiresAt timestamptz,
      CONSTRAINT uq_idempotency_tenant_key UNIQUE(tenantId,key)
    )`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_idempotency_tenantId ON idempotency_keys(tenantId)`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS feature_flags (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      key varchar(100) NOT NULL,
      enabled boolean NOT NULL DEFAULT false,
      description text,
      createdAt timestamptz NOT NULL DEFAULT now(),
      updatedAt timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT uq_feature_flags_key UNIQUE(key)
    )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop order: children before parents
    await queryRunner.query(`DROP TABLE IF EXISTS feature_flags`);
    await queryRunner.query(`DROP TABLE IF EXISTS idempotency_keys`);
    await queryRunner.query(`DROP TABLE IF EXISTS webhooks`);
    await queryRunner.query(`DROP TABLE IF EXISTS password_reset_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS theme_snapshots`);
    await queryRunner.query(`DROP TABLE IF EXISTS themes`);
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS api_keys`);
    await queryRunner.query(`DROP TABLE IF EXISTS memberships`);
    await queryRunner.query(`DROP TABLE IF EXISTS findings`);
    await queryRunner.query(`DROP TABLE IF EXISTS scans`);
    await queryRunner.query(`DROP TABLE IF EXISTS assets`);
    await queryRunner.query(`DROP TABLE IF EXISTS projects`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
    await queryRunner.query(`DROP TABLE IF EXISTS tenants`);
  }
}
