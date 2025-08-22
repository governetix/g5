import { Controller, Get, Query, UsePipes } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { TenantId } from '../common/decorators/tenant.decorator';
import { ListQuery, ListQueryPipe } from '../common/pagination/pagination.pipe';

@Controller('audit-logs')
export class AuditLogController {
  constructor(private svc: AuditLogService) {}

  @Get()
  @UsePipes(new ListQueryPipe())
  list(@TenantId() tenantId: string, @Query() q: ListQuery) {
    const sort = q.sort?.[0] ? `${q.sort[0].field}:${q.sort[0].direction}` : undefined;
    const pq = { limit: q.limit, cursor: undefined, sort };
    return this.svc.list(tenantId, pq, q.filters);
  }
}
