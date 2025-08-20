import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, Role } from '../decorators/roles.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Membership } from '../../entities/membership.entity';
import { AppRequest, getUserId } from '../../types/request-context';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(Membership) private memberships: Repository<Membership>,
  ) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const request = ctx.switchToHttp().getRequest<AppRequest>();
    const user = request.user;
    if (!user) return false;
    // If role already attached (e.g., set earlier) reuse
    if (!user.role) {
      const tenantId = user.tenantId || (request.headers['x-tenant-id'] as string | undefined);
      if (!tenantId) return false;
      const membership = await this.memberships.findOne({
        where: { tenantId, userId: getUserId(user)! },
      });
      if (membership) user.role = membership.role;
    }
    if (user.role === 'OWNER') return true;
    return required.includes(user.role as Role);
  }
}
