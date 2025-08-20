import { IsIn, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateAssetDto {
  @IsNotEmpty()
  projectId: string;

  @IsNotEmpty()
  name: string;

  @IsIn(['site', 'domain', 'repository'])
  type: string;

  @IsOptional()
  target?: string;
}
