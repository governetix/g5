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

@Entity('webhooks')
@Index(['tenantId', 'isActive'])
export class Webhook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  tenantId: string;

  @ManyToOne(() => Tenant, (t) => t.webhooks, { onDelete: 'CASCADE' })
  tenant: Tenant;

  @Column()
  url: string;

  @Column('text', { array: true })
  events: string[]; // event names subscribed

  @Column('text', { nullable: true })
  secretHash?: string | null; // hashed secret for signature

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  failureCount: number;

  // When circuit opens (disabled due to failures)
  @Column({ type: 'timestamptz', nullable: true })
  circuitOpenedAt?: Date | null;

  // When it can be tried again automatically
  @Column({ type: 'timestamptz', nullable: true })
  nextRetryAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
