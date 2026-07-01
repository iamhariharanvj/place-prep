import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { EnrollDto, LIMITS, ProgressStatus, DailyTaskStatus } from '@placement/shared';
import { DrizzleService } from '../../database/drizzle.service';
import { dailyTasks, enrollments, milestones, modules, objectives, progress, roadmaps } from '../../database/schema';
import { newId, startOfDayUTC, toDateString } from '../../common/utils';
import { OutboxService } from '../gamification/outbox.service';

@Injectable()
export class EnrollmentService {
  constructor(private db: DrizzleService) {}

  async enroll(userId: string, dto: EnrollDto) {
    const [existing] = await this.db.db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.userId, userId), eq(enrollments.roadmapId, dto.roadmapId)))
      .limit(1);
    if (existing) {
      throw new ConflictException({ error: { code: 'ALREADY_ENROLLED', message: 'Already enrolled', details: {} } });
    }

    const [created] = await this.db.db
      .insert(enrollments)
      .values({ id: newId(), userId, roadmapId: dto.roadmapId, pace: dto.pace })
      .returning();
    return created;
  }

  async list(userId: string) {
    return this.db.db.select().from(enrollments).where(eq(enrollments.userId, userId));
  }
}

@Injectable()
export class ProgressService {
  constructor(
    private db: DrizzleService,
    private outbox: OutboxService,
  ) {}

  async completeObjective(userId: string, objectiveId: string) {
    const data = await this.db.completeObjective(userId, objectiveId);
    const parsed = data as {
      progress: { objective_id: string; status: string; completed_at: string };
      user: { xp: number; streakCount: number };
      roadmapId: string;
      xpAwarded: number;
    };

    await this.outbox.insertXpAwarded({
      userId,
      xpDelta: parsed.xpAwarded,
      roadmapId: parsed.roadmapId as string,
      occurredAt: new Date().toISOString(),
    });

    return {
      progress: {
        objectiveId: parsed.progress.objective_id ?? objectiveId,
        status: parsed.progress.status,
        completedAt: parsed.progress.completed_at,
      },
      xpAwarded: parsed.xpAwarded,
      user: parsed.user,
      roadmapId: parsed.roadmapId,
    };
  }

  async skipObjective(userId: string, objectiveId: string) {
    const [existing] = await this.db.db
      .select()
      .from(progress)
      .where(and(eq(progress.userId, userId), eq(progress.objectiveId, objectiveId)))
      .limit(1);

    if (existing) {
      await this.db.db.update(progress).set({ status: ProgressStatus.SKIPPED }).where(eq(progress.id, existing.id));
    } else {
      await this.db.db.insert(progress).values({
        id: newId(),
        userId,
        objectiveId,
        status: ProgressStatus.SKIPPED,
      });
    }
    return { objectiveId, status: ProgressStatus.SKIPPED };
  }

  async getProgress(userId: string, roadmapId?: string) {
    if (!roadmapId) {
      return this.db.db.select().from(progress).where(eq(progress.userId, userId));
    }
    const result = await this.db.db.execute(sql`
      SELECT p.* FROM progress p
      JOIN objectives o ON o.id = p.objective_id
      JOIN milestones ms ON ms.id = o.milestone_id
      JOIN modules m ON m.id = ms.module_id
      WHERE p.user_id = ${userId} AND m.roadmap_id = ${roadmapId}
    `);
    return result;
  }
}

@Injectable()
export class DailyTaskService {
  constructor(private db: DrizzleService) {}

  async getDailyTasks(userId: string, dateStr?: string) {
    const date = dateStr ?? toDateString(startOfDayUTC(new Date()));
    const result = await this.db.db.execute(sql`
      SELECT dt.*, o.title, o.description, o.type, o.xp_reward,
             r.id AS roadmap_id, r.title AS roadmap_title, r.slug AS roadmap_slug
      FROM daily_tasks dt
      JOIN objectives o ON o.id = dt.objective_id
      JOIN milestones ms ON ms.id = o.milestone_id
      JOIN modules m ON m.id = ms.module_id
      JOIN roadmaps r ON r.id = m.roadmap_id
      WHERE dt.user_id = ${userId} AND dt.assigned_date = ${date}::date
      ORDER BY dt.carry_forward DESC, o."order"
    `);

    return (result as unknown as Record<string, unknown>[]).map((row) => ({
      id: row.id,
      objectiveId: row.objective_id,
      title: row.title,
      description: row.description,
      type: row.type,
      xpReward: row.xp_reward,
      status: row.status,
      carryForward: row.carry_forward,
      roadmap: { id: row.roadmap_id, title: row.roadmap_title, slug: row.roadmap_slug },
    }));
  }

  async assignForDate(date: Date, shard?: number, shardCount = 4): Promise<number> {
    const dateStr = toDateString(startOfDayUTC(date));
    const enrollmentRows = await this.db.db.select().from(enrollments);
    let assigned = 0;

    for (const enrollment of enrollmentRows) {
      if (shard !== undefined) {
        const hash = [...enrollment.userId].reduce((a, c) => a + c.charCodeAt(0), 0);
        if (hash % shardCount !== shard) continue;
      }
      assigned += await this.assignForEnrollment(enrollment, dateStr);
    }
    return assigned;
  }

  private async assignForEnrollment(enrollment: typeof enrollments.$inferSelect, dateStr: string) {
    const [roadmap] = await this.db.db.select().from(roadmaps).where(eq(roadmaps.id, enrollment.roadmapId)).limit(1);
    if (!roadmap) return 0;

    const pool: { id: string; carryForward: boolean }[] = [];

    if (roadmap.carryForward) {
      const carried = await this.db.db.execute(sql`
        SELECT dt.objective_id AS id FROM daily_tasks dt
        WHERE dt.user_id = ${enrollment.userId}
          AND dt.status = 'PENDING'
          AND dt.assigned_date < ${dateStr}::date
        ORDER BY dt.assigned_date
        LIMIT ${LIMITS.CARRY_FORWARD_MAX}
      `);
      for (const row of carried as unknown as { id: string }[]) {
        pool.push({ id: row.id, carryForward: true });
      }
    }

    const remaining = enrollment.pace - pool.length;
    if (remaining > 0) {
      const next = await this.db.db.execute(sql`
        SELECT o.id FROM objectives o
        JOIN milestones ms ON ms.id = o.milestone_id
        JOIN modules m ON m.id = ms.module_id
        WHERE m.roadmap_id = ${enrollment.roadmapId}
          AND NOT EXISTS (
            SELECT 1 FROM progress p
            WHERE p.user_id = ${enrollment.userId} AND p.objective_id = o.id
              AND p.status IN ('COMPLETED', 'SKIPPED')
          )
        ORDER BY m."order", ms."order", o."order"
        LIMIT ${remaining}
      `);
      for (const row of next as unknown as { id: string }[]) {
        pool.push({ id: row.id, carryForward: false });
      }
    }

    let count = 0;
    for (const obj of pool.slice(0, enrollment.pace)) {
      await this.db.db.execute(sql`
        INSERT INTO daily_tasks (id, user_id, objective_id, assigned_date, status, carry_forward)
        VALUES (${newId()}, ${enrollment.userId}, ${obj.id}, ${dateStr}::date, 'PENDING', ${obj.carryForward})
        ON CONFLICT (user_id, objective_id, assigned_date) DO NOTHING
      `);
      count++;
    }
    return count;
  }
}
