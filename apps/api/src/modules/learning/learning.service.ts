import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { EnrollDto, LIMITS, ProgressStatus } from '@placement/shared';
import { DrizzleService } from '../../database/drizzle.service';
import { dailyTasks, enrollments, progress, roadmaps } from '../../database/schema';
import { newId, startOfDayUTC, toDateString } from '../../common/utils';
import { OutboxService } from '../gamification/outbox.service';

type ObjectivePoolItem = { id: string; milestoneId: string; carryForward: boolean };

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

  async updatePace(userId: string, enrollmentId: string, pace: number) {
    const [updated] = await this.db.db
      .update(enrollments)
      .set({ pace })
      .where(and(eq(enrollments.id, enrollmentId), eq(enrollments.userId, userId)))
      .returning();
    if (!updated) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Enrollment not found', details: {} } });
    }
    return updated;
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

    await this.db.db.execute(sql`
      UPDATE daily_tasks SET status = 'SKIPPED'
      WHERE user_id = ${userId} AND objective_id = ${objectiveId}
        AND assigned_date = (timezone('UTC', now()))::date AND status = 'PENDING'
    `);

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
             ms.id AS milestone_id, ms.title AS milestone_title,
             r.id AS roadmap_id, r.title AS roadmap_title, r.slug AS roadmap_slug
      FROM daily_tasks dt
      JOIN objectives o ON o.id = dt.objective_id
      JOIN milestones ms ON ms.id = dt.milestone_id
      JOIN modules m ON m.id = ms.module_id
      JOIN roadmaps r ON r.id = m.roadmap_id
      WHERE dt.user_id = ${userId} AND dt.assigned_date = ${date}::date
      ORDER BY dt.carry_forward DESC, m."order", ms."order", o."order"
    `);

    return (result as unknown as Record<string, unknown>[]).map((row) => ({
      id: row.id,
      objectiveId: row.objective_id,
      milestoneId: row.milestone_id,
      milestoneTitle: row.milestone_title,
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

  async assignForUser(userId: string, date: Date): Promise<number> {
    const dateStr = toDateString(startOfDayUTC(date));
    const enrollmentRows = await this.db.db.select().from(enrollments).where(eq(enrollments.userId, userId));
    let assigned = 0;
    for (const enrollment of enrollmentRows) {
      assigned += await this.assignForEnrollment(enrollment, dateStr);
    }
    return assigned;
  }

  async advanceToNextDay(userId: string, fromDateStr?: string) {
    const activeDateStr = fromDateStr ?? toDateString(startOfDayUTC(new Date()));
    const [{ count: pending }] = await this.db.db.execute(sql`
      SELECT COUNT(*)::int AS count FROM daily_tasks
      WHERE user_id = ${userId} AND assigned_date = ${activeDateStr}::date AND status = 'PENDING'
    `) as unknown as [{ count: number }];

    if (pending > 0) {
      throw new BadRequestException({
        error: { code: 'TASKS_PENDING', message: 'Complete or skip all tasks before advancing', details: {} },
      });
    }

    const [{ count: dayTotal }] = await this.db.db.execute(sql`
      SELECT COUNT(*)::int AS count FROM daily_tasks
      WHERE user_id = ${userId} AND assigned_date = ${activeDateStr}::date
    `) as unknown as [{ count: number }];

    if (dayTotal === 0) {
      throw new BadRequestException({
        error: { code: 'NO_TASKS_TODAY', message: 'No tasks assigned for this day', details: {} },
      });
    }

    const nextDay = new Date(`${activeDateStr}T00:00:00.000Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const nextDateStr = toDateString(nextDay);

    const [{ count: existingNext }] = await this.db.db.execute(sql`
      SELECT COUNT(*)::int AS count FROM daily_tasks
      WHERE user_id = ${userId} AND assigned_date = ${nextDateStr}::date
    `) as unknown as [{ count: number }];

    if (existingNext > 0) {
      throw new BadRequestException({
        error: { code: 'ALREADY_ADVANCED', message: 'Next day tasks are already assigned', details: {} },
      });
    }

    const assigned = await this.assignForUser(userId, nextDay);
    const tasks = await this.getDailyTasks(userId, nextDateStr);
    return { assigned, date: nextDateStr, tasks };
  }

  async assignForEnrollment(enrollment: typeof enrollments.$inferSelect, dateStr: string) {
    const [roadmap] = await this.db.db.select().from(roadmaps).where(eq(roadmaps.id, enrollment.roadmapId)).limit(1);
    if (!roadmap) return 0;

    const pool: ObjectivePoolItem[] = [];
    const carriedMilestoneIds = new Set<string>();

    if (roadmap.carryForward) {
      const carried = await this.db.db.execute(sql`
        SELECT dt.objective_id AS id, dt.milestone_id AS milestone_id
        FROM daily_tasks dt
        WHERE dt.user_id = ${enrollment.userId}
          AND dt.status = 'PENDING'
          AND dt.assigned_date < ${dateStr}::date
        ORDER BY dt.assigned_date, dt.milestone_id
      `);

      for (const row of carried as unknown as { id: string; milestone_id: string }[]) {
        if (carriedMilestoneIds.size >= LIMITS.CARRY_FORWARD_MAX && !carriedMilestoneIds.has(row.milestone_id)) {
          continue;
        }
        carriedMilestoneIds.add(row.milestone_id);
        pool.push({ id: row.id, milestoneId: row.milestone_id, carryForward: true });
      }
    }

    const remainingMilestones = Math.max(0, enrollment.pace - carriedMilestoneIds.size);
    if (remainingMilestones > 0) {
      const nextMilestones = await this.db.db.execute(sql`
        SELECT ms.id FROM milestones ms
        JOIN modules m ON m.id = ms.module_id
        WHERE m.roadmap_id = ${enrollment.roadmapId}
          AND EXISTS (
            SELECT 1 FROM objectives o
            WHERE o.milestone_id = ms.id
              AND NOT EXISTS (
                SELECT 1 FROM progress p
                WHERE p.user_id = ${enrollment.userId} AND p.objective_id = o.id
                  AND p.status IN ('COMPLETED', 'SKIPPED')
              )
          )
          AND NOT EXISTS (
            SELECT 1 FROM daily_tasks dt
            JOIN objectives o2 ON o2.id = dt.objective_id
            WHERE dt.user_id = ${enrollment.userId}
              AND o2.milestone_id = ms.id
              AND dt.status = 'PENDING'
              AND dt.assigned_date < ${dateStr}::date
          )
        ORDER BY m."order", ms."order"
        LIMIT ${remainingMilestones}
      `);

      for (const { id: milestoneId } of nextMilestones as unknown as { id: string }[]) {
        const objectives = await this.db.db.execute(sql`
          SELECT o.id FROM objectives o
          WHERE o.milestone_id = ${milestoneId}
            AND NOT EXISTS (
              SELECT 1 FROM progress p
              WHERE p.user_id = ${enrollment.userId} AND p.objective_id = o.id
                AND p.status IN ('COMPLETED', 'SKIPPED')
            )
          ORDER BY o."order"
        `);
        for (const obj of objectives as unknown as { id: string }[]) {
          pool.push({ id: obj.id, milestoneId, carryForward: false });
        }
      }
    }

    let count = 0;
    for (const obj of pool) {
      await this.db.db.execute(sql`
        INSERT INTO daily_tasks (id, user_id, objective_id, milestone_id, assigned_date, status, carry_forward)
        VALUES (${newId()}, ${enrollment.userId}, ${obj.id}, ${obj.milestoneId}, ${dateStr}::date, 'PENDING', ${obj.carryForward})
        ON CONFLICT (user_id, objective_id, assigned_date) DO NOTHING
      `);
      count++;
    }
    return count;
  }
}
