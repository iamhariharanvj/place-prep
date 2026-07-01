import {
  Controller, Get, Post, Put, Patch, Delete, Param, Query, Body, HttpCode, HttpStatus
} from '@nestjs/common';
import { Public, Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@placement/shared';
import {
  RoadmapsService,
  createRoadmapSchema,
  createModuleSchema,
  createMilestoneSchema,
  createObjectiveSchema,
} from './roadmaps.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { z } from 'zod';

@Controller('roadmaps')
export class RoadmapsController {
  constructor(private roadmaps: RoadmapsService) {}

  @Public()
  @Get()
  list(@Query('slug') slug?: string) {
    return this.roadmaps.list(true, slug);
  }

  @Roles(Role.MENTOR)
  @Get('mine')
  listMine(@CurrentUser('sub') mentorId: string) {
    return this.roadmaps.listForMentor(mentorId);
  }

  @Roles(Role.MENTOR)
  @Get(':id/edit')
  getForEdit(@Param('id') id: string) {
    return this.roadmaps.getById(id);
  }

  @Public()
  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.roadmaps.getBySlug(slug);
  }

  @Roles(Role.MENTOR)
  @Post()
  create(
    @CurrentUser('sub') mentorId: string,
    @Body(new ZodValidationPipe(createRoadmapSchema)) dto: z.infer<typeof createRoadmapSchema>,
  ) {
    return this.roadmaps.create(mentorId, dto);
  }

  @Roles(Role.MENTOR)
  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('sub') mentorId: string,
    @Body(new ZodValidationPipe(createRoadmapSchema.partial())) dto: Partial<z.infer<typeof createRoadmapSchema>>,
  ) {
    return this.roadmaps.update(id, mentorId, dto);
  }

  @Roles(Role.MENTOR)
  @Patch(':id/publish')
  publish(@Param('id') id: string, @Body('published') published: boolean) {
    return this.roadmaps.setPublished(id, published);
  }

  @Roles(Role.MENTOR)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteRoadmap(@Param('id') id: string) {
    return this.roadmaps.deleteRoadmap(id);
  }

  // --- Modules ---

  @Roles(Role.MENTOR)
  @Post(':roadmapId/modules')
  addModule(
    @Param('roadmapId') roadmapId: string,
    @Body(new ZodValidationPipe(createModuleSchema)) dto: z.infer<typeof createModuleSchema>,
  ) {
    return this.roadmaps.addModule(roadmapId, dto);
  }

  @Roles(Role.MENTOR)
  @Put('modules/:id')
  updateModule(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createModuleSchema.partial())) dto: Partial<z.infer<typeof createModuleSchema>>,
  ) {
    return this.roadmaps.updateModule(id, dto);
  }

  @Roles(Role.MENTOR)
  @Delete('modules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteModule(@Param('id') id: string) {
    return this.roadmaps.deleteModule(id);
  }

  // --- Milestones ---

  @Roles(Role.MENTOR)
  @Post('modules/:moduleId/milestones')
  addMilestone(
    @Param('moduleId') moduleId: string,
    @Body(new ZodValidationPipe(createMilestoneSchema)) dto: z.infer<typeof createMilestoneSchema>,
  ) {
    return this.roadmaps.addMilestone(moduleId, dto);
  }

  @Roles(Role.MENTOR)
  @Put('milestones/:id')
  updateMilestone(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createMilestoneSchema.partial())) dto: Partial<z.infer<typeof createMilestoneSchema>>,
  ) {
    return this.roadmaps.updateMilestone(id, dto);
  }

  @Roles(Role.MENTOR)
  @Delete('milestones/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMilestone(@Param('id') id: string) {
    return this.roadmaps.deleteMilestone(id);
  }

  // --- Objectives ---

  @Roles(Role.MENTOR)
  @Post('milestones/:milestoneId/objectives')
  addObjective(
    @Param('milestoneId') milestoneId: string,
    @Body(new ZodValidationPipe(createObjectiveSchema)) dto: z.infer<typeof createObjectiveSchema>,
  ) {
    return this.roadmaps.addObjective(milestoneId, dto);
  }

  @Roles(Role.MENTOR)
  @Put('objectives/:id')
  updateObjective(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createObjectiveSchema.partial())) dto: Partial<z.infer<typeof createObjectiveSchema>>,
  ) {
    return this.roadmaps.updateObjective(id, dto);
  }

  @Roles(Role.MENTOR)
  @Delete('objectives/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteObjective(@Param('id') id: string) {
    return this.roadmaps.deleteObjective(id);
  }
}
