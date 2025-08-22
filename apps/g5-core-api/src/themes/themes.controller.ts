import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { ThemesService } from './themes.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant.decorator';
import { CreateThemeDto } from './dto/create-theme.dto';
import { UpdateThemeDto } from './dto/update-theme.dto';
import { CreateThemeSnapshotDto } from './dto/create-theme-snapshot.dto';
import { RollbackThemeDto } from './dto/rollback-theme.dto';
import { ImportThemeDto } from './dto/import-theme.dto';

@UseGuards(JwtAuthGuard, TenantGuard)
@ApiTags('gThemes')
@Controller('themes')
export class ThemesController {
  constructor(private svc: ThemesService) {
    // Diagnostic log to ensure controller instantiation
    // eslint-disable-next-line no-console
    console.log('[ThemesController] initialized');
  }

  @Get()
  list(@TenantId() tenantId: string) {
  return this.svc.list(tenantId);
  }

  @Get('_debug')
  debug() {
    return { ok: true, controller: 'themes', timestamp: new Date().toISOString() };
  }

  @Roles('OWNER', 'ADMIN', 'EDITOR')
  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateThemeDto) {
    return this.svc.create(tenantId, dto);
  }

  @Roles('OWNER', 'ADMIN', 'EDITOR')
  @Post('import')
  import(@TenantId() tenantId: string, @Body() dto: ImportThemeDto) {
    return this.svc.import(tenantId, dto);
  }

  @Get(':id/export')
  export(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.svc.export(tenantId, id);
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

  // --- Snapshots ---
  @Get(':id/snapshots')
  snapshots(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.svc.listSnapshots(tenantId, id);
  }

  @Roles('OWNER', 'ADMIN', 'EDITOR')
  @Post(':id/snapshots')
  createSnapshot(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateThemeSnapshotDto,
  ) {
    return this.svc.createSnapshot(tenantId, id, dto);
  }

  @Roles('OWNER', 'ADMIN', 'EDITOR')
  @Post(':id/rollback')
  rollback(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: RollbackThemeDto,
  ) {
    return this.svc.rollback(tenantId, id, dto);
  }
}
