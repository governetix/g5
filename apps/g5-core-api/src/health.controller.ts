import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@ApiTags('gHealth')
@Controller('health')
export class HealthController {
  private redis?: Redis;
  constructor(
    private dataSource: DataSource,
    private cfg: ConfigService,
  ) {
    const redisUrl = this.cfg.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redis = new Redis(redisUrl, { lazyConnect: true });
    } else {
      const host = this.cfg.get<string>('REDIS_HOST');
      const port = this.cfg.get<string>('REDIS_PORT');
      if (host && port) {
        this.redis = new Redis({ host, port: parseInt(port, 10), lazyConnect: true });
      }
    }
  }
  @Get()
  ok() {
    return { status: 'ok', service: 'g5-core-api' };
  }

  @Get('ready')
  async ready() {
    const db = await this.dataSource
      .query('SELECT 1')
      .then(() => true)
      .catch(() => false);
    let redis = false;
    if (this.redis) {
      try {
        await this.redis.ping();
        redis = true;
      } catch {
        redis = false;
      }
    }
    const ready = db && (this.redis ? redis : true);
    return { status: ready ? 'ready' : 'degraded', db, redis };
  }

  @Get('smoke/db')
  async smokeDb() {
    const t0 = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      const latencyMs = Date.now() - t0;
      return { ok: true, latencyMs };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'db error' };
    }
  }

  @Get('smoke/redis')
  async smokeRedis() {
    if (!this.redis) {
      return { ok: false, error: 'redis not configured' };
    }
    try {
      const t0 = Date.now();
      const key = `smoke:${Date.now()}`;
      await this.redis.setex(key, 5, 'ok');
      const val = await this.redis.get(key);
      const pong = await this.redis.ping();
      const latencyMs = Date.now() - t0;
      return { ok: pong === 'PONG' && val === 'ok', ping: pong, roundtrip: val, latencyMs };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'redis error' };
    }
  }
}
