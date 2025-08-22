import { Body, Controller, Delete, Get, Param, Post, Patch, Query, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import {
  ApiKeyBatchRotateDto,
  ApiKeyBatchRevokeDto,
  ApiKeyMetadataUpdateDto,
} from './dto/batch.dto';
import { TenantId } from '../common/decorators/tenant.decorator';
import { ListQuery, ListQueryPipe } from '../common/pagination/pagination.pipe';

@ApiTags('api-keys')
@Controller('api-keys')
export class ApiKeysController {
  constructor(private service: ApiKeysService) {}

  @Roles('OWNER', 'ADMIN')
  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateApiKeyDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  @UsePipes(new ListQueryPipe())
  list(@TenantId() tenantId: string, @Query() q: ListQuery) {
    const includeRevoked = q.filters.includeRevoked === true || q.filters.includeRevoked === 'true';
    // Map ListQuery to existing service pagination (cursorless page-mode for now)
    const sort = q.sort?.[0] ? `${q.sort[0].field}:${q.sort[0].direction}` : undefined;
    const pq = { limit: q.limit, cursor: undefined, sort };
    return this.service.list(tenantId, includeRevoked, pq);
  }

  @Roles('OWNER', 'ADMIN')
  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }

  @Roles('OWNER', 'ADMIN')
  @Patch(':id/rotate')
  rotate(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.rotate(tenantId, id);
  }

  @Roles('OWNER', 'ADMIN')
  @Patch(':id/revoke')
  revoke(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.revoke(tenantId, id);
  }

  @Roles('OWNER', 'ADMIN')
  @Patch(':id')
  updateMetadata(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ApiKeyMetadataUpdateDto,
  ) {
    return this.service.updateMetadata(tenantId, id, dto.name);
  }

  @Roles('OWNER', 'ADMIN')
  @Post('batch/rotate')
  batchRotate(@TenantId() tenantId: string, @Body() dto: ApiKeyBatchRotateDto) {
    return this.service.batchRotate(tenantId, dto.ids);
  }

  @Roles('OWNER', 'ADMIN')
  @Post('batch/revoke')
  batchRevoke(@TenantId() tenantId: string, @Body() dto: ApiKeyBatchRevokeDto) {
    return this.service.batchRevoke(tenantId, dto.ids);
  }
}
