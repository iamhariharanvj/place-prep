'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api-client';
import { LIMITS } from '@placement/shared';

type Task = {
  id: string;
  objectiveId: string;
  milestoneId: string;
  milestoneTitle: string;
  title: string;
  type: string;
  xpReward: number;
  status: string;
  description?: string;
  roadmap: { id: string; title: string; slug: string };
};

type Enrollment = { id: string; roadmapId: string; pace: number };

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function isTaskDone(status: string) {
  return status === 'COMPLETED' || status === 'DONE' || status === 'SKIPPED';
}

const TYPE_BADGE: Record<string, string> = {
  READ: 'badge-indigo', PRACTICE: 'badge-green', QUIZ: 'badge-amber',
  PROJECT: 'badge-red', MOCK_INTERVIEW: 'badge-slate',
};

const TYPE_LABEL: Record<string, string> = {
  READ: '📖 Read', PRACTICE: '💻 Practice', QUIZ: '🧠 Quiz',
  PROJECT: '🏗️ Project', MOCK_INTERVIEW: '🎤 Mock Interview',
};

const PACE_LABELS = ['', 'Steady', 'Balanced', 'Ambitious', 'Intense', 'Full energy'];

function TaskCard({ task, onComplete, onSkip, busy }: {
  task: Task;
  onComplete: (objectiveId: string) => void;
  onSkip: (objectiveId: string) => void;
  busy: boolean;
}) {
  const done = task.status === 'COMPLETED' || task.status === 'DONE';
  const skipped = task.status === 'SKIPPED';

  return (
    <div className={`card p-5 transition-all ${done || skipped ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={TYPE_BADGE[task.type] ?? 'badge-slate'}>{TYPE_LABEL[task.type] ?? task.type}</span>
            {done && <span className="badge-green">✓ Done</span>}
            {skipped && <span className="badge-slate">Skipped</span>}
          </div>
          <h3 className={`font-semibold text-slate-900 ${done ? 'line-through text-slate-400' : ''}`}>{task.title}</h3>
          {task.description && (
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">{task.description}</p>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          <span className="xp-badge">+{task.xpReward} XP</span>
        </div>
      </div>

      {!done && !skipped && (
        <div className="flex gap-2 mt-4">
          <button onClick={() => onComplete(task.objectiveId)} disabled={busy} className="btn-primary btn-sm">
            Mark complete
          </button>
          <button onClick={() => onSkip(task.objectiveId)} disabled={busy} className="btn-ghost btn-sm">
            Skip for now
          </button>
        </div>
      )}
    </div>
  );
}

function PaceControl({ enrollment, roadmapTitle, onUpdate, busy }: {
  enrollment: Enrollment;
  roadmapTitle: string;
  onUpdate: (pace: number) => void;
  busy: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm font-medium text-slate-700 min-w-0 truncate flex-1">{roadmapTitle}</span>
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-xs text-slate-500 mr-1">Milestones/day:</span>
        {Array.from({ length: LIMITS.PACE_MAX }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            title={PACE_LABELS[n]}
            disabled={busy}
            onClick={() => onUpdate(n)}
            className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
              enrollment.pace === n
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DailyPage() {
  const qc = useQueryClient();
  const [toast, setToast] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(todayUtc);

  const { data, isLoading } = useQuery({
    queryKey: ['daily-tasks', viewDate],
    queryFn: () => api<Task[]>(`/daily-tasks${viewDate !== todayUtc() ? `?date=${viewDate}` : ''}`),
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => api<Enrollment[]>('/enrollments'),
  });

  const { data: roadmaps = [] } = useQuery({
    queryKey: ['roadmaps'],
    queryFn: () => api<{ id: string; title: string }[]>('/roadmaps'),
  });

  const roadmapTitle = (id: string) => roadmaps.find((r) => r.id === id)?.title ?? 'Roadmap';

  const completeMutation = useMutation({
    mutationFn: (objectiveId: string) =>
      api(`/objectives/${objectiveId}/complete`, { method: 'POST' }),
    onSuccess: (_, objectiveId) => {
      qc.setQueryData<Task[]>(['daily-tasks', viewDate], (old) => {
        if (!old) return old;
        return old.map((t) => t.objectiveId === objectiveId ? { ...t, status: 'COMPLETED' } : t);
      });
      setToast('Great job! XP awarded 🎉');
      setTimeout(() => setToast(null), 3000);
    },
  });

  const skipMutation = useMutation({
    mutationFn: (objectiveId: string) =>
      api(`/objectives/${objectiveId}/skip`, { method: 'POST' }),
    onSuccess: (_, objectiveId) => {
      qc.setQueryData<Task[]>(['daily-tasks', viewDate], (old) => {
        if (!old) return old;
        return old.map((t) => t.objectiveId === objectiveId ? { ...t, status: 'SKIPPED' } : t);
      });
    },
  });

  const paceMutation = useMutation({
    mutationFn: ({ id, pace }: { id: string; pace: number }) =>
      api(`/enrollments/${id}/pace`, { method: 'PATCH', body: JSON.stringify({ pace }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enrollments'] });
      setToast('Pace updated — applies to your next assignment');
      setTimeout(() => setToast(null), 3000);
    },
  });

  const advanceMutation = useMutation({
    mutationFn: () =>
      api<{ assigned: number; date: string; tasks: Task[] }>('/daily-tasks/advance', {
        method: 'POST',
        body: JSON.stringify({ fromDate: viewDate }),
      }),
    onSuccess: (result) => {
      setViewDate(result.date);
      qc.setQueryData(['daily-tasks', result.date], result.tasks);
      setToast(`⚡ ${result.assigned} new tasks loaded — feeling the energy!`);
      setTimeout(() => setToast(null), 4000);
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Could not advance';
      setToast(msg);
      setTimeout(() => setToast(null), 4000);
    },
  });

  const tasks = data ?? [];
  const done = tasks.filter((t) => isTaskDone(t)).length;
  const allFinished = tasks.length > 0 && tasks.every((t) => isTaskDone(t));
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  const byMilestone = useMemo(() => {
    const groups = new Map<string, { title: string; tasks: Task[] }>();
    for (const t of tasks) {
      const g = groups.get(t.milestoneId) ?? { title: t.milestoneTitle, tasks: [] };
      g.tasks.push(t);
      groups.set(t.milestoneId, g);
    }
    return [...groups.values()];
  }, [tasks]);

  const displayDate = new Date(`${viewDate}T12:00:00.000Z`);

  return (
    <div className="max-w-2xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-emerald-600 text-white px-4 py-3 text-sm font-medium shadow-lg max-w-sm">
          {toast}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="section-heading">Daily Tasks</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {displayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })}
            {viewDate !== todayUtc() && (
              <button type="button" onClick={() => setViewDate(todayUtc())} className="ml-2 text-indigo-600 hover:underline">
                Back to today
              </button>
            )}
          </p>
        </div>
      </div>

      {enrollments.length > 0 && (
        <div className="card p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-2">Your study pace</h2>
          <p className="text-xs text-slate-500 mb-3">How many milestones to tackle per day (each milestone includes all its objectives)</p>
          {enrollments.map((e) => (
            <PaceControl
              key={e.id}
              enrollment={e}
              roadmapTitle={roadmapTitle(e.roadmapId)}
              busy={paceMutation.isPending}
              onUpdate={(pace) => paceMutation.mutate({ id: e.id, pace })}
            />
          ))}
        </div>
      )}

      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-700">Progress</span>
          <span className="text-sm font-bold text-indigo-600">{done}/{tasks.length} objectives</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        {allFinished && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-sm text-emerald-600 font-medium mb-3">🎉 All done for this day!</p>
            <button
              type="button"
              onClick={() => advanceMutation.mutate()}
              disabled={advanceMutation.isPending}
              className="btn-primary w-full sm:w-auto"
            >
              {advanceMutation.isPending ? 'Loading next milestones…' : '⚡ Feeling energized — start next day\'s milestones'}
            </button>
            <p className="text-xs text-slate-500 mt-2">Pull tomorrow&apos;s milestones forward and keep the momentum going.</p>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-32 rounded-xl" />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No tasks assigned yet</h3>
          <p className="text-sm text-slate-500">Enroll in a roadmap to get daily milestones assigned.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {byMilestone.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold text-indigo-700 mb-2 px-1">{group.title}</h3>
              <div className="space-y-3">
                {group.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    busy={completeMutation.isPending || skipMutation.isPending}
                    onComplete={(objId) => completeMutation.mutate(objId)}
                    onSkip={(objId) => skipMutation.mutate(objId)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
