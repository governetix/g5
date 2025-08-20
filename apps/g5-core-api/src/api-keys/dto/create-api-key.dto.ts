import { IsNotEmpty } from 'class-validator';

export class CreateApiKeyDto {
  @IsNotEmpty()
  name: string;
}
