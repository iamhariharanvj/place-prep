import { pgTable, text, integer, boolean, timestamp, date, jsonb, primaryKey, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('STUDENT'),
  displayName: text('display_name').notNull(),
  company: text('company'),
  bio: text('bio'),
  college: text('college'),
  linkedinUrl: text('linkedin_url'),
  leetcodeUrl: text('leetcode_url'),
  githubUrl: text('github_url'),
  xp: integer('xp').notNull().default(0),
  streakCount: integer('streak_count').notNull().default(0),
  lastActiveDate: timestamp('last_active_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const aliases = pgTable('aliases', {
  id: text('id').primaryKey(),
  displayName: text('display_name').notNull(),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const roadmaps = pgTable('roadmaps', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  published: boolean('published').notNull().default(false),
  carryForward: boolean('carry_forward').notNull().default(true),
  createdById: text('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const modules = pgTable('modules', {
  id: text('id').primaryKey(),
  roadmapId: text('roadmap_id').notNull().references(() => roadmaps.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  order: integer('order').notNull(),
});

export const milestones = pgTable('milestones', {
  id: text('id').primaryKey(),
  moduleId: text('module_id').notNull().references(() => modules.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  order: integer('order').notNull(),
});

export const objectives = pgTable('objectives', {
  id: text('id').primaryKey(),
  milestoneId: text('milestone_id').notNull().references(() => milestones.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type').notNull(),
  xpReward: integer('xp_reward').notNull().default(10),
  order: integer('order').notNull(),
});

export const enrollments = pgTable('enrollments', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roadmapId: text('roadmap_id').notNull().references(() => roadmaps.id, { onDelete: 'cascade' }),
  pace: integer('pace').notNull().default(2),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userRoadmap: uniqueIndex('enrollments_user_roadmap').on(t.userId, t.roadmapId),
}));

export const progress = pgTable('progress', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  objectiveId: text('objective_id').notNull().references(() => objectives.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('NOT_STARTED'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (t) => ({
  userObjective: uniqueIndex('progress_user_objective').on(t.userId, t.objectiveId),
}));

export const dailyTasks = pgTable('daily_tasks', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  objectiveId: text('objective_id').notNull().references(() => objectives.id, { onDelete: 'cascade' }),
  assignedDate: date('assigned_date').notNull(),
  status: text('status').notNull().default('PENDING'),
  carryForward: boolean('carry_forward').notNull().default(false),
}, (t) => ({
  userObjDate: uniqueIndex('daily_tasks_user_obj_date').on(t.userId, t.objectiveId, t.assignedDate),
}));

export const resources = pgTable('resources', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  url: text('url').notNull(),
  type: text('type').notNull(),
  status: text('status').notNull().default('PENDING'),
  description: text('description'),
  submittedById: text('submitted_by_id').notNull().references(() => users.id),
  approvedById: text('approved_by_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tags = pgTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
});

export const resourceTags = pgTable('resource_tags', {
  resourceId: text('resource_id').notNull().references(() => resources.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => ({ pk: primaryKey({ columns: [t.resourceId, t.tagId] }) }));

export const resourceRoadmaps = pgTable('resource_roadmaps', {
  resourceId: text('resource_id').notNull().references(() => resources.id, { onDelete: 'cascade' }),
  roadmapId: text('roadmap_id').notNull().references(() => roadmaps.id, { onDelete: 'cascade' }),
}, (t) => ({ pk: primaryKey({ columns: [t.resourceId, t.roadmapId] }) }));

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  authorId: text('author_id').notNull().references(() => users.id),
  aliasId: text('alias_id').references(() => aliases.id),
  visibility: text('visibility').notNull().default('PUBLIC'),
  voteScore: integer('vote_score').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const questions = pgTable('questions', {
  messageId: text('message_id').primaryKey().references(() => messages.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: text('body').notNull(),
  acceptedAnswerId: text('accepted_answer_id'),
});

export const answers = pgTable('answers', {
  messageId: text('message_id').primaryKey().references(() => messages.id, { onDelete: 'cascade' }),
  questionId: text('question_id').notNull().references(() => questions.messageId, { onDelete: 'cascade' }),
  body: text('body').notNull(),
});

export const notes = pgTable('notes', {
  messageId: text('message_id').primaryKey().references(() => messages.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: text('body').notNull(),
});

export const experiences = pgTable('experiences', {
  messageId: text('message_id').primaryKey().references(() => messages.id, { onDelete: 'cascade' }),
  company: text('company').notNull(),
  role: text('role').notNull(),
  body: text('body').notNull(),
});

export const discussions = pgTable('discussions', {
  messageId: text('message_id').primaryKey().references(() => messages.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: text('body').notNull(),
});

export const votes = pgTable('votes', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  messageId: text('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  value: integer('value').notNull(),
}, (t) => ({
  userMessage: uniqueIndex('votes_user_message').on(t.userId, t.messageId),
}));

export const comments = pgTable('comments', {
  id: text('id').primaryKey(),
  messageId: text('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  authorId: text('author_id').notNull().references(() => users.id),
  aliasId: text('alias_id').references(() => aliases.id),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const messageTags = pgTable('message_tags', {
  messageId: text('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => ({ pk: primaryKey({ columns: [t.messageId, t.tagId] }) }));

export const reports = pgTable('reports', {
  id: text('id').primaryKey(),
  messageId: text('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  reporterId: text('reporter_id').notNull().references(() => users.id),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('OPEN'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  adminId: text('admin_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  payload: jsonb('payload').notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const outboxEvents = pgTable('outbox_events', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  status: text('status').notNull().default('PENDING'),
  attempts: integer('attempts').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
});

export const schema = {
  users, aliases, refreshTokens, roadmaps, modules, milestones, objectives,
  enrollments, progress, dailyTasks, resources, tags, resourceTags, resourceRoadmaps,
  messages, questions, answers, notes, experiences, discussions, votes, comments,
  messageTags, reports, auditLogs, notifications, outboxEvents,
};

export type Db = typeof schema;
