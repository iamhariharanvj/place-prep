'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { ProfileView } from '@/components/profile-view';
import type { UserProfileDto } from '@placement/shared';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => api<UserProfileDto>('/me'),
    enabled: !!user,
  });

  if (authLoading || isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="empty-state">
        <p className="text-slate-500">
          Please <Link href="/login" className="text-indigo-600">sign in</Link> to view your profile.
        </p>
      </div>
    );
  }

  return (
    <ProfileView
      profile={profile}
      isOwn
      onSaved={() => qc.invalidateQueries({ queryKey: ['profile', 'me'] })}
    />
  );
}
