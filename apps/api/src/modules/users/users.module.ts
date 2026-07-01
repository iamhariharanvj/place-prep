import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DrizzleService } from '../../database/drizzle.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, DrizzleService],
  exports: [UsersService],
})
export class UsersModule {}
