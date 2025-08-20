import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MetricsService } from '../metrics/metrics.service';
import { DataSource } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  constructor(
    private metrics: MetricsService,
    private dataSource: DataSource,
    @InjectQueue('webhooks-dlq') private dlq: Queue,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async pulse() {
    const dlqCount = await this.dlq.getJobCountByTypes('waiting', 'active', 'delayed', 'failed');
    if (dlqCount > 50) this.logger.warn(`ALERT: DLQ size high (${dlqCount})`);
    // crude 5xx detection using metrics counter delta (needs external scrape integration)
    // For simplicity we assume metrics service exposes registry; we could track last 5xx count locally.
    // DB health check
    try {
      await this.dataSource.query('SELECT 1');
    } catch (e) {
      this.logger.error('ALERT: Database down');
    }
  }
}
