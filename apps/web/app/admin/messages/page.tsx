'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

type Message = { id: string; type: string; authorId: string; voteScore: number; createdAt: string; displayName?: string };

const FILTERS = ['ALL', 'QUESTION', 'ANSWER', 'NOTE', 'EXPERIENCE', 'DISCUSSION'] as const;

const TYPE_LABEL: Record<string, string> = {
  ALL: 'All',
  QUESTION: 'Doubts',
  ANSWER: 'Answers',
  NOTE: 'Notes',
  EXPERIENCE: 'Experiences',
  DISCUSSION: 'Discussions',
};

export default function AdminMessagesPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-messages', filter],
    queryFn: () => api<Message[]>(`/admin/messages${filter !== 'ALL' ? `?type=${filter}` : ''}`),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api(`/admin/messages/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-messages'] }),
  });

  const TYPE_BADGE: Record<string, string> = {
    QUESTION: 'badge-indigo', ANSWER: 'badge-green', NOTE: 'badge-amber',
    EXPERIENCE: 'badge-slate', DISCUSSION: 'badge-red',
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="section-heading">Content Moderation</h1>
          <p className="text-sm text-slate-500 mt-0.5">Review and delete community content</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-slate-200">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              filter === f
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {TYPE_LABEL[f] ?? f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-16 rounded-xl"/>)}</div>
      ) : !data?.length ? (
        <div className="empty-state">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-slate-500">No content found.</p>
        </div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {data.map((msg) => (
            <div key={msg.id} className="flex items-center gap-4 px-5 py-4">
              <span className={`${TYPE_BADGE[msg.type] ?? 'badge-slate'} flex-shrink-0`}>{msg.type}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 font-medium">{msg.displayName ?? 'Unknown user'}</p>
                <p className="text-xs text-slate-400 font-mono">{msg.id}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-sm font-semibold ${msg.voteScore >= 0 ? 'text-slate-500' : 'text-red-500'}`}>
                  {msg.voteScore > 0 ? '+' : ''}{msg.voteScore} votes
                </span>
                <span className="text-xs text-slate-400">{new Date(msg.createdAt).toLocaleDateString()}</span>
                <button
                  onClick={() => { if (confirm('Delete this content? This cannot be undone.')) deleteMut.mutate(msg.id); }}
                  disabled={deleteMut.isPending && deleteMut.variables === msg.id}
                  className="btn-danger btn-sm"
                >
                  {deleteMut.isPending && deleteMut.variables === msg.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
