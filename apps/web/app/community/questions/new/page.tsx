'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { api, ApiError, formatApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

const MIN_TITLE = 5;
const MIN_BODY = 10;

export default function NewDoubtPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && user && user.role !== 'STUDENT') {
      router.replace('/community/questions');
    }
  }, [user, loading, router]);

  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  const titleValid = trimmedTitle.length >= MIN_TITLE;
  const bodyValid = trimmedBody.length >= MIN_BODY;
  const canSubmit = titleValid && bodyValid;

  const mut = useMutation({
    mutationFn: () =>
      api('/questions', {
        method: 'POST',
        body: JSON.stringify({ title: trimmedTitle, body: trimmedBody }),
      }),
    onSuccess: () => router.push('/community/questions'),
    onError: (e: unknown) => {
      if (e instanceof ApiError) {
        setError(formatApiError(e.body, 'Failed to post doubt'));
      } else {
        setError('Failed to post doubt');
      }
    },
  });

  if (loading) {
    return <div className="max-w-2xl mx-auto skeleton h-64 rounded-xl" />;
  }

  if (user && user.role !== 'STUDENT') {
    return (
      <div className="max-w-2xl mx-auto empty-state">
        <p className="text-slate-500">Only students can post doubts.</p>
        <Link href="/community/questions" className="btn-secondary mt-4">Back to doubts</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="section-heading">Ask a Doubt</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Share what you&apos;re stuck on — mentors and fellow students can help clarify
        </p>
      </div>

      <div className="card p-6">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) {
              setError(
                !titleValid
                  ? `Title must be at least ${MIN_TITLE} characters.`
                  : `Details must be at least ${MIN_BODY} characters.`,
              );
              return;
            }
            setError('');
            mut.mutate();
          }}
          className="space-y-4"
        >
          <div className="form-group">
            <label className="label">Doubt title</label>
            <input
              className="input"
              placeholder="e.g. How do I approach two-pointer problems?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={MIN_TITLE}
            />
            <p className={`text-xs mt-1 ${title.length > 0 && !titleValid ? 'text-red-500' : 'text-slate-400'}`}>
              {trimmedTitle.length}/{MIN_TITLE} min characters
            </p>
          </div>
          <div className="form-group">
            <label className="label">Details</label>
            <textarea
              className="input min-h-32 resize-y"
              placeholder="What exactly are you confused about? What have you tried so far?"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              minLength={MIN_BODY}
              rows={5}
            />
            <p className={`text-xs mt-1 ${body.length > 0 && !bodyValid ? 'text-red-500' : 'text-slate-400'}`}>
              {trimmedBody.length}/{MIN_BODY} min characters — explain your doubt clearly
            </p>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={mut.isPending || !canSubmit} className="btn-primary">
              {mut.isPending ? 'Posting…' : 'Post doubt'}
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
