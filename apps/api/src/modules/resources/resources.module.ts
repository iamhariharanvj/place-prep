import { Module } from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { ResourcesController } from './resources.controller';
import { DrizzleService } from '../../database/drizzle.service';

@Module({
  controllers: [ResourcesController],
  providers: [ResourcesService, DrizzleService],
  exports: [ResourcesService],
})
export class ResourcesModule {}
