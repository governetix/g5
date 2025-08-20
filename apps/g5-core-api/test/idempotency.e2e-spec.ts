import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import request from 'supertest';

async function registerAndLogin(app: INestApplication, tenantSlug: string, email: string, password: string) {
  // assumes tenant already exists or adjust to create tenant fixture if needed
  // Here we just attempt register then login
  await request(app.getHttpServer())
    .post('/auth/register')
    .send({ tenantSlug, email, password });
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ tenantSlug, email, password });
  return res.body.accessToken as string;
}

describe('Idempotency (e2e)', () => {
  let app: INestApplication;
  let token: string;
  const tenantSlug = 'tenant1';

  beforeAll(async () => {
    process.env.IDEMPOTENCY_TTL_SECONDS = '10';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    token = await registerAndLogin(app, tenantSlug, 'idem@test.com', 'Password1!');
  });

  afterAll(async () => {
    await app.close();
  });

  it('reusing Idempotency-Key returns same result and marks replay header', async () => {
    const key = 'test-key-123';
    const first = await request(app.getHttpServer())
      .post('/api-keys')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantSlug)
      .set('Idempotency-Key', key)
      .send({ name: 'Sample Key', scopes: [] });
    expect(first.status).toBe(201);
    expect(first.headers['idempotent-replay']).toBe('false');

    const second = await request(app.getHttpServer())
      .post('/api-keys')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantSlug)
      .set('Idempotency-Key', key)
      .send({ name: 'Sample Key', scopes: [] });
    expect(second.status).toBe(201);
    expect(second.headers['idempotent-replay']).toBe('true');
    expect(second.body.id).toEqual(first.body.id);
  });

  it('different Idempotency-Key creates distinct resources', async () => {
    const a = await request(app.getHttpServer())
      .post('/api-keys')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantSlug)
      .set('Idempotency-Key', 'k1')
      .send({ name: 'Key A', scopes: [] });
    const b = await request(app.getHttpServer())
      .post('/api-keys')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantSlug)
      .set('Idempotency-Key', 'k2')
      .send({ name: 'Key B', scopes: [] });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(a.body.id).not.toEqual(b.body.id);
  });
});
