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

@Entity('projects')
@Index(['tenantId', 'key'], { unique: true })
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  tenantId: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.projects, { onDelete: 'CASCADE' })
  tenant: Tenant;

  @Column()
  key: string; // short code per tenant

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @OneToMany(() => Asset, (asset) => asset.project)
  assets: Asset[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
