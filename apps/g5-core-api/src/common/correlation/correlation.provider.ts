import { AsyncLocalStorage } from 'async_hooks';

export interface CorrelationStore {
  traceId: string;
}
export const correlationStorage = new AsyncLocalStorage<CorrelationStore>();

export function getTraceId(): string | undefined {
  return correlationStorage.getStore()?.traceId;
}
