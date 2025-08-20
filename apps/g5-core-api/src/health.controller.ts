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
}
