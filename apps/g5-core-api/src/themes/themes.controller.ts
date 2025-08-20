import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { ThemesService } from './themes.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant.decorator';
import { CreateThemeDto } from './dto/create-theme.dto';
import { UpdateThemeDto } from './dto/update-theme.dto';

@UseGuards(JwtAuthGuard, TenantGuard)
@ApiTags('gThemes')
@Controller('themes')
export class ThemesController {
  constructor(private svc: ThemesService) {}

  @Get()
  list(@TenantId() tenantId: string) {
    return this.svc.list(tenantId);
  }

  @Roles('OWNER', 'ADMIN', 'EDITOR')
  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateThemeDto) {
    return this.svc.create(tenantId, dto);
  }

  @Roles('OWNER', 'ADMIN', 'EDITOR')
  @Patch(':id')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateThemeDto) {
    return this.svc.update(tenantId, id, dto);
  }

  @Roles('OWNER', 'ADMIN')
  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.svc.remove(tenantId, id);
  }
}
