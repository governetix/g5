import { http } from '../support/http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import helmet from 'helmet';

// Basic smoke test until full suite implemented.
describe('App smoke (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.FORCE_DB_SYNC = '1'; // fallback while migrations blocked
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(helmet());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/health (GET)', async () => {
    const api = http(app);
    const res = await api.get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
  });
});
