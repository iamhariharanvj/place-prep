import { z } from 'zod';
import { Role } from '../types/enums';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(2).max(64),
  role: z.nativeEnum(Role).optional().default(Role.STUDENT),
  company: z.string().min(2).max(100).optional(),
});
export type RegisterDto = z.infer<typeof registerSchema>;

export const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(64).optional(),
  company: z.string().min(2).max(100).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  college: z.string().min(2).max(100).optional().nullable(),
  linkedinUrl: z.string().max(200).optional().nullable(),
  leetcodeUrl: z.string().max(200).optional().nullable(),
  githubUrl: z.string().max(200).optional().nullable(),
});
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;

export interface UserProfileDto {
  id: string;
  email?: string;
  role: string;
  displayName: string;
  company?: string | null;
  bio?: string | null;
  college?: string | null;
  linkedinUrl?: string | null;
  leetcodeUrl?: string | null;
  githubUrl?: string | null;
  xp: number;
  streakCount: number;
  enrollmentsCount?: number;
  roadmapsCount?: number;
  memberSince?: string | Date;
  createdAt?: string | Date;
}

export interface UserPublicProfileDto {
  id: string;
  role: string;
  displayName: string;
  company?: string | null;
  bio?: string | null;
  college?: string | null;
  linkedinUrl?: string | null;
  leetcodeUrl?: string | null;
  githubUrl?: string | null;
  xp: number;
  streakCount: number;
  enrollmentsCount?: number;
  roadmapsCount?: number;
  memberSince?: string | Date;
}

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const updateAliasSchema = z.object({
  displayName: z.string().min(2).max(64),
});
export type UpdateAliasDto = z.infer<typeof updateAliasSchema>;

export interface UserPublicDto {
  id: string;
  email: string;
  role: string;
  displayName: string;
  company?: string | null;
  xp: number;
  streakCount: number;
}

export interface AuthTokensResponse {
  accessToken: string;
  expiresIn: number;
  user: UserPublicDto;
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}
