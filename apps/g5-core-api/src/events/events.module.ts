import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { AuditEventsListener } from '../audit/listeners/audit-events.listener';
import { AuditLogModule } from '../audit/audit-log.module';

@Module({
  imports: [AuditLogModule],
  providers: [EventsService, AuditEventsListener],
  exports: [EventsService],
})
export class EventsModule {}
