import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { createReportSchema, ReportStatus, Role } from '@placement/shared';
import { ZodBody } from '../../common/pipes/zod-validation.pipe';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';
import { ModerationService } from './moderation.service';
import { DailyTaskService } from '../learning/learning.service';
import { z } from 'zod';

@Controller()
export class ModerationController {
  constructor(
    private moderation: ModerationService,
    private daily: DailyTaskService,
  ) {}

  @Post('reports')
  createReport(@CurrentUser() user: JwtUser, @Body(ZodBody(createReportSchema)) dto: ReturnType<typeof createReportSchema.parse>) {
    return this.moderation.createReport(user.id, dto);
  }

  @Get('admin/reports')
  @Roles(Role.ADMIN)
  listReports() {
    return this.moderation.listReports();
  }

  @Patch('admin/reports/:id')
  @Roles(Role.ADMIN)
  updateReport(@Param('id') id: string, @Body(ZodBody(z.object({ status: z.nativeEnum(ReportStatus) }))) body: { status: ReportStatus }) {
    return this.moderation.updateReport(id, body.status);
  }

  @Get('admin/messages')
  @Roles(Role.ADMIN)
  listMessages(@Query('type') type?: string) {
    return this.moderation.listMessages(type);
  }

  @Delete('admin/messages/:id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMessage(@CurrentUser() admin: JwtUser, @Param('id') id: string) {
    await this.moderation.deleteMessage(id);
    await this.moderation.auditLog(admin.id, 'DELETE_MESSAGE', 'message', id);
  }

  @Delete('admin/comments/:id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComment(@CurrentUser() admin: JwtUser, @Param('id') id: string) {
    await this.moderation.deleteComment(id);
    await this.moderation.auditLog(admin.id, 'DELETE_COMMENT', 'comment', id);
  }

  @Get('admin/messages/:id/author')
  @Roles(Role.ADMIN)
  async resolveAuthor(@CurrentUser() admin: JwtUser, @Param('id') id: string) {
    const author = await this.moderation.resolveAuthor(id);
    await this.moderation.auditLog(admin.id, 'RESOLVE_ANONYMITY', 'message', id);
    return author;
  }

  @Post('admin/jobs/assign-daily-tasks')
  @Roles(Role.ADMIN)
  async assignDailyTasks() {
    const count = await this.daily.assignForDate(new Date());
    return { assigned: count };
  }
}
