import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { MetricsService } from './metrics.service';
import { AppRequest } from '../types/request-context';
import { Request, Response } from 'express';

@Injectable()
export class MetricsHttpInterceptor implements NestInterceptor {
  constructor(private metrics: MetricsService) {}
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const start = process.hrtime.bigint();
    const http = ctx.switchToHttp();
    const req = http.getRequest<Request & AppRequest>();
    // Derive a stable route key: prefer Express route path if present, else URL pathname
    let rawRoute = '';
    const routeObj = (req as unknown as { route?: { path?: string } }).route;
    if (routeObj && typeof routeObj.path === 'string') rawRoute = routeObj.path;
    else if (typeof (req as unknown as { path?: string }).path === 'string')
      rawRoute = (req as unknown as { path?: string }).path!;
    else rawRoute = req.url || '';
    const route =
      typeof rawRoute === 'string' && rawRoute.includes(':')
        ? rawRoute.replace(/:/g, '')
        : rawRoute;
    const method = req.method;
    return next.handle().pipe(
      tap(() => {
        const res = http.getResponse<Response>();
        const status = res.statusCode || 200;
        const elapsedNs = Number(process.hrtime.bigint() - start);
        const seconds = elapsedNs / 1e9;
        this.metrics.httpRequestCounter.inc({ method, route, status });
        this.metrics.httpDuration.observe({ method, route, status }, seconds);
      }),
    );
  }
}
