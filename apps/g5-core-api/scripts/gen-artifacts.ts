import 'dotenv/config';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import IORedis from 'ioredis';

function run(cmd: string, args: string[], opts: any = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
    p.on('exit', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}`));
    });
  });
}

async function verifyInfra() {
  console.log('> Checking DB/Redis directly');
  let dbOk = false;
  const pgClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER,
    password: (process.env.DB_PASS || '').trim(),
    database: process.env.DB_NAME,
  });
  try {
    await pgClient.connect();
    await pgClient.query('select 1');
    dbOk = true;
    console.log('> PG OK');
  } catch (e) {
    console.error('> PG ERROR', (e as Error).message);
  } finally {
    await pgClient.end().catch(() => undefined);
  }
  let redisOk = false;
  try {
    const redis = new IORedis({ host: process.env.REDIS_HOST || '127.0.0.1', port: parseInt(process.env.REDIS_PORT || '6379', 10), lazyConnect: true });
    await redis.connect();
    await redis.ping();
    redisOk = true;
    await redis.quit();
    console.log('> Redis OK');
  } catch (e) {
    console.error('> Redis ERROR', (e as Error).message);
  }
  if (!dbOk || !redisOk) {
    throw new Error('Infrastructure not ready');
  }
}

async function waitForHealth(baseUrl: string, timeoutMs = 30000) {
  console.log('> Waiting for health endpoint');
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) {
        console.log('> Health OK');
        return;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Health endpoint not ready within timeout');
}

async function fetchSwagger(baseUrl: string) {
  const outDir = path.join(process.cwd(), 'openapi');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const url = baseUrl + '/docs-json';
  console.log('> Fetching', url);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Swagger fetch failed HTTP ' + res.status);
  const json = await res.text();
  fs.writeFileSync(path.join(outDir, 'openapi.json'), json);
  console.log('> OpenAPI saved');
}

async function main() {
  try {
    await verifyInfra();
  } catch (e) {
    console.error('> Aborting:', (e as Error).message);
    process.exit(1);
  }
  console.log('> Building');
  await run('pnpm', ['build']);
  console.log('> Spawning server');
  const server = spawn('node', ['dist/src/main.js'], { shell: process.platform === 'win32' });
  server.stdout.on('data', (d) => process.stdout.write(d));
  server.stderr.on('data', (d) => process.stderr.write(d));
  const port = process.env.PORT || '3001';
  const baseUrl = `http://localhost:${port}`;
  try {
    await waitForHealth(baseUrl);
    await fetchSwagger(baseUrl);
    console.log('> Generating Postman collection');
    await run('pnpm', ['gen:postman']);
    console.log('> Generating TypeScript client');
    await run('pnpm', ['gen:client']);
    console.log('> All artifacts generated');
  } catch (e) {
    console.error('> Failed:', (e as Error).message);
    process.exitCode = 1;
  } finally {
    server.kill();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
