import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { UpdateAliasDto, UpdateProfileDto, Role } from '@placement/shared';
import { DrizzleService } from '../../database/drizzle.service';
import { aliases, enrollments, notifications, roadmaps, users } from '../../database/schema';
import { newId } from '../../common/utils';

@Injectable()
export class UsersService {
  constructor(private db: DrizzleService) {}

  async getProfile(userId: string) {
    const [user] = await this.db.db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'User not found', details: {} } });

    const enrollmentRows = await this.db.db.select().from(enrollments).where(eq(enrollments.userId, userId));

    let roadmapsCount = 0;
    if (user.role === Role.MENTOR) {
      const [row] = await this.db.db.execute(sql`
        SELECT COUNT(*)::int AS count FROM roadmaps WHERE created_by_id = ${userId}
      `) as unknown as [{ count: number }];
      roadmapsCount = row?.count ?? 0;
    }

    const base = {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      company: user.company ?? null,
      bio: user.bio ?? null,
      college: user.college ?? null,
      linkedinUrl: user.linkedinUrl ?? null,
      leetcodeUrl: user.leetcodeUrl ?? null,
      githubUrl: user.githubUrl ?? null,
      xp: user.role === Role.STUDENT ? user.xp : 0,
      streakCount: user.role === Role.STUDENT ? user.streakCount : 0,
      enrollmentsCount: user.role === Role.STUDENT ? enrollmentRows.length : undefined,
      roadmapsCount: user.role === Role.MENTOR ? roadmapsCount : undefined,
      createdAt: user.createdAt,
    };
    return base;
  }

  async getPublicProfile(userId: string) {
    const [user] = await this.db.db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'User not found', details: {} } });

    const enrollmentRows = await this.db.db.select().from(enrollments).where(eq(enrollments.userId, userId));

    let roadmapsCount = 0;
    if (user.role === Role.MENTOR) {
      const [row] = await this.db.db.execute(sql`
        SELECT COUNT(*)::int AS count FROM roadmaps WHERE created_by_id = ${userId}
      `) as unknown as [{ count: number }];
      roadmapsCount = row?.count ?? 0;
    }

    return {
      id: user.id,
      role: user.role,
      displayName: user.displayName,
      company: user.role === Role.MENTOR ? (user.company ?? null) : null,
      bio: user.bio ?? null,
      college: user.college ?? null,
      linkedinUrl: user.linkedinUrl ?? null,
      leetcodeUrl: user.leetcodeUrl ?? null,
      githubUrl: user.githubUrl ?? null,
      xp: user.role === Role.STUDENT ? user.xp : 0,
      streakCount: user.role === Role.STUDENT ? user.streakCount : 0,
      enrollmentsCount: user.role === Role.STUDENT ? enrollmentRows.length : undefined,
      roadmapsCount: user.role === Role.MENTOR ? roadmapsCount : undefined,
      memberSince: user.createdAt,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const [user] = await this.db.db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'User not found', details: {} } });

    const [updated] = await this.db.db.update(users).set({
      ...(dto.displayName !== undefined && { displayName: dto.displayName }),
      ...(dto.company !== undefined && user.role === Role.MENTOR && { company: dto.company }),
      ...(dto.bio !== undefined && { bio: dto.bio }),
      ...(dto.college !== undefined && { college: dto.college }),
      ...(dto.linkedinUrl !== undefined && { linkedinUrl: dto.linkedinUrl }),
      ...(dto.leetcodeUrl !== undefined && { leetcodeUrl: dto.leetcodeUrl }),
      ...(dto.githubUrl !== undefined && { githubUrl: dto.githubUrl }),
      updatedAt: new Date(),
    }).where(eq(users.id, userId)).returning();

    return this.getProfile(updated.id);
  }

  async updateAlias(userId: string, dto: UpdateAliasDto) {
    const [existing] = await this.db.db.select().from(aliases).where(eq(aliases.userId, userId));
    if (existing) {
      const [updated] = await this.db.db
        .update(aliases)
        .set({ displayName: dto.displayName })
        .where(eq(aliases.id, existing.id))
        .returning();
      return { id: updated.id, displayName: updated.displayName };
    }
    const [created] = await this.db.db
      .insert(aliases)
      .values({ id: newId(), userId, displayName: dto.displayName })
      .returning();
    return { id: created.id, displayName: created.displayName };
  }

  async ensureAlias(userId: string) {
    const [existing] = await this.db.db.select().from(aliases).where(eq(aliases.userId, userId));
    if (existing) return existing;
    const [user] = await this.db.db.select().from(users).where(eq(users.id, userId));
    const [created] = await this.db.db
      .insert(aliases)
      .values({ id: newId(), userId, displayName: `${user.displayName}_anon` })
      .returning();
    return created;
  }

  async getNotifications(userId: string, limit = 20) {
    const rows = await this.db.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
    return { data: rows, nextCursor: null, hasMore: false };
  }

  async markNotificationRead(userId: string, id: string) {
    await this.db.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }
}
