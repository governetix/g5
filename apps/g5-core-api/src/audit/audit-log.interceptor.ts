import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { AuditLogService } from './audit-log.service';
import { AppRequest, getUserId } from '../types/request-context';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private audit: AuditLogService) {}
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req = ctx.switchToHttp().getRequest<AppRequest>();
    const user = req.user;
    const tenantId = (req.headers['x-tenant-id'] as string | undefined) || user?.tenantId;
    const method = req.method;
    const path = req.url;
    return next.handle().pipe(
      finalize(() => {
        if (!tenantId) return;
        const action = method + ' ' + path;
        const actorUserId = getUserId(user);
        void this.audit.log({
          tenantId,
          actorUserId,
          action,
          entityType: path.split('/')[1] || 'unknown',
          metadata: { status: 'success' },
        });
      }),
    );
  }
}
