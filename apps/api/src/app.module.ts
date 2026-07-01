import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { validateEnv } from './config/env.schema';
import { envFilePathOption } from './config/env-paths';
import { DrizzleModule } from './database/drizzle.module';
import { DrizzleService } from './database/drizzle.service';
import { RedisModule } from './redis/redis.module';
import { RateLimiterService } from './redis/rate-limiter.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RoadmapsModule } from './modules/roadmaps/roadmaps.module';
import { LearningModule } from './modules/learning/learning.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { CommunityModule } from './modules/community/community.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: envFilePathOption(),
    }),
    DrizzleModule,
    RedisModule,
    AuthModule,
    UsersModule,
    RoadmapsModule,
    LearningModule,
    GamificationModule,
    CommunityModule,
    ResourcesModule,
    ModerationModule,
    JobsModule,
  ],
  controllers: [HealthController],
  providers: [
    DrizzleService,
    RateLimiterService,
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
