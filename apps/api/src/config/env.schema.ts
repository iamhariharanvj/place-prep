import { z } from 'zod';

/** CORS origin must match the browser Origin header exactly (no trailing slash). */
export function normalizeCorsOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  REFRESH_TOKEN_DAYS: z.coerce.number().default(7),
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:3000')
    .transform(normalizeCorsOrigin),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  RUN_MODE: z.enum(['api', 'worker']).default('api'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const missing = result.error.issues
      .filter((i) => i.code === 'invalid_type' && i.received === 'undefined')
      .map((i) => String(i.path[0]));

    if (missing.length) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}. ` +
          'Add them in Railway → your API service → Variables (or Shared Variables). ' +
          'Local .env is not deployed with Docker.',
      );
    }
    throw result.error;
  }
  return result.data;
}
