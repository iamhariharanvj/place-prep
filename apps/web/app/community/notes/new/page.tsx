'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api, ApiError, formatApiError } from '@/lib/api-client';

export default function NewNotePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  const mut = useMutation({
    mutationFn: () => api('/notes', { method: 'POST', body: JSON.stringify({ title, body }) }),
    onSuccess: () => router.push('/community/notes'),
    onError: (e: unknown) => {
      if (e instanceof ApiError) setError(formatApiError(e.body, 'Failed to post note'));
      else setError('Failed to post note');
    },
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="section-heading">Share a Note</h1>
        <p className="text-sm text-slate-500 mt-0.5">Help others by sharing your study notes</p>
      </div>
      <div className="card p-6">
        {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-4">
          <div className="form-group">
            <label className="label">Title</label>
            <input className="input" placeholder="Note title" value={title} onChange={e => setTitle(e.target.value)} required minLength={5} />
          </div>
          <div className="form-group">
            <label className="label">Content</label>
            <textarea className="input min-h-48 resize-y" placeholder="Share your notes, tips, or study material…" value={body} onChange={e => setBody(e.target.value)} required minLength={10} rows={8} />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={mut.isPending} className="btn-primary">{mut.isPending ? 'Posting…' : 'Share note'}</button>
            <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
