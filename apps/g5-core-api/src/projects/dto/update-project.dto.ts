import { IsOptional } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  name?: string;
  @IsOptional()
  description?: string;
}
