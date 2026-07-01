import { Global, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { schema } from './schema';

export const DRIZZLE = Symbol('DRIZZLE');

export type DrizzleDb = PostgresJsDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.getOrThrow<string>('DATABASE_URL');
        const client = postgres(url, { max: 10 });
        return drizzle(client, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DrizzleModule implements OnModuleDestroy {
  constructor(private config: ConfigService) {}

  async onModuleDestroy() {
    // postgres client cleanup handled by process exit
  }
}
