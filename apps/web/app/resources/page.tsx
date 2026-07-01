'use client';

export const dynamic = 'force-dynamic';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

type Resource = { id: string; title: string; url: string; type: string; description?: string; status: string; createdAt: string };

const TYPE_ICON: Record<string, string> = {
  VIDEO: '🎬', ARTICLE: '📄', PDF: '📑', REPO: '🐙',
};

export default function ResourcesPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['resources'],
    queryFn: () => api<Resource[]>('/resources'),
  });

  const approved = (data ?? []).filter((r) => r.status === 'APPROVED');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="section-heading">Resources</h1>
          <p className="text-sm text-slate-500 mt-0.5">Curated learning resources</p>
        </div>
        {user?.role === 'MENTOR' && (
          <Link href="/resources/new" className="btn-primary">Submit resource</Link>
        )}
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-28 rounded-xl"/>)}
        </div>
      ) : !approved.length ? (
        <div className="empty-state">
          <div className="text-4xl mb-3">📚</div>
          <h3 className="font-semibold text-slate-900 mb-1">No resources yet</h3>
          <p className="text-sm text-slate-500">Mentors can submit resources for approval.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {approved.map((r) => (
            <a
              key={r.id}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="card-hover p-5 flex gap-4 items-start group"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-xl flex-shrink-0">
                {TYPE_ICON[r.type] ?? '🔗'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors text-sm">{r.title}</h3>
                  <span className="badge-slate flex-shrink-0">{r.type}</span>
                </div>
                {r.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.description}</p>}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
