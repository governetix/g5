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
import { User } from './user.entity';

export type MembershipRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

@Entity('memberships')
@Unique(['tenantId', 'userId'])
@Index(['tenantId', 'role'])
export class Membership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  tenantId: string;

  @ManyToOne(() => Tenant, (t) => t.memberships, { onDelete: 'CASCADE' })
  tenant: Tenant;

  @Column('uuid')
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'varchar', length: 16 })
  role: MembershipRole;

  @Column({ type: 'varchar', length: 16, default: 'ACTIVE' })
  status: 'ACTIVE' | 'INVITED';

  @Column({ type: 'varchar', length: 64, nullable: true })
  inviteToken?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  inviteExpiresAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
