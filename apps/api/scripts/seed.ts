import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../../.env') });

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const isSupabase = url.includes('supabase.co');
  const sql = postgres(url, {
    max: 1,
    ssl: isSupabase ? 'require' : undefined,
    connect_timeout: 15,
  });
  const passwordHash = await bcrypt.hash('password123', 12);

  const adminId = randomUUID();
  const mentorId = randomUUID();
  const studentId = randomUUID();
  const roadmapId = randomUUID();
  const moduleId = randomUUID();
  const milestoneId = randomUUID();

  await sql`
    INSERT INTO users (
      id, email, password_hash, role, display_name, company,
      bio, college, linkedin_url, leetcode_url, github_url,
      xp, streak_count
    )
    VALUES
      (
        ${adminId}, 'admin@placement.dev', ${passwordHash}, 'ADMIN', 'Admin User', NULL,
        NULL, NULL, NULL, NULL, NULL,
        500, 5
      ),
      (
        ${mentorId}, 'mentor@placement.dev', ${passwordHash}, 'MENTOR', 'Mentor User', 'Zoho',
        'Senior engineer helping students crack product company interviews.',
        NULL,
        'https://linkedin.com/in/mentor-user',
        'mentor_user',
        'mentor-user',
        300, 3
      ),
      (
        ${studentId}, 'student@placement.dev', ${passwordHash}, 'STUDENT', 'Student User', NULL,
        'Final-year CS student preparing for SDE roles. DSA + system design.',
        'IIT Madras',
        'https://linkedin.com/in/student-user',
        'student_user',
        'student-user',
        120, 2
      )
    ON CONFLICT (email) DO NOTHING
  `;

  await sql`
    UPDATE users SET
      bio = 'Senior engineer helping students crack product company interviews.',
      linkedin_url = 'https://linkedin.com/in/mentor-user',
      leetcode_url = 'mentor_user',
      github_url = 'mentor-user',
      company = 'Zoho'
    WHERE email = 'mentor@placement.dev'
  `;
  await sql`
    UPDATE users SET
      bio = 'Final-year CS student preparing for SDE roles. DSA + system design.',
      college = 'IIT Madras',
      linkedin_url = 'https://linkedin.com/in/student-user',
      leetcode_url = 'student_user',
      github_url = 'student-user'
    WHERE email = 'student@placement.dev'
  `;

  for (const [uid, name] of [[adminId, 'Admin_Anon'], [mentorId, 'Mentor_Anon'], [studentId, 'Student_Anon']] as const) {
    await sql`
      INSERT INTO aliases (id, user_id, display_name)
      VALUES (${randomUUID()}, ${uid}, ${name})
      ON CONFLICT (user_id) DO NOTHING
    `;
  }

  await sql`
    INSERT INTO roadmaps (id, title, slug, description, published, carry_forward)
    VALUES (${roadmapId}, 'Full Stack Interview Prep', 'full-stack-prep',
      'Structured roadmap for placement preparation', true, true)
    ON CONFLICT (slug) DO NOTHING
  `;

  const [roadmap] = await sql`SELECT id FROM roadmaps WHERE slug = 'full-stack-prep' LIMIT 1`;
  const rid = roadmap?.id ?? roadmapId;

  await sql`
    INSERT INTO modules (id, roadmap_id, title, "order")
    VALUES (${moduleId}, ${rid}, 'Week 1 — Foundations', 1)
    ON CONFLICT DO NOTHING
  `;

  const [mod] = await sql`SELECT id FROM modules WHERE roadmap_id = ${rid} LIMIT 1`;
  const mid = mod?.id ?? moduleId;

  await sql`
    INSERT INTO milestones (id, module_id, title, "order")
    VALUES (${milestoneId}, ${mid}, 'Data Structures Basics', 1)
    ON CONFLICT DO NOTHING
  `;

  const [ms] = await sql`SELECT id FROM milestones WHERE module_id = ${mid} LIMIT 1`;
  const msid = ms?.id ?? milestoneId;

  const objectives = [
    { title: 'Read Arrays & Hashing guide', type: 'READ', xp: 10, order: 1 },
    { title: 'Solve 5 Easy array problems', type: 'PRACTICE', xp: 20, order: 2 },
    { title: 'Take DS fundamentals quiz', type: 'QUIZ', xp: 15, order: 3 },
    { title: 'Build a todo CLI project', type: 'PROJECT', xp: 30, order: 4 },
    { title: 'Mock interview: arrays', type: 'MOCK_INTERVIEW', xp: 25, order: 5 },
  ];

  for (const obj of objectives) {
    await sql`
      INSERT INTO objectives (id, milestone_id, title, type, xp_reward, "order")
      VALUES (${randomUUID()}, ${msid}, ${obj.title}, ${obj.type}, ${obj.xp}, ${obj.order})
      ON CONFLICT DO NOTHING
    `;
  }

  await sql`
    INSERT INTO enrollments (id, user_id, roadmap_id, pace)
    VALUES (${randomUUID()}, ${studentId}, ${rid}, 2)
    ON CONFLICT (user_id, roadmap_id) DO NOTHING
  `;

  const tagId = randomUUID();
  await sql`INSERT INTO tags (id, name) VALUES (${tagId}, 'javascript') ON CONFLICT (name) DO NOTHING`;

  const resourceId = randomUUID();
  await sql`
    INSERT INTO resources (id, title, url, type, status, submitted_by_id, approved_by_id, description)
    VALUES (${resourceId}, 'MDN JavaScript Guide', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
      'ARTICLE', 'APPROVED', ${mentorId}, ${mentorId}, 'Official JS reference')
    ON CONFLICT DO NOTHING
  `;

  const qMsgId = randomUUID();
  await sql`
    INSERT INTO messages (id, type, author_id, visibility)
    VALUES (${qMsgId}, 'QUESTION', ${studentId}, 'PUBLIC')
  `;
  await sql`
    INSERT INTO questions (message_id, title, body)
    VALUES (${qMsgId}, 'How should I approach system design prep?', 'I am confused about where to start for system design interviews. What topics and resources would you recommend?')
  `;

  const expMsgId = randomUUID();
  await sql`
    INSERT INTO messages (id, type, author_id, visibility)
    VALUES (${expMsgId}, 'EXPERIENCE', ${mentorId}, 'PUBLIC')
  `;
  await sql`
    INSERT INTO experiences (message_id, company, role, body)
    VALUES (
      ${expMsgId},
      'Zoho',
      'SDE',
      'Three rounds: online test, technical (DSA + projects), and HR. Focus on arrays, trees, and explaining your project architecture clearly.'
    )
  `;

  const expMsgId2 = randomUUID();
  await sql`
    INSERT INTO messages (id, type, author_id, visibility)
    VALUES (${expMsgId2}, 'EXPERIENCE', ${studentId}, 'PUBLIC')
  `;
  await sql`
    INSERT INTO experiences (message_id, company, role, body)
    VALUES (
      ${expMsgId2},
      'Google',
      'SDE Intern',
      'Phone screen on easy-medium LeetCode. Onsite had two coding rounds and one googliness. Practice communicating your thought process out loud.'
    )
  `;

  await sql.end();
  console.log('Seed complete. Demo accounts (password: password123):');
  console.log('  admin@placement.dev (ADMIN)');
  console.log('  mentor@placement.dev (MENTOR)');
  console.log('  student@placement.dev (STUDENT)');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
