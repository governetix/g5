import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdempotencyKeyRecord } from '../entities/idempotency.entity';
import * as crypto from 'crypto';

@Injectable()
export class IdempotencyService {
  constructor(
    @InjectRepository(IdempotencyKeyRecord) private repo: Repository<IdempotencyKeyRecord>,
  ) {}

  async find(tenantId: string, key: string) {
    return this.repo.findOne({ where: { tenantId, key } });
  }

  async store<T>(
    tenantId: string,
    key: string,
    body: T,
    ttlSeconds = 3600,
  ): Promise<IdempotencyKeyRecord> {
    const responseHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
    const record = this.repo.create({
      tenantId,
      key,
      responseHash,
      responseBody: body,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    });
    try {
      await this.repo.insert(record);
      return record;
    } catch {
      const existing = await this.find(tenantId, key);
      return existing!;
    }
  }
}
