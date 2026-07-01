'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api-client';

type Task = {
  id: string;
  objectiveId: string;
  title: string;
  type: string;
  xpReward: number;
  status: string;
  description?: string;
};

const TYPE_BADGE: Record<string, string> = {
  READ: 'badge-indigo', PRACTICE: 'badge-green', QUIZ: 'badge-amber',
  PROJECT: 'badge-red', MOCK_INTERVIEW: 'badge-slate',
};

const TYPE_LABEL: Record<string, string> = {
  READ: '📖 Read', PRACTICE: '💻 Practice', QUIZ: '🧠 Quiz',
  PROJECT: '🏗️ Project', MOCK_INTERVIEW: '🎤 Mock Interview',
};

function TaskCard({ task, onComplete, onSkip, busy }: {
  task: Task;
  onComplete: (objectiveId: string) => void;
  onSkip: (objectiveId: string) => void;
  busy: boolean;
}) {
  const isDone = task.status === 'DONE';
  const isSkipped = task.status === 'SKIPPED';

  return (
    <div className={`card p-5 transition-all ${isDone ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={TYPE_BADGE[task.type] ?? 'badge-slate'}>{TYPE_LABEL[task.type] ?? task.type}</span>
            {isDone && <span className="badge-green">✓ Done</span>}
            {isSkipped && <span className="badge-slate">Skipped</span>}
          </div>
          <h3 className={`font-semibold text-slate-900 ${isDone ? 'line-through text-slate-400' : ''}`}>{task.title}</h3>
          {task.description && (
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">{task.description}</p>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          <span className="xp-badge">+{task.xpReward} XP</span>
        </div>
      </div>

      {!isDone && !isSkipped && (
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onComplete(task.objectiveId)}
            disabled={busy}
            className="btn-primary btn-sm"
          >
            Mark complete
          </button>
          <button
            onClick={() => onSkip(task.objectiveId)}
            disabled={busy}
            className="btn-ghost btn-sm"
          >
            Skip for now
          </button>
        </div>
      )}
    </div>
  );
}

export default function DailyPage() {
  const qc = useQueryClient();
  const [toast, setToast] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['daily-tasks'],
    queryFn: () => api<Task[]>('/daily-tasks'),
  });

  const completeMutation = useMutation({
    mutationFn: (objectiveId: string) =>
      api(`/objectives/${objectiveId}/complete`, { method: 'POST' }),
    onSuccess: (_, objectiveId) => {
      qc.setQueryData<Task[]>(['daily-tasks'], (old) => {
        if (!old) return old;
        return old.map((t) => t.objectiveId === objectiveId ? { ...t, status: 'DONE' } : t);
      });
      setToast('Great job! XP awarded 🎉');
      setTimeout(() => setToast(null), 3000);
    },
  });

  const skipMutation = useMutation({
    mutationFn: (objectiveId: string) =>
      api(`/objectives/${objectiveId}/skip`, { method: 'POST' }),
    onSuccess: (_, objectiveId) => {
      qc.setQueryData<Task[]>(['daily-tasks'], (old) => {
        if (!old) return old;
        return old.map((t) => t.objectiveId === objectiveId ? { ...t, status: 'SKIPPED' } : t);
      });
    },
  });

  const tasks = data ?? [];
  const done = tasks.filter((t) => t.status === 'DONE').length;
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-emerald-600 text-white px-4 py-3 text-sm font-medium shadow-lg animate-in slide-in-from-right">
          {toast}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="section-heading">Daily Tasks</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-700">Today's progress</span>
          <span className="text-sm font-bold text-indigo-600">{done}/{tasks.length} tasks</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        {pct === 100 && tasks.length > 0 && (
          <p className="text-sm text-emerald-600 font-medium mt-2">🎉 All done for today! See you tomorrow.</p>
        )}
      </div>

      {/* Tasks */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-32 rounded-xl" />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No tasks assigned yet</h3>
          <p className="text-sm text-slate-500">Enroll in a roadmap to get daily tasks assigned.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              busy={completeMutation.isPending || skipMutation.isPending}
              onComplete={(objId) => completeMutation.mutate(objId)}
              onSkip={(objId) => skipMutation.mutate(objId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
