import { IsArray, IsOptional, IsString, ArrayNotEmpty } from 'class-validator';

export class ApiKeyBatchRotateDto {
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) ids!: string[];
}

export class ApiKeyBatchRevokeDto {
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) ids!: string[];
}

export class ApiKeyMetadataUpdateDto {
  @IsOptional() @IsString() name?: string; // rename only for now
}
