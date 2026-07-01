'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

type Report = { id: string; messageId: string; reason: string; status: string; createdAt: string };

export default function AdminReportsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => api<Report[]>('/admin/reports'),
  });

  const resolveMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/admin/reports/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reports'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (messageId: string) => api(`/admin/messages/${messageId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reports'] }),
  });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="section-heading">Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">Review and resolve content reports</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-xl"/>)}</div>
      ) : !data?.length ? (
        <div className="empty-state">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="font-semibold text-slate-900">No open reports</h3>
          <p className="text-sm text-slate-500 mt-1">Everything looks clean!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge-red">Report</span>
                    <span className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-slate-700 font-medium">{r.reason}</p>
                  <p className="text-xs text-slate-400 mt-1 font-mono">Message ID: {r.messageId}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => { if (confirm('Delete the reported content?')) deleteMut.mutate(r.messageId); }}
                    disabled={deleteMut.isPending || resolveMut.isPending}
                    className="btn-danger btn-sm"
                  >
                    {deleteMut.isPending && deleteMut.variables === r.messageId ? 'Deleting…' : 'Delete content'}
                  </button>
                  <button
                    onClick={() => resolveMut.mutate({ id: r.id, status: 'RESOLVED' })}
                    disabled={deleteMut.isPending || resolveMut.isPending}
                    className="btn-secondary btn-sm"
                  >
                    {resolveMut.isPending && resolveMut.variables?.id === r.id ? 'Saving…' : 'Dismiss'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
