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
    if (process.env.DEV_DISABLE_TENANT === 'true') {
      // Dev mode: skip tenant validation entirely
      return true;
    }
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
    const user = req.user;
    const superAdmins = (process.env.PLATFORM_SUPERADMINS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const isSuperAdmin = !!(user?.email && superAdmins.includes(user.email.toLowerCase()));
    if (isSuperAdmin) {
      // Super-admin can omit tenant header for cross-tenant operations; mark flags
      (req as any).isSuperAdmin = true;
      if (!req.headers['x-tenant-id']) {
        // No tenant scope: skip tenant existence & membership checks
        return true;
      }
    }
    let tenantId = req.headers['x-tenant-id'] as string | undefined;
    if (!tenantId || tenantId.trim() === '') {
      if (process.env.DEV_AUTO_TENANT === 'true') {
        // Try to lookup or create a single dev tenant
        const existing = await this.tenants.find({ take: 1 });
        if (existing.length) {
          tenantId = existing[0].id;
          req.headers['x-tenant-id'] = tenantId;
        } else {
          const created = this.tenants.create({ name: 'Dev Tenant' });
            await this.tenants.save(created);
            tenantId = created.id;
            req.headers['x-tenant-id'] = tenantId;
        }
      } else {
        throw new BadRequestException('Missing X-Tenant-Id');
      }
    }
    const tenant = await this.tenants.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (user?.id) {
      const membership = await this.memberships.findOne({ where: { tenantId, userId: user.id } });
      if (!membership && !isSuperAdmin) throw new ForbiddenException('No membership for tenant');
      if (membership) {
        req.user!.role = membership.role;
      }
      if (isSuperAdmin && !membership) {
        // Provide elevated OWNER-like role for scoped super-admin actions without stored membership
        req.user!.role = 'OWNER' as any;
        (req as any).superAdminTenantOverride = tenantId;
      }
    }
    return true;
  }
}
