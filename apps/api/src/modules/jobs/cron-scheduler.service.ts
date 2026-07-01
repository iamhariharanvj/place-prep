import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import {
  QUEUE_DAILY,
  QUEUE_OUTBOX,
  QUEUE_LEADERBOARD,
  QUEUE_NOTIFICATIONS,
  JOB_ASSIGN_DAILY,
  JOB_PROCESS_OUTBOX,
  JOB_RECONCILE,
  JOB_SEED,
  JOB_DAILY_REMINDER,
} from './queues.constants';
import { startOfDayUTC } from '../../common/utils';

@Injectable()
export class CronSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(CronSchedulerService.name);

  constructor(
    @InjectQueue(QUEUE_DAILY) private dailyQueue: Queue,
    @InjectQueue(QUEUE_OUTBOX) private outboxQueue: Queue,
    @InjectQueue(QUEUE_LEADERBOARD) private leaderboardQueue: Queue,
    @InjectQueue(QUEUE_NOTIFICATIONS) private notificationsQueue: Queue,
    private config: ConfigService,
  ) {}

  async onModuleInit() {
    if (this.config.get('RUN_MODE') !== 'worker') return;

    await this.outboxQueue.add(
      JOB_PROCESS_OUTBOX,
      {},
      { repeat: { every: 10_000 }, removeOnComplete: 100, removeOnFail: 50 },
    );

    await this.dailyQueue.add(
      JOB_ASSIGN_DAILY,
      { date: startOfDayUTC(new Date()).toISOString(), shard: 0, shardCount: 4 },
      { repeat: { pattern: '5 0 * * *' }, removeOnComplete: 10 },
    );

    for (let shard = 0; shard < 4; shard++) {
      await this.dailyQueue.add(
        JOB_ASSIGN_DAILY,
        { date: startOfDayUTC(new Date()).toISOString(), shard, shardCount: 4 },
        { repeat: { pattern: '5 0 * * *' }, jobId: `daily-shard-${shard}` },
      );
    }

    await this.leaderboardQueue.add(
      JOB_RECONCILE,
      {},
      { repeat: { pattern: '0 * * * *' }, removeOnComplete: 10 },
    );

    await this.notificationsQueue.add(
      JOB_DAILY_REMINDER,
      {},
      { repeat: { pattern: '0 8 * * *' }, removeOnComplete: 10 },
    );

    await this.leaderboardQueue.add(JOB_SEED, {}, { jobId: 'seed-on-start' });

    this.logger.log('Repeatable jobs registered');
  }
}
