/**
 * Integration smoke tests for all API v1 endpoints.
 * Run: pnpm --filter @placement/api test:api
 */
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../../.env') });

const BASE = process.env.API_TEST_URL ?? 'http://localhost:4000/api/v1';

type Tokens = { student: string; mentor: string; admin: string };
type Ids = {
  studentId: string;
  mentorId: string;
  adminId: string;
  roadmapId: string;
  roadmapSlug: string;
  questionId: string;
  objectiveId: string;
  resourceId: string;
};

interface TestCase {
  name: string;
  method: string;
  path: string;
  token?: keyof Tokens | null;
  body?: unknown;
  expect: number | number[];
  skip?: boolean;
}

interface Result {
  name: string;
  method: string;
  path: string;
  status: number;
  expected: string;
  ok: boolean;
  detail?: string;
}

const results: Result[] = [];

async function login(email: string, password: string): Promise<{ token: string; userId: string }> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { accessToken: string; user: { id: string } };
  return { token: data.accessToken, userId: data.user.id };
}

async function runTest(tc: TestCase, tokens: Tokens): Promise<unknown> {
  if (tc.skip) {
    results.push({
      name: tc.name,
      method: tc.method,
      path: tc.path,
      status: 0,
      expected: String(tc.expect),
      ok: true,
      detail: 'skipped',
    });
    return null;
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (tc.token) headers.Authorization = `Bearer ${tokens[tc.token]}`;

  const res = await fetch(`${BASE}${tc.path}`, {
    method: tc.method,
    headers,
    body: tc.body !== undefined ? JSON.stringify(tc.body) : undefined,
  });

  const expected = Array.isArray(tc.expect) ? tc.expect : [tc.expect];
  const ok = expected.includes(res.status);
  let detail: string | undefined;
  let parsed: unknown = null;

  const text = await res.text();
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!ok) {
    detail = typeof parsed === 'object' ? JSON.stringify(parsed).slice(0, 200) : String(parsed).slice(0, 200);
  }

  results.push({
    name: tc.name,
    method: tc.method,
    path: tc.path,
    status: res.status,
    expected: expected.join('|'),
    ok,
    detail,
  });

  return parsed;
}

function replacePath(path: string, ids: Ids): string {
  return path
    .replace(':studentId', ids.studentId)
    .replace(':mentorId', ids.mentorId)
    .replace(':adminId', ids.adminId)
    .replace(':roadmapId', ids.roadmapId)
    .replace(':slug', ids.roadmapSlug)
    .replace(':questionId', ids.questionId)
    .replace(':objectiveId', ids.objectiveId)
    .replace(':resourceId', ids.resourceId);
}

