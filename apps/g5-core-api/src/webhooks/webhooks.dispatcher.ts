import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Webhook } from '../entities/webhook.entity';
import { AuditLogService } from '../audit/audit-log.service';
import { AuditActions } from '../audit/audit-actions';
import { MetricsService } from '../metrics/metrics.service';
import { WebhooksService } from './webhooks.service';

@Processor('webhooks')
export class WebhookDispatcher extends WorkerHost {
  // Shape of data enqueued for webhook processing
  // (Ensure producer matches this interface)
  private static readonly FAILURE_THRESHOLD = () =>
    parseInt(process.env.WEBHOOK_FAILURE_THRESHOLD || '10', 10);
  private static readonly CIRCUIT_RESET_MINUTES = () =>
    parseInt(process.env.WEBHOOK_CIRCUIT_RESET_MINUTES || '30', 10);

  constructor(
    @InjectRepository(Webhook) private repo: Repository<Webhook>,
    private audit: AuditLogService,
    private metrics: MetricsService,
    private webhooksService: WebhooksService,
    @InjectQueue('webhooks-dlq') private dlq: Queue,
  ) {
    super();
  }

  async process(job: Job<WebhookJobData>): Promise<{ delivered: boolean } | void> {
    const { webhookId, tenantId, event, body, timestamp, signature } = job.data;
    const hook = await this.repo.findOne({ where: { id: webhookId, tenantId } });
    if (!hook || !hook.isActive) return;
    // If circuit open but cooldown passed, auto-reactivate
    if (!hook.isActive && hook.nextRetryAt && hook.nextRetryAt.getTime() <= Date.now()) {
      hook.isActive = true;
      hook.failureCount = 0;
      hook.circuitOpenedAt = null;
      await this.repo.save(hook);
      await this.audit.log({
        tenantId,
        action: AuditActions.WEBHOOK_UPDATED,
        entityType: 'Webhook',
        entityId: hook.id,
        metadata: { autoReenabled: true },
      });
    }
    // Anti-replay: reject if timestamp older than 5 minutes
    const now = Date.now();
    if (timestamp && Math.abs(now - parseInt(timestamp, 10)) > 5 * 60 * 1000) {
      this.metrics.webhookFailures.inc({ event });
      return;
    }
    const jsonBody = JSON.stringify(body);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Timestamp': timestamp ?? '',
    };
    if (signature) headers['X-Signature'] = signature;
    try {
      const res = await fetch(hook.url, { method: 'POST', headers, body: jsonBody });
      if (!res.ok) {
        throw new Error('HTTP ' + res.status);
      }
    } catch (err) {
      hook.failureCount += 1;
      await this.repo.save(hook);
      await this.audit.log({
        tenantId,
        action: AuditActions.WEBHOOK_DELIVERY_FAILED,
        entityType: 'Webhook',
        entityId: hook.id,
        metadata: { error: (err as Error).message },
      });
      this.metrics.webhookFailures.inc({ event });
      const threshold = WebhookDispatcher.FAILURE_THRESHOLD();
      if (hook.failureCount >= threshold) {
        hook.isActive = false;
        hook.circuitOpenedAt = new Date();
        const cooldownMinutes = WebhookDispatcher.CIRCUIT_RESET_MINUTES();
        hook.nextRetryAt = new Date(Date.now() + cooldownMinutes * 60 * 1000);
        await this.repo.save(hook);
        await this.audit.log({
          tenantId,
          action: AuditActions.WEBHOOK_DISABLED,
          entityType: 'Webhook',
          entityId: hook.id,
          metadata: { reason: 'failure threshold' },
        });
        // Push to DLQ with context
        await this.dlq.add('dead', {
          original: job.data,
          failures: hook.failureCount,
          lastError: (err as Error).message,
        });
      }
      throw err;
    }
    if (job.attemptsStarted && job.attemptsStarted > 1) {
      await this.audit.log({
        tenantId,
        action: AuditActions.WEBHOOK_DELIVERY_RETRIED,
        entityType: 'Webhook',
        entityId: hook.id,
        metadata: { attempts: job.attemptsStarted },
      });
      this.metrics.webhookRetries.inc({ event });
    }
    // Success path: reset failure count if >0
    if (hook.failureCount > 0) {
      hook.failureCount = 0;
      hook.circuitOpenedAt = null;
      hook.nextRetryAt = null;
      await this.repo.save(hook);
    }
    this.metrics.webhookDeliveries.inc({ event });
    return { delivered: true };
  }

  @OnWorkerEvent('active')
  onActive() {
    // metrics hook placeholder
  }
}

export interface WebhookJobData {
  webhookId: string;
  tenantId: string;
  event: string;
  body: unknown;
  timestamp?: string;
  signature?: string;
}
