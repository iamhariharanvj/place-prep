'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import Link from 'next/link';

type Roadmap = { id: string; slug: string; title: string; description?: string; published: boolean; enrolled_count?: number; createdAt: string };

export default function MentorRoadmapsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['mentor-roadmaps'],
    queryFn: () => api<Roadmap[]>('/roadmaps/mine'),
  });

  const publishMut = useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      api(`/roadmaps/${id}/publish`, { method: 'PATCH', body: JSON.stringify({ published }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mentor-roadmaps'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api(`/roadmaps/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mentor-roadmaps'] }),
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="section-heading">My Roadmaps</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your learning roadmaps</p>
        </div>
        <Link href="/mentor/roadmaps/new" className="btn-primary">Create roadmap</Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-xl"/>)}</div>
      ) : !data?.length ? (
        <div className="empty-state">
          <div className="text-4xl mb-4">🗺️</div>
          <h3 className="font-semibold text-slate-900 mb-1">No roadmaps yet</h3>
          <p className="text-sm text-slate-500 mb-4">Create your first roadmap to start guiding students.</p>
          <Link href="/mentor/roadmaps/new" className="btn-primary">Create your first roadmap</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((rm) => (
            <div key={rm.id} className="card p-5 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-slate-900 truncate">{rm.title}</h3>
                  <span className={rm.published ? 'badge-green' : 'badge-slate'}>
                    {rm.published ? '✓ Published' : 'Draft'}
                  </span>
                </div>
                {rm.description && <p className="text-sm text-slate-500 line-clamp-1">{rm.description}</p>}
                <div className="text-xs text-slate-400 mt-1">
                  {rm.enrolled_count ?? 0} students enrolled · Created {new Date(rm.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link href={`/mentor/roadmaps/${rm.id}/edit`} className="btn-secondary btn-sm">Edit</Link>
                <button
                  onClick={() => publishMut.mutate({ id: rm.id, published: !rm.published })}
                  disabled={publishMut.isPending && publishMut.variables?.id === rm.id}
                  className={rm.published ? 'btn-secondary btn-sm' : 'btn-primary btn-sm'}
                >
                  {publishMut.isPending && publishMut.variables?.id === rm.id
                    ? 'Saving…'
                    : rm.published ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${rm.title}"? This cannot be undone.`)) {
                      deleteMut.mutate(rm.id);
                    }
                  }}
                  disabled={deleteMut.isPending && deleteMut.variables === rm.id}
                  className="btn-ghost btn-sm text-red-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-40"
                >
                  {deleteMut.isPending && deleteMut.variables === rm.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
