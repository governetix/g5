import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

@Entity('audit_logs')
@Index(['tenantId', 'createdAt'])
@Index(['tenantId', 'action', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  tenantId: string;

  @ManyToOne(() => Tenant, (t) => t.auditLogs, { onDelete: 'CASCADE' })
  tenant: Tenant;

  @Column('uuid', { nullable: true })
  actorUserId?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  actorUser?: User | null;

  @Column()
  action: string; // e.g. project.create

  @Column({ type: 'varchar', length: 64, nullable: true })
  entityType?: string | null;

  @Column({ type: 'uuid', nullable: true })
  entityId?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
