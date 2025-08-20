import { AppDataSource } from '../data-source';
import { ConfigService } from '@nestjs/config';
import { BackupService } from './backup.service';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

async function run() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: ts-node src/backups/restore-backup.ts <backup-file.sql|.sql.enc>');
    process.exit(1);
  }
  const app = await NestFactory.createApplicationContext({
    module: class TmpModule {},
    imports: [ConfigModule.forRoot({ isGlobal: true })],
    providers: [BackupService, ConfigService],
  } as any);
  try {
    await AppDataSource.initialize();
    const svc = app.get(BackupService);
    await svc.restore(file);
  } finally {
    await AppDataSource.destroy();
    await app.close();
  }
}

void run();
