import { Controller, Get } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { Public } from './common/decorators/roles.decorator';
import { DrizzleService } from './database/drizzle.service';
import { REDIS_CLIENT } from './redis/redis.module';

@Controller('health')
export class HealthController {
  constructor(
    private db: DrizzleService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  @Public()
  @Get()
  async check() {
    const [dbOk, redisOk] = await Promise.all([
      this.db.ping().catch(() => false),
      this.redis.ping().then((r) => r === 'PONG').catch(() => false),
    ]);
    return {
      status: dbOk && redisOk ? 'ok' : 'degraded',
      db: dbOk,
      redis: redisOk,
    };
  }
}
