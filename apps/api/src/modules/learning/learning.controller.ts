import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { enrollSchema, updateEnrollmentPaceSchema, advanceDailySchema } from '@placement/shared';
import { ZodBody } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';
import { EnrollmentService, ProgressService, DailyTaskService } from './learning.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@placement/shared';
import { startOfDayUTC, toDateString } from '../../common/utils';

@Controller()
export class LearningController {
  constructor(
    private enrollment: EnrollmentService,
    private progress: ProgressService,
    private daily: DailyTaskService,
  ) {}

  @Post('enrollments')
  @Roles(Role.STUDENT, Role.MENTOR, Role.ADMIN)
  async enroll(@CurrentUser() user: JwtUser, @Body(ZodBody(enrollSchema)) dto: ReturnType<typeof enrollSchema.parse>) {
    const created = await this.enrollment.enroll(user.id, dto);
    await this.daily.assignForEnrollment(created, toDateString(startOfDayUTC(new Date())));
    return created;
  }

  @Get('enrollments')
  listEnrollments(@CurrentUser() user: JwtUser) {
    return this.enrollment.list(user.id);
  }

  @Patch('enrollments/:id/pace')
  @Roles(Role.STUDENT, Role.MENTOR, Role.ADMIN)
  updatePace(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body(ZodBody(updateEnrollmentPaceSchema)) dto: ReturnType<typeof updateEnrollmentPaceSchema.parse>,
  ) {
    return this.enrollment.updatePace(user.id, id, dto.pace);
  }

  @Get('daily-tasks')
  dailyTasks(@CurrentUser() user: JwtUser, @Query('date') date?: string) {
    return this.daily.getDailyTasks(user.id, date);
  }

  @Post('daily-tasks/advance')
  @Roles(Role.STUDENT, Role.MENTOR, Role.ADMIN)
  advanceDaily(
    @CurrentUser() user: JwtUser,
    @Body(ZodBody(advanceDailySchema)) dto: ReturnType<typeof advanceDailySchema.parse>,
  ) {
    return this.daily.advanceToNextDay(user.id, dto.fromDate);
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
