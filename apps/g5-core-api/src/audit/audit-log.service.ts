import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate } from '../common/pagination/pagination.util';
import { PaginationQuery } from '../common/pagination/pagination.dto';
import { AuditLog } from '../entities/auditlog.entity';

@Injectable()
export class AuditLogService {
  constructor(@InjectRepository(AuditLog) private repo: Repository<AuditLog>) {}

  async log(data: Partial<AuditLog>) {
    try {
      const entry = this.repo.create(data);
      return await this.repo.save(entry);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[audit] log skipped (table missing or other error)');
      }
      return undefined as any;
    }
  }

  async list(
    tenantId: string,
    pq?: PaginationQuery,
    filters?: { actorId?: string; action?: string | string[]; dateFrom?: string; dateTo?: string },
  ) {
    if (!pq && !filters)
      return this.repo.find({ where: { tenantId }, order: { createdAt: 'DESC' }, take: 100 });
    const qb = this.repo.createQueryBuilder('a').where('a.tenantId = :tenantId', { tenantId });
    if (filters) {
      if (filters.actorId) qb.andWhere('a.actorId = :actorId', { actorId: filters.actorId });
      if (filters.action) {
        if (Array.isArray(filters.action) && filters.action.length) {
          qb.andWhere('a.action = ANY(:actions)', { actions: filters.action });
        } else if (typeof filters.action === 'string') {
          qb.andWhere('a.action = :action', { action: filters.action });
        }
      }
      if (filters.dateFrom) qb.andWhere('a.createdAt >= :dateFrom', { dateFrom: filters.dateFrom });
      if (filters.dateTo) qb.andWhere('a.createdAt <= :dateTo', { dateTo: filters.dateTo });
    }
    return paginate(qb, pq || { limit: 50 }, 'createdAt');
  }
}
