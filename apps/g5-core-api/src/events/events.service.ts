import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { DomainEvent } from './event-types';

@Injectable()
export class EventsService {
  private subject = new Subject<DomainEvent>();
  events$ = this.subject.asObservable();

  emit(event: DomainEvent) {
    this.subject.next(event);
  }
}
