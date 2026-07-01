import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from './drizzle.module';

@Injectable()
export class DrizzleService {
  constructor(@Inject(DRIZZLE) readonly db: DrizzleDb) {}

  async ping(): Promise<boolean> {
    await this.db.execute(sql`SELECT 1`);
    return true;
  }

  async completeObjective(userId: string, objectiveId: string) {
    const result = await this.db.execute(
      sql`SELECT complete_objective(${userId}, ${objectiveId}) AS data`,
    );
    const row = result[0] as { data: unknown };
    return row.data as Record<string, unknown>;
  }
}
