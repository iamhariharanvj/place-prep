import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import { outboxEvents } from '../../database/schema';
import { newId } from '../../common/utils';

export interface XpAwardedPayload {
  userId: string;
  xpDelta: number;
  roadmapId: string;
  occurredAt: string;
}

@Injectable()
export class OutboxService {
  constructor(private db: DrizzleService) {}

  async insertXpAwarded(payload: XpAwardedPayload) {
    await this.db.db.insert(outboxEvents).values({
      id: newId(),
      eventType: 'XpAwarded',
      payload,
      status: 'PENDING',
    });
  }

  async claimBatch(limit = 50) {
    const result = await this.db.db.execute(sql`
      UPDATE outbox_events
      SET status = 'PROCESSING', attempts = attempts + 1
      WHERE id IN (
        SELECT id FROM outbox_events
        WHERE status IN ('PENDING','FAILED') AND attempts < 5
        ORDER BY created_at
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `);
    return result as unknown as (typeof outboxEvents.$inferSelect)[];
  }

  async markCompleted(id: string) {
    await this.db.db.execute(sql`
      UPDATE outbox_events SET status = 'COMPLETED', processed_at = now() WHERE id = ${id}
    `);
  }

  async markFailed(id: string) {
    await this.db.db.execute(sql`
      UPDATE outbox_events SET status = 'FAILED' WHERE id = ${id}
    `);
  }
}
