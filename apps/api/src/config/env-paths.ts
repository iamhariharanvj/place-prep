import { existsSync } from 'fs';
import { resolve } from 'path';

/** Resolve monorepo root `.env` (works from apps/api in dev and dist/src in prod). */
export function resolveEnvFilePaths(): string[] {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../.env'),
    resolve(__dirname, '../../../.env'),
    resolve(__dirname, '../../../../.env'),
  ];
  return [...new Set(candidates.filter((p) => existsSync(p)))];
}

export function envFilePathOption(): string | string[] {
  const paths = resolveEnvFilePaths();
  return paths.length ? paths : resolve(process.cwd(), '../../.env');
}
