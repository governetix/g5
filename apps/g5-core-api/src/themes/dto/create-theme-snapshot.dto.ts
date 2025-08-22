import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateThemeSnapshotDto {
  @IsObject()
  tokens!: Record<string, any>;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsBoolean()
  activate?: boolean; // if true sets activeSnapshotId
}
