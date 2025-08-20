import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry } from 'prom-client';

@Injectable()
export class MetricsService {
  readonly registry = new Registry();
  readonly httpRequestCounter: Counter;
  readonly httpDuration: Histogram;
  readonly webhookDeliveries: Counter;
  readonly webhookFailures: Counter;
  readonly webhookRetries: Counter;

  constructor() {
    this.httpRequestCounter = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });
    this.httpDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration seconds',
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });
    this.webhookDeliveries = new Counter({
      name: 'webhook_deliveries_total',
      help: 'Successful webhook deliveries',
      labelNames: ['event'],
      registers: [this.registry],
    });
    this.webhookFailures = new Counter({
      name: 'webhook_failures_total',
      help: 'Failed webhook deliveries',
      labelNames: ['event'],
      registers: [this.registry],
    });
    this.webhookRetries = new Counter({
      name: 'webhook_retries_total',
      help: 'Webhook retry attempts (after first)',
      labelNames: ['event'],
      registers: [this.registry],
    });
  }
}
