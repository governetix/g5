import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Scan } from './scan.entity';

export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';

@Entity('findings')
@Index(['tenantId', 'scanId', 'code'])
export class Finding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  tenantId: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.findings, { onDelete: 'CASCADE' })
  tenant: Tenant;

  @Column('uuid')
  @Index()
  scanId: string;

  @ManyToOne(() => Scan, (scan) => scan.findings, { onDelete: 'CASCADE' })
  scan: Scan;

  @Column()
  code: string; // rule id or similar

  @Column({ type: 'varchar', length: 16 })
  severity: Severity;

  @Column({ type: 'text', nullable: true })
  title?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
