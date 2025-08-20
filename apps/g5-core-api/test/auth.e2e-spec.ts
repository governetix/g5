import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { http } from './support/http';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Tenant } from '../src/entities/tenant.entity';

describe('Auth flow (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    ds = app.get(DataSource);
    // ensure demo tenant
    const tenantRepo = ds.getRepository(Tenant);
    const slug = 'demo';
    let tenant = await tenantRepo.findOne({ where: { slug } });
    if (!tenant) {
      tenant = tenantRepo.create({ slug, name: 'Demo Tenant' });
      await tenantRepo.save(tenant);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('register then login', async () => {
    const email = 'e2euser@example.com';
    const password = 'Passw0rd!';
    const api = http(app);
    const register = await api
      .post('/v1/auth/register')
      .send({ tenantSlug: 'demo', email, password });
    // register returns user only
    expect(register.status).toBeLessThan(500);
    const login = await api.post('/v1/auth/login').send({ tenantSlug: 'demo', email, password });
    expect(login.status).toBe(201);
    expect(login.body.accessToken).toBeDefined();
    expect(login.body.refreshToken).toBeDefined();
    const refresh = await api
      .post('/v1/auth/refresh')
      .send({ refreshToken: login.body.refreshToken });
    expect(refresh.status).toBe(201);
    expect(refresh.body.accessToken).toBeDefined();
  });
});
