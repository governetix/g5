import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Theme } from './theme.entity';

@Entity('theme_snapshots')
@Index(['themeId', 'version'], { unique: true })
export class ThemeSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  themeId: string;

  @ManyToOne(() => Theme, { onDelete: 'CASCADE' })
  theme: Theme;

  @Column('int')
  version: number; // sequential per theme

  @Column({ type: 'jsonb' })
  tokens: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  label?: string | null;

  @Column({ default: false })
  isRollback: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
