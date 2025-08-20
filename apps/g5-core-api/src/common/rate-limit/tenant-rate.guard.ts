import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class TenantRateLimitGuard implements CanActivate {
  private redis?: Redis;
  private limit: number;
  private window: number; // seconds
  constructor(cfg: ConfigService) {
    const redisUrl = cfg.get<string>('REDIS_URL');
    if (redisUrl) this.redis = new Redis(redisUrl);
    this.limit = parseInt(cfg.get<string>('TENANT_RATE_LIMIT') || '600', 10); // default 600/min
    this.window = parseInt(cfg.get<string>('TENANT_RATE_WINDOW_SEC') || '60', 10);
  }
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (!this.redis) return true; // disabled if no redis
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string | string[]> }>();
    const rawTenant = req.headers['x-tenant-id'];
    const tenantId = Array.isArray(rawTenant) ? rawTenant[0] : rawTenant;
    if (!tenantId) return true; // other guards enforce
    const bucket = Math.floor(Date.now() / 1000 / this.window);
    const key = `rl:tenant:${tenantId}:${bucket}`;
    const ttlNeeded = this.window;
    const multi = this.redis.multi();
    multi.incr(key);
    multi.expire(key, ttlNeeded, 'NX');
    const results = await multi.exec();
    // results shape: [[null, count], [null, 1]] on success
    const incrTuple = results?.[0];
    const count = Array.isArray(incrTuple) ? (incrTuple[1] as number) : 1;
    if (count > this.limit) {
      const retryAfter = this.window;
      throw new HttpException(
        { message: 'Tenant rate limit exceeded', retryAfter },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
