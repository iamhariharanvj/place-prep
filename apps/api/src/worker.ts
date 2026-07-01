import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  process.env.RUN_MODE = 'worker';
  const app = await NestFactory.createApplicationContext(AppModule);
  console.log('Worker started — processing BullMQ jobs');
  await app.init();
}

bootstrap();
