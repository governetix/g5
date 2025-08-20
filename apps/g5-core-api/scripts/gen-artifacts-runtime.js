require('dotenv').config();
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const IORedis = require('ioredis');

const T0 = Date.now();
function log(msg) { process.stdout.write(`[${((Date.now()-T0)/1000).toFixed(1)}s] ${msg}\n`); }
function logErr(msg) { process.stderr.write(`[${((Date.now()-T0)/1000).toFixed(1)}s] ${msg}\n`); }

// Global watchdog (15 min) to prevent infinite hang
setTimeout(() => { logErr('Watchdog timeout reached – forcing exit'); process.exit(2); }, 15 * 60 * 1000).unref();

function run(cmd, args, opts = {}) {
  log(`RUN ${cmd} ${args.join(' ')}`);
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
    p.on('exit', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}`));
    });
  });
}

async function checkInfra() {
  log('Checking DB/Redis inline');
  const triedPorts = [];
  const desiredPorts = [];
  if (process.env.DB_PORT) desiredPorts.push(parseInt(process.env.DB_PORT, 10));
  // Common host-mapped fallback (compose maps 55432:5432)
  if (!desiredPorts.includes(55432)) desiredPorts.push(55432);
  if (!desiredPorts.includes(5432)) desiredPorts.push(5432);
  let dbOk = false; let lastErr;
  for (const port of desiredPorts) {
    triedPorts.push(port);
    const pg = new Client({
      host: process.env.DB_HOST || 'localhost',
      port,
      user: process.env.DB_USER,
      password: (process.env.DB_PASS || '').trim(),
      database: process.env.DB_NAME,
      connectionTimeoutMillis: 4000,
    });
    try {
      await pg.connect();
      await pg.query('select 1');
      dbOk = true;
      process.env.DB_PORT = String(port); // lock chosen port
      log(`PG OK on port ${port}`);
      await pg.end().catch(()=>{});
      break;
    } catch (e) {
      lastErr = e;
      logErr(`PG attempt on port ${port} failed: ${e.message}`);
      await pg.end().catch(()=>{});
    }
  }
  let redisOk = false;
  try {
    const r = new IORedis({ host: process.env.REDIS_HOST || '127.0.0.1', port: parseInt(process.env.REDIS_PORT||'6379',10), lazyConnect:true, connectTimeout: 4000 });
    await r.connect();
    await r.ping();
    redisOk = true;
    await r.quit();
    log('Redis OK');
  } catch(e){
    logErr('Redis ERROR: '+ e.message);
  }
  if (!dbOk) throw new Error('Infrastructure DB not ready. Tried ports: '+ triedPorts.join(', ') + (lastErr? ' last error: '+lastErr.message:''));
  if (!redisOk) throw new Error('Infrastructure Redis not ready');
}

async function build() {
  log('Building (pnpm build)');
  await run('pnpm', ['build']);
}

function spawnServer() {
  log('Starting server');
  const env = { ...process.env };
  const p = spawn('node', ['dist/src/main.js'], { shell: process.platform === 'win32', env });
  p.stdout.on('data', d => process.stdout.write(d));
  p.stderr.on('data', d => process.stderr.write(d));
  p.on('exit', code => log(`Server process exited with code ${code}`));
  return p;
}

async function waitHealth(port) {
  log('Waiting for health endpoint');
  const base = `http://localhost:${port}`;
  const deadline = Date.now() + 120_000; // 2 min
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt++;
    try {
      const res = await fetch(`${base}/health`);
      if (res.ok) { log(`Health OK after ${attempt} attempts`); return; }
      log(`Health attempt ${attempt} HTTP ${res.status}`);
    } catch (e) {
      if (attempt % 10 === 0) log(`Health attempt ${attempt} still failing: ${e.message}`);
    }
    await new Promise(r=>setTimeout(r,1000));
  }
  throw new Error('Health timeout after 120s');
}

async function fetchSwagger(port) {
  const base = `http://localhost:${port}`;
  const url = `${base}/docs-json`;
  log('Fetching Swagger JSON '+url);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Swagger fetch HTTP '+res.status);
  const json = await res.text();
  const dir = path.join(process.cwd(), 'openapi');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'openapi.json'), json);
  log('OpenAPI saved to openapi/openapi.json ('+json.length+' bytes)');
}

async function genPostman() {
  log('Generating Postman collection');
  await run('pnpm', ['gen:postman']);
}

async function genClientDirect() {
  log('Generating TypeScript client');
  await run('pnpm', ['gen:client:direct']);
}

async function main() {
  log('Starting artifact generation runtime');
  const port = process.env.PORT || '3001';
  log(`Effective env snapshot (subset): PORT=${port} DB_HOST=${process.env.DB_HOST} DB_PORT=${process.env.DB_PORT} SKIP_DB=${process.env.SKIP_DB} SKIP_QUEUES=${process.env.SKIP_QUEUES}`);
  try {
    await checkInfra();
  } catch (e) {
    logErr('Infra check failed (continuing with SKIP_DB mode): '+e.message);
    process.env.SKIP_DB = 'true';
  }
  await build();
  const server = spawnServer();
  try {
    await waitHealth(port);
    await fetchSwagger(port);
    await genPostman();
    await genClientDirect();
    log('Artifacts complete');
    process.exitCode = 0; // ensure success code
  } catch (e) {
    logErr('Failed: '+ e.stack);
    process.exitCode = 1;
  } finally {
    try {
      server.kill('SIGTERM');
    } catch {}
  }
}

main().catch(e => { logErr('Fatal: '+e.stack); process.exit(1); });
