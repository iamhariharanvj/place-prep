'use client';

export const dynamic = 'force-dynamic';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { VoteButtons } from '@/components/vote-buttons';

type Note = {
  id: string; title: string; body: string; voteScore: number; userVote?: 1 | -1 | null;
  createdAt: string; author: { id: string; displayName: string };
};
type PagedResult = { data: Note[]; nextCursor: string | null; hasMore: boolean };

export default function NotesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: () => api<PagedResult>('/notes'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api(`/admin/messages/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  });

  const notes = data?.data ?? [];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="section-heading">Notes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Share study notes with the community</p>
        </div>
        {user && <Link href="/community/notes/new" className="btn-primary">Share a note</Link>}
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-28 rounded-xl"/>)}</div>
      ) : !notes.length ? (
        <div className="empty-state">
          <div className="text-4xl mb-3">📝</div>
          <h3 className="font-semibold text-slate-900 mb-1">No notes yet</h3>
          {user && <Link href="/community/notes/new" className="btn-primary mt-4">Share the first note</Link>}
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="card-hover p-5 flex gap-4">
              <VoteButtons messageId={note.id} score={note.voteScore} userVote={note.userVote} invalidateKeys={[['notes']]} />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 mb-1">{note.title}</h3>
                <p className="text-sm text-slate-500 line-clamp-3">{note.body}</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-xs text-slate-400">
                    by <span className="font-medium text-slate-600">{note.author?.displayName ?? 'Anonymous'}</span> · {new Date(note.createdAt).toLocaleDateString()}
                  </div>
                  {user?.role === 'ADMIN' && (
                    <button
                      onClick={() => deleteMut.mutate(note.id)}
                      disabled={deleteMut.isPending && deleteMut.variables === note.id}
                      className="btn-danger btn-sm"
                    >
                      {deleteMut.isPending && deleteMut.variables === note.id ? 'Deleting…' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
