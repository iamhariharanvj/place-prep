import { Module } from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';
import { DrizzleService } from '../../database/drizzle.service';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [LeaderboardController],
  providers: [OutboxService, LeaderboardService, DrizzleService],
  exports: [OutboxService, LeaderboardService],
})
export class GamificationModule {}
