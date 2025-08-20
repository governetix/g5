import { IsString, IsOptional } from 'class-validator';

export class CreateThemeDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;
}
