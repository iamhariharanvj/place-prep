'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { ProfileView } from '@/components/profile-view';
import type { UserPublicProfileDto } from '@placement/shared';

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', id],
    queryFn: () => api<UserPublicProfileDto>(`/users/${id}`),
    retry: false,
    enabled: !!id && user?.id !== id,
  });

  if (user?.id === id) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <p className="text-slate-500 mb-4">This is your profile.</p>
        <Link href="/profile" className="btn-primary">Go to my profile</Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="empty-state">
        <p className="text-slate-500">User not found.</p>
      </div>
    );
  }

  return <ProfileView profile={profile} />;
}
