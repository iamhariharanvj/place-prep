import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import {
  MessageType,
  Visibility,
  createQuestionSchema,
  createAnswerSchema,
  createNoteSchema,
  createExperienceSchema,
  CreateQuestionDto,
  CreateAnswerDto,
  CreateNoteDto,
  CreateExperienceDto,
  encodeCursor,
  decodeCursor,
  LIMITS,
} from '@placement/shared';
import { DrizzleService } from '../../database/drizzle.service';
import {
  messages, questions, answers, notes, experiences, messageTags, users, aliases, votes, comments,
} from '../../database/schema';
import { newId } from '../../common/utils';
import { resolveAuthor, MessageRow, AuthorContext } from '../../domain/message/capabilities';
import { MessageTypeRegistry } from '../../domain/message/message-type.registry';
import { UsersService } from '../users/users.service';
import { RateLimiterService } from '../../redis/rate-limiter.service';

@Injectable()
export class PublishService {
  constructor(
    private db: DrizzleService,
    private users: UsersService,
    private rateLimiter: RateLimiterService,
  ) {}

  async createQuestion(userId: string, input: CreateQuestionDto) {
    createQuestionSchema.parse(input);
    return this.publish(MessageType.QUESTION, userId, input, async (messageId, dto) => {
      await this.db.db.insert(questions).values({ messageId, title: dto.title, body: dto.body });
    });
  }

  async createAnswer(userId: string, questionId: string, input: CreateAnswerDto) {
    createAnswerSchema.parse(input);
    const [q] = await this.db.db.select().from(questions).where(eq(questions.messageId, questionId)).limit(1);
    if (!q) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Question not found', details: {} } });
    return this.publish(MessageType.ANSWER, userId, input, async (messageId, dto) => {
      await this.db.db.insert(answers).values({ messageId, questionId, body: dto.body });
    });
  }

  async createNote(userId: string, input: CreateNoteDto) {
    createNoteSchema.parse(input);
    return this.publish(MessageType.NOTE, userId, input, async (messageId, dto) => {
      await this.db.db.insert(notes).values({ messageId, title: dto.title, body: dto.body });
    });
  }

  async createExperience(userId: string, input: CreateExperienceDto) {
    createExperienceSchema.parse(input);
    return this.publish(MessageType.EXPERIENCE, userId, input, async (messageId, dto) => {
      await this.db.db.insert(experiences).values({ messageId, company: dto.company, role: dto.role, body: dto.body });
    });
  }

  private async publish<T extends { visibility?: Visibility; tagIds?: string[] }>(
    type: MessageType,
    userId: string,
    dto: T,
    persist: (messageId: string, dto: T) => Promise<void>,
  ) {
    await this.rateLimiter.assert(`pp:rl:post:${userId}`, LIMITS.POSTS_PER_HOUR, 3600);
    const visibility = dto.visibility ?? Visibility.PUBLIC;
    const alias = visibility === Visibility.SEMI_ANONYMOUS ? await this.users.ensureAlias(userId) : null;
    const messageId = newId();

    await this.db.db.insert(messages).values({
      id: messageId,
      type,
      authorId: userId,
      aliasId: alias?.id ?? null,
      visibility,
    });

    await persist(messageId, dto);

    if (dto.tagIds?.length) {
      for (const tagId of dto.tagIds) {
        await this.db.db.insert(messageTags).values({ messageId, tagId }).onConflictDoNothing();
      }
    }

    return this.loadPublicMessage(messageId, userId);
  }

  async listQuestions(cursor?: string, limit = 20, viewerId?: string) {
    return this.listByType(MessageType.QUESTION, cursor, limit, viewerId);
  }

  async listNotes(cursor?: string, limit = 20, viewerId?: string) {
    return this.listByType(MessageType.NOTE, cursor, limit, viewerId);
  }

  async listExperiences(
    cursor?: string,
    limit = 20,
    viewerId?: string,
    filters?: { company?: string; role?: string },
  ) {
    const decoded = cursor ? decodeCursor(cursor) : null;
    const companyFilter = filters?.company ? sql`AND e.company = ${filters.company}` : sql``;
    const roleFilter = filters?.role ? sql`AND e.role = ${filters.role}` : sql``;
    const cursorFilter = decoded
      ? sql`AND (m.created_at, m.id) < (${decoded.ts}::timestamptz, ${decoded.id})`
      : sql``;

    const rows = await this.db.db.execute(sql`
      SELECT m.* FROM messages m
      INNER JOIN experiences e ON e.message_id = m.id
      WHERE m.type = ${MessageType.EXPERIENCE} AND m.visibility != 'PRIVATE'
      ${companyFilter}
      ${roleFilter}
      ${cursorFilter}
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT ${limit + 1}
    `);

    const list = rows as unknown as (MessageRow & { created_at?: string; id: string })[];
    const normalized = list.map((m) => ({
      ...m,
      createdAt: m.createdAt ?? new Date(m.created_at as string),
    }));
    const hasMore = normalized.length > limit;
    const data = hasMore ? normalized.slice(0, limit) : normalized;
    const voteMap = await this.getUserVotes(viewerId, data.map((m) => m.id));
    const mapped = await Promise.all(data.map((m) => this.loadPublicMessage(m.id, viewerId, voteMap.get(m.id) ?? null)));
    const last = data[data.length - 1];
    return {
      data: mapped,
      nextCursor: hasMore && last ? encodeCursor(new Date(last.createdAt), last.id) : null,
      hasMore,
    };
  }

