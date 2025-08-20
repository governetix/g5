import { IsNotEmpty } from 'class-validator';

export class CreateProjectDto {
  @IsNotEmpty()
  key: string;

  @IsNotEmpty()
  name: string;

  description?: string;
}
