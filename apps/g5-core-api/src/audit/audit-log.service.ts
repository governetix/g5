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
    const entry = this.repo.create(data);
    return this.repo.save(entry);
  }

  async list(tenantId: string, pq?: PaginationQuery) {
    if (!pq)
      return this.repo.find({ where: { tenantId }, order: { createdAt: 'DESC' }, take: 100 });
    const qb = this.repo.createQueryBuilder('a').where('a.tenantId = :tenantId', { tenantId });
    return paginate(qb, pq, 'createdAt');
  }
}
