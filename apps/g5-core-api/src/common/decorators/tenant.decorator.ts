import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AppRequest } from '../../types/request-context';

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest<AppRequest>();
    const headerTenant = req.headers['x-tenant-id'] as string | undefined;
    return headerTenant || req.user?.tenantId;
  },
);
