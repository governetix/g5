import { Test } from '@nestjs/testing';
import { BackupService } from './backup.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';

describe('BackupService', () => {
  it('creates dummy backup file and applies retention', async () => {
    const dir = './backups-test';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const moduleRef = await Test.createTestingModule({
      providers: [
        BackupService,
        {
          provide: ConfigService,
          useValue: {
            get: (k: string) => {
              const map: Record<string, string> = {
                ENABLE_BACKUPS: 'true',
                BACKUP_RETENTION_DAYS: '0',
                BACKUP_DIR: dir,
                BACKUP_TEST_DUMMY: 'true',
              };
              return map[k];
            },
          },
        },
      ],
    }).compile();
    const svc = moduleRef.get(BackupService);
    await (svc as any).dailyBackup();
    const files = fs.readdirSync(dir).filter(f=>f.endsWith('.sql')||f.endsWith('.enc'));
    expect(files.length).toBeGreaterThan(0);
  });
});
