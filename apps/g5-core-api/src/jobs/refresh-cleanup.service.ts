import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { Membership } from '../entities/membership.entity';

@Injectable()
export class RefreshCleanupService {
  private readonly logger = new Logger(RefreshCleanupService.name);
  constructor(
    @InjectRepository(RefreshToken) private refreshRepo: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken) private prtRepo: Repository<PasswordResetToken>,
    @InjectRepository(Membership) private membershipRepo: Repository<Membership>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanup() {
    const now = new Date();
    const expiredRefresh = await this.refreshRepo.find({ where: { expiresAt: LessThan(now) } });
    if (expiredRefresh.length) {
      await this.refreshRepo.remove(expiredRefresh);
      this.logger.log(`Removed ${expiredRefresh.length} expired refresh tokens`);
    }
    const expiredInvites = await this.membershipRepo.find({
      where: { inviteExpiresAt: LessThan(now), status: 'INVITED' },
    });
    for (const inv of expiredInvites) {
      inv.inviteToken = null;
      inv.inviteExpiresAt = null;
    }
    if (expiredInvites.length) {
      await this.membershipRepo.save(expiredInvites);
      this.logger.log(`Expired ${expiredInvites.length} invites`);
    }
    const prs = await this.prtRepo.find();
    const toDelete: PasswordResetToken[] = [];
    const cutoff = Date.now();
    for (const t of prs) {
      if ((t.expiresAt && t.expiresAt.getTime() < cutoff) || t.usedAt) {
        toDelete.push(t);
      }
    }
    if (toDelete.length) {
      await this.prtRepo.remove(toDelete);
      this.logger.log(`Removed ${toDelete.length} password reset tokens`);
    }
  }
}
