import { Controller, Get, Query } from '@nestjs/common';
import { LeaderboardScope } from '@placement/shared';
import { Public } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private leaderboard: LeaderboardService) {}

  @Public()
  @Get()
  getTop(
    @Query('scope') scope: LeaderboardScope = LeaderboardScope.GLOBAL,
    @Query('roadmapId') roadmapId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.leaderboard.getTop(scope, { roadmapId, limit: limit ? parseInt(limit, 10) : undefined });
  }

  @Get('me')
  getMe(
    @CurrentUser() user: JwtUser,
    @Query('scope') scope: LeaderboardScope = LeaderboardScope.GLOBAL,
    @Query('roadmapId') roadmapId?: string,
  ) {
    return this.leaderboard.getMyRank(user.id, scope, roadmapId);
  }
}
