import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventsService } from '../../events/events.service';
import { DomainEventType } from '../../events/event-types';
import { AuditLogService } from '../audit-log.service';
import { AuditActions } from '../audit-actions';

@Injectable()
export class AuditEventsListener implements OnModuleInit {
  constructor(
    private events: EventsService,
    private audit: AuditLogService,
  ) {}
  onModuleInit() {
    this.events.events$.subscribe((ev) => {
      let p: Promise<unknown> | undefined;
      switch (ev.type) {
        case DomainEventType.INVITE_SENT:
          p = this.audit.log({
            tenantId: ev.tenantId,
            action: AuditActions.INVITE_SENT,
            entityType: 'Membership',
            entityId: ev.payload.membershipId,
            metadata: ev.payload,
          });
          break;
        case DomainEventType.INVITE_ACCEPTED:
          p = this.audit.log({
            tenantId: ev.tenantId,
            action: AuditActions.INVITE_ACCEPTED,
            entityType: 'Membership',
            entityId: ev.payload.membershipId,
            metadata: ev.payload,
          });
          break;
        case DomainEventType.PASSWORD_RESET_REQUESTED:
          p = this.audit.log({
            tenantId: ev.tenantId,
            action: AuditActions.PASSWORD_RESET_REQUESTED,
            entityType: 'User',
            entityId: ev.payload.userId,
            metadata: ev.payload,
          });
          break;
        case DomainEventType.PASSWORD_RESET_DONE:
          p = this.audit.log({
            tenantId: ev.tenantId,
            action: AuditActions.PASSWORD_RESET_DONE,
            entityType: 'User',
            entityId: ev.payload.userId,
            metadata: ev.payload,
          });
          break;
      }
      if (p !== undefined) {
        void p.catch(() => undefined);
      }
    });
  }
}
