/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate } from '../common/pagination/pagination.util';
import { PaginationQuery } from '../common/pagination/pagination.dto';
import { Webhook } from '../entities/webhook.entity';
import * as crypto from 'crypto';
import { AuditLogService } from '../audit/audit-log.service';
import { AuditActions } from '../audit/audit-actions';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(Webhook) private repo: Repository<Webhook>,
    private audit: AuditLogService,
    @InjectQueue('webhooks') private queue: Queue,
    @InjectQueue('webhooks-dlq') private dlq: Queue,
  ) {}

  async list(tenantId: string, query?: PaginationQuery) {
    if (!query) {
      return this.repo.find({ where: { tenantId } });
    }
    const qb = this.repo.createQueryBuilder('w').where('w.tenantId = :tenantId', { tenantId });
    return paginate(qb, query, 'createdAt');
  }

  async create(tenantId: string, url: string, events: string[], secret?: string) {
    if (!url) throw new BadRequestException('url required');
    if (!Array.isArray(events) || !events.length) throw new BadRequestException('events required');
    const secretHash = secret ? crypto.createHash('sha256').update(secret).digest('hex') : null;
    const hook = this.repo.create({ tenantId, url, events, secretHash: secretHash || null });
    await this.repo.save(hook);
    await this.audit.log({
      tenantId,
      action: AuditActions.WEBHOOK_CREATED,
      entityType: 'Webhook',
      entityId: hook.id,
      metadata: { url, events },
    });
    return { id: hook.id, secret };
  }

  async update(
    tenantId: string,
    id: string,
    data: { url?: string; events?: string[]; rotateSecret?: boolean },
  ) {
    const hook = await this.repo.findOne({ where: { id, tenantId } });
    if (!hook) throw new NotFoundException('Webhook not found');
    if (data.url) hook.url = data.url;
    if (data.events && data.events.length) hook.events = data.events;
    let newSecret: string | undefined;
    if (data.rotateSecret) {
      newSecret = crypto.randomBytes(24).toString('hex');
      hook.secretHash = crypto.createHash('sha256').update(newSecret).digest('hex');
    }
    await this.repo.save(hook);
    await this.audit.log({
      tenantId,
      action: AuditActions.WEBHOOK_UPDATED,
      entityType: 'Webhook',
      entityId: hook.id,
      metadata: { url: hook.url, events: hook.events, rotated: !!data.rotateSecret },
    });
    return { updated: true, newSecret };
  }

  async disable(tenantId: string, id: string) {
    const hook = await this.repo.findOne({ where: { id, tenantId } });
    if (!hook) throw new NotFoundException('Webhook not found');
    hook.isActive = false;
    await this.repo.save(hook);
    await this.audit.log({
      tenantId,
      action: AuditActions.WEBHOOK_DISABLED,
      entityType: 'Webhook',
      entityId: hook.id,
      metadata: {},
    });
    return { disabled: true };
  }

  async enqueueDelivery(tenantId: string, event: string, payload: unknown): Promise<void> {
    const active = await this.repo.find({ where: { tenantId, isActive: true } });
    const now = Date.now();
    for (const h of active) {
      // Skip if circuit open and still in cooldown
      if (h.circuitOpenedAt && h.nextRetryAt && h.nextRetryAt.getTime() > now) continue;
      if (!h.events.includes(event)) continue;
      const timestamp = now.toString();
      const body = { event, payload, timestamp: new Date(now).toISOString() };
      let signature: string | null = null;
      if (h.secretHash) {
        // We cannot recover original secret; use hash as key (acceptable if kept secret).
        const hmac = crypto.createHmac('sha256', h.secretHash);
        hmac.update(JSON.stringify(body));
        hmac.update(timestamp);
        signature = hmac.digest('hex');
      }
      await this.queue.add('deliver', {
        webhookId: h.id,
        tenantId,
        event,
        body,
        timestamp,
        signature,
      });
    }
  }

  async recordFailure(hook: Webhook) {
    hook.failureCount += 1;
    const threshold = parseInt(process.env.WEBHOOK_FAILURE_THRESHOLD || '10', 10);
    const cooldownMinutes = parseInt(process.env.WEBHOOK_CIRCUIT_RESET_MINUTES || '30', 10);
    if (hook.failureCount >= threshold) {
      hook.isActive = false; // disable until manual or automatic reopen
      hook.circuitOpenedAt = new Date();
      hook.nextRetryAt = new Date(Date.now() + cooldownMinutes * 60 * 1000);
    }
    await this.repo.save(hook);
  }

  async listDlq(
    tenantId: string,
  ): Promise<Array<{ id: string | number | null; data: DlqJobData }>> {
    const jobs = await this.dlq.getJobs([
      'waiting',
      'failed',
      'delayed',
      'active',
      'completed',
    ] as const);
    const out: Array<{ id: string | number | null; data: DlqJobData }> = [];

    for (const job of jobs as Array<{ id?: string | number | null; data: unknown }>) {
      const raw: unknown = job.data;
      if (!isDlqJobData(raw)) continue;

      const data: DlqJobData = raw; // narrowed by guard
      if (data.original.tenantId !== tenantId) continue;
      const entryId: string | number | null = job.id ?? null;
      const entry = {
        id: entryId,
        data,
      } satisfies { id: string | number | null; data: DlqJobData };
      out.push(entry);
    }

    return out;
  }

  async replayFromDlq(tenantId: string, jobId: string): Promise<{ replayed: boolean }> {
    const job = await this.dlq.getJob(jobId);
    if (!job) throw new NotFoundException('DLQ job not found');
    const dataUnknown = (job as { data?: unknown }).data;
    if (!isDlqJobData(dataUnknown)) throw new NotFoundException('DLQ job not found');
    const original = dataUnknown.original;
    if (original.tenantId !== tenantId) throw new NotFoundException('DLQ job not found');
    await this.queue.add('deliver', original);
    if (typeof (job as { remove?: () => Promise<unknown> }).remove === 'function') {
      await (job as { remove: () => Promise<unknown> }).remove();
    }
    return { replayed: true };
  }
}

// Types for DLQ serialization
export interface DeliverJobData {
  webhookId: string;
  tenantId: string;
  event: string;
  body: unknown;
  timestamp: string;
  signature: string | null;
}
export interface DlqJobData {
  original: DeliverJobData;
  failures: number;
  lastError?: string;
}

function isDlqJobData(val: unknown): val is DlqJobData {
  if (!val || typeof val !== 'object') return false;
  const maybe = val as {
    original?: unknown;
    failures?: unknown;
    lastError?: unknown;
  };
  if (!maybe.original || typeof maybe.original !== 'object') return false;
  const orig = maybe.original as {
    webhookId?: unknown;
    tenantId?: unknown;
    event?: unknown;
    body?: unknown;
    timestamp?: unknown;
    signature?: unknown;
  };
  if (
    typeof orig.webhookId !== 'string' ||
    typeof orig.tenantId !== 'string' ||
    typeof orig.event !== 'string' ||
    typeof orig.timestamp !== 'string'
  ) {
    return false;
  }
  if (maybe.failures !== undefined && typeof maybe.failures !== 'number') return false;
  if (maybe.lastError !== undefined && typeof maybe.lastError !== 'string') return false;
  return true;
}
