'use client';

export const dynamic = 'force-dynamic';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { VoteButtons } from '@/components/vote-buttons';

type Doubt = {
  id: string; title: string; body: string; voteScore: number; userVote?: 1 | -1 | null;
  createdAt: string; author: { id: string; displayName: string };
};
type PagedResult = { data: Doubt[]; nextCursor: string | null; hasMore: boolean };

export default function DoubtsPage() {
  const { user } = useAuth();
  const isStudent = user?.role === 'STUDENT';

  const { data, isLoading } = useQuery({
    queryKey: ['questions'],
    queryFn: () => api<PagedResult>('/questions'),
  });

  const doubts = data?.data ?? [];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="section-heading">Doubts</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isStudent
              ? 'Post doubts from your prep — mentors and peers can help clear them'
              : 'Doubts posted by students — share your knowledge to help them'}
          </p>
        </div>
        {isStudent && (
          <Link href="/community/questions/new" className="btn-primary">Ask a doubt</Link>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-28 rounded-xl" />)}</div>
      ) : !doubts.length ? (
        <div className="empty-state">
          <div className="text-4xl mb-3">❓</div>
          <h3 className="font-semibold text-slate-900 mb-1">No doubts yet</h3>
          <p className="text-sm text-slate-500">
            {isStudent ? 'Stuck on something? Ask your first doubt.' : 'Students haven’t posted any doubts yet.'}
          </p>
          {isStudent && (
            <Link href="/community/questions/new" className="btn-primary mt-4">Ask a doubt</Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {doubts.map((d) => (
            <div key={d.id} className="card-hover p-5 flex gap-4">
              <VoteButtons messageId={d.id} score={d.voteScore} userVote={d.userVote} invalidateKeys={[['questions']]} />
              <div className="flex-1 min-w-0">
                <Link href={`/community/questions/${d.id}`}>
                  <h3 className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors mb-1">{d.title}</h3>
                </Link>
                <p className="text-sm text-slate-500 line-clamp-2">{d.body}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                  <span>by {d.author?.displayName ?? 'Anonymous'}</span>
                  <span>·</span>
                  <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
