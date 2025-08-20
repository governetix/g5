import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import request from 'supertest';

// NOTE: This test assumes REDIS_URL is set and guard enabled.
// It lowers the limit via env override if supported (not currently dynamic), so we simulate by rapid calls.

describe('Tenant Rate Limiting (e2e)', () => {
  let app: INestApplication;
  const tenant = 'tenant1';

  beforeAll(async () => {
    process.env.TENANT_RATE_LIMIT = '5';
    process.env.TENANT_RATE_WINDOW_SEC = '2';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should allow first N requests then 429 and recover after window', async () => {
  const agent = request(app.getHttpServer());
    for (let i = 0; i < 5; i++) {
      const res = await agent.get('/health').set('X-Tenant-Id', tenant);
      expect(res.status).toBe(200);
    }
    const blocked = await agent.get('/health').set('X-Tenant-Id', tenant);
    expect(blocked.status).toBe(429);
    expect(blocked.body.retryAfter).toBeDefined();
    // Wait window to reset
    await new Promise(r => setTimeout(r, 2100));
    const after = await agent.get('/health').set('X-Tenant-Id', tenant);
    expect(after.status).toBe(200);
  });
});
