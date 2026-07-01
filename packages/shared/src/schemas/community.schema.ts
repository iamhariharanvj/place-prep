import { z } from 'zod';
import { Visibility } from '../types/enums';

export const createQuestionSchema = z.object({
  title: z.string().min(5).max(200),
  body: z.string().min(10).max(10000),
  visibility: z.nativeEnum(Visibility).default(Visibility.PUBLIC),
  tagIds: z.array(z.string().uuid()).max(5).optional(),
});
export type CreateQuestionDto = z.infer<typeof createQuestionSchema>;

export const createAnswerSchema = z.object({
  body: z.string().min(10).max(10000),
  visibility: z.nativeEnum(Visibility).default(Visibility.PUBLIC),
});
export type CreateAnswerDto = z.infer<typeof createAnswerSchema>;

export const createNoteSchema = z.object({
  title: z.string().min(5).max(200),
  body: z.string().min(10).max(10000),
  visibility: z.nativeEnum(Visibility).default(Visibility.PUBLIC),
  tagIds: z.array(z.string().uuid()).max(5).optional(),
});
export type CreateNoteDto = z.infer<typeof createNoteSchema>;

export const createExperienceSchema = z.object({
  company: z.string().min(1).max(100),
  role: z.string().min(1).max(100),
  body: z.string().min(10).max(10000),
  visibility: z.nativeEnum(Visibility).default(Visibility.PUBLIC),
  tagIds: z.array(z.string().uuid()).max(5).optional(),
});
export type CreateExperienceDto = z.infer<typeof createExperienceSchema>;

export const listExperiencesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  company: z.string().min(1).max(100).optional(),
  role: z.string().min(1).max(100).optional(),
});
export type ListExperiencesQuery = z.infer<typeof listExperiencesQuerySchema>;

export interface ExperienceTagDto {
  type: 'company' | 'role';
  label: string;
}

export interface ExperienceFilterOption {
  label: string;
  count: number;
}

export const voteSchema = z.object({
  value: z.union([z.literal(1), z.literal(-1)]),
});
export type VoteDto = z.infer<typeof voteSchema>;

export const createCommentSchema = z.object({
  body: z.string().min(1).max(2000),
  visibility: z.nativeEnum(Visibility).default(Visibility.PUBLIC),
});
export type CreateCommentDto = z.infer<typeof createCommentSchema>;

export const createReportSchema = z.object({
  messageId: z.string().uuid(),
  reason: z.string().min(5).max(500),
});
export type CreateReportDto = z.infer<typeof createReportSchema>;

export interface PublicAuthorDto {
  displayName: string;
  isAnonymous: boolean;
}

export interface VoteResult {
  score: number;
  userVote: 1 | -1 | null;
}
