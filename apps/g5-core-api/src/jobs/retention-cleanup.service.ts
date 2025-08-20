import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { AuditLog } from '../entities/auditlog.entity';
import { ApiKey } from '../entities/apikey.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RetentionCleanupService {
  private readonly logger = new Logger(RetentionCleanupService.name);
  private auditDays: number;
  private revokedDays: number;
  constructor(
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
    @InjectRepository(ApiKey) private apiKeyRepo: Repository<ApiKey>,
    @InjectRepository(RefreshToken) private refreshRepo: Repository<RefreshToken>,
    cfg: ConfigService,
  ) {
    this.auditDays = parseInt(cfg.get<string>('AUDIT_RETENTION_DAYS') || '30', 10);
    this.revokedDays = parseInt(cfg.get<string>('REVOKED_TOKEN_RETENTION_DAYS') || '30', 10);
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async run() {
    const now = Date.now();
    const auditCut = new Date(now - this.auditDays * 86400000);
    const revokedCut = new Date(now - this.revokedDays * 86400000);
    const oldAudits = await this.auditRepo.find({ where: { createdAt: LessThan(auditCut) } });
    if (oldAudits.length) {
      await this.auditRepo.remove(oldAudits);
      this.logger.log(`Removed ${oldAudits.length} old audit logs`);
    }
    const oldApiKeys = await this.apiKeyRepo
      .createQueryBuilder('k')
      .where('k.revokedAt IS NOT NULL AND k.revokedAt < :cut', { cut: revokedCut })
      .getMany();
    if (oldApiKeys.length) {
      await this.apiKeyRepo.remove(oldApiKeys);
      this.logger.log(`Removed ${oldApiKeys.length} revoked api keys`);
    }
    const oldRefresh = await this.refreshRepo
      .createQueryBuilder('r')
      .where('r.revokedAt IS NOT NULL AND r.revokedAt < :cut', { cut: revokedCut })
      .getMany();
    if (oldRefresh.length) {
      await this.refreshRepo.remove(oldRefresh);
      this.logger.log(`Removed ${oldRefresh.length} revoked refresh tokens`);
    }
  }
}
