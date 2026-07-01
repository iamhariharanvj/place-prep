'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

type VoteButtonsProps = {
  messageId: string;
  score: number;
  userVote?: 1 | -1 | null;
  invalidateKeys?: readonly (readonly string[])[];
  scoreClassName?: string;
};

export function VoteButtons({
  messageId,
  score: initialScore,
  userVote: initialUserVote = null,
  invalidateKeys = [],
  scoreClassName = 'text-sm',
}: VoteButtonsProps) {
  const qc = useQueryClient();
  const [score, setScore] = useState(initialScore);
  const [userVote, setUserVote] = useState<1 | -1 | null>(initialUserVote);

  useEffect(() => {
    setScore(initialScore);
    setUserVote(initialUserVote ?? null);
  }, [initialScore, initialUserVote, messageId]);

  const voteMut = useMutation({
    mutationFn: (value: number) =>
      api<{ score: number; userVote: 1 | -1 | null }>(`/messages/${messageId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ value }),
      }),
    onSuccess: (data) => {
      setScore(data.score);
      setUserVote(data.userVote);
      for (const key of invalidateKeys) {
        qc.invalidateQueries({ queryKey: [...key] });
      }
    },
  });

  const busy = voteMut.isPending;
  const scoreColor = score > 0 ? 'text-emerald-600' : score < 0 ? 'text-red-500' : 'text-slate-400';

  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0 min-w-[2rem]">
      {userVote !== 1 && (
        <button
          type="button"
          onClick={() => voteMut.mutate(1)}
          disabled={busy}
          aria-label="Upvote"
          className="btn-ghost btn-sm px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ▲
        </button>
      )}
      {userVote === 1 && (
        <span className="text-emerald-600 font-bold text-xs px-2 py-1" title="You upvoted">▲</span>
      )}
      <span className={`font-bold ${scoreClassName} ${scoreColor}`}>{score}</span>
      {userVote !== -1 && (
        <button
          type="button"
          onClick={() => voteMut.mutate(-1)}
          disabled={busy}
          aria-label="Downvote"
          className="btn-ghost btn-sm px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ▼
        </button>
      )}
      {userVote === -1 && (
        <span className="text-red-500 font-bold text-xs px-2 py-1" title="You downvoted">▼</span>
      )}
    </div>
  );
}
