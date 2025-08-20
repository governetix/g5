import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
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

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
