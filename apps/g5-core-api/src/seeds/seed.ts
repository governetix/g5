import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as dotenv } from 'dotenv';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { Membership } from '../entities/membership.entity';
import { Project } from '../entities/project.entity';
import { Asset } from '../entities/asset.entity';
import { ApiKey } from '../entities/apikey.entity';
import { AuditLog } from '../entities/auditlog.entity';
import { Theme } from '../entities/theme.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

dotenv();

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER,
  password: (process.env.DB_PASS || '').trim(),
  database: process.env.DB_NAME,
  entities: [
    Tenant,
    User,
    Membership,
    Project,
    Asset,
    ApiKey,
    AuditLog,
    Theme,
    RefreshToken,
    PasswordResetToken,
  ],
  synchronize: false,
});

async function run() {
  await ds.initialize();
  const tenantRepo = ds.getRepository(Tenant);
  const userRepo = ds.getRepository(User);
  const membershipRepo = ds.getRepository(Membership);
  const projectRepo = ds.getRepository(Project);
  const assetRepo = ds.getRepository(Asset);
  const apiKeyRepo = ds.getRepository(ApiKey);

  let tenant = await tenantRepo.findOne({ where: { slug: 'demo' } });
  if (!tenant) {
    tenant = tenantRepo.create({ name: 'Demo Tenant', slug: 'demo' });
    await tenantRepo.save(tenant);
    console.log('Created tenant demo');
  }

  let user = await userRepo.findOne({ where: { tenantId: tenant.id, email: 'admin@local' } });
  if (!user) {
    user = userRepo.create({
      tenantId: tenant.id,
      email: 'admin@local',
      passwordHash: await bcrypt.hash('Admin123!', 10),
    });
    await userRepo.save(user);
    console.log('Created user admin@local (password: Admin123!)');
  }

  let membership = await membershipRepo.findOne({
    where: { tenantId: tenant.id, userId: user.id },
  });
  if (!membership) {
    membership = membershipRepo.create({ tenantId: tenant.id, userId: user.id, role: 'OWNER' });
    await membershipRepo.save(membership);
  }

  let project = await projectRepo.findOne({ where: { tenantId: tenant.id, name: 'Demo Project' } });
  if (!project) {
    project = projectRepo.create({
      tenantId: tenant.id,
      name: 'Demo Project',
      description: 'Seeded project',
    });
    await projectRepo.save(project);
  }

  const existingAssets = await assetRepo.find({
    where: { tenantId: tenant.id, projectId: project.id },
  });
  if (existingAssets.length === 0) {
    const asset = assetRepo.create({
      tenantId: tenant.id,
      projectId: project.id,
      name: 'Demo Asset',
      type: 'site',
      target: 'https://example.com',
      metadata: { url: 'https://example.com' },
    });
    await assetRepo.save(asset);
  }

  // Ensure at least one API key
  const keyCount = await apiKeyRepo.count({ where: { tenantId: tenant.id } });
  if (keyCount === 0) {
    const raw = 'gk_' + crypto.randomBytes(24).toString('hex');
    const keyHash = crypto.createHash('sha256').update(raw).digest('hex');
    const key = apiKeyRepo.create({ tenantId: tenant.id, name: 'Seed Key', keyHash });
    await apiKeyRepo.save(key);
    console.log('Created API key (store securely):', raw);
  }

  console.log('Seed complete');
  await ds.destroy();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
