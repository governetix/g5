import { execSync } from 'child_process';
import * as fs from 'fs';

/*
  This script (best-effort) will:
  1. Exec into container to overwrite pg_hba.conf with a minimal secure ordering (local trust, host all md5)
  2. Reload postgres
  3. Reset password for g5_user via postgres superuser

  NOTE: requires container name g5_postgres and that 'postgres' superuser has no password (default official image).
*/

function run(cmd: string) {
  console.log('> ' + cmd);
  execSync(cmd, { stdio: 'inherit' });
}

const NEW_PG_HBA = `# Simplified pg_hba.conf installed by pg-fix-auth script\nlocal   all             all                                     trust\nhost    all             all             127.0.0.1/32            md5\nhost    all             all             ::1/128                 md5\nhost    all             all             0.0.0.0/0               md5\n`;

try {
  // Write temp file
  const tmpFile = 'scripts/tmp_pg_hba.conf';
  fs.writeFileSync(tmpFile, NEW_PG_HBA, { encoding: 'utf8' });
  // Copy into container
  run(`docker cp ${tmpFile} g5_postgres:/var/lib/postgresql/data/pg_hba.conf`);
  // Reload config
  // Reload as postgres user; if that fails, create a reload signal by sending SIGHUP
  try {
    run(`docker exec g5_postgres su - postgres -c "pg_ctl -D /var/lib/postgresql/data reload"`);
  } catch {
    console.log('pg_ctl reload failed, trying SIGHUP');
    run(`docker exec g5_postgres pkill -HUP -U postgres postgres`);
  }
  // Reset password
  run(`docker exec g5_postgres psql -U postgres -d postgres -c "ALTER USER g5_user WITH PASSWORD 'g5_pass';"`);
  console.log('Applied pg_hba.conf rewrite + password reset. Retry pg:debug.');
} catch (e) {
  console.error('Failed to apply fixes', e);
  process.exit(1);
}
