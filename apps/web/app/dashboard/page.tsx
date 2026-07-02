'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

type Task = { id: string; objectiveId: string; title: string; type: string; xpReward: number; status: string };

const TYPE_BADGE: Record<string, string> = {
  READ: 'badge-indigo', PRACTICE: 'badge-green', QUIZ: 'badge-amber',
  PROJECT: 'badge-red', MOCK_INTERVIEW: 'badge-slate',
};

function TaskItem({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === 'COMPLETED' || task.status === 'DONE' ? 'bg-emerald-400' : 'bg-slate-300'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${task.status === 'COMPLETED' || task.status === 'DONE' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{task.title}</p>
        <span className={`text-xs ${TYPE_BADGE[task.type] ?? 'badge-slate'}`}>{task.type}</span>
      </div>
      <span className="xp-badge">+{task.xpReward}</span>
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${accent ?? 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['daily-tasks'],
    queryFn: () => api<Task[]>('/daily-tasks'),
    enabled: !!user,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => api<{ id: string; roadmapId: string }[]>('/enrollments'),
    enabled: !!user && user.role === 'STUDENT',
  });

  const { data: leaderboard = [] } = useQuery({
    queryKey: ['leaderboard', 'global'],
    queryFn: () => api<{ rank: number; userId: string; displayName: string; score: number }[]>('/leaderboard?limit=5'),
    enabled: !!user,
  });

  const done = tasks.filter((t) => t.status === 'COMPLETED' || t.status === 'DONE').length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.displayName?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-500 mt-1">Here's your progress for today</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total XP" value={user?.xp?.toLocaleString() ?? '0'} sub="lifetime" accent="text-indigo-600" />
        <StatCard label="Streak" value={`${user?.streakCount ?? 0} 🔥`} sub="days in a row" />
        <StatCard label="Today's tasks" value={`${done}/${total}`} sub={`${pct}% complete`} accent={pct === 100 && total > 0 ? 'text-emerald-600' : 'text-slate-900'} />
        <StatCard label="Enrolled" value={enrollments.length} sub="roadmaps" />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Today's Tasks</h2>
              <Link href="/daily" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">View all →</Link>
            </div>
            <div className="px-5">
              <div className="py-3">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                  <span>{done} of {total} done</span><span>{pct}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
              {tasksLoading ? (
                <div className="space-y-3 py-2">{[1,2,3].map(i => <div key={i} className="skeleton h-10"/>)}</div>
              ) : tasks.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  No tasks today. <Link href="/roadmaps" className="text-indigo-600">Enroll in a roadmap</Link>
                </div>
              ) : (
                tasks.slice(0, 5).map(t => <TaskItem key={t.id} task={t} />)
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Leaderboard</h2>
              <Link href="/leaderboard" className="text-sm text-indigo-600 font-medium">Full →</Link>
            </div>
            <div className="px-5 py-2">
              {leaderboard.slice(0, 5).map((entry, i) => (
                <div key={entry.userId} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                  <span className="text-sm font-bold w-6 text-center">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
                  </span>
                  <span className={`flex-1 text-sm truncate ${entry.userId === user?.id ? 'font-semibold text-indigo-600' : 'text-slate-700'}`}>
                    {entry.displayName}
                  </span>
                  <span className="xp-badge">{entry.score?.toLocaleString()} XP</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 card p-4 space-y-2">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Quick actions</h3>
            <Link href="/roadmaps" className="btn-secondary w-full justify-start text-sm">🗺️ Browse roadmaps</Link>
            {user?.role === 'STUDENT' && (
              <Link href="/community/questions/new" className="btn-secondary w-full justify-start text-sm">❓ Ask a doubt</Link>
            )}
            <Link href="/resources" className="btn-secondary w-full justify-start text-sm">📚 Browse resources</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
