'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api-client';

export default function NewRoadmapPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [carryForward, setCarryForward] = useState(true);
  const [error, setError] = useState('');

  const mut = useMutation({
    mutationFn: () => api<{ id: string }>('/roadmaps', { method: 'POST', body: JSON.stringify({ title, description: description || undefined, carryForward }) }),
    onSuccess: (data: { id: string }) => {
      qc.invalidateQueries({ queryKey: ['mentor-roadmaps'] });
      router.push(`/mentor/roadmaps/${data.id}/edit`);
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError) {
        const body = e.body as { error?: { message?: string }; message?: string };
        setError(body?.error?.message ?? body?.message ?? 'Failed to create roadmap');
      } else {
        setError('Failed to create roadmap');
      }
    },
  });

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="section-heading">Create Roadmap</h1>
        <p className="text-sm text-slate-500 mt-0.5">Define the basic info — you can add modules and objectives next</p>
      </div>

      <div className="card p-6">
        {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-5">
          <div className="form-group">
            <label className="label">Title <span className="text-red-500">*</span></label>
            <input
              className="input"
              placeholder="e.g. Full Stack Web Development"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
            />
          </div>

          <div className="form-group">
            <label className="label">Description</label>
            <textarea
              className="input resize-y"
              placeholder="What will students learn from this roadmap?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setCarryForward(!carryForward)}
              className={`w-10 h-6 rounded-full transition-colors relative ${carryForward ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${carryForward ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Carry forward incomplete tasks</p>
              <p className="text-xs text-slate-500">Unfinished daily tasks roll over to the next day</p>
            </div>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={mut.isPending} className="btn-primary">
              {mut.isPending ? 'Creating…' : 'Create and build →'}
            </button>
            <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
