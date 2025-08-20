import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@ApiTags('gTenants')
@Controller('tenants')
export class TenantsController {
  constructor(private service: TenantsService) {}

  @Roles('OWNER', 'ADMIN')
  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.service.create(dto);
  }

  @Get()
  list(
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('sort') sort?: string,
  ) {
    const pq =
      limit || cursor || sort
        ? { limit: limit ? parseInt(limit, 10) : undefined, cursor, sort }
        : undefined;
    return this.service.findAll(pq);
  }

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }

  @Roles('OWNER', 'ADMIN')
  @Patch(':slug')
  update(@Param('slug') slug: string, @Body() dto: UpdateTenantDto) {
    return this.service.update(slug, dto);
  }

  @Roles('OWNER', 'ADMIN')
  @Put(':slug/theme')
  setTheme(@Param('slug') slug: string, @Body() body: Record<string, unknown>) {
    return this.service.setTheme(slug, body);
  }
}
