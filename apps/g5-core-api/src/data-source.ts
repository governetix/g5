import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as dotenv } from 'dotenv';
import { Tenant } from './entities/tenant.entity';
import { User } from './entities/user.entity';
import { Project } from './entities/project.entity';
import { Asset } from './entities/asset.entity';
import { Scan } from './entities/scan.entity';
import { Finding } from './entities/finding.entity';
import { Membership } from './entities/membership.entity';
import { ApiKey } from './entities/apikey.entity';
import { AuditLog } from './entities/auditlog.entity';
import { Theme } from './entities/theme.entity';
import { ThemeSnapshot } from './entities/theme-snapshot.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { Webhook } from './entities/webhook.entity';

dotenv();

// Debug env (non-secret) for migration auth issue
const { DB_HOST, DB_PORT, DB_USER, DB_NAME } = process.env;
if (process.env.DEBUG_DB_ENV === '1') {
  // Do not print raw password, only length if present

  console.log('[DB ENV]', {
    DB_HOST,
    DB_PORT,
    DB_USER,
    DB_NAME,
    DB_PASS_LEN: (process.env.DB_PASS || '').length,
  });
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER,
  password: (process.env.DB_PASS || '').trim(),
  database: process.env.DB_NAME,
  entities: [
    Tenant,
    User,
    Project,
    Asset,
    Scan,
    Finding,
    Membership,
    ApiKey,
    AuditLog,
    Theme,
  ThemeSnapshot,
    RefreshToken,
    PasswordResetToken,
    Webhook,
  ],
  migrations: ['dist/src/migrations/*.js'],
  // One-time schema sync (NOT for production). Set DB_SYNC_ONCE=true when starting the app
  // to let TypeORM create missing tables/columns, then unset for subsequent runs.
  synchronize: process.env.DB_SYNC_ONCE === 'true',
  logging: process.env.DB_SYNC_ONCE === 'true' ? ['error','schema','warn'] : false,
});
