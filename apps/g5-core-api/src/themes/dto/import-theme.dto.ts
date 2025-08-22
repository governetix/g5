import { ApiProperty } from '@nestjs/swagger';

export class ImportThemeDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  tokens: any;
}
