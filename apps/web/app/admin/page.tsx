'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import Link from 'next/link';

export default function AdminPage() {
  const { data: reports } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => api<any[]>('/admin/reports'),
  });

  const { data: messages } = useQuery({
    queryKey: ['admin-messages'],
    queryFn: () => api<any[]>('/admin/messages?limit=5'),
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="section-heading">Admin Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Moderate content and manage the platform</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Open reports', value: reports?.length ?? 0, href: '/admin/reports', accent: reports?.length ? 'text-red-600' : 'text-slate-900', icon: '🚩' },
          { label: 'Content items', value: messages?.length ?? 0, href: '/admin/messages', accent: 'text-slate-900', icon: '📝' },
          { label: 'Moderation queue', value: (reports?.length ?? 0), href: '/admin/reports', accent: 'text-amber-600', icon: '⚠️' },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href} className="card-hover p-5">
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className={`text-3xl font-bold ${stat.accent}`}>{stat.value}</div>
            <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Recent Reports</h2>
            <Link href="/admin/reports" className="text-sm text-indigo-600 font-medium">View all →</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {!reports?.length ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">No open reports</div>
            ) : reports.slice(0, 5).map((r: any) => (
              <div key={r.id} className="px-5 py-3 flex items-center gap-3">
                <span className="badge-red flex-shrink-0">Open</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 truncate">{r.reason}</p>
                  <p className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Content Moderation</h2>
            <Link href="/admin/messages" className="text-sm text-indigo-600 font-medium">View all →</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {!messages?.length ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">No content yet</div>
            ) : messages.slice(0, 5).map((m: any) => (
              <div key={m.id} className="px-5 py-3 flex items-center gap-3">
                <span className="badge-indigo flex-shrink-0">{m.type}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 truncate">{m.displayName}</p>
                  <p className="text-xs text-slate-400">{new Date(m.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
