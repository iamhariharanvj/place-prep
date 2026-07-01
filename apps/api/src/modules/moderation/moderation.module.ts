import { Module } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { ModerationController } from './moderation.controller';
import { DrizzleService } from '../../database/drizzle.service';
import { LearningModule } from '../learning/learning.module';

@Module({
  imports: [LearningModule],
  controllers: [ModerationController],
  providers: [ModerationService, DrizzleService],
  exports: [ModerationService],
})
export class ModerationModule {}
