'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

const RESOURCE_TYPES = [
  { value: 'ARTICLE', label: '📄 Article' },
  { value: 'VIDEO', label: '🎬 Video' },
  { value: 'PDF', label: '📑 PDF / Document' },
  { value: 'REPO', label: '🐙 Repository' },
] as const;

type Roadmap = { id: string; title: string };

export default function NewResourcePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<string>('ARTICLE');
  const [description, setDescription] = useState('');
  const [roadmapIds, setRoadmapIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  const { data: roadmaps = [] } = useQuery({
    queryKey: ['mentor-roadmaps'],
    queryFn: () => api<Roadmap[]>('/roadmaps/mine'),
    enabled: user?.role === 'MENTOR',
  });

  const mut = useMutation({
    mutationFn: () =>
      api('/resources', {
        method: 'POST',
        body: JSON.stringify({
          title,
          url,
          type,
          description: description || undefined,
          roadmapIds: roadmapIds.length ? roadmapIds : undefined,
        }),
      }),
    onSuccess: () => router.push('/resources'),
    onError: (e: unknown) => {
      if (e instanceof ApiError) {
        const body = e.body as { error?: { message?: string }; message?: string };
        setError(body?.error?.message ?? body?.message ?? 'Failed to submit resource');
      } else {
        setError('Failed to submit resource');
      }
    },
  });

  const toggleRoadmap = (id: string) => {
    setRoadmapIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : prev.length < 5 ? [...prev, id] : prev,
    );
  };

  if (user && user.role !== 'MENTOR') {
    return (
      <div className="empty-state max-w-md mx-auto">
        <div className="text-4xl mb-3">🔒</div>
        <h3 className="font-semibold text-slate-900 mb-1">Mentors only</h3>
        <p className="text-sm text-slate-500">Only mentors can submit learning resources.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="section-heading">Submit a Resource</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Share a useful link — it will be reviewed before appearing in the library
        </p>
      </div>

      <div className="card p-6">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate();
          }}
          className="space-y-4"
        >
          <div className="form-group">
            <label className="label" htmlFor="title">Title</label>
            <input
              id="title"
              className="input"
              placeholder="e.g. NeetCode Blind 75 Playlist"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="url">URL</label>
            <input
              id="url"
              type="url"
              className="input"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="type">Type</label>
            <select
              id="type"
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {RESOURCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="description">Description (optional)</label>
            <textarea
              id="description"
              className="input resize-y min-h-24"
              placeholder="Why is this resource useful? What topics does it cover?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {roadmaps.length > 0 && (
            <div className="form-group">
              <label className="label">Link to roadmaps (optional)</label>
              <p className="text-xs text-slate-400 mb-2">Select up to 5 roadmaps this resource relates to</p>
              <div className="space-y-2 max-h-40 overflow-y-auto rounded-lg border border-slate-200 p-3">
                {roadmaps.map((rm) => (
                  <label key={rm.id} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={roadmapIds.includes(rm.id)}
                      onChange={() => toggleRoadmap(rm.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    {rm.title}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={mut.isPending} className="btn-primary">
              {mut.isPending ? 'Submitting…' : 'Submit for review'}
            </button>
            <button type="button" onClick={() => router.back()} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
