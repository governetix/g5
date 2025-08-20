import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import request from 'supertest';

describe('Auth Refresh Rotation (e2e)', () => {
  let app: INestApplication;
  const tenantSlug = 'tenantrot';
  const email = 'rot@test.com';
  const password = 'Password1!';
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ tenantSlug, email, password });
  });
  afterAll(async () => { await app.close(); });

  it('old refresh token is revoked after rotation', async () => {
    const login = await request(app.getHttpServer()).post('/auth/login').send({ tenantSlug, email, password });
    expect(login.status).toBe(201);
    const firstRefresh = login.body.refreshToken as string;
    const first = await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken: firstRefresh });
    expect(first.status).toBe(201);
    const secondRefresh = first.body.refreshToken as string;
    // Using old refresh should now fail
    const reuseOld = await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken: firstRefresh });
    expect(reuseOld.status).toBe(401);
    // New one should work
    const second = await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken: secondRefresh });
    expect(second.status).toBe(201);
  });
});
