import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.getOrThrow<string>('REDIS_URL');
        return new Redis(url, {
          maxRetriesPerRequest: null,
          tls: url.startsWith('rediss://') ? {} : undefined,
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
