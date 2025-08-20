import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { TenantId } from '../common/decorators/tenant.decorator';

@ApiTags('gAssets')
@Controller('assets')
export class AssetsController {
  constructor(private service: AssetsService) {}

  @Roles('OWNER', 'ADMIN', 'EDITOR')
  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateAssetDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  list(
    @TenantId() tenantId: string,
    @Query('projectId') projectId?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('sort') sort?: string,
  ) {
    const pq =
      limit || cursor || sort
        ? { limit: limit ? parseInt(limit, 10) : undefined, cursor, sort }
        : undefined;
    return this.service.list(tenantId, projectId, pq);
  }

  @Get(':id')
  get(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.get(tenantId, id);
  }

  @Roles('OWNER', 'ADMIN', 'EDITOR')
  @Patch(':id')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.service.update(tenantId, id, dto);
  }

  @Roles('OWNER', 'ADMIN')
  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
