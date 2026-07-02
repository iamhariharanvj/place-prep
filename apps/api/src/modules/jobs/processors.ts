import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DailyTaskService } from '../learning/learning.service';
import { OutboxService, XpAwardedPayload } from '../gamification/outbox.service';
import { LeaderboardService } from '../gamification/leaderboard.service';
import { DrizzleService } from '../../database/drizzle.service';
import { notifications } from '../../database/schema';
import { eq, and, sql } from 'drizzle-orm';
import { newId, startOfDayUTC, toDateString } from '../../common/utils';
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
import { UPSTASH_WORKER_OPTS } from './worker-options';

@Processor(QUEUE_DAILY, UPSTASH_WORKER_OPTS)
export class DailyTasksProcessor extends WorkerHost {
  private readonly logger = new Logger(DailyTasksProcessor.name);

  constructor(private daily: DailyTaskService) {
    super();
  }

  async process(job: Job<{ date: string; shard: number; shardCount: number }>) {
    if (job.name !== JOB_ASSIGN_DAILY) return;
    const date = new Date(job.data.date);
    const count = await this.daily.assignForDate(date, job.data.shard, job.data.shardCount);
    this.logger.log(`Shard ${job.data.shard}: assigned ${count} tasks`);
    return { count };
  }
}

@Processor(QUEUE_OUTBOX, UPSTASH_WORKER_OPTS)
export class OutboxProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboxProcessor.name);

  constructor(
    private outbox: OutboxService,
    private leaderboard: LeaderboardService,
  ) {
    super();
  }

  async process(job: Job) {
    if (job.name !== JOB_PROCESS_OUTBOX) return;
    const events = await this.outbox.claimBatch(50);
    for (const event of events) {
      try {
        if (event.eventType === 'XpAwarded') {
          await this.leaderboard.applyXpEvent(event.payload as XpAwardedPayload);
        }
        await this.outbox.markCompleted(event.id);
      } catch (err) {
        this.logger.error(`Outbox event ${event.id} failed`, err);
        await this.outbox.markFailed(event.id);
      }
    }
    return { processed: events.length };
  }
}

@Processor(QUEUE_LEADERBOARD, UPSTASH_WORKER_OPTS)
export class LeaderboardProcessor extends WorkerHost {
  private readonly logger = new Logger(LeaderboardProcessor.name);

  constructor(private leaderboard: LeaderboardService) {
    super();
  }

  async process(job: Job) {
    if (job.name === JOB_RECONCILE) {
      const result = await this.leaderboard.reconcile();
      this.logger.log('Leaderboard reconciled');
      return result;
    }
    if (job.name === JOB_SEED) {
      await this.leaderboard.seedFromDatabase();
      this.logger.log('Leaderboard seeded');
      return { seeded: true };
    }
  }
}

@Processor(QUEUE_NOTIFICATIONS, UPSTASH_WORKER_OPTS)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private db: DrizzleService) {
    super();
  }

  async process(job: Job) {
    if (job.name !== JOB_DAILY_REMINDER) return;
    const today = toDateString(startOfDayUTC(new Date()));
    const rows = await this.db.db.execute(sql`
      SELECT DISTINCT user_id FROM daily_tasks
      WHERE assigned_date = ${today}::date AND status = 'PENDING'
    `);
    for (const row of rows as unknown as { user_id: string }[]) {
      await this.db.db.insert(notifications).values({
        id: newId(),
        userId: row.user_id,
        type: 'DAILY_TASK',
        payload: { date: today, message: 'You have pending daily tasks' },
      });
    }
    this.logger.log(`Sent ${(rows as unknown[]).length} daily reminders`);
    return { count: (rows as unknown[]).length };
  }
}
