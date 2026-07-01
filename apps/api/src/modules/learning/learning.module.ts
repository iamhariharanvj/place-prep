import { Module } from '@nestjs/common';
import { EnrollmentService, ProgressService, DailyTaskService } from './learning.service';
import { LearningController } from './learning.controller';
import { DrizzleService } from '../../database/drizzle.service';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [GamificationModule],
  controllers: [LearningController],
  providers: [EnrollmentService, ProgressService, DailyTaskService, DrizzleService],
  exports: [DailyTaskService, ProgressService, EnrollmentService],
})
export class LearningModule {}
