import { IsUUID } from 'class-validator';

export class RollbackThemeDto {
  @IsUUID()
  snapshotId!: string; // snapshot to rollback TO (becomes active)
}
