import { execSync, spawn } from 'child_process';

function sh(cmd: string) {
  console.log('> ' + cmd);
  execSync(cmd, { stdio: 'inherit' });
}

function wait(ms: number) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const user = process.env.DB_USER || 'g5_user';
  const pass = process.env.DB_PASS || 'g5_pass';
  const db = process.env.DB_NAME || 'g5_db';
  console.log('Resetting Postgres with credentials', { user, pass, db });

  try { sh('docker compose down'); } catch {}
  try { sh('docker volume rm g5_pgdata_v2'); } catch { console.log('Volume already absent'); }
  sh('docker compose up -d postgres redis');

  // Wait for container healthy (simple retry on pg_isready via docker exec)
  let attempts = 0;
  while (attempts < 30) {
    try {
      execSync(`docker exec g5_postgres pg_isready -h 127.0.0.1 -p 5432`, { stdio: 'ignore' });
      break;
    } catch {
      attempts++; await wait(1000);
    }
  }
  if (attempts >= 30) {
    console.error('Postgres did not become ready in time');
    process.exit(1);
  }

  // Test password using psql
  let ok = false;
  try {
    sh(`docker exec -e PGPASSWORD=${pass} g5_postgres psql -h 127.0.0.1 -U ${user} -d ${db} -c "select 1;"`);
    ok = true;
  } catch {
    console.error('Initial password test failed, attempting ALTER USER inside container');
    try {
      sh(`docker exec g5_postgres psql -U ${user} -d ${db} -c "ALTER USER ${user} WITH PASSWORD '${pass}';"`);
      sh(`docker exec -e PGPASSWORD=${pass} g5_postgres psql -h 127.0.0.1 -U ${user} -d ${db} -c "select 1;"`);
      ok = true;
    } catch (e) {
      console.error('Password reset still failing');
    }
  }
  if (!ok) {
    console.error('Giving up. Manual investigation required.');
    process.exit(1);
  }
  console.log('Connection succeeded. Run pg:debug or migrations next.');
})();