  async listExperienceFilters() {
    const companyRows = await this.db.db.execute(sql`
      SELECT e.company AS label, COUNT(*)::int AS count
      FROM experiences e
      INNER JOIN messages m ON m.id = e.message_id
      WHERE m.visibility != 'PRIVATE'
      GROUP BY e.company
      ORDER BY count DESC, e.company ASC
    `);
    const roleRows = await this.db.db.execute(sql`
      SELECT e.role AS label, COUNT(*)::int AS count
      FROM experiences e
      INNER JOIN messages m ON m.id = e.message_id
      WHERE m.visibility != 'PRIVATE'
      GROUP BY e.role
      ORDER BY count DESC, e.role ASC
    `);
    return {
      companies: companyRows as unknown as { label: string; count: number }[],
      roles: roleRows as unknown as { label: string; count: number }[],
    };
  }

  private async getUserVotes(viewerId: string | undefined, messageIds: string[]) {
    if (!viewerId || messageIds.length === 0) return new Map<string, 1 | -1>();
    const rows = await this.db.db
      .select({ messageId: votes.messageId, value: votes.value })
      .from(votes)
      .where(and(eq(votes.userId, viewerId), inArray(votes.messageId, messageIds)));
    return new Map(rows.map((r) => [r.messageId, r.value as 1 | -1]));
  }

  private async listByType(type: MessageType, cursor?: string, limit = 20, viewerId?: string) {
    const decoded = cursor ? decodeCursor(cursor) : null;
    const rows = decoded
      ? await this.db.db.execute(sql`
          SELECT * FROM messages
          WHERE type = ${type} AND visibility != 'PRIVATE'
            AND (created_at, id) < (${decoded.ts}::timestamptz, ${decoded.id})
          ORDER BY created_at DESC, id DESC
          LIMIT ${limit + 1}
        `)
      : await this.db.db.execute(sql`
          SELECT * FROM messages
          WHERE type = ${type} AND visibility != 'PRIVATE'
          ORDER BY created_at DESC, id DESC
          LIMIT ${limit + 1}
        `);

    const list = rows as unknown as (MessageRow & { created_at?: string; id: string })[];
    const normalized = list.map((m) => ({
      ...m,
      createdAt: m.createdAt ?? new Date(m.created_at as string),
    }));
    const hasMore = normalized.length > limit;
    const data = hasMore ? normalized.slice(0, limit) : normalized;
    const voteMap = await this.getUserVotes(viewerId, data.map((m) => m.id));
    const mapped = await Promise.all(data.map((m) => this.loadPublicMessage(m.id, viewerId, voteMap.get(m.id) ?? null)));
    const last = data[data.length - 1];
    return {
      data: mapped,
      nextCursor: hasMore && last ? encodeCursor(new Date(last.createdAt), last.id) : null,
      hasMore,
    };
  }

  async getQuestion(id: string, viewerId?: string) {
    const [q] = await this.db.db.select().from(questions).where(eq(questions.messageId, id)).limit(1);
    if (!q) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Question not found', details: {} } });

    const question = await this.loadPublicMessage(id, viewerId);
    const answerRows = await this.db.db.select().from(answers).where(eq(answers.questionId, id));
    const voteMap = await this.getUserVotes(viewerId, answerRows.map((a) => a.messageId));
    const answerDtos = await Promise.all(
      answerRows.map((a) => this.loadPublicMessage(a.messageId, viewerId, voteMap.get(a.messageId) ?? null)),
    );
    return { ...question, answers: answerDtos };
  }

  async acceptAnswer(userId: string, answerId: string) {
    const [answer] = await this.db.db.select().from(answers).where(eq(answers.messageId, answerId)).limit(1);
    if (!answer) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Answer not found', details: {} } });

    const [msg] = await this.db.db.select().from(messages).where(eq(messages.id, answer.questionId)).limit(1);
    if (msg?.authorId !== userId) {
      throw new ForbiddenException({ error: { code: 'FORBIDDEN', message: 'Only question author can accept', details: {} } });
    }

    await this.db.db.update(questions).set({ acceptedAnswerId: answerId }).where(eq(questions.messageId, answer.questionId));
    return { acceptedAnswerId: answerId };
  }

