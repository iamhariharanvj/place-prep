import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import {
  QUEUE_DAILY,
  QUEUE_OUTBOX,
  QUEUE_LEADERBOARD,
  QUEUE_NOTIFICATIONS,
} from './queues.constants';
import {
  DailyTasksProcessor,
  OutboxProcessor,
  LeaderboardProcessor,
  NotificationsProcessor,
} from './processors';
import { CronSchedulerService } from './cron-scheduler.service';
import { LearningModule } from '../learning/learning.module';
import { GamificationModule } from '../gamification/gamification.module';
import { DrizzleService } from '../../database/drizzle.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.getOrThrow<string>('REDIS_URL'),
          maxRetriesPerRequest: null,
          tls: config.getOrThrow<string>('REDIS_URL').startsWith('rediss://') ? {} : undefined,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_DAILY },
      { name: QUEUE_OUTBOX },
      { name: QUEUE_LEADERBOARD },
      { name: QUEUE_NOTIFICATIONS },
    ),
    LearningModule,
    GamificationModule,
  ],
  providers: [
    DailyTasksProcessor,
    OutboxProcessor,
    LeaderboardProcessor,
    NotificationsProcessor,
    CronSchedulerService,
    DrizzleService,
  ],
  exports: [BullModule],
})
export class JobsModule {}
