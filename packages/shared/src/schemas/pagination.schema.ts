import { z } from 'zod';
import { LIMITS, ResourceType } from '../types/enums';

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(LIMITS.PAGE_MAX).default(LIMITS.PAGE_DEFAULT),
});
export type PaginationDto = z.infer<typeof paginationSchema>;

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}:${id}`).toString('base64url');
}

export function decodeCursor(cursor: string): { ts: string; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const idx = decoded.lastIndexOf(':');
    if (idx === -1) return null;
    return { ts: decoded.slice(0, idx), id: decoded.slice(idx + 1) };
  } catch {
    return null;
  }
}

export const createResourceSchema = z.object({
  title: z.string().min(3).max(200),
  url: z.string().url(),
  type: z.nativeEnum(ResourceType),
  description: z.string().max(2000).optional(),
  tagIds: z.array(z.string().uuid()).max(5).optional(),
  roadmapIds: z.array(z.string().uuid()).max(5).optional(),
});
export type CreateResourceDto = z.infer<typeof createResourceSchema>;

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  score: number;
  streakCount?: number;
}

export interface LeaderboardMeResponse {
  rank: number | null;
  score: number;
  totalParticipants: number;
}
