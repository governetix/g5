import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { http } from './support/http';
import { AppModule } from '../src/app.module';

// Basic e2e covering register/login, create api key, batch operations

describe('API Keys E2E', () => {
  let app: INestApplication;
  let accessToken: string;
  let tenantId: string;

  beforeAll(async () => {
    process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  it('health', async () => {
    const api = http(app);
    await api.get('/health').expect(200);
  });

  it('login seed user', async () => {
    const api = http(app);
    const res = await api
      .post('/v1/auth/login')
      .send({ tenantSlug: 'demo', email: 'admin@local', password: 'Admin123!' })
      .expect(201);
    accessToken = res.body.accessToken;
    tenantId = res.body.user.tenantId;
    expect(accessToken).toBeDefined();
  });

  let createdKeyId: string;
  it('create api key', async () => {
    const api = http(app);
    const res = await api
      .post('/v1/api-keys')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Tenant-Id', tenantId)
      .send({ name: 'Test Key 1' })
      .expect(201);
    createdKeyId = res.body.id;
  });

  it('list api keys', async () => {
    const api = http(app);
    const res = await api
      .get('/v1/api-keys')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Tenant-Id', tenantId)
      .expect(200);
    expect(Array.isArray(res.body.items || res.body)).toBeTruthy();
  });

  it('batch rotate/revoke', async () => {
    const api = http(app);
    const rotateRes = await api
      .post('/v1/api-keys/batch/rotate')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Tenant-Id', tenantId)
      .send({ ids: [createdKeyId] })
      .expect(201);
    expect(rotateRes.body.results.length).toBe(1);
    const revokeRes = await api
      .post('/v1/api-keys/batch/revoke')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Tenant-Id', tenantId)
      .send({ ids: [rotateRes.body.results[0].id] })
      .expect(201);
    expect(revokeRes.body.results[0].revoked).toBe(true);
  });

  it('list sessions', async () => {
    const api = http(app);
    const res = await api
      .get('/v1/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Tenant-Id', tenantId)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  afterAll(async () => {
    await app.close();
  });
});
