import { IsString, IsOptional } from 'class-validator';

export class UpdateThemeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  isDefault?: boolean;
}
