import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const pexec = promisify(exec);

@Injectable()
export class BackupService implements OnModuleInit {
  private readonly logger = new Logger(BackupService.name);
  private retentionDays: number;
  private enabled: boolean;
  private dir: string;
  private encryptPassphrase?: string;
  private testDummy: boolean;
  constructor(private cfg: ConfigService) {
    this.retentionDays = parseInt(this.cfg.get<string>('BACKUP_RETENTION_DAYS') || '7', 10);
    this.enabled = (this.cfg.get<string>('ENABLE_BACKUPS') || 'false') === 'true';
    this.dir = this.cfg.get<string>('BACKUP_DIR') || './backups';
    this.encryptPassphrase = this.cfg.get<string>('BACKUP_ENCRYPT_PASSPHRASE') || undefined;
    this.testDummy = (this.cfg.get<string>('BACKUP_TEST_DUMMY') || 'false') === 'true';
    if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
  }
  onModuleInit() {
    if (!this.enabled) {
      this.logger.log('Backups disabled');
    }
  }
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async dailyBackup() {
    if (!this.enabled) return;
    const ts = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
    const file = path.join(this.dir, `backup-${ts}.sql`);
    const host = this.cfg.get<string>('DB_HOST');
    const port = this.cfg.get<string>('DB_PORT');
    const db = this.cfg.get<string>('DB_NAME');
    const user = this.cfg.get<string>('DB_USER');
    const pass = this.cfg.get<string>('DB_PASS');
    try {
      if (this.testDummy) {
        fs.writeFileSync(file, '-- dummy backup --');
      } else {
        const cmd = `set PGPASSWORD="${pass}" && pg_dump -h ${host} -p ${port} -U ${user} -F p -d ${db} > "${file}"`;
        await pexec(cmd, { shell: 'pwsh.exe' });
      }
      if (this.encryptPassphrase) {
        const encFile = `${file}.enc`;
        const encCmd = `openssl enc -aes-256-cbc -pbkdf2 -pass pass:${this.encryptPassphrase} -in "${file}" -out "${encFile}"`;
        await pexec(encCmd, { shell: 'pwsh.exe' });
        fs.unlinkSync(file);
        this.logger.log(`Backup created (encrypted) ${encFile}`);
      } else {
        this.logger.log(`Backup created ${file}`);
      }
      this.applyRetention();
    } catch (e: any) {
      this.logger.error('Backup failed', e);
    }
  }
  private applyRetention() {
    const files = fs
      .readdirSync(this.dir)
      .filter((f) => f.startsWith('backup-') && (f.endsWith('.sql') || f.endsWith('.sql.enc')));
    const cutoff = Date.now() - this.retentionDays * 86400000;
    for (const f of files) {
      const full = path.join(this.dir, f);
      const stat = fs.statSync(full);
      if (stat.mtime.getTime() < cutoff) {
        fs.unlinkSync(full);
        this.logger.log(`Deleted old backup ${f}`);
      }
    }
  }
  // Basic restore helper (manual invocation) - decrypts if needed.
  async restore(fileName: string) {
    const host = this.cfg.get<string>('DB_HOST');
    const port = this.cfg.get<string>('DB_PORT');
    const db = this.cfg.get<string>('DB_NAME');
    const user = this.cfg.get<string>('DB_USER');
    const pass = this.cfg.get<string>('DB_PASS');
    const full = path.resolve(this.dir, fileName);
    if (!fs.existsSync(full)) throw new Error('Backup file not found');
    let sqlFile = full;
    if (full.endsWith('.enc')) {
      if (!this.encryptPassphrase) throw new Error('Passphrase required to decrypt');
      const decrypted = full.replace(/\.enc$/, '');
      const decCmd = `openssl enc -d -aes-256-cbc -pbkdf2 -pass pass:${this.encryptPassphrase} -in "${full}" -out "${decrypted}"`;
      await pexec(decCmd, { shell: 'pwsh.exe' });
      sqlFile = decrypted;
    }
    const cmd = `set PGPASSWORD="${pass}" && psql -h ${host} -p ${port} -U ${user} -d ${db} -f "${sqlFile}"`;
    await pexec(cmd, { shell: 'pwsh.exe' });
    this.logger.log(`Restore completed from ${fileName}`);
  }
}
