import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  REFRESH_TOKEN_DAYS: z.coerce.number().default(7),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  RUN_MODE: z.enum(['api', 'worker']).default('api'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  return envSchema.parse(config);
}
