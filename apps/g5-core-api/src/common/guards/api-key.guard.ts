import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '../../entities/apikey.entity';
import { AppRequest, AuthUser } from '../../types/request-context';
import * as crypto from 'crypto';

// In-memory throttle map (pid-local). For distributed scale, replace with Redis TTL ops.
const lastUpdateMap = new Map<string, number>();
const LAST_USED_THROTTLE_MS = 60_000; // 1 min

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(@InjectRepository(ApiKey) private keys: Repository<ApiKey>) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AppRequest>();
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer gk_')) return true; // not an api key -> allow others
    const raw = auth.substring('Bearer '.length).trim();
    const tenantId = req.headers['x-tenant-id'] as string | undefined;
    if (!tenantId) throw new ForbiddenException('Missing X-Tenant-Id');
    const keyHash = crypto.createHash('sha256').update(raw).digest('hex');
    // Fetch candidate keys for tenant to timing-safe compare (bounded by unique hash index anyway)
    const key = await this.keys.findOne({ where: { keyHash, tenantId } });
    if (!key || key.revokedAt) throw new UnauthorizedException('Invalid API key');
    // Timing safe compare of hashes (redundant since we matched via hash, but adds defense-in-depth pattern)
    const provided = Buffer.from(keyHash);
    const stored = Buffer.from(key.keyHash);
    if (provided.length !== stored.length || !crypto.timingSafeEqual(provided, stored)) {
      throw new UnauthorizedException('Invalid API key');
    }
    const now = Date.now();
    const last = lastUpdateMap.get(key.id) || 0;
    if (now - last > LAST_USED_THROTTLE_MS) {
      lastUpdateMap.set(key.id, now);
      key.lastUsedAt = new Date();
      // fire and forget; do not await to reduce latency
      this.keys.update({ id: key.id }, { lastUsedAt: key.lastUsedAt }).catch(() => {});
    }
    req.apiKeyAuth = { keyId: key.id, tenantId: key.tenantId };
    if (!req.user) {
      const apiUser: AuthUser = {
        id: 'api-key:' + key.id,
        email: 'api-key@internal',
        role: 'VIEWER',
        tenantId: key.tenantId,
      };
      req.user = apiUser;
    }
    return true;
  }
}
