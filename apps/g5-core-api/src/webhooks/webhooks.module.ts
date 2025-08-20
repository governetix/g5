import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Webhook } from '../entities/webhook.entity';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { BullModule } from '@nestjs/bullmq';
import { AuditLogModule } from '../audit/audit-log.module';
import { EventsModule } from '../events/events.module';
import { WebhookDispatcher } from './webhooks.dispatcher';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Webhook]),
    AuditLogModule,
    EventsModule,
    ...(
      process.env.SKIP_QUEUES === 'true'
        ? []
        : [
            BullModule.registerQueue({
              name: 'webhooks',
              defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 2000 } },
            }),
            BullModule.registerQueue({ name: 'webhooks-dlq' }),
          ]
    ),
    MetricsModule,
  ],
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    ...(process.env.SKIP_QUEUES === 'true' ? [] : [WebhookDispatcher]),
  ],
  exports: [WebhooksService, ...(process.env.SKIP_QUEUES === 'true' ? [] : [WebhookDispatcher])],
})
export class WebhooksModule {}