  async loadPublicMessage(messageId: string, viewerId?: string, userVote?: 1 | -1 | null) {
    const [msg] = await this.db.db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
    if (!msg) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Message not found', details: {} } });

    let resolvedVote = userVote;
    if (resolvedVote === undefined && viewerId) {
      const [existing] = await this.db.db
        .select({ value: votes.value })
        .from(votes)
        .where(and(eq(votes.userId, viewerId), eq(votes.messageId, messageId)))
        .limit(1);
      resolvedVote = existing ? (existing.value as 1 | -1) : null;
    }

    const ctx = await this.buildAuthorContext(msg, viewerId);
    const author = resolveAuthor(msg as MessageRow, ctx);
    const base = {
      id: msg.id,
      type: msg.type,
      voteScore: msg.voteScore,
      userVote: resolvedVote ?? null,
      visibility: msg.visibility,
      author,
      createdAt: msg.createdAt.toISOString(),
    };

    if (msg.type === MessageType.QUESTION) {
      const [q] = await this.db.db.select().from(questions).where(eq(questions.messageId, messageId)).limit(1);
      return { ...base, title: q?.title, body: q?.body, acceptedAnswerId: q?.acceptedAnswerId };
    }
    if (msg.type === MessageType.ANSWER) {
      const [a] = await this.db.db.select().from(answers).where(eq(answers.messageId, messageId)).limit(1);
      return { ...base, body: a?.body, questionId: a?.questionId };
    }
    if (msg.type === MessageType.NOTE) {
      const [n] = await this.db.db.select().from(notes).where(eq(notes.messageId, messageId)).limit(1);
      return { ...base, title: n?.title, body: n?.body };
    }
    if (msg.type === MessageType.EXPERIENCE) {
      const [e] = await this.db.db.select().from(experiences).where(eq(experiences.messageId, messageId)).limit(1);
      const company = e?.company ?? '';
      const role = e?.role ?? '';
      return {
        ...base,
        company,
        role,
        body: e?.body,
        tags: [
          ...(company ? [{ type: 'company' as const, label: company }] : []),
          ...(role ? [{ type: 'role' as const, label: role }] : []),
        ],
      };
    }
    return base;
  }

  private async buildAuthorContext(msg: typeof messages.$inferSelect, viewerId?: string): Promise<AuthorContext> {
    const [author] = await this.db.db.select().from(users).where(eq(users.id, msg.authorId)).limit(1);
    let aliasDisplayName: string | undefined;
    if (msg.aliasId) {
      const [alias] = await this.db.db.select().from(aliases).where(eq(aliases.id, msg.aliasId)).limit(1);
      aliasDisplayName = alias?.displayName;
    }
    return { viewerId, aliasDisplayName, authorDisplayName: author?.displayName };
  }
}

@Injectable()
export class VoteService {
  constructor(
    private db: DrizzleService,
    private registry: MessageTypeRegistry,
    private rateLimiter: RateLimiterService,
  ) {}

  async toggleVote(userId: string, messageId: string, value: 1 | -1) {
    await this.rateLimiter.assert(`pp:rl:vote:${userId}`, LIMITS.VOTES_PER_HOUR, 3600);

    const [message] = await this.db.db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
    if (!message) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Message not found', details: {} } });
    this.registry.assertVotable(message.type as MessageType);

    const [existing] = await this.db.db
      .select()
      .from(votes)
      .where(and(eq(votes.userId, userId), eq(votes.messageId, messageId)))
      .limit(1);

    let delta = 0;
    let userVote: 1 | -1 | null = value;

    if (!existing) {
      await this.db.db.insert(votes).values({ id: newId(), userId, messageId, value });
      delta = value;
    } else if (existing.value === value) {
      await this.db.db.delete(votes).where(eq(votes.id, existing.id));
      delta = -value;
      userVote = null;
    } else {
      await this.db.db.update(votes).set({ value }).where(eq(votes.id, existing.id));
      delta = value - existing.value;
    }

    const [updated] = await this.db.db
      .update(messages)
      .set({ voteScore: sql`${messages.voteScore} + ${delta}` })
      .where(eq(messages.id, messageId))
      .returning();

    return { score: updated.voteScore, userVote };
  }
}

@Injectable()
export class CommentService {
  constructor(
    private db: DrizzleService,
    private registry: MessageTypeRegistry,
    private users: UsersService,
  ) {}

  async list(messageId: string) {
    const rows = await this.db.db
      .select()
      .from(comments)
      .where(eq(comments.messageId, messageId))
      .orderBy(desc(comments.createdAt));
    return rows.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  async create(userId: string, messageId: string, body: string, visibility = Visibility.PUBLIC) {
    const [message] = await this.db.db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
    if (!message) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Message not found', details: {} } });
    this.registry.assertCommentable(message.type as MessageType);

    const alias = visibility === Visibility.SEMI_ANONYMOUS ? await this.users.ensureAlias(userId) : null;
    const [created] = await this.db.db
      .insert(comments)
      .values({ id: newId(), messageId, authorId: userId, aliasId: alias?.id ?? null, body })
      .returning();
    return created;
  }
}
