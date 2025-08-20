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

@Entity('api_keys')
@Index(['tenantId', 'name'], { unique: true })
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  tenantId: string;

  @ManyToOne(() => Tenant, (t) => t.apiKeys, { onDelete: 'CASCADE' })
  tenant: Tenant;

  @Column()
  name: string; // user provided label

  @Column({ unique: true })
  keyHash: string; // sha256 hash (base64 / hex)

  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt?: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
