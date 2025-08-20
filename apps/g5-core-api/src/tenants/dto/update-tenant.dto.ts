import { IsOptional } from 'class-validator';

export class UpdateTenantDto {
  @IsOptional()
  name?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
