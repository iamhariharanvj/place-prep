import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '../src/config/env.schema';
import { envFilePathOption } from '../src/config/env-paths';
import { DrizzleModule } from '../src/database/drizzle.module';
import { DrizzleService } from '../src/database/drizzle.service';
import { DailyTaskService } from '../src/modules/learning/learning.service';
import { toDateString, startOfDayUTC } from '../src/common/utils';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: envFilePathOption(),
    }),
    DrizzleModule,
  ],
  providers: [DailyTaskService, DrizzleService],
})
class AssignDailyModule {}

async function main() {
  const app = await NestFactory.createApplicationContext(AssignDailyModule, {
    logger: ['error', 'log', 'warn'],
  });

  try {
    const daily = app.get(DailyTaskService);
    const today = startOfDayUTC(new Date());
    const count = await daily.assignForDate(today);
    console.log(JSON.stringify({ assigned: count, date: toDateString(today) }, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
