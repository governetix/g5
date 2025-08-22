import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('themes')
@Unique(['tenantId', 'name'])
export class Theme {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  tenantId: string;

  @ManyToOne(() => Tenant, (t) => t.themes, { onDelete: 'CASCADE' })
  tenant: Tenant;

  @Column()
  name: string; // e.g. default, dark

  @Column({ type: 'jsonb', nullable: true })
  palette?: Record<string, any> | null; // colors, logo URLs, etc

  @Column({ default: false })
  isDefault: boolean;

  @Column('uuid', { nullable: true })
  activeSnapshotId?: string | null;

  // activeSnapshot relation removed (resolve later with explicit entity registration) – use activeSnapshotId only for now

  // snapshots relation removed temporarily

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
