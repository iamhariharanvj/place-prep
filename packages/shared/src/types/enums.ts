export enum Role {
  STUDENT = 'STUDENT',
  MENTOR = 'MENTOR',
  ADMIN = 'ADMIN',
}

export enum ObjectiveType {
  READ = 'READ',
  PRACTICE = 'PRACTICE',
  QUIZ = 'QUIZ',
  PROJECT = 'PROJECT',
  MOCK_INTERVIEW = 'MOCK_INTERVIEW',
}

export enum ProgressStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

export enum DailyTaskStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

export enum ResourceType {
  ARTICLE = 'ARTICLE',
  VIDEO = 'VIDEO',
  PDF = 'PDF',
  REPO = 'REPO',
}

export enum ResourceStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum MessageType {
  QUESTION = 'QUESTION',
  ANSWER = 'ANSWER',
  NOTE = 'NOTE',
  EXPERIENCE = 'EXPERIENCE',
  DISCUSSION = 'DISCUSSION',
}

export enum MessageCapability {
  VOTABLE = 'VOTABLE',
  COMMENTABLE = 'COMMENTABLE',
  TAGGABLE = 'TAGGABLE',
}

export enum Visibility {
  PUBLIC = 'PUBLIC',
  SEMI_ANONYMOUS = 'SEMI_ANONYMOUS',
  PRIVATE = 'PRIVATE',
}

export enum ReportStatus {
  OPEN = 'OPEN',
  REVIEWED = 'REVIEWED',
  DISMISSED = 'DISMISSED',
}

export enum LeaderboardScope {
  GLOBAL = 'global',
  ROADMAP = 'roadmap',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum NotificationType {
  DAILY_TASK = 'DAILY_TASK',
  RESOURCE_APPROVED = 'RESOURCE_APPROVED',
  RESOURCE_REJECTED = 'RESOURCE_REJECTED',
  ANSWER_ACCEPTED = 'ANSWER_ACCEPTED',
}

export const VOTABLE_TYPES: ReadonlySet<MessageType> = new Set([
  MessageType.QUESTION,
  MessageType.ANSWER,
  MessageType.NOTE,
  MessageType.EXPERIENCE,
]);

export const COMMENTABLE_TYPES: ReadonlySet<MessageType> = new Set([
  MessageType.QUESTION,
  MessageType.NOTE,
  MessageType.EXPERIENCE,
  MessageType.DISCUSSION,
]);

export const LIMITS = {
  PACE_MIN: 1,
  PACE_MAX: 10,
  CARRY_FORWARD_MAX: 3,
  POSTS_PER_HOUR: 10,
  VOTES_PER_HOUR: 60,
  AUTH_PER_MINUTE: 5,
  PAGE_DEFAULT: 20,
  PAGE_MAX: 50,
  LEADERBOARD_TOP_N: 100,
} as const;

export const JWT = {
  ACCESS_TTL: '15m',
  REFRESH_TTL_DAYS: 7,
} as const;
