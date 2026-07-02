'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useState } from 'react';
import { LIMITS } from '@placement/shared';

type Roadmap = { id: string; slug: string; title: string; description?: string; carryForward: boolean };

const PACE_LABELS = ['', 'Steady', 'Balanced', 'Ambitious', 'Intense', 'Full energy'];

function EnrollButton({ roadmapId, enrolled }: { roadmapId: string; enrolled: boolean }) {
  const qc = useQueryClient();
  const [pace, setPace] = useState(2);
  const [open, setOpen] = useState(false);

  const mut = useMutation({
    mutationFn: () => api('/enrollments', { method: 'POST', body: JSON.stringify({ roadmapId, pace }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enrollments'] });
      qc.invalidateQueries({ queryKey: ['daily-tasks'] });
      setOpen(false);
    },
  });

  if (enrolled) return <span className="badge-green">✓ Enrolled</span>;

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary btn-sm">
        Enroll
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-1">
        {Array.from({ length: LIMITS.PACE_MAX }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            title={`${n} milestone${n > 1 ? 's' : ''}/day — ${PACE_LABELS[n]}`}
            onClick={() => setPace(n)}
            className={`w-7 h-7 rounded text-xs font-semibold ${
              pace === n ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost btn-sm">Cancel</button>
        <button type="button" onClick={() => mut.mutate()} disabled={mut.isPending} className="btn-primary btn-sm">
          {mut.isPending ? '…' : `Enroll (${pace}/day)`}
        </button>
      </div>
    </div>
  );
}

export default function RoadmapsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const { data: roadmaps, isLoading } = useQuery({
    queryKey: ['roadmaps'],
    queryFn: () => api<Roadmap[]>('/roadmaps'),
  });

  const { data: enrollments } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => api<{ roadmapId: string }[]>('/enrollments'),
    enabled: !!user && user.role === 'STUDENT',
  });

  const enrolledIds = new Set(enrollments?.map((e) => e.roadmapId) ?? []);
  const filtered = (roadmaps ?? []).filter((r) =>
    !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="section-heading">Roadmaps</h1>
          <p className="text-sm text-slate-500 mt-0.5">Expert-crafted learning paths</p>
        </div>
      </div>

      <div className="mb-6">
        <input
          type="search"
          className="input max-w-sm"
          placeholder="Search roadmaps…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-40 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="text-4xl mb-3">🗺️</div>
          <h3 className="font-semibold text-slate-900">No roadmaps found</h3>
          <p className="text-sm text-slate-500 mt-1">
            {search ? 'Try different search terms.' : 'No roadmaps published yet.'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((r) => (
            <div key={r.id} className="card-hover p-5 flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-xl flex-shrink-0">🗺️</div>
                {user?.role === 'STUDENT' && <EnrollButton roadmapId={r.id} enrolled={enrolledIds.has(r.id)} />}
              </div>
              <Link href={`/roadmaps/${r.slug}`}>
                <h3 className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors mb-1">{r.title}</h3>
              </Link>
              {r.description && (
                <p className="text-sm text-slate-500 line-clamp-2 flex-1">{r.description}</p>
              )}
              <div className="flex items-center gap-2 mt-3">
                {r.carryForward && <span className="badge-slate">Carry-forward</span>}
                <Link href={`/roadmaps/${r.slug}`} className="ml-auto text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  View details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
