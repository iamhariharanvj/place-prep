import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { enrollSchema } from '@placement/shared';
import { ZodBody } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';
import { EnrollmentService, ProgressService, DailyTaskService } from './learning.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@placement/shared';

@Controller()
export class LearningController {
  constructor(
    private enrollment: EnrollmentService,
    private progress: ProgressService,
    private daily: DailyTaskService,
  ) {}

  @Post('enrollments')
  @Roles(Role.STUDENT, Role.MENTOR, Role.ADMIN)
  enroll(@CurrentUser() user: JwtUser, @Body(ZodBody(enrollSchema)) dto: ReturnType<typeof enrollSchema.parse>) {
    return this.enrollment.enroll(user.id, dto);
  }

  @Get('enrollments')
  listEnrollments(@CurrentUser() user: JwtUser) {
    return this.enrollment.list(user.id);
  }

  @Get('daily-tasks')
  dailyTasks(@CurrentUser() user: JwtUser, @Query('date') date?: string) {
    return this.daily.getDailyTasks(user.id, date);
  }

  @Post('objectives/:id/complete')
  complete(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.progress.completeObjective(user.id, id);
  }

  @Post('objectives/:id/skip')
  skip(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.progress.skipObjective(user.id, id);
  }

  @Get('progress')
  getProgress(@CurrentUser() user: JwtUser, @Query('roadmapId') roadmapId?: string) {
    return this.progress.getProgress(user.id, roadmapId);
  }
}
