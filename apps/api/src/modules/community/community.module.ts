import { Module } from '@nestjs/common';
import { PublishService, VoteService, CommentService } from './community.service';
import { CommunityController } from './community.controller';
import { DrizzleService } from '../../database/drizzle.service';
import { UsersModule } from '../users/users.module';
import { MessageTypeRegistry } from '../../domain/message/message-type.registry';
import { RateLimiterService } from '../../redis/rate-limiter.service';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [UsersModule, RedisModule],
  controllers: [CommunityController],
  providers: [PublishService, VoteService, CommentService, MessageTypeRegistry, DrizzleService, RateLimiterService],
  exports: [PublishService],
})
export class CommunityModule {}
