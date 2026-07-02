import { z } from 'zod';
import { LIMITS } from '../types/enums';

export const enrollSchema = z.object({
  roadmapId: z.string().uuid(),
  pace: z.number().int().min(LIMITS.PACE_MIN).max(LIMITS.PACE_MAX).default(2),
});
export type EnrollDto = z.infer<typeof enrollSchema>;

export const updateEnrollmentPaceSchema = z.object({
  pace: z.number().int().min(LIMITS.PACE_MIN).max(LIMITS.PACE_MAX),
});
export type UpdateEnrollmentPaceDto = z.infer<typeof updateEnrollmentPaceSchema>;

export const completeObjectiveSchema = z.object({
  objectiveId: z.string().uuid(),
});

export interface DailyTaskDto {
  id: string;
  objectiveId: string;
  milestoneId: string;
  milestoneTitle: string;
  title: string;
  description: string | null;
  type: string;
  xpReward: number;
  status: string;
  carryForward: boolean;
  roadmap: { id: string; title: string; slug: string };
}

export const advanceDailySchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type AdvanceDailyDto = z.infer<typeof advanceDailySchema>;

export interface EnrollmentDto {
  id: string;
  userId: string;
  roadmapId: string;
  pace: number;
  startedAt: string;
}

export interface CompleteObjectiveResponse {
  progress: { objectiveId: string; status: string; completedAt: string };
  xpAwarded: number;
  user: { xp: number; streakCount: number };
  roadmapId: string;
}
