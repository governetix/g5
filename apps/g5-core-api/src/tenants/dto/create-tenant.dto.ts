import { IsNotEmpty } from 'class-validator';

export class CreateTenantDto {
  @IsNotEmpty()
  slug: string;

  @IsNotEmpty()
  name: string;
}
