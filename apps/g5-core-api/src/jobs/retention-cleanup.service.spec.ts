import { Test } from '@nestjs/testing';
import { RetentionCleanupService } from './retention-cleanup.service';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLog } from '../entities/auditlog.entity';
import { ApiKey } from '../entities/apikey.entity';
import { RefreshToken } from '../entities/refresh-token.entity';

function repoMock(initial: any[] = []) {
  return {
    data: initial,
    find: jest.fn(async (cond?: any) => {
      if (!cond?.where?.createdAt) return initial;
      return initial.filter(i => i.createdAt < cond.where.createdAt._value);
    }),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => initial.filter(i => i.revokedAt && i.revokedAt < new Date(Date.now() - 1))),
    })),
    remove: jest.fn(async (rows: any[]) => rows.forEach(r => { const idx = initial.indexOf(r); if (idx>=0) initial.splice(idx,1); })),
  } as any;
}

describe('RetentionCleanupService', () => {
  it('purges old audit logs and revoked tokens/api keys', async () => {
    const oldDate = new Date(Date.now() - 40*86400000);
    const recent = new Date();
    const auditRepo = repoMock([{ id:'a1', createdAt: oldDate }, { id:'a2', createdAt: recent }]);
    const apiRepo = repoMock([{ id:'k1', revokedAt: oldDate }, { id:'k2', revokedAt: null }]);
    const refreshRepo = repoMock([{ id:'r1', revokedAt: oldDate }, { id:'r2', revokedAt: null }]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        RetentionCleanupService,
        { provide: getRepositoryToken(AuditLog), useValue: auditRepo },
        { provide: getRepositoryToken(ApiKey), useValue: apiRepo },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshRepo },
        { provide: ConfigService, useValue: { get: (k: string) => ({ AUDIT_RETENTION_DAYS: '30', REVOKED_TOKEN_RETENTION_DAYS: '30' }[k]) } },
      ],
    }).compile();
    const svc = moduleRef.get(RetentionCleanupService);
    await svc.run();
    expect(auditRepo.data.find((r:any)=>r.id==='a1')).toBeUndefined();
    expect(apiRepo.data.find((r:any)=>r.id==='k1')).toBeUndefined();
    expect(refreshRepo.data.find((r:any)=>r.id==='r1')).toBeUndefined();
  });
});
