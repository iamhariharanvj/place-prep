import { Inject, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

@Injectable()
export class RateLimiterService {
  constructor(@Inject(REDIS_CLIENT) private redis: Redis) {}

  async assert(key: string, limit: number, windowSec: number): Promise<void> {
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, windowSec);
    if (count > limit) {
      throw new HttpException(
        { error: { code: 'RATE_LIMITED', message: 'Too many requests', details: {} } },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
