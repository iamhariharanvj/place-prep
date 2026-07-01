'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { VoteButtons } from '@/components/vote-buttons';

type ExperienceTag = { type: 'company' | 'role'; label: string };
type Experience = {
  id: string;
  company: string;
  role: string;
  body: string;
  tags?: ExperienceTag[];
  voteScore: number;
  userVote?: 1 | -1 | null;
  createdAt: string;
  author: { id: string; displayName: string };
};
type PagedResult = { data: Experience[]; nextCursor: string | null; hasMore: boolean };
type FilterOption = { label: string; count: number };
type FiltersResponse = { companies: FilterOption[]; roles: FilterOption[] };

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
        active
          ? 'bg-indigo-600 text-white'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      }`}
    >
      {label}
      <span className={`text-xs ${active ? 'text-indigo-200' : 'text-slate-400'}`}>{count}</span>
    </button>
  );
}

function TagBadge({ tag, onFilter }: { tag: ExperienceTag; onFilter: (type: 'company' | 'role', label: string) => void }) {
  const styles =
    tag.type === 'company'
      ? 'bg-violet-100 text-violet-800 hover:bg-violet-200'
      : 'bg-sky-100 text-sky-800 hover:bg-sky-200';
  return (
    <button
      type="button"
      onClick={() => onFilter(tag.type, tag.label)}
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${styles}`}
    >
      {tag.type === 'company' ? '🏢' : '💼'} {tag.label}
    </button>
  );
}

export default function ExperiencesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [companyFilter, setCompanyFilter] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  const canShare = user?.role === 'STUDENT' || user?.role === 'MENTOR';

  const { data: filters } = useQuery({
    queryKey: ['experience-filters'],
    queryFn: () => api<FiltersResponse>('/experiences/filters'),
  });

  const queryParams = new URLSearchParams();
  if (companyFilter) queryParams.set('company', companyFilter);
  if (roleFilter) queryParams.set('role', roleFilter);
  const queryString = queryParams.toString();

  const { data, isLoading } = useQuery({
    queryKey: ['experiences', companyFilter, roleFilter],
    queryFn: () => api<PagedResult>(`/experiences${queryString ? `?${queryString}` : ''}`),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api(`/admin/messages/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['experiences'] });
      qc.invalidateQueries({ queryKey: ['experience-filters'] });
    },
  });

  const exps = data?.data ?? [];
  const hasFilters = !!(companyFilter || roleFilter);

  const applyTagFilter = (type: 'company' | 'role', label: string) => {
    if (type === 'company') {
      setCompanyFilter((prev) => (prev === label ? null : label));
    } else {
      setRoleFilter((prev) => (prev === label ? null : label));
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="section-heading">Interview Experiences</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Students and mentors share real interview stories — filter by company or role
          </p>
        </div>
        {canShare && (
          <Link href="/community/experiences/new" className="btn-primary">Share experience</Link>
        )}
      </div>

      {(filters?.companies.length || filters?.roles.length) ? (
        <div className="card p-4 mb-6 space-y-4">
          {!!filters?.companies.length && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Company</p>
              <div className="flex flex-wrap gap-2">
                {filters.companies.map((c) => (
                  <FilterChip
                    key={c.label}
                    label={c.label}
                    count={c.count}
                    active={companyFilter === c.label}
                    onClick={() => setCompanyFilter((prev) => (prev === c.label ? null : c.label))}
                  />
                ))}
              </div>
            </div>
          )}
          {!!filters?.roles.length && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Role</p>
              <div className="flex flex-wrap gap-2">
                {filters.roles.map((r) => (
                  <FilterChip
                    key={r.label}
                    label={r.label}
                    count={r.count}
                    active={roleFilter === r.label}
                    onClick={() => setRoleFilter((prev) => (prev === r.label ? null : r.label))}
                  />
                ))}
              </div>
            </div>
          )}
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setCompanyFilter(null);
                setRoleFilter(null);
              }}
              className="text-sm text-indigo-600 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-36 rounded-xl" />)}</div>
      ) : !exps.length ? (
        <div className="empty-state">
          <div className="text-4xl mb-3">🎤</div>
          <h3 className="font-semibold text-slate-900 mb-1">
            {hasFilters ? 'No experiences match these filters' : 'No experiences shared yet'}
          </h3>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => {
                setCompanyFilter(null);
                setRoleFilter(null);
              }}
              className="btn-secondary mt-4"
            >
              Clear filters
            </button>
          ) : (
            canShare && (
              <Link href="/community/experiences/new" className="btn-primary mt-4">Share yours</Link>
            )
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {exps.map((exp) => {
            const tags = exp.tags ?? [
              { type: 'company' as const, label: exp.company },
              { type: 'role' as const, label: exp.role },
            ];
            return (
              <div key={exp.id} className="card-hover p-5 flex gap-4">
                <VoteButtons
                  messageId={exp.id}
                  score={exp.voteScore}
                  userVote={exp.userVote}
                  invalidateKeys={[['experiences']]}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {tags.map((tag) => (
                      <TagBadge key={`${tag.type}-${tag.label}`} tag={tag} onFilter={applyTagFilter} />
                    ))}
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">{exp.body}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs text-slate-400">
                      by{' '}
                      <span className="font-medium text-slate-600">{exp.author?.displayName ?? 'Anonymous'}</span>
                      {' · '}
                      {new Date(exp.createdAt).toLocaleDateString()}
                    </div>
                    {user?.role === 'ADMIN' && (
                      <button
                        onClick={() => deleteMut.mutate(exp.id)}
                        disabled={deleteMut.isPending && deleteMut.variables === exp.id}
                        className="btn-danger btn-sm"
                      >
                        {deleteMut.isPending && deleteMut.variables === exp.id ? 'Deleting…' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
