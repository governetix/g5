import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MetricsService } from '../metrics/metrics.service';
import { DataSource } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import fetch from 'node-fetch';
import { ConfigService } from '@nestjs/config';

interface RateSample {
  ts: number; // epoch ms
  errors: number; // 5xx in interval
  total: number; // total requests in interval
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  private lastTotals: { total: number; errors: number } = { total: 0, errors: 0 };
  private ring: RateSample[] = [];
  private slackWebhook?: string;
  private dlqThreshold: number;
  private errorRateThreshold: number; // fraction (e.g. 0.05)
  private p95LatencyThreshold: number; // seconds
  private p99LatencyThreshold: number; // seconds
  private cooldownSec: number;
  private lastAlertAt: Record<string, number> = {};
  constructor(
    private metrics: MetricsService,
    private dataSource: DataSource,
    @InjectQueue('webhooks-dlq') private dlq: Queue,
    private cfg: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async pulse() {
    this.ensureConfig();
    const dlqCount = await this.dlq.getJobCountByTypes('waiting', 'active', 'delayed', 'failed');
  this.metrics.dlqSizeGauge.set(dlqCount);
    if (dlqCount > this.dlqThreshold)
      await this.emitAlert('dlq_size', `DLQ size high (${dlqCount}) threshold=${this.dlqThreshold}`);
    // crude 5xx detection using metrics counter delta (needs external scrape integration)
    // For simplicity we assume metrics service exposes registry; we could track last 5xx count locally.
    // DB health check
    try {
      await this.dataSource.query('SELECT 1');
    } catch (e) {
      await this.emitAlert('db_down', 'Database down (SELECT 1 failed)');
    }
    try {
      this.computeHttpErrorRateAndLatency();
    } catch (e) {
      this.logger.error('computeHttpErrorRateAndLatency failed', e as any);
    }
  }

  private ensureConfig() {
    if (this.slackWebhook !== undefined) return; // already loaded
    this.slackWebhook = this.cfg.get<string>('ALERTS_SLACK_WEBHOOK') || undefined;
    this.dlqThreshold = parseInt(this.cfg.get<string>('ALERT_DLQ_THRESHOLD') || '50', 10);
    this.errorRateThreshold = parseFloat(this.cfg.get<string>('ALERT_ERROR_RATE_5M') || '0.05');
    this.p95LatencyThreshold = parseFloat(this.cfg.get<string>('ALERT_P95_LATENCY') || '0.75');
    this.p99LatencyThreshold = parseFloat(this.cfg.get<string>('ALERT_P99_LATENCY') || '1.5');
    this.cooldownSec = parseInt(this.cfg.get<string>('ALERTS_COOLDOWN_SEC') || '300', 10);
  }

  private computeHttpErrorRateAndLatency() {
    const counter = this.metrics.httpRequestCounter as any;
    const duration = this.metrics.httpDuration as any;
    if (!counter || typeof counter.get !== 'function') return;
    const counterGet = counter.get();
    if (!counterGet || !Array.isArray(counterGet.values)) return;
    const raw = counterGet.values as Array<any>;
    let total = 0;
    let errors = 0;
    raw.forEach((v) => {
      const status = v.labels.status ? parseInt(v.labels.status, 10) : 0;
      if (!isNaN(status)) {
        total += v.value;
        if (status >= 500 && status <= 599) errors += v.value;
      }
    });
    const deltaTotal = total - this.lastTotals.total;
    const deltaErrors = errors - this.lastTotals.errors;
    this.lastTotals = { total, errors };
    if (deltaTotal > 0) {
      this.ring.push({ ts: Date.now(), errors: deltaErrors, total: deltaTotal });
      // keep last 5 samples (~5m)
      while (this.ring.length > 5) this.ring.shift();
      const sumErrors = this.ring.reduce((a, s) => a + s.errors, 0);
      const sumTotal = this.ring.reduce((a, s) => a + s.total, 0);
      if (sumTotal > 0) {
        const rate = sumErrors / sumTotal;
        if (rate >= this.errorRateThreshold) {
          void this.emitAlert(
            'http_error_rate',
            `5xx rate 5m ${(rate * 100).toFixed(2)}% >= ${(this.errorRateThreshold * 100).toFixed(
              1,
            )}% (errors=${sumErrors} total=${sumTotal})`,
          );
        }
      }
    }
    // Approximate latency percentiles from histogram buckets
    try {
      if (!duration || typeof duration.get !== 'function') return;
      const durationGet = duration.get();
      if (!durationGet || !Array.isArray(durationGet.values)) return;
      const hist = durationGet.values as Array<any>; // buckets and sum,count
      const bucketRows = hist.filter((r) => r.metricName === 'http_request_duration_seconds_bucket');
      const counts = bucketRows.reduce<{ le: number; c: number }[]>((arr, r) => {
        const le = parseFloat(r.labels.le);
        if (!isNaN(le)) arr.push({ le, c: r.value });
        return arr;
      }, []);
      counts.sort((a, b) => a.le - b.le);
      const countRow = hist.find((r) => r.metricName === 'http_request_duration_seconds_count');
      if (countRow) {
        const totalCount = countRow.value;
        if (totalCount > 0) {
          const p95Index = Math.ceil(totalCount * 0.95);
          const p99Index = Math.ceil(totalCount * 0.99);
          let cumulative = 0;
            let p95 = 0;
            let p99 = 0;
          for (const b of counts) {
            cumulative = b.c;
            if (!p95 && cumulative >= p95Index) p95 = b.le;
            if (!p99 && cumulative >= p99Index) {
              p99 = b.le;
              break;
            }
          }
          if (p95 && p95 > this.p95LatencyThreshold) {
            void this.emitAlert(
              'latency_p95',
              `HTTP p95 ${p95.toFixed(3)}s > ${this.p95LatencyThreshold}s threshold`,
            );
          }
          if (p99 && p99 > this.p99LatencyThreshold) {
            void this.emitAlert(
              'latency_p99',
              `HTTP p99 ${p99.toFixed(3)}s > ${this.p99LatencyThreshold}s threshold`,
            );
          }
        }
      }
    } catch (e) {
      // Ignore percentile errors (structure changed)
    }
  }

  private async emitAlert(key: string, message: string) {
    const now = Date.now();
    const last = this.lastAlertAt[key] || 0;
    if (now - last < this.cooldownSec * 1000) return; // cooldown
    this.lastAlertAt[key] = now;
    this.logger.warn(`ALERT[${key}]: ${message}`);
    if (this.slackWebhook) {
      try {
        await fetch(this.slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: `:rotating_light: ${message}` }),
          timeout: 3000,
        } as any);
      } catch (e) {
        this.logger.error(`Failed to post Slack alert (${key})`);
      }
    }
  }
}
