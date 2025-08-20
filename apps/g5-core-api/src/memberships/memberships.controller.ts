import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppRequest } from '../types/request-context';
import { Roles } from '../common/decorators/roles.decorator';
import { MembershipsService } from './memberships.service';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@ApiTags('memberships')
@Controller('memberships')
export class MembershipsController {
  constructor(private svc: MembershipsService) {}

  @Get()
  list(@TenantId() tenantId: string) {
    return this.svc.list(tenantId);
  }

  @Roles('OWNER', 'ADMIN')
  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateMembershipDto, @Req() req: AppRequest) {
    return this.svc.add(tenantId, dto, req.user!.role || 'VIEWER');
  }

  @Roles('OWNER', 'ADMIN')
  @Patch(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMembershipDto,
    @Req() req: AppRequest,
  ) {
    return this.svc.update(tenantId, id, dto, req.user!.role || 'VIEWER');
  }

  @Roles('OWNER', 'ADMIN')
  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string, @Req() req: AppRequest) {
    return this.svc.remove(tenantId, id, req.user!.role || 'VIEWER');
  }
}
