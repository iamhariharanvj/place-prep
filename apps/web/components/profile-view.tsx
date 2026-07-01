'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { hasLearningStats, roleBadgeStyle, roleLabel } from '@/lib/role-ui';
import type { UserProfileDto, UserPublicProfileDto } from '@placement/shared';

type ProfileData = UserProfileDto | UserPublicProfileDto;

function normalizeLink(type: 'linkedin' | 'leetcode' | 'github', raw: string): string {
  const v = raw.trim();
  if (v.startsWith('http://') || v.startsWith('https://')) return v;
  const handle = v.replace(/^@/, '').replace(/\/$/, '');
  if (type === 'leetcode') return `https://leetcode.com/u/${handle}/`;
  if (type === 'github') return `https://github.com/${handle}`;
  return `https://linkedin.com/in/${handle}`;
}

function displayHandle(type: 'linkedin' | 'leetcode' | 'github', raw: string): string {
  const v = raw.trim();
  if (!v.startsWith('http')) return v.replace(/^@/, '');
  try {
    const url = new URL(v);
    const parts = url.pathname.split('/').filter(Boolean);
    if (type === 'leetcode') return parts[parts.length - 1] ?? v;
    if (type === 'github') return parts[0] ?? v;
    return parts[parts.length - 1] ?? v;
  } catch {
    return v;
  }
}

const SOCIAL_CONFIG = [
  {
    key: 'linkedinUrl' as const,
    type: 'linkedin' as const,
    label: 'LinkedIn',
    short: 'in',
    color: 'hover:border-[#0A66C2]/30 hover:bg-[#0A66C2]/5',
    accent: 'text-[#0A66C2]',
    placeholder: 'linkedin.com/in/username',
  },
  {
    key: 'leetcodeUrl' as const,
    type: 'leetcode' as const,
    label: 'LeetCode',
    short: 'LC',
    color: 'hover:border-amber-300 hover:bg-amber-50',
    accent: 'text-amber-600',
    placeholder: 'leetcode.com/u/username',
  },
  {
    key: 'githubUrl' as const,
    type: 'github' as const,
    label: 'GitHub',
    short: 'GH',
    color: 'hover:border-slate-400 hover:bg-slate-50',
    accent: 'text-slate-800',
    placeholder: 'github.com/username',
  },
];