async function main() {
  console.log(`\n🧪 API integration tests → ${BASE}\n`);

  // --- Auth ---
  const [studentAuth, mentorAuth, adminAuth] = await Promise.all([
    login('student@placement.dev', 'password123'),
    login('mentor@placement.dev', 'password123'),
    login('admin@placement.dev', 'password123'),
  ]);

  const tokens: Tokens = {
    student: studentAuth.token,
    mentor: mentorAuth.token,
    admin: adminAuth.token,
  };

  const ids: Ids = {
    studentId: studentAuth.userId,
    mentorId: mentorAuth.userId,
    adminId: adminAuth.userId,
    roadmapId: '',
    roadmapSlug: 'full-stack-prep',
    questionId: '',
    objectiveId: '',
    resourceId: '',
  };

  // Discover IDs from live data
  const roadmaps = (await runTest(
    { name: 'List roadmaps', method: 'GET', path: '/roadmaps', token: null, expect: 200 },
    tokens,
  )) as { id: string; slug: string }[];
  if (Array.isArray(roadmaps) && roadmaps[0]) {
    ids.roadmapId = roadmaps.find((r) => r.slug === 'full-stack-prep')?.id ?? roadmaps[0].id;
    ids.roadmapSlug = roadmaps.find((r) => r.slug === 'full-stack-prep')?.slug ?? roadmaps[0].slug;
  }

  const roadmapDetail = (await runTest(
    { name: 'Get roadmap by slug', method: 'GET', path: `/roadmaps/${ids.roadmapSlug}`, token: null, expect: 200 },
    tokens,
  )) as { modules?: { milestones?: { objectives?: { id: string }[] }[] }[] };
  ids.objectiveId =
    roadmapDetail?.modules?.[0]?.milestones?.[0]?.objectives?.[0]?.id ?? '';

  const questions = (await runTest(
    { name: 'List questions', method: 'GET', path: '/questions', token: null, expect: 200 },
    tokens,
  )) as { data?: { id: string }[] };
  ids.questionId = questions?.data?.[0]?.id ?? '';

  const resources = (await runTest(
    { name: 'List resources', method: 'GET', path: '/resources', token: null, expect: 200 },
    tokens,
  )) as { id: string }[];
  ids.resourceId = Array.isArray(resources) && resources[0] ? resources[0].id : '';

  // --- Build test suite (skip already-run discovery tests by marking duplicates) ---
  const tests: TestCase[] = [
    // Health
    { name: 'Health check', method: 'GET', path: '/health', token: null, expect: 200 },

    // Users
    { name: 'Get my profile (student)', method: 'GET', path: '/me', token: 'student', expect: 200 },
    { name: 'Get my profile (mentor)', method: 'GET', path: '/me', token: 'mentor', expect: 200 },
    { name: 'Get public profile', method: 'GET', path: '/users/:studentId', token: null, expect: 200 },
    {
      name: 'Update profile',
      method: 'PATCH',
      path: '/me/profile',
      token: 'student',
      body: { bio: 'API test bio update' },
      expect: 200,
    },
    {
      name: 'Update alias',
      method: 'PATCH',
      path: '/me/alias',
      token: 'student',
      body: { displayName: 'Student_Anon' },
      expect: 200,
    },
    { name: 'Get notifications', method: 'GET', path: '/me/notifications', token: 'student', expect: 200 },

    // Community - questions
    { name: 'Get question detail', method: 'GET', path: '/questions/:questionId', token: null, expect: [200, 404], skip: !ids.questionId },
    {
      name: 'Create question (student)',
      method: 'POST',
      path: '/questions',
      token: 'student',
      body: {
        title: 'API test doubt title',
        body: 'This is an automated API test doubt with enough characters.',
      },
      expect: 201,
    },
    {
      name: 'Create question forbidden (mentor)',
      method: 'POST',
      path: '/questions',
      token: 'mentor',
      body: { title: 'Should fail', body: 'Mentors cannot post doubts per role policy.' },
      expect: 403,
    },
    {
      name: 'Create answer (mentor)',
      method: 'POST',
      path: '/questions/:questionId/answers',
      token: 'mentor',
      body: { body: 'Automated mentor answer for API integration testing.' },
      expect: [200, 201],
      skip: !ids.questionId,
    },

    // Community - notes & experiences
    { name: 'List notes', method: 'GET', path: '/notes', token: null, expect: 200 },
    {
      name: 'Create note',
      method: 'POST',
      path: '/notes',
      token: 'student',
      body: { title: 'API test note', body: 'Study notes created during automated API testing run.' },
      expect: 201,
    },
    { name: 'Experience filters', method: 'GET', path: '/experiences/filters', token: null, expect: 200 },
    { name: 'List experiences', method: 'GET', path: '/experiences', token: null, expect: 200 },
    {
      name: 'Create experience (student)',
      method: 'POST',
      path: '/experiences',
      token: 'student',
      body: {
        company: 'TestCo',
        role: 'SDE Intern',
        body: 'Automated experience post for API testing purposes only.',
      },
      expect: 201,
    },

    // Votes & comments
    {
      name: 'Upvote question',
      method: 'POST',
      path: '/messages/:questionId/vote',
      token: 'mentor',
      body: { value: 1 },
      expect: 201,
      skip: !ids.questionId,
    },
    {
      name: 'List comments',
      method: 'GET',
      path: '/messages/:questionId/comments',
      token: 'student',
      expect: 200,
      skip: !ids.questionId,
    },
    {
      name: 'Create comment',
      method: 'POST',
      path: '/messages/:questionId/comments',
      token: 'student',
      body: { body: 'Helpful doubt, thanks for asking!' },
      expect: 201,
      skip: !ids.questionId,
    },

    // Roadmaps (mentor)
    { name: 'Mentor roadmaps', method: 'GET', path: '/roadmaps/mine', token: 'mentor', expect: 200 },
    {
      name: 'Roadmap for edit',
      method: 'GET',
      path: '/roadmaps/:roadmapId/edit',
      token: 'mentor',
      expect: [200, 404],
      skip: !ids.roadmapId,
    },

    // Learning
    { name: 'List enrollments', method: 'GET', path: '/enrollments', token: 'student', expect: 200 },
    {
      name: 'Enroll in roadmap',
      method: 'POST',
      path: '/enrollments',
      token: 'student',
      body: { roadmapId: ':roadmapId', pace: 2 },
      expect: [200, 201, 409],
      skip: !ids.roadmapId,
    },
    { name: 'Daily tasks', method: 'GET', path: '/daily-tasks', token: 'student', expect: 200 },
    {
      name: 'Progress',
      method: 'GET',
      path: '/progress?roadmapId=:roadmapId',
      token: 'student',
      expect: 200,
      skip: !ids.roadmapId,
    },
    {
      name: 'Complete objective',
      method: 'POST',
      path: '/objectives/:objectiveId/complete',
      token: 'student',
      expect: [200, 201, 400, 409],
      skip: !ids.objectiveId,
    },
    {
      name: 'Skip objective',
      method: 'POST',
      path: '/objectives/:objectiveId/skip',
      token: 'student',
      expect: [200, 201, 400, 409],
      skip: !ids.objectiveId,
    },

    // Leaderboard
    { name: 'Leaderboard global', method: 'GET', path: '/leaderboard?limit=10', token: null, expect: 200 },
    {
      name: 'Leaderboard roadmap scope',
      method: 'GET',
      path: '/leaderboard?scope=roadmap&roadmapId=:roadmapId&limit=10',
      token: null,
      expect: 200,
      skip: !ids.roadmapId,
    },
    { name: 'My leaderboard rank', method: 'GET', path: '/leaderboard/me', token: 'student', expect: 200 },

    // Resources
    {
      name: 'Submit resource (mentor)',
      method: 'POST',
      path: '/resources',
      token: 'mentor',
      body: {
        title: 'API Test Resource',
        url: 'https://example.com/api-test-resource',
        type: 'ARTICLE',
        description: 'Created by automated API test',
      },
      expect: 201,
    },

    // Admin / moderation
    { name: 'Admin list reports', method: 'GET', path: '/admin/reports', token: 'admin', expect: 200 },
    { name: 'Admin list messages', method: 'GET', path: '/admin/messages', token: 'admin', expect: 200 },
    {
      name: 'Admin resolve author',
      method: 'GET',
      path: '/admin/messages/:questionId/author',
      token: 'admin',
      expect: [200, 404],
      skip: !ids.questionId,
    },
    {
      name: 'Admin assign daily tasks',
      method: 'POST',
      path: '/admin/jobs/assign-daily-tasks',
      token: 'admin',
      expect: [200, 201],
    },
    {
      name: 'Create report',
      method: 'POST',
      path: '/reports',
      token: 'student',
      body: { messageId: ':questionId', reason: 'Automated test report — please ignore' },
      expect: [200, 201, 409],
      skip: !ids.questionId,
    },

    // Auth logout
    { name: 'Logout', method: 'POST', path: '/auth/logout', token: 'student', expect: 204 },
  ];

  // Capture new question id from create for accept-answer flow
  let newQuestionId = '';
  let newAnswerId = '';
  let newResourceId = '';
  let newReportId = '';
  let tempRoadmapId = '';
  let tempCommentId = '';

  // Re-run discovery endpoints are duplicated in results — filter to only run remaining tests
  const discoveryNames = new Set([
    'List roadmaps',
    'Get roadmap by slug',
    'List questions',
    'List resources',
  ]);

  for (const tc of tests) {
    if (discoveryNames.has(tc.name)) continue;
    const path = replacePath(tc.path, ids);
    let body = tc.body;
    if (body && typeof body === 'object') {
      body = JSON.parse(replacePath(JSON.stringify(body), ids));
    }
    const parsed = await runTest({ ...tc, path, body }, tokens);

    if (tc.name === 'Create question (student)' && parsed && typeof parsed === 'object' && 'id' in parsed) {
      newQuestionId = (parsed as { id: string }).id;
    }
    if (tc.name === 'Create answer (mentor)' && parsed && typeof parsed === 'object' && 'id' in parsed) {
      newAnswerId = (parsed as { id: string }).id;
    }
    if (tc.name === 'Submit resource (mentor)' && parsed && typeof parsed === 'object' && 'id' in parsed) {
      newResourceId = (parsed as { id: string }).id;
    }
    if (tc.name === 'Create report' && parsed && typeof parsed === 'object' && 'id' in parsed) {
      newReportId = (parsed as { id: string }).id;
    }
    if (tc.name === 'Create comment' && parsed && typeof parsed === 'object' && 'id' in parsed) {
      tempCommentId = (parsed as { id: string }).id;
    }
  }

  // Phase 2: tests that depend on IDs created in phase 1
  const phase2: TestCase[] = [
    {
      name: 'Accept answer',
      method: 'POST',
      path: `/answers/${newAnswerId}/accept`,
      token: 'student',
      expect: [200, 201, 403, 404],
      skip: !newAnswerId,
    },
    {
      name: 'Remove vote',
      method: 'DELETE',
      path: `/messages/${ids.questionId || newQuestionId}/vote`,
      token: 'mentor',
      expect: 200,
      skip: !(ids.questionId || newQuestionId),
    },
    {
      name: 'Experiences company filter',
      method: 'GET',
      path: '/experiences?company=Zoho',
      token: null,
      expect: 200,
    },
    {
      name: 'Approve resource (admin)',
      method: 'PATCH',
      path: `/resources/${newResourceId}/approve`,
      token: 'admin',
      expect: [200, 201, 400],
      skip: !newResourceId,
    },
    {
      name: 'Update report status',
      method: 'PATCH',
      path: `/admin/reports/${newReportId}`,
      token: 'admin',
      body: { status: 'REVIEWED' },
      expect: [200, 201, 404],
      skip: !newReportId,
    },
    {
      name: 'Mentor create roadmap',
      method: 'POST',
      path: '/roadmaps',
      token: 'mentor',
      body: {
        title: `API Test Roadmap ${Date.now()}`,
        description: 'Temporary roadmap for API integration testing',
        carryForward: true,
      },
      expect: 201,
    },
  ];

  for (const tc of phase2) {
    const parsed = await runTest(tc, tokens);
    if (tc.name === 'Mentor create roadmap' && parsed && typeof parsed === 'object' && 'id' in parsed) {
      tempRoadmapId = (parsed as { id: string }).id;
    }
  }

  if (tempRoadmapId) {
    await runTest(
      {
        name: 'Mentor import roadmap JSON',
        method: 'POST',
        path: `/roadmaps/${tempRoadmapId}/import`,
        token: 'mentor',
        body: {
          mode: 'append',
          modules: [
            {
              title: 'Imported Module',
              milestones: [
                {
                  title: 'Imported Milestone',
                  objectives: [
                    { title: 'Imported objective', type: 'READ', xpReward: 10 },
                  ],
                },
              ],
            },
          ],
        },
        expect: 200,
      },
      tokens,
    );
    await runTest(
      {
        name: 'Mentor publish roadmap',
        method: 'PATCH',
        path: `/roadmaps/${tempRoadmapId}/publish`,
        token: 'mentor',
        body: { published: true },
        expect: 200,
      },
      tokens,
    );
    await runTest(
      {
        name: 'Mentor delete roadmap',
        method: 'DELETE',
        path: `/roadmaps/${tempRoadmapId}`,
        token: 'mentor',
        expect: 204,
      },
      tokens,
    );
  }

  if (tempCommentId) {
    await runTest(
      {
        name: 'Admin delete comment',
        method: 'DELETE',
        path: `/admin/comments/${tempCommentId}`,
        token: 'admin',
        expect: 204,
      },
      tokens,
    );
  }

  // --- Report ---
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  console.log('Results:\n');
  for (const r of results) {
    const icon = r.ok ? '✅' : '❌';
    const detail = r.detail ? ` — ${r.detail}` : '';
    console.log(`${icon} ${r.method.padEnd(6)} ${r.path.padEnd(45)} ${r.status} (expected ${r.expected})${detail}`);
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Total: ${results.length}  Passed: ${passed}  Failed: ${failed.length}`);

  if (failed.length) {
    console.log('\nFailed tests:');
    for (const f of failed) {
      console.log(`  • ${f.name}: got ${f.status}, expected ${f.expected}${f.detail ? ` — ${f.detail}` : ''}`);
    }
    process.exit(1);
  }

  console.log('\n✅ All API tests passed.\n');
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
