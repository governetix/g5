import { Controller, Get, Query } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('audit-logs')
export class AuditLogController {
  constructor(private svc: AuditLogService) {}

  @Get()
  list(
    @TenantId() tenantId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('sort') sort?: string,
  ) {
    const pq =
      limit || cursor || sort
        ? { limit: limit ? parseInt(limit, 10) : undefined, cursor, sort }
        : undefined;
    return this.svc.list(tenantId, pq);
  }
}
