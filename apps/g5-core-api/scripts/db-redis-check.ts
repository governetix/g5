import 'dotenv/config';
import { Client } from 'pg';
import IORedis from 'ioredis';

(async () => {
  const pg = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER,
    password: (process.env.DB_PASS || '').trim(),
    database: process.env.DB_NAME,
  });
  try {
    await pg.connect();
    const r = await pg.query('select current_user, current_database()');
    console.log('[PG_OK]', r.rows[0]);
  } catch (e) {
    console.error('[PG_ERROR]', (e as Error).message);
  } finally {
    await pg.end().catch(() => undefined);
  }

  try {
    const redis = new IORedis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      lazyConnect: true,
    });
    await redis.connect();
    const pong = await redis.ping();
    console.log('[REDIS_OK]', pong);
    await redis.quit();
  } catch (e) {
    console.error('[REDIS_ERROR]', (e as Error).message);
  }
})();
