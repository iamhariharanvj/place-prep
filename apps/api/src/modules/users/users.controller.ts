import { Controller, Get, Patch, Body, Param, HttpCode } from '@nestjs/common';
import { updateAliasSchema, updateProfileSchema } from '@placement/shared';
import { ZodBody } from '../../common/pipes/zod-validation.pipe';
import { Public } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: JwtUser) {
    return this.users.getProfile(user.id);
  }

  @Patch('me/profile')
  updateProfile(@CurrentUser() user: JwtUser, @Body(ZodBody(updateProfileSchema)) dto: ReturnType<typeof updateProfileSchema.parse>) {
    return this.users.updateProfile(user.id, dto);
  }

  @Public()
  @Get('users/:id')
  getPublicProfile(@Param('id') id: string) {
    return this.users.getPublicProfile(id);
  }

  @Patch('me/alias')
  updateAlias(@CurrentUser() user: JwtUser, @Body(ZodBody(updateAliasSchema)) dto: ReturnType<typeof updateAliasSchema.parse>) {
    return this.users.updateAlias(user.id, dto);
  }

  @Get('me/notifications')
  getNotifications(@CurrentUser() user: JwtUser) {
    return this.users.getNotifications(user.id);
  }

  @Patch('me/notifications/:id/read')
  @HttpCode(204)
  markRead(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.users.markNotificationRead(user.id, id);
  }
}
