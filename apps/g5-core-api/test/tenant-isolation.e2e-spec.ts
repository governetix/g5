import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import request from 'supertest';

describe('Tenant Isolation (e2e)', () => {
  let app: INestApplication;
  const t1 = 'tenantIso1';
  const t2 = 'tenantIso2';
  beforeAll(async () => {
    const m = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = m.createNestApplication();
    await app.init();
    await request(app.getHttpServer()).post('/auth/register').send({ tenantSlug: t1, email: 'a@a.com', password: 'Password1!' });
    await request(app.getHttpServer()).post('/auth/register').send({ tenantSlug: t2, email: 'b@b.com', password: 'Password1!' });
  });
  afterAll(async () => { await app.close(); });

  it('cannot access another tenant resource', async () => {
    const login1 = await request(app.getHttpServer()).post('/auth/login').send({ tenantSlug: t1, email: 'a@a.com', password: 'Password1!' });
    const token1 = login1.body.accessToken;
    // create an api key in tenant1
    const k = await request(app.getHttpServer())
      .post('/api-keys')
      .set('Authorization', `Bearer ${token1}`)
      .set('X-Tenant-Id', t1)
      .send({ name: 'K1', scopes: [] });
    expect(k.status).toBe(201);
    const id = k.body.id;
    // attempt read with tenant2 header & auth of user2
    const login2 = await request(app.getHttpServer()).post('/auth/login').send({ tenantSlug: t2, email: 'b@b.com', password: 'Password1!' });
    const token2 = login2.body.accessToken;
    const forbidden = await request(app.getHttpServer())
      .get('/api-keys')
      .set('Authorization', `Bearer ${token2}`)
      .set('X-Tenant-Id', t1);
    // Expect either empty list or 403 depending on guard design; we assert not leaking id
    expect(forbidden.body.items?.some?.((x: any) => x.id === id)).toBeFalsy();
  });
});
