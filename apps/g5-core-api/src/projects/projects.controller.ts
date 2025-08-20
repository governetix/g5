import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { TenantId } from '../common/decorators/tenant.decorator';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private service: ProjectsService) {}

  @Roles('OWNER', 'ADMIN', 'EDITOR')
  @Permissions('project.create')
  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateProjectDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  list(
    @TenantId() tenantId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('sort') sort?: string,
  ) {
    const pq =
      limit || cursor || sort
        ? { limit: limit ? parseInt(limit, 10) : undefined, cursor, sort }
        : undefined;
    return this.service.list(tenantId, pq);
  }

  @Get(':id')
  get(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.get(tenantId, id);
  }

  @Roles('OWNER', 'ADMIN', 'EDITOR')
  @Permissions('project.update')
  @Patch(':id')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.service.update(tenantId, id, dto);
  }

  @Roles('OWNER', 'ADMIN')
  @Permissions('project.delete')
  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
