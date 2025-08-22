import { Controller, Get, Patch, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppRequest, getUserId } from '../types/request-context';
import { UsersService } from './users.service';
import { DataSource } from 'typeorm';
import { Membership } from '../entities/membership.entity';
import { roleHasPermission, ROLE_PERMISSIONS, RoleKey } from '../common/auth/permissions';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UpdatePasswordDto } from './dto/update-password.dto';

@UseGuards(JwtAuthGuard)
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private svc: UsersService, private dataSource: DataSource) {}

  @Get('me')
  me(@Req() req: AppRequest) {
    const user = req.user!;
    return this.svc.findById(getUserId(user)!);
  }

  @Get('me/permissions')
  async myPermissions(@Req() req: AppRequest) {
    const userCtx = req.user;
    if (!userCtx) throw new BadRequestException('No user context');
    const tenantId = (req.headers['x-tenant-id'] as string) || undefined;
    let role: RoleKey | undefined = userCtx.role as RoleKey | undefined;
    if (!role && tenantId) {
      const repo = this.dataSource.getRepository(Membership);
      const membership = await repo.findOne({ where: { tenantId, userId: getUserId(userCtx)! } });
      role = (membership?.role as RoleKey) || undefined;
    }
    if (!role) {
      // If no tenant scope (e.g., future super-admin) we return empty permissions until super-admin implemented
      return { role: null, permissions: [] };
    }
    if (role === 'OWNER') {
      return { role, permissions: ROLE_PERMISSIONS.OWNER };
    }
    const perms = ROLE_PERMISSIONS[role] || [];
    return { role, permissions: perms };
  }

  @Patch('me/password')
  changePassword(@Req() req: AppRequest, @Body() dto: UpdatePasswordDto) {
    const user = req.user!;
    return this.svc.changePassword(getUserId(user)!, dto);
  }
}
