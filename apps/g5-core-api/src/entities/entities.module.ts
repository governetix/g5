import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';
import { Project } from './project.entity';
import { Asset } from './asset.entity';
import { Scan } from './scan.entity';
import { Finding } from './finding.entity';
import { Membership } from './membership.entity';
import { ApiKey } from './apikey.entity';
import { AuditLog } from './auditlog.entity';
import { Theme } from './theme.entity';
import { RefreshToken } from './refresh-token.entity';
import { PasswordResetToken } from './password-reset-token.entity';
import { Webhook } from './webhook.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      User,
      Project,
      Asset,
      Scan,
      Finding,
      Membership,
      ApiKey,
      AuditLog,
      Theme,
      RefreshToken,
      PasswordResetToken,
      Webhook,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class EntitiesModule {}
