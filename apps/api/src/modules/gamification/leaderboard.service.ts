import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import Redis from 'ioredis';
import { LeaderboardScope, LIMITS } from '@placement/shared';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { DrizzleService } from '../../database/drizzle.service';
import { users } from '../../database/schema';
import { formatISOWeek, formatMonth } from '../../common/utils';
import { XpAwardedPayload } from './outbox.service';

@Injectable()
export class LeaderboardService {
  constructor(
    @Inject(REDIS_CLIENT) private redis: Redis,
    private db: DrizzleService,
  ) {}

  private key(scope: LeaderboardScope, roadmapId?: string, at = new Date()) {
    switch (scope) {
      case LeaderboardScope.GLOBAL:
        return 'pp:lb:global';
      case LeaderboardScope.ROADMAP:
        return `pp:lb:roadmap:${roadmapId}`;
      case LeaderboardScope.WEEKLY:
        return `pp:lb:weekly:${formatISOWeek(at)}`;
      case LeaderboardScope.MONTHLY:
        return `pp:lb:monthly:${formatMonth(at)}`;
    }
  }

  async applyXpEvent(event: XpAwardedPayload) {
    const at = new Date(event.occurredAt);
    const pipeline = this.redis.pipeline();
    pipeline.zincrby(this.key(LeaderboardScope.GLOBAL), event.xpDelta, event.userId);
    if (event.roadmapId) {
      pipeline.zincrby(this.key(LeaderboardScope.ROADMAP, event.roadmapId), event.xpDelta, event.userId);
    }
    const weekKey = this.key(LeaderboardScope.WEEKLY, undefined, at);
    const monthKey = this.key(LeaderboardScope.MONTHLY, undefined, at);
    pipeline.zincrby(weekKey, event.xpDelta, event.userId);
    pipeline.expire(weekKey, 56 * 86400);
    pipeline.zincrby(monthKey, event.xpDelta, event.userId);
    pipeline.expire(monthKey, 90 * 86400);
    await pipeline.exec();
    await this.redis.del(`pp:user:profile:${event.userId}`);
  }

  async getTop(scope: LeaderboardScope, opts: { roadmapId?: string; limit?: number } = {}) {
    const limit = opts.limit ?? LIMITS.LEADERBOARD_TOP_N;
    const key = this.key(scope, opts.roadmapId);
    const raw = await this.redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');

    const entries = [];
    for (let i = 0; i < raw.length; i += 2) {
      const userId = raw[i];
      const score = parseInt(raw[i + 1], 10);
      const profile = await this.getProfile(userId);
      entries.push({
        rank: entries.length + 1,
        userId,
        displayName: profile.displayName,
        score,
        streakCount: profile.streakCount,
      });
    }
    return entries;
  }

  async getMyRank(userId: string, scope: LeaderboardScope, roadmapId?: string) {
    const key = this.key(scope, roadmapId);
    const rank = await this.redis.zrevrank(key, userId);
    const score = await this.redis.zscore(key, userId);
    const total = await this.redis.zcard(key);
    return {
      rank: rank !== null ? rank + 1 : null,
      score: score ? parseInt(score, 10) : 0,
      totalParticipants: total,
    };
  }

  private async getProfile(userId: string) {
    const cached = await this.redis.hgetall(`pp:user:profile:${userId}`);
    if (cached.displayName) {
      return { displayName: cached.displayName, streakCount: parseInt(cached.streakCount ?? '0', 10) };
    }
    const [user] = await this.db.db.select().from(users).where(eq(users.id, userId)).limit(1);
    const profile = { displayName: user?.displayName ?? 'Unknown', streakCount: user?.streakCount ?? 0 };
    await this.redis.hset(`pp:user:profile:${userId}`, profile);
    await this.redis.expire(`pp:user:profile:${userId}`, 300);
    return profile;
  }

  async seedFromDatabase() {
    const allUsers = await this.db.db.select({ id: users.id, xp: users.xp }).from(users);
    const pipeline = this.redis.pipeline();
    for (const u of allUsers) {
      if (u.xp > 0) pipeline.zadd('pp:lb:global', u.xp, u.id);
    }
    await pipeline.exec();
  }

  async reconcile() {
    const allUsers = await this.db.db.select({ id: users.id, xp: users.xp }).from(users);
    const pipeline = this.redis.pipeline();
    pipeline.del('pp:lb:global');
    for (const u of allUsers) {
      if (u.xp > 0) pipeline.zadd('pp:lb:global', u.xp, u.id);
    }
    await pipeline.exec();
    return { drift: 0 };
  }
}
