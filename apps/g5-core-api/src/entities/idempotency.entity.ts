import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('idempotency_keys')
@Index(['tenantId', 'key'], { unique: true })
export class IdempotencyKeyRecord {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') tenantId: string;
  @Column() key: string;
  @Column('text') responseHash: string; // hash of stored payload
  @Column('jsonb') responseBody: any;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) expiresAt?: Date | null;
}
