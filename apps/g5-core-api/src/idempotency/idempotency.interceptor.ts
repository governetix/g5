import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, from, of } from 'rxjs';
import { mergeMap, finalize } from 'rxjs/operators';
import { IdempotencyService } from './idempotency.service';
import { AppRequest } from '../types/request-context';
import { Response } from 'express';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private svc: IdempotencyService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<AppRequest>();
    const tenantId: string | undefined =
      req.user?.tenantId || (req.headers['x-tenant-id'] as string | undefined);
    const key = req.headers['idempotency-key'] as string | undefined;
    if (!tenantId || !key) return next.handle();
    return from(this.svc.find(tenantId, key)).pipe(
      mergeMap((existing) => {
        if (existing) {
          const res = context.switchToHttp().getResponse<Response>();
          res.setHeader('Idempotent-Replay', 'true');
          res.setHeader('Idempotency-Key', key);
          return from(Promise.resolve(existing.responseBody));
        }
        let responseBody: unknown;
        return next.handle().pipe(
          mergeMap((body) => {
            responseBody = body;
            return of(body);
          }),
          finalize(() => {
            if (responseBody !== undefined) {
              const ttl = parseInt(process.env.IDEMPOTENCY_TTL_SECONDS || '3600', 10);
              void this.svc.store(tenantId, key, responseBody, ttl);
              const res = context.switchToHttp().getResponse<Response>();
              res.setHeader('Idempotent-Replay', 'false');
              res.setHeader('Idempotency-Key', key);
            }
          }),
        );
      }),
    );
  }
}
