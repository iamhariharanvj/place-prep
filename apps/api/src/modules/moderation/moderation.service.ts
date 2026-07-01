import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { CreateReportDto, ReportStatus, Role } from '@placement/shared';
import { DrizzleService } from '../../database/drizzle.service';
import { auditLogs, comments, messages, reports, users, aliases } from '../../database/schema';
import { newId } from '../../common/utils';

@Injectable()
export class ModerationService {
  constructor(private db: DrizzleService) {}

  async createReport(reporterId: string, dto: CreateReportDto) {
    const [created] = await this.db.db
      .insert(reports)
      .values({ id: newId(), messageId: dto.messageId, reporterId, reason: dto.reason })
      .returning();
    return created;
  }

  async listReports() {
    return this.db.db.select().from(reports).where(eq(reports.status, ReportStatus.OPEN)).orderBy(desc(reports.createdAt));
  }

  async updateReport(id: string, status: ReportStatus) {
    const [updated] = await this.db.db.update(reports).set({ status }).where(eq(reports.id, id)).returning();
    if (!updated) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Report not found', details: {} } });
    return updated;
  }

  async deleteMessage(id: string) {
    const [msg] = await this.db.db.select().from(messages).where(eq(messages.id, id)).limit(1);
    if (!msg) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Message not found', details: {} } });
    await this.db.db.delete(messages).where(eq(messages.id, id));
  }

  async deleteComment(id: string) {
    const [comment] = await this.db.db.select().from(comments).where(eq(comments.id, id)).limit(1);
    if (!comment) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Comment not found', details: {} } });
    await this.db.db.delete(comments).where(eq(comments.id, id));
  }

  async listMessages(type?: string) {
    let q = this.db.db
      .select({
        id: messages.id,
        type: messages.type,
        authorId: messages.authorId,
        voteScore: messages.voteScore,
        createdAt: messages.createdAt,
        displayName: users.displayName,
      })
      .from(messages)
      .leftJoin(users, eq(messages.authorId, users.id))
      .orderBy(desc(messages.createdAt))
      .$dynamic();
    if (type) {
      const result = await this.db.db
        .select({
          id: messages.id,
          type: messages.type,
          authorId: messages.authorId,
          voteScore: messages.voteScore,
          createdAt: messages.createdAt,
          displayName: users.displayName,
        })
        .from(messages)
        .leftJoin(users, eq(messages.authorId, users.id))
        .where(eq(messages.type, type))
        .orderBy(desc(messages.createdAt))
        .limit(50);
      return result;
    }
    return q.limit(50);
  }

  async resolveAuthor(messageId: string) {
    const [msg] = await this.db.db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
    if (!msg) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Message not found', details: {} } });

    const [user] = await this.db.db.select().from(users).where(eq(users.id, msg.authorId)).limit(1);
    const [alias] = msg.aliasId
      ? await this.db.db.select().from(aliases).where(eq(aliases.id, msg.aliasId)).limit(1)
      : [null];

    return {
      userId: user?.id,
      email: user?.email,
      displayName: user?.displayName,
      aliasDisplayName: alias?.displayName ?? null,
    };
  }

  async auditLog(adminId: string, action: string, targetType: string, targetId: string, metadata?: Record<string, unknown>) {
    await this.db.db.insert(auditLogs).values({
      id: newId(),
      adminId,
      action,
      targetType,
      targetId,
      metadata: metadata ?? null,
    });
  }
}
