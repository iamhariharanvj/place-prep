'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, formatApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { VoteButtons } from '@/components/vote-buttons';

type Answer = {
  id: string; body: string; voteScore: number; userVote?: 1 | -1 | null;
  createdAt: string; author: { id: string; displayName: string };
};
type Doubt = {
  id: string; title: string; body: string; voteScore: number; userVote?: 1 | -1 | null;
  createdAt: string; author: { id: string; displayName: string }; answers: Answer[];
};

export default function DoubtDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [answerBody, setAnswerBody] = useState('');
  const [answerError, setAnswerError] = useState('');

  const { data: doubt, isLoading } = useQuery({
    queryKey: ['question', id],
    queryFn: () => api<Doubt>(`/questions/${id}`),
    retry: false,
  });

  const answerMut = useMutation({
    mutationFn: () =>
      api(`/questions/${id}/answers`, {
        method: 'POST',
        body: JSON.stringify({ body: answerBody.trim() }),
      }),
    onSuccess: () => {
      setAnswerBody('');
      setAnswerError('');
      qc.invalidateQueries({ queryKey: ['question', id] });
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError) setAnswerError(formatApiError(e.body, 'Failed to post answer'));
      else setAnswerError('Failed to post answer');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (messageId: string) => api(`/admin/messages/${messageId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['question', id] }),
  });

  const canAnswer = !!user && user.role !== 'ADMIN';
  const answerHeading = user?.role === 'MENTOR' ? 'Clear this doubt' : 'Your answer';

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
      </div>
    );
  }

  if (!doubt) {
    return (
      <div className="empty-state">
        <p className="text-slate-500">Doubt not found.</p>
        <Link href="/community/questions" className="btn-secondary mt-4">Back to doubts</Link>
      </div>
    );
  }

  const doubtKey = ['question', String(id)] as const;

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/community/questions" className="text-sm text-indigo-600 font-medium mb-4 inline-block">
        ← All doubts
      </Link>

      <div className="card p-6 mb-6">
        <div className="flex gap-4">
          <VoteButtons
            messageId={doubt.id}
            score={doubt.voteScore}
            userVote={doubt.userVote}
            scoreClassName="text-lg"
            invalidateKeys={[doubtKey]}
          />
          <div className="flex-1">
            <span className="badge-indigo text-xs mb-2 inline-block">Student doubt</span>
            <h1 className="text-xl font-bold text-slate-900 mb-3">{doubt.title}</h1>
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{doubt.body}</p>
            <div className="flex items-center justify-between mt-4">
              <div className="text-xs text-slate-400">
                Asked by{' '}
                <span className="font-medium text-slate-600">{doubt.author?.displayName ?? 'Anonymous'}</span>
                {' · '}
                {new Date(doubt.createdAt).toLocaleDateString()}
              </div>
              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => deleteMut.mutate(doubt.id)}
                  disabled={deleteMut.isPending}
                  className="btn-danger btn-sm"
                >
                  {deleteMut.isPending && deleteMut.variables === doubt.id ? 'Deleting…' : 'Delete'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <h2 className="font-semibold text-slate-900 mb-3">
        {doubt.answers?.length ?? 0} {doubt.answers?.length === 1 ? 'Answer' : 'Answers'}
      </h2>
      <div className="space-y-4 mb-8">
        {!doubt.answers?.length && (
          <p className="text-sm text-slate-500 italic">No answers yet — be the first to help.</p>
        )}
        {doubt.answers?.map((ans) => (
          <div key={ans.id} className="card p-5 flex gap-4">
            <VoteButtons messageId={ans.id} score={ans.voteScore} userVote={ans.userVote} invalidateKeys={[doubtKey]} />
            <div className="flex-1">
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{ans.body}</p>
              <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-slate-400">
                  <span className="font-medium text-slate-600">{ans.author?.displayName ?? 'Anonymous'}</span>
                  {' · '}
                  {new Date(ans.createdAt).toLocaleDateString()}
                </div>
                {user?.role === 'ADMIN' && (
                  <button
                    onClick={() => deleteMut.mutate(ans.id)}
                    disabled={deleteMut.isPending}
                    className="btn-danger btn-sm"
                  >
                    {deleteMut.isPending && deleteMut.variables === ans.id ? 'Deleting…' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {canAnswer ? (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-1">{answerHeading}</h3>
          {user?.role === 'MENTOR' && (
            <p className="text-sm text-slate-500 mb-3">Help this student understand the concept clearly.</p>
          )}
          {answerError && (
            <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{answerError}</div>
          )}
          <textarea
            className="input min-h-32 resize-y mb-1"
            placeholder={user?.role === 'MENTOR' ? 'Explain the concept and suggest next steps…' : 'Share what helped you…'}
            value={answerBody}
            onChange={(e) => setAnswerBody(e.target.value)}
            disabled={answerMut.isPending}
            minLength={10}
            rows={4}
          />
          <p className="text-xs text-slate-400 mb-3">{answerBody.trim().length}/10 min characters</p>
          <button
            onClick={() => answerMut.mutate()}
            disabled={answerMut.isPending || answerBody.trim().length < 10}
            className="btn-primary"
          >
            {answerMut.isPending ? 'Posting…' : 'Post answer'}
          </button>
        </div>
      ) : (
        <div className="card p-5 text-center text-sm text-slate-500">
          <a href="/login" className="text-indigo-600 font-medium">Sign in</a> to answer this doubt.
        </div>
      )}
    </div>
  );
}
