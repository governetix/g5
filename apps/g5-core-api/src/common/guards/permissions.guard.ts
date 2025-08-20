import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Permission, roleHasPermission, RoleKey } from '../auth/permissions';
import { InjectRepository } from '@nestjs/typeorm';
import { Membership } from '../../entities/membership.entity';
import { Repository } from 'typeorm';
import { AppRequest, getUserId } from '../../types/request-context';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(Membership) private memberships: Repository<Membership>,
  ) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const request = ctx.switchToHttp().getRequest<AppRequest>();
    const user = request.user;
    if (!user) return false;
    if (!user.role) {
      const tenantId = user.tenantId || (request.headers['x-tenant-id'] as string | undefined);
      if (!tenantId) return false;
      const membership = await this.memberships.findOne({
        where: { tenantId, userId: getUserId(user)! },
      });
      if (membership) user.role = membership.role as RoleKey;
    }
    const role = user.role as RoleKey;
    if (!role) return false;
    for (const p of required) {
      if (!roleHasPermission(role, p)) return false;
    }
    return true;
  }
}
