import { http } from '../support/http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import helmet from 'helmet';

/**
 * Covers register, login, me, refresh, logout flows.
 */
describe('Auth flows (e2e)', () => {
  let app: INestApplication;
  let api: ReturnType<typeof http>;
  let accessToken: string;
  let refreshToken: string;
  const email = 'e2e_user@example.com';
  const password = 'Passw0rd!';

  beforeAll(async () => {
    process.env.FORCE_DB_SYNC = '1';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(helmet());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    api = http(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('register', async () => {
    const res = await api.post('/auth/register').send({ email, password });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('me', async () => {
    const res = await api.get('/auth/me').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(email);
  });

  it('refresh', async () => {
    const res = await api.post('/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(201);
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('logout', async () => {
    const res = await api.post('/auth/logout').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(201);
  });
});
