import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Tenant } from '../../entities/tenant.entity';
import { Membership } from '../../entities/membership.entity';
import { AppRequest } from '../../types/request-context';

@Injectable()
export class TenantGuard implements CanActivate {
  private tenants: Repository<Tenant>;
  private memberships: Repository<Membership>;

  constructor(private dataSource: DataSource) {
    this.tenants = this.dataSource.getRepository(Tenant);
    this.memberships = this.dataSource.getRepository(Membership);
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AppRequest>();
    // Allow unauthenticated routes that don't require tenant (auth/register, auth/login, health, docs)
    const path: string = req.path || '';
    if (
      path.startsWith('/health') ||
      path.startsWith('/docs') ||
      path.startsWith('/auth/') ||
      path.startsWith('/metrics')
    ) {
      return true;
    }
    const tenantId = req.headers['x-tenant-id'] as string | undefined;
    if (!tenantId || tenantId.trim() === '') {
      throw new BadRequestException('Missing X-Tenant-Id');
    }
    const tenant = await this.tenants.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    // If request has apiKey user injected (viewer role) or real user, verify membership
    // Skip membership check only for endpoints that create the first tenant? (Assuming tenant already exists here)
    const user = req.user;
    if (user?.id) {
      const membership = await this.memberships.findOne({ where: { tenantId, userId: user.id } });
      if (!membership) throw new ForbiddenException('No membership for tenant');
      // Attach membership role for downstream guards
      req.user!.role = membership.role;
    }
    return true;
  }
}
