import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and, ilike, sql } from 'drizzle-orm';
import { CreateResourceDto, ResourceStatus, Role } from '@placement/shared';
import { DrizzleService } from '../../database/drizzle.service';
import { resources, resourceTags, resourceRoadmaps, tags } from '../../database/schema';
import { newId } from '../../common/utils';

@Injectable()
export class ResourcesService {
  constructor(private db: DrizzleService) {}

  async list(filters: { type?: string; tag?: string; roadmapId?: string; q?: string }) {
    let rows = await this.db.db.select().from(resources);
    rows = rows.filter((r) => r.status === ResourceStatus.APPROVED);
    if (filters.type) rows = rows.filter((r) => r.type === filters.type);
    if (filters.q) rows = rows.filter((r) => r.title.toLowerCase().includes(filters.q!.toLowerCase()));
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      url: r.url,
      type: r.type,
      description: r.description,
      status: r.status,
    }));
  }

  async create(userId: string, dto: CreateResourceDto) {
    const id = newId();
    await this.db.db.insert(resources).values({
      id,
      title: dto.title,
      url: dto.url,
      type: dto.type,
      description: dto.description ?? null,
      submittedById: userId,
      status: ResourceStatus.PENDING,
    });

    if (dto.tagIds?.length) {
      for (const tagId of dto.tagIds) {
        await this.db.db.insert(resourceTags).values({ resourceId: id, tagId });
      }
    }
    if (dto.roadmapIds?.length) {
      for (const roadmapId of dto.roadmapIds) {
        await this.db.db.insert(resourceRoadmaps).values({ resourceId: id, roadmapId });
      }
    }

    const [created] = await this.db.db.select().from(resources).where(eq(resources.id, id));
    return created;
  }

  async approve(id: string, approverId: string) {
    const [updated] = await this.db.db
      .update(resources)
      .set({ status: ResourceStatus.APPROVED, approvedById: approverId })
      .where(eq(resources.id, id))
      .returning();
    if (!updated) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Resource not found', details: {} } });
    return updated;
  }

  async reject(id: string, approverId: string) {
    const [updated] = await this.db.db
      .update(resources)
      .set({ status: ResourceStatus.REJECTED, approvedById: approverId })
      .where(eq(resources.id, id))
      .returning();
    if (!updated) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Resource not found', details: {} } });
    return updated;
  }

  async listPending() {
    return this.db.db.select().from(resources).where(eq(resources.status, ResourceStatus.PENDING));
  }
}
