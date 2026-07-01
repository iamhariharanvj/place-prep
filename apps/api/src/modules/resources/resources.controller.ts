import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { createResourceSchema, Role } from '@placement/shared';
import { ZodBody } from '../../common/pipes/zod-validation.pipe';
import { Public, Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';
import { ResourcesService } from './resources.service';

@Controller('resources')
export class ResourcesController {
  constructor(private resources: ResourcesService) {}

  @Public()
  @Get()
  list(@Query('type') type?: string, @Query('tag') tag?: string, @Query('roadmapId') roadmapId?: string, @Query('q') q?: string) {
    return this.resources.list({ type, tag, roadmapId, q });
  }

  @Post()
  create(@CurrentUser() user: JwtUser, @Body(ZodBody(createResourceSchema)) dto: ReturnType<typeof createResourceSchema.parse>) {
    return this.resources.create(user.id, dto);
  }

  @Patch(':id/approve')
  @Roles(Role.MENTOR, Role.ADMIN)
  approve(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.resources.approve(id, user.id);
  }

  @Patch(':id/reject')
  @Roles(Role.MENTOR, Role.ADMIN)
  reject(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.resources.reject(id, user.id);
  }
}
