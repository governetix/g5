import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AuditLog } from '../src/entities/auditlog.entity';

describe('Audit Log Structure (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  const tenant = 'tenantAudit';
  beforeAll(async () => {
    const m = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = m.createNestApplication();
    await app.init();
    ds = app.get(DataSource);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ tenantSlug: tenant, email: 'au@a.com', password: 'Password1!' });
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ tenantSlug: tenant, email: 'au@a.com', password: 'Password1!' });
    const token = login.body.accessToken;
    await request(app.getHttpServer())
      .post('/api-keys')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenant)
      .send({ name: 'AuditKey', scopes: [] });
  });
  afterAll(async () => { await app.close(); });

  it('audit log entries have expected shape and no secrets', async () => {
    const repo = ds.getRepository(AuditLog);
    const logs = await repo.find({ where: { tenantId: expect.any(String) } as any });
    expect(logs.length).toBeGreaterThan(0);
    for (const l of logs) {
      expect(l).toHaveProperty('action');
      expect(l).toHaveProperty('entityType');
      expect(l).toHaveProperty('entityId');
      expect(l).not.toHaveProperty('secret');
      if (l.metadata) {
        const m = l.metadata as any;
        expect(m.secret).toBeUndefined();
        expect(JSON.stringify(m).toLowerCase()).not.toContain('password');
      }
    }
  });
});
