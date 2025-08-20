export enum DomainEventType {
  INVITE_SENT = 'invite.sent',
  INVITE_ACCEPTED = 'invite.accepted',
  PASSWORD_RESET_REQUESTED = 'password.reset.requested',
  PASSWORD_RESET_DONE = 'password.reset.done',
}

interface BaseEvent<TType extends DomainEventType, TPayload> {
  type: TType;
  tenantId: string;
  occurredAt: Date;
  payload: TPayload;
}

export type InviteSentEvent = BaseEvent<
  DomainEventType.INVITE_SENT,
  {
    membershipId: string;
    email: string;
    role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
  }
>;
export type InviteAcceptedEvent = BaseEvent<
  DomainEventType.INVITE_ACCEPTED,
  {
    membershipId: string;
    userId: string;
  }
>;
export type PasswordResetRequestedEvent = BaseEvent<
  DomainEventType.PASSWORD_RESET_REQUESTED,
  {
    userId: string;
    email: string;
  }
>;
export type PasswordResetDoneEvent = BaseEvent<
  DomainEventType.PASSWORD_RESET_DONE,
  {
    userId: string;
  }
>;

export type DomainEvent =
  | InviteSentEvent
  | InviteAcceptedEvent
  | PasswordResetRequestedEvent
  | PasswordResetDoneEvent;
