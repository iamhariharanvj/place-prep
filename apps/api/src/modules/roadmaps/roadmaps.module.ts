import { Module } from '@nestjs/common';
import { RoadmapsService } from './roadmaps.service';
import { RoadmapsController } from './roadmaps.controller';
import { DrizzleService } from '../../database/drizzle.service';

@Module({
  controllers: [RoadmapsController],
  providers: [RoadmapsService, DrizzleService],
  exports: [RoadmapsService],
})
export class RoadmapsModule {}