function SocialLinkCard({
  type,
  label,
  short,
  color,
  accent,
  value,
}: {
  type: 'linkedin' | 'leetcode' | 'github';
  label: string;
  short: string;
  color: string;
  accent: string;
  value: string;
}) {
  const href = normalizeLink(type, value);
  const handle = displayHandle(type, value);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all ${color}`}
    >
      <div className={`w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold ${accent}`}>
        {short}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-800 truncate">{handle}</p>
      </div>
      <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

function MetricCard({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string | number;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? 'border-indigo-200 bg-indigo-50/60' : 'border-slate-200 bg-white'}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 tabular-nums ${highlight ? 'text-indigo-600' : 'text-slate-900'}`}>
        {value}
      </p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function ProfileStats({ profile }: { profile: ProfileData }) {
  const since = profile.memberSince ?? ('createdAt' in profile ? profile.createdAt : undefined);
  const memberYear = since ? new Date(since).getFullYear() : null;

  if (profile.role === 'STUDENT') {
    return (
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Total XP" value={profile.xp.toLocaleString()} highlight />
        <MetricCard label="Day streak" value={profile.streakCount} hint="Complete daily tasks" />
        <MetricCard label="Roadmaps" value={profile.enrollmentsCount ?? 0} hint="Enrolled" />
        {memberYear && (
          <MetricCard label="Member since" value={memberYear} hint="On PlacementPrep" />
        )}
      </div>
    );
  }

  if (profile.role === 'MENTOR') {
    return (
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Roadmaps" value={profile.roadmapsCount ?? 0} hint="Published" highlight />
        {memberYear && (
          <MetricCard label="Member since" value={memberYear} hint="On PlacementPrep" />
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-600">
        Platform administrator{memberYear ? ` · member since ${memberYear}` : ''}.
      </p>
    </div>
  );
}

type ProfileViewProps = {
  profile: ProfileData;
  isOwn?: boolean;
  onSaved?: () => void;
};

export function ProfileView({ profile, isOwn = false, onSaved }: ProfileViewProps) {
  const { refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [company, setCompany] = useState(profile.company ?? '');
  const [college, setCollege] = useState(profile.college ?? '');
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedinUrl ?? '');
  const [leetcodeUrl, setLeetcodeUrl] = useState(profile.leetcodeUrl ?? '');
  const [githubUrl, setGithubUrl] = useState(profile.githubUrl ?? '');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDisplayName(profile.displayName);
    setBio(profile.bio ?? '');
    setCompany(profile.company ?? '');
    setCollege(profile.college ?? '');
    setLinkedinUrl(profile.linkedinUrl ?? '');
    setLeetcodeUrl(profile.leetcodeUrl ?? '');
    setGithubUrl(profile.githubUrl ?? '');
  }, [profile]);

  const resetForm = () => {
    setDisplayName(profile.displayName);
    setBio(profile.bio ?? '');
    setCompany(profile.company ?? '');
    setCollege(profile.college ?? '');
    setLinkedinUrl(profile.linkedinUrl ?? '');
    setLeetcodeUrl(profile.leetcodeUrl ?? '');
    setGithubUrl(profile.githubUrl ?? '');
    setError('');
  };

  const saveMut = useMutation({
    mutationFn: () =>
      api<UserProfileDto>('/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          displayName,
          bio: bio || null,
          college: college || null,
          linkedinUrl: linkedinUrl || null,
          leetcodeUrl: leetcodeUrl || null,
          githubUrl: githubUrl || null,
          ...(profile.role === 'MENTOR' ? { company: company || null } : {}),
        }),
      }),
    onSuccess: async () => {
      await refreshUser();
      setEditing(false);
      setSaved(true);
      onSaved?.();
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError) {
        const body = e.body as { error?: { message?: string } };
        setError(body?.error?.message ?? 'Failed to save');
      }
    },
  });

  const since = profile.memberSince ?? ('createdAt' in profile ? profile.createdAt : undefined);
  const socialLinks = SOCIAL_CONFIG.filter((s) => profile[s.key]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header card */}
      <div className="card overflow-hidden mb-6">
        <div className="relative h-28 sm:h-32 bg-gradient-to-r from-slate-800 via-indigo-900 to-violet-900">
          <div className="absolute -bottom-10 sm:-bottom-12 left-5 sm:left-8">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border-4 border-white shadow-md flex items-center justify-center text-2xl sm:text-3xl font-bold text-indigo-600">
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-8 pt-14 sm:pt-16 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 min-w-0 sm:pl-28 sm:pt-1">
              {!editing ? (
                <>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight break-words">
                    {profile.displayName}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleBadgeStyle(profile.role)}`}>
                      {roleLabel(profile.role)}
                    </span>
                    {profile.role === 'MENTOR' && profile.company && (
                      <span className="inline-flex items-center rounded-full bg-violet-50 text-violet-700 border border-violet-200 px-2.5 py-0.5 text-xs font-medium">
                        {profile.company}
                      </span>
                    )}
                    {profile.college && (
                      <span className="inline-flex items-center rounded-full bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-0.5 text-xs font-medium">
                        {profile.college}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-lg font-semibold text-slate-800">Editing profile</p>
              )}
            </div>

            {isOwn && !editing && (
              <button type="button" onClick={() => setEditing(true)} className="btn-primary btn-sm self-start flex-shrink-0">
                Edit profile
              </button>
            )}
          </div>

          {saved && (
            <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800">
              Profile saved.
            </div>
          )}

          {!editing && profile.bio && (
            <p className="mt-5 text-slate-600 leading-relaxed max-w-2xl">{profile.bio}</p>
          )}

          {!editing && isOwn && 'email' in profile && profile.email && (
            <p className="mt-3 text-sm text-slate-400">{profile.email}</p>
          )}
        </div>
      </div>

      {editing ? (
        <div className="card p-5 sm:p-8">
          {error && (
            <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</div>
          )}

          <div className="space-y-8">
            <section>
              <h2 className="text-sm font-semibold text-slate-900 mb-4">About you</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="form-group sm:col-span-2">
                  <label className="label">Display name</label>
                  <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required minLength={2} />
                </div>
                <div className="form-group sm:col-span-2">
                  <label className="label">Bio</label>
                  <textarea
                    className="input min-h-28 resize-y"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={
                      profile.role === 'MENTOR'
                        ? 'Your background, areas you mentor in, companies you’ve worked at…'
                        : 'What you’re preparing for, target roles, interests…'
                    }
                    maxLength={500}
                    rows={4}
                  />
                  <p className="text-xs text-slate-400 mt-1 text-right">{bio.length}/500</p>
                </div>
                <div className="form-group">
                  <label className="label">College / University</label>
                  <input className="input" value={college} onChange={(e) => setCollege(e.target.value)} placeholder="Optional" />
                </div>
                {profile.role === 'MENTOR' && (
                  <div className="form-group">
                    <label className="label">Company</label>
                    <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Where you work" />
                  </div>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-slate-900 mb-1">Online presence</h2>
              <p className="text-sm text-slate-500 mb-4">Paste a full URL or just your username.</p>
              <div className="space-y-3">
                {SOCIAL_CONFIG.map(({ key, label, placeholder }) => {
                  const values = { linkedinUrl, leetcodeUrl, githubUrl };
                  const setters = { linkedinUrl: setLinkedinUrl, leetcodeUrl: setLeetcodeUrl, githubUrl: setGithubUrl };
                  return (
                    <div key={key} className="form-group">
                      <label className="label">{label}</label>
                      <input
                        className="input"
                        value={values[key]}
                        onChange={(e) => setters[key](e.target.value)}
                        placeholder={placeholder}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-slate-100">
            <button type="button" onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="btn-primary">
              {saveMut.isPending ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); resetForm(); }}
              disabled={saveMut.isPending}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">
            <section className="card p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Links</h2>
              {socialLinks.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {socialLinks.map(({ key, type, label, short, color, accent }) => (
                    <SocialLinkCard
                      key={key}
                      type={type}
                      label={label}
                      short={short}
                      color={color}
                      accent={accent}
                      value={profile[key]!}
                    />
                  ))}
                </div>
              ) : isOwn ? (
                <div className="rounded-xl border border-dashed border-slate-200 py-10 px-4 text-center">
                  <p className="text-sm text-slate-500 mb-3">Add LinkedIn, LeetCode, or GitHub so others can connect with you.</p>
                  <button type="button" onClick={() => setEditing(true)} className="btn-secondary btn-sm">
                    Add links
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No links added yet.</p>
              )}
            </section>

            {isOwn && (
              <section className="card p-5 sm:p-6">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">Quick actions</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.role === 'STUDENT' && (
                    <>
                      <Link href="/roadmaps" className="btn-primary btn-sm">Browse roadmaps</Link>
                      <Link href="/daily" className="btn-secondary btn-sm">Daily tasks</Link>
                      <Link href="/community/questions/new" className="btn-secondary btn-sm">Ask a doubt</Link>
                      <Link href="/community/experiences/new" className="btn-secondary btn-sm">Share experience</Link>
                    </>
                  )}
                  {profile.role === 'MENTOR' && (
                    <>
                      <Link href="/mentor/roadmaps" className="btn-primary btn-sm">My roadmaps</Link>
                      <Link href="/mentor/roadmaps/new" className="btn-secondary btn-sm">Create roadmap</Link>
                      <Link href="/community/questions" className="btn-secondary btn-sm">Answer doubts</Link>
                      <Link href="/community/experiences/new" className="btn-secondary btn-sm">Share experience</Link>
                    </>
                  )}
                  {profile.role === 'ADMIN' && (
                    <>
                      <Link href="/admin" className="btn-primary btn-sm">Admin overview</Link>
                      <Link href="/admin/reports" className="btn-secondary btn-sm">Reports</Link>
                    </>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar stats */}
          <aside className="space-y-6">
            <section className="card p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">
                {hasLearningStats(profile.role) ? 'Learning progress' : 'Overview'}
              </h2>
              <ProfileStats profile={profile} />
              {!hasLearningStats(profile.role) && profile.role === 'MENTOR' && (
                <p className="text-xs text-slate-400 mt-3">
                  Streaks and XP are tracked for students only.
                </p>
              )}
            </section>

            {since && (
              <section className="card p-5 sm:p-6">
                <h2 className="text-sm font-semibold text-slate-900 mb-2">Joined</h2>
                <p className="text-sm text-slate-600">
                  {new Date(since).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </section>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
