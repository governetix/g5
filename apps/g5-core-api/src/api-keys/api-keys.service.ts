import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate } from '../common/pagination/pagination.util';
import { PaginationQuery } from '../common/pagination/pagination.dto';
import { ApiKey } from '../entities/apikey.entity';
import { AuditLog } from '../entities/auditlog.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { AuditActions } from '../audit/audit-actions';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey) private repo: Repository<ApiKey>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

  async create(tenantId: string, dto: CreateApiKeyDto) {
    const exists = await this.repo.findOne({ where: { tenantId, name: dto.name } });
    if (exists) throw new ConflictException('Name already used');
    const raw = 'gk_' + crypto.randomBytes(24).toString('base64url');
    const keyHash = crypto.createHash('sha256').update(raw).digest('hex');
    const entity = this.repo.create({ tenantId, name: dto.name, keyHash });
    await this.repo.save(entity);
    const audit = this.auditRepo.create({
      tenantId,
      action: AuditActions.APIKEY_CREATED,
      entityType: 'ApiKey',
      entityId: entity.id,
      metadata: { name: entity.name },
    });
    await this.auditRepo.save(audit);
    return { id: entity.id, name: entity.name, key: raw, createdAt: entity.createdAt };
  }

  list(tenantId: string, includeRevoked = false, pq?: PaginationQuery) {
    const qb = this.repo.createQueryBuilder('k').where('k.tenantId = :tenantId', { tenantId });
    if (!includeRevoked) qb.andWhere('k.revokedAt IS NULL');
    if (!pq) return qb.getMany();
    return paginate(qb, pq, 'createdAt');
  }

  async remove(tenantId: string, id: string) {
    // Soft delete semantics: alias to revoke
    await this.revoke(tenantId, id);
    return { revoked: true };
  }

  async rotate(tenantId: string, id: string) {
    const old = await this.repo.findOne({ where: { tenantId, id } });
    if (!old) throw new NotFoundException('API key not found');
    if (old.revokedAt) throw new ConflictException('API key already revoked');
    // Revoke old
    old.revokedAt = new Date();
    await this.repo.save(old);
    // Create new with same name suffix or increment
    const raw = 'gk_' + crypto.randomBytes(24).toString('base64url');
    const keyHash = crypto.createHash('sha256').update(raw).digest('hex');
    const newKey = this.repo.create({ tenantId, name: old.name, keyHash });
    await this.repo.save(newKey);
    const audit = this.auditRepo.create({
      tenantId,
      action: AuditActions.APIKEY_ROTATED,
      entityType: 'ApiKey',
      entityId: newKey.id,
      metadata: { previousId: old.id, name: old.name },
    });
    await this.auditRepo.save(audit);
    return { id: newKey.id, name: newKey.name, key: raw, rotatedFrom: old.id };
  }

  async revoke(tenantId: string, id: string) {
    const key = await this.repo.findOne({ where: { tenantId, id } });
    if (!key) throw new NotFoundException('API key not found');
    if (key.revokedAt) return { revoked: true };
    key.revokedAt = new Date();
    await this.repo.save(key);
    const audit = this.auditRepo.create({
      tenantId,
      action: AuditActions.APIKEY_REVOKED,
      entityType: 'ApiKey',
      entityId: key.id,
      metadata: { name: key.name },
    });
    await this.auditRepo.save(audit);
    return { revoked: true };
  }

  async batchRotate(tenantId: string, ids: string[]) {
    type RotateSuccess = { id: string; name: string; key: string; rotatedFrom: string };
    type RotateResult = { id: string; error?: string } | RotateSuccess;
    const results: RotateResult[] = [];
    for (const id of ids) {
      try {
        const rotated = await this.rotate(tenantId, id);
        const success: RotateSuccess = {
          id: rotated.id,
          name: rotated.name,
          key: rotated.key,
          rotatedFrom: rotated.rotatedFrom,
        };
        results.push(success);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        results.push({ id, error: msg });
      }
    }
    return { results };
  }

  async batchRevoke(tenantId: string, ids: string[]) {
    const results: Array<{ id: string; revoked?: true; error?: string }> = [];
    for (const id of ids) {
      try {
        await this.revoke(tenantId, id);
        results.push({ id, revoked: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        results.push({ id, error: msg });
      }
    }
    return { results };
  }

  async updateMetadata(tenantId: string, id: string, name?: string) {
    if (!name) return { updated: false };
    const key = await this.repo.findOne({ where: { tenantId, id } });
    if (!key) throw new NotFoundException('API key not found');
    if (key.revokedAt) throw new ConflictException('Cannot rename revoked key');
    const existing = await this.repo.findOne({ where: { tenantId, name } });
    if (existing) throw new ConflictException('Name already used');
    key.name = name;
    await this.repo.save(key);
    const audit = this.auditRepo.create({
      tenantId,
      action: AuditActions.APIKEY_CREATED,
      entityType: 'ApiKey',
      entityId: key.id,
      metadata: { renamed: true, name },
    });
    await this.auditRepo.save(audit);
    return { updated: true };
  }
}
