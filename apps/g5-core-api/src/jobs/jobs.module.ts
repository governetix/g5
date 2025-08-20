import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { Membership } from '../entities/membership.entity';
import { AuditLog } from '../entities/auditlog.entity';
import { ApiKey } from '../entities/apikey.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { RefreshCleanupService } from './refresh-cleanup.service';
import { BackupService } from '../backups/backup.service';
import { AlertsService } from '../alerts/alerts.service';
import { RetentionCleanupService } from './retention-cleanup.service';
import { MetricsModule } from '../metrics/metrics.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([RefreshToken, PasswordResetToken, Membership, AuditLog, ApiKey]),
    MetricsModule,
    ...(process.env.SKIP_QUEUES === 'true'
      ? []
      : [BullModule.registerQueue({ name: 'webhooks-dlq' })]),
  ],
  providers: [RefreshCleanupService, BackupService, AlertsService, RetentionCleanupService],
})
export class JobsModule {}
