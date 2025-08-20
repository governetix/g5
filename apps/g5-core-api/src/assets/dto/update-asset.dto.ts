import { IsIn, IsOptional } from 'class-validator';

export class UpdateAssetDto {
  @IsOptional()
  name?: string;
  @IsOptional()
  @IsIn(['site', 'domain', 'repository'])
  type?: string;
  @IsOptional()
  target?: string;
  @IsOptional()
  metadata?: Record<string, any>;
}
