import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

(async () => {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    // dotenv/config already loaded; optional re-load not necessary.
  }
  const cfg = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER,
    password: (process.env.DB_PASS || '').trim(),
    database: process.env.DB_NAME,
  };
  console.log('Direct pg test config', cfg);
  console.log('Password char codes', cfg.password?.split('').map(c => c.charCodeAt(0)));
  const client = new Client(cfg);
  try {
    await client.connect();
    const r = await client.query('select current_user, current_database()');
    console.log('PG OK', r.rows[0]);
  } catch (e) {
    console.error('PG connection error', e);
  } finally {
    await client.end();
  }
})();
