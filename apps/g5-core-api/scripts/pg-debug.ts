import 'reflect-metadata';
import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

(async () => {
  const cfg = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER,
    password: (process.env.DB_PASS || '').trim(),
    database: process.env.DB_NAME,
  };
  console.log('Attempting PG connect with (excluding password):', { ...cfg, password: '***' });
  const client = new Client(cfg);
  try {
    await client.connect();
    const who = await client.query('select current_user, version(), inet_server_addr() as server_addr');
    console.log('Connected OK:', who.rows[0]);
  } catch (e) {
    console.error('PG connection failed:', (e as any).message, e);
  } finally {
    await client.end().catch(()=>{});
  }
})();
