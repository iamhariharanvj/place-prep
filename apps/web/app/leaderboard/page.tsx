'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

type Entry = { rank: number; userId: string; displayName: string; score: number; streakCount?: number };
type Roadmap = { id: string; title: string; slug: string };
type MyRank = { rank: number | null; score: number; totalParticipants: number };

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [roadmapId, setRoadmapId] = useState<string>('');

  const { data: roadmaps = [] } = useQuery({
    queryKey: ['roadmaps'],
    queryFn: () => api<Roadmap[]>('/roadmaps'),
  });

  const scope = roadmapId ? 'roadmap' : 'global';
  const queryKey = ['leaderboard', scope, roadmapId || 'all'];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({ limit: '50', scope });
      if (roadmapId) params.set('roadmapId', roadmapId);
      return api<Entry[]>(`/leaderboard?${params}`);
    },
  });

  const { data: myRank } = useQuery({
    queryKey: ['leaderboard-me', scope, roadmapId || 'all'],
    queryFn: () => {
      const params = new URLSearchParams({ scope });
      if (roadmapId) params.set('roadmapId', roadmapId);
      return api<MyRank>(`/leaderboard/me?${params}`);
    },
    enabled: !!user,
  });

  const medals = ['🥇', '🥈', '🥉'];
  const selectedRoadmap = roadmaps.find((r) => r.id === roadmapId);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="section-heading">Leaderboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {user?.role !== 'STUDENT'
              ? 'Student rankings by XP — enroll in a roadmap to compete'
              : roadmapId && selectedRoadmap
                ? `Top learners in ${selectedRoadmap.title}`
                : 'Top XP earners across all roadmaps'}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <label className="label" htmlFor="roadmap-filter">Filter by roadmap</label>
        <select
          id="roadmap-filter"
          className="input max-w-md"
          value={roadmapId}
          onChange={(e) => setRoadmapId(e.target.value)}
        >
          <option value="">All roadmaps (global)</option>
          {roadmaps.map((r) => (
            <option key={r.id} value={r.id}>{r.title}</option>
          ))}
        </select>
      </div>

      {user && myRank && myRank.rank !== null && user.role === 'STUDENT' && (
        <div className="card p-4 mb-4 bg-indigo-50 border-indigo-100">
          <p className="text-sm text-indigo-800">
            Your rank: <strong>#{myRank.rank}</strong> of {myRank.totalParticipants} · {myRank.score.toLocaleString()} XP
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : !data?.length ? (
        <div className="empty-state">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-slate-500">
            {roadmapId ? 'No XP earned on this roadmap yet.' : 'No data yet. Start completing tasks!'}
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {data.map((entry, i) => {
            const isMe = entry.userId === user?.id;
            return (
              <div key={entry.userId} className={`flex items-center gap-4 px-5 py-4 ${isMe ? 'bg-indigo-50' : ''}`}>
                <div className="w-8 text-center flex-shrink-0">
                  {i < 3 ? <span className="text-xl">{medals[i]}</span> : <span className="text-sm font-semibold text-slate-400">#{i + 1}</span>}
                </div>
                <Link href={`/users/${entry.userId}`} className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 hover:ring-2 hover:ring-indigo-300 ${isMe ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {entry.displayName.charAt(0).toUpperCase()}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/users/${entry.userId}`} className={`font-medium truncate block hover:text-indigo-600 ${isMe ? 'text-indigo-700' : 'text-slate-800'}`}>
                    {entry.displayName}
                    {isMe && <span className="ml-2 text-xs font-normal text-indigo-500">(you)</span>}
                  </Link>
                </div>
                <div className="flex-shrink-0">
                  <span className="xp-badge">{entry.score?.toLocaleString()} XP</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
