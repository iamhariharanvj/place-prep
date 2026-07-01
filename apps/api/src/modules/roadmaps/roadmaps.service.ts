import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import { milestones, modules, objectives, roadmaps } from '../../database/schema';
import { newId } from '../../common/utils';
import { z } from 'zod';

export const createRoadmapSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens').optional(),
  description: z.string().max(2000).optional(),
  carryForward: z.boolean().default(true),
});

export const createModuleSchema = z.object({
  title: z.string().min(2).max(200),
  order: z.number().int().min(1),
});

export const createMilestoneSchema = z.object({
  title: z.string().min(2).max(200),
  order: z.number().int().min(1),
});

export const createObjectiveSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(['READ', 'PRACTICE', 'QUIZ', 'PROJECT', 'MOCK_INTERVIEW']),
  xpReward: z.number().int().min(1).max(1000).default(10),
  order: z.number().int().min(1),
});

@Injectable()
export class RoadmapsService {
  constructor(private db: DrizzleService) {}

  async list(publishedOnly = true, slug?: string) {
    const rows = await this.db.db.select().from(roadmaps);
    return rows
      .filter((r) => (!publishedOnly || r.published) && (!slug || r.slug === slug))
      .map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        description: r.description,
        published: r.published,
        carryForward: r.carryForward,
        createdAt: r.createdAt,
      }));
  }

  async listForMentor(mentorId: string) {
    const rows = await this.db.db.execute(sql`
      SELECT r.*, COUNT(e.id)::int AS enrolled_count
      FROM roadmaps r
      LEFT JOIN enrollments e ON e.roadmap_id = r.id
      WHERE r.created_by_id = ${mentorId}
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `);
    return rows as unknown as (typeof roadmaps.$inferSelect & { enrolled_count: number })[];
  }

  async getBySlug(slug: string, publishedOnly = true) {
    const [roadmap] = await this.db.db.select().from(roadmaps).where(eq(roadmaps.slug, slug)).limit(1);
    if (!roadmap || (publishedOnly && !roadmap.published)) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Roadmap not found', details: {} } });
    }
    return this.buildTree(roadmap);
  }

  async getById(id: string) {
    const [roadmap] = await this.db.db.select().from(roadmaps).where(eq(roadmaps.id, id)).limit(1);
    if (!roadmap) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Roadmap not found', details: {} } });
    return this.buildTree(roadmap);
  }

  private async buildTree(roadmap: typeof roadmaps.$inferSelect) {
    const modRows = await this.db.db.select().from(modules).where(eq(modules.roadmapId, roadmap.id));
    const tree = [];
    for (const mod of modRows.sort((a, b) => a.order - b.order)) {
      const msRows = await this.db.db.select().from(milestones).where(eq(milestones.moduleId, mod.id));
      const milestonesTree = [];
      for (const ms of msRows.sort((a, b) => a.order - b.order)) {
        const objRows = await this.db.db.select().from(objectives).where(eq(objectives.milestoneId, ms.id));
        milestonesTree.push({
          id: ms.id, title: ms.title, order: ms.order,
          objectives: objRows.sort((a, b) => a.order - b.order).map((o) => ({
            id: o.id, title: o.title, description: o.description,
            type: o.type, xpReward: o.xpReward, order: o.order,
          })),
        });
      }
      tree.push({ id: mod.id, title: mod.title, order: mod.order, milestones: milestonesTree });
    }
    return { ...roadmap, modules: tree };
  }

  async create(mentorId: string, dto: z.infer<typeof createRoadmapSchema>) {
    const slug = dto.slug ?? await this.generateUniqueSlug(dto.title);
    const [existing] = await this.db.db.select().from(roadmaps).where(eq(roadmaps.slug, slug)).limit(1);
    if (existing) throw new ForbiddenException({ error: { code: 'SLUG_TAKEN', message: 'A roadmap with this title already exists', details: {} } });
    const [created] = await this.db.db.insert(roadmaps).values({
      id: newId(), title: dto.title, slug,
      description: dto.description ?? null, carryForward: dto.carryForward,
      published: false, createdById: mentorId,
    }).returning();
    return created;
  }

  private slugify(title: string): string {
    const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (base.length >= 2) return base.slice(0, 80);
    return `roadmap-${Date.now().toString(36)}`;
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const base = this.slugify(title);
    let slug = base;
    let suffix = 2;
    while (true) {
      const [existing] = await this.db.db.select().from(roadmaps).where(eq(roadmaps.slug, slug)).limit(1);
      if (!existing) return slug;
      const suffixStr = `-${suffix}`;
      slug = `${base.slice(0, 80 - suffixStr.length)}${suffixStr}`;
      suffix++;
    }
  }

  async update(id: string, mentorId: string, dto: Partial<z.infer<typeof createRoadmapSchema>>) {
    const [roadmap] = await this.db.db.select().from(roadmaps).where(eq(roadmaps.id, id)).limit(1);
    if (!roadmap) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Roadmap not found', details: {} } });
    const [updated] = await this.db.db.update(roadmaps).set({
      ...(dto.title && { title: dto.title }),
      ...(dto.slug && { slug: dto.slug }),
      ...(dto.description !== undefined && { description: dto.description ?? null }),
      ...(dto.carryForward !== undefined && { carryForward: dto.carryForward }),
    }).where(eq(roadmaps.id, id)).returning();
    return updated;
  }

  async setPublished(id: string, published: boolean) {
    const [updated] = await this.db.db.update(roadmaps).set({ published }).where(eq(roadmaps.id, id)).returning();
    if (!updated) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Roadmap not found', details: {} } });
    return updated;
  }

  async deleteRoadmap(id: string) {
    await this.db.db.delete(roadmaps).where(eq(roadmaps.id, id));
  }

  async addModule(roadmapId: string, dto: z.infer<typeof createModuleSchema>) {
    const [created] = await this.db.db.insert(modules).values({
      id: newId(), roadmapId, title: dto.title, order: dto.order,
    }).returning();
    return created;
  }

  async updateModule(id: string, dto: Partial<z.infer<typeof createModuleSchema>>) {
    const [updated] = await this.db.db.update(modules).set({
      ...(dto.title && { title: dto.title }),
      ...(dto.order !== undefined && { order: dto.order }),
    }).where(eq(modules.id, id)).returning();
    if (!updated) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Module not found', details: {} } });
    return updated;
  }

  async deleteModule(id: string) {
    await this.db.db.delete(modules).where(eq(modules.id, id));
  }

  async addMilestone(moduleId: string, dto: z.infer<typeof createMilestoneSchema>) {
    const [created] = await this.db.db.insert(milestones).values({
      id: newId(), moduleId, title: dto.title, order: dto.order,
    }).returning();
    return created;
  }

  async updateMilestone(id: string, dto: Partial<z.infer<typeof createMilestoneSchema>>) {
    const [updated] = await this.db.db.update(milestones).set({
      ...(dto.title && { title: dto.title }),
      ...(dto.order !== undefined && { order: dto.order }),
    }).where(eq(milestones.id, id)).returning();
    if (!updated) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Milestone not found', details: {} } });
    return updated;
  }

  async deleteMilestone(id: string) {
    await this.db.db.delete(milestones).where(eq(milestones.id, id));
  }

  async addObjective(milestoneId: string, dto: z.infer<typeof createObjectiveSchema>) {
    const [created] = await this.db.db.insert(objectives).values({
      id: newId(), milestoneId, title: dto.title, description: dto.description ?? null,
      type: dto.type, xpReward: dto.xpReward, order: dto.order,
    }).returning();
    return created;
  }

  async updateObjective(id: string, dto: Partial<z.infer<typeof createObjectiveSchema>>) {
    const [updated] = await this.db.db.update(objectives).set({
      ...(dto.title && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description ?? null }),
      ...(dto.type && { type: dto.type }),
      ...(dto.xpReward !== undefined && { xpReward: dto.xpReward }),
      ...(dto.order !== undefined && { order: dto.order }),
    }).where(eq(objectives.id, id)).returning();
    if (!updated) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Objective not found', details: {} } });
    return updated;
  }

  async deleteObjective(id: string) {
    await this.db.db.delete(objectives).where(eq(objectives.id, id));
  }

  async findById(id: string) {
    const [roadmap] = await this.db.db.select().from(roadmaps).where(eq(roadmaps.id, id)).limit(1);
    return roadmap ?? null;
  }
}
