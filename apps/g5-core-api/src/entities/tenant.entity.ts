import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
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
import { Webhook } from './webhook.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string; // identificador corto

  @Column()
  name: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  themeSettings?: Record<string, any> | null;

  @OneToMany(() => User, (user) => user.tenant)
  users: User[];

  @OneToMany(() => Project, (project) => project.tenant)
  projects: Project[];

  @OneToMany(() => Asset, (asset) => asset.tenant)
  assets: Asset[];

  @OneToMany(() => Scan, (scan) => scan.tenant)
  scans: Scan[];

  @OneToMany(() => Finding, (finding) => finding.tenant)
  findings: Finding[];

  @OneToMany<Membership>(() => Membership, (membership) => membership.tenant)
  memberships: Membership[];

  @OneToMany<ApiKey>(() => ApiKey, (apiKey) => apiKey.tenant)
  apiKeys: ApiKey[];

  @OneToMany<AuditLog>(() => AuditLog, (auditLog) => auditLog.tenant)
  auditLogs: AuditLog[];

  @OneToMany<Theme>(() => Theme, (theme) => theme.tenant)
  themes: Theme[];

  @OneToMany<RefreshToken>(() => RefreshToken, (refreshToken) => refreshToken.tenant)
  refreshTokens: RefreshToken[];

  @OneToMany<Webhook>(() => Webhook, (webhook) => webhook.tenant)
  webhooks: Webhook[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
