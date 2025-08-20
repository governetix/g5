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
import { Project } from './project.entity';
import { Scan } from './scan.entity';

export type AssetType = 'site' | 'domain' | 'repository';

@Entity('assets')
@Index(['tenantId', 'projectId', 'name'], { unique: true })
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  tenantId: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.assets, { onDelete: 'CASCADE' })
  tenant: Tenant;

  @Column('uuid')
  @Index()
  projectId: string;

  @ManyToOne(() => Project, (project) => project.assets, { onDelete: 'CASCADE' })
  project: Project;

  @Column()
  name: string; // host, repo name, etc

  @Column({ type: 'varchar', length: 32 })
  type: AssetType;

  @Column({ type: 'text', nullable: true })
  target?: string | null; // URL, domain, repo URL

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @OneToMany(() => Scan, (scan) => scan.asset)
  scans: Scan[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
