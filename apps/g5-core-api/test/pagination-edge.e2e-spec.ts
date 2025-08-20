import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import request from 'supertest';

describe('Pagination Edge Cases (e2e)', () => {
  let app: INestApplication;
  const tenant = 'tenantPg';
  let token: string;
  beforeAll(async () => {
    const m = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = m.createNestApplication();
    await app.init();
    await request(app.getHttpServer()).post('/auth/register').send({ tenantSlug: tenant, email: 'p@p.com', password: 'Password1!' });
    const login = await request(app.getHttpServer()).post('/auth/login').send({ tenantSlug: tenant, email: 'p@p.com', password: 'Password1!' });
    token = login.body.accessToken;
    for (let i = 0; i < 6; i++) {
      await request(app.getHttpServer())
        .post('/api-keys')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenant)
        .send({ name: `K${i}`, scopes: [] });
    }
  });
  afterAll(async () => { await app.close(); });

  it('invalid cursor ignored gracefully', async () => {
    const res = await request(app.getHttpServer())
      .get('/api-keys?cursor=invalid&limit=2')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenant);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
  });

  it('iterate pages until end', async () => {
    let cursor: string | null = null;
    const seen = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const url = cursor ? `/api-keys?limit=2&cursor=${encodeURIComponent(cursor)}` : '/api-keys?limit=2';
      const page = await request(app.getHttpServer())
        .get(url)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenant);
      expect(page.status).toBe(200);
      for (const it of page.body.items) seen.add(it.id);
      cursor = page.body.nextCursor;
      if (!cursor) break;
    }
    expect(seen.size).toBeGreaterThanOrEqual(6);
  });
});
