'use client';

export const dynamic = 'force-dynamic';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

type Objective = { id: string; title: string; description?: string; type: string; xpReward: number; order: number };
type Milestone = { id: string; title: string; order: number; objectives: Objective[] };
type Module = { id: string; title: string; order: number; milestones: Milestone[] };
type Roadmap = {
  id: string; slug: string; title: string; description?: string;
  carryForward: boolean; modules: Module[];
};

const TYPE_LABEL: Record<string, string> = {
  READ: '📖', PRACTICE: '💻', QUIZ: '🧠', PROJECT: '🏗️', MOCK_INTERVIEW: '🎤',
};

function ObjectiveRow({ obj }: { obj: Objective }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-base mt-0.5">{TYPE_LABEL[obj.type] ?? '📌'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800">{obj.title}</p>
        {obj.description && <p className="text-xs text-slate-500 mt-0.5">{obj.description}</p>}
      </div>
      <span className="xp-badge flex-shrink-0">+{obj.xpReward}</span>
    </div>
  );
}

export default function RoadmapDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: roadmap, isLoading } = useQuery({
    queryKey: ['roadmap', slug],
    queryFn: () => api<Roadmap>(`/roadmaps/${slug}`),
    retry: false,
  });

  const { data: enrollments } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => api<{ roadmapId: string }[]>('/enrollments'),
    enabled: !!user && user.role === 'STUDENT',
  });

  const enrolled = enrollments?.some((e) => e.roadmapId === roadmap?.id);

  const enrollMut = useMutation({
    mutationFn: (roadmapId: string) =>
      api('/enrollments', { method: 'POST', body: JSON.stringify({ roadmapId, pace: 2 }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enrollments'] }),
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="skeleton h-10 w-64" />
        <div className="skeleton h-5 w-96" />
        {[1, 2, 3].map((i) => <div key={i} className="skeleton h-48 rounded-xl" />)}
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="empty-state">
        <div className="text-4xl mb-3">🗺️</div>
        <h3 className="font-semibold text-slate-900">Roadmap not found</h3>
      </div>
    );
  }

  const totalObjectives = roadmap.modules.flatMap((m) => m.milestones.flatMap((ms) => ms.objectives)).length;
  const totalXP = roadmap.modules
    .flatMap((m) => m.milestones.flatMap((ms) => ms.objectives))
    .reduce((sum, o) => sum + o.xpReward, 0);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{roadmap.title}</h1>
            {roadmap.description && <p className="text-slate-500 mt-2">{roadmap.description}</p>}
            <div className="flex items-center gap-3 mt-3">
              <span className="badge-slate">{totalObjectives} objectives</span>
              <span className="xp-badge">{totalXP.toLocaleString()} total XP</span>
              {roadmap.carryForward && <span className="badge-indigo">Carry-forward</span>}
            </div>
          </div>
          {user?.role === 'STUDENT' && (
            <div className="flex-shrink-0">
              {enrolled ? (
                <span className="badge-green text-sm px-3 py-1.5">✓ Enrolled</span>
              ) : (
                <button
                  onClick={() => enrollMut.mutate(roadmap.id)}
                  disabled={enrollMut.isPending}
                  className="btn-primary"
                >
                  {enrollMut.isPending ? 'Enrolling…' : 'Enroll in this roadmap'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modules tree */}
      {roadmap.modules.length === 0 ? (
        <div className="card p-8 text-center text-slate-400">
          <p>No content added yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {roadmap.modules.map((mod) => (
            <div key={mod.id} className="card overflow-hidden">
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
                <h2 className="font-semibold text-slate-800">{mod.order}. {mod.title}</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {mod.milestones.map((ms) => (
                  <div key={ms.id} className="px-5 py-3">
                    <h3 className="text-sm font-semibold text-indigo-700 mb-2">
                      {mod.order}.{ms.order} {ms.title}
                    </h3>
                    <div>
                      {ms.objectives.map((obj) => (
                        <ObjectiveRow key={obj.id} obj={obj} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
