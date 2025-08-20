import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Asset } from './asset.entity';
import { Finding } from './finding.entity';

export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed';

@Entity('scans')
@Index(['tenantId', 'assetId', 'startedAt'])
export class Scan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  tenantId: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.scans, { onDelete: 'CASCADE' })
  tenant: Tenant;

  @Column('uuid')
  @Index()
  assetId: string;

  @ManyToOne(() => Asset, (asset) => asset.scans, { onDelete: 'CASCADE' })
  asset: Asset;

  @Column({ type: 'varchar', length: 32 })
  status: ScanStatus;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt?: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metrics?: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  error?: string | null;

  @OneToMany(() => Finding, (finding) => finding.scan)
  findings: Finding[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
