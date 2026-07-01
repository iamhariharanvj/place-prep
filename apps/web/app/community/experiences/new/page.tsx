'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

export default function NewExperiencePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  const canShare = user?.role === 'STUDENT' || user?.role === 'MENTOR';

  useEffect(() => {
    if (!loading && user?.role === 'MENTOR' && user.company && !company) {
      setCompany(user.company);
    }
  }, [user, loading, company]);

  useEffect(() => {
    if (!loading && user && !canShare) {
      router.replace('/community/experiences');
    }
  }, [user, loading, canShare, router]);

  const mut = useMutation({
    mutationFn: () => api('/experiences', { method: 'POST', body: JSON.stringify({ company, role, body }) }),
    onSuccess: () => router.push('/community/experiences'),
    onError: (e: unknown) => {
      const err = e as { body?: { message?: string; error?: { message?: string } } };
      setError(err?.body?.error?.message ?? err?.body?.message ?? 'Failed to post experience');
    },
  });

  if (loading) {
    return <div className="max-w-2xl mx-auto skeleton h-64 rounded-xl" />;
  }

  if (user && !canShare) {
    return (
      <div className="max-w-2xl mx-auto empty-state">
        <p className="text-slate-500">Only students and mentors can share interview experiences.</p>
        <Link href="/community/experiences" className="btn-secondary mt-4">Back to experiences</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="section-heading">Share Interview Experience</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {user?.role === 'MENTOR'
            ? 'Share your interview panel experience or past hiring rounds to guide students'
            : 'Help others prepare by sharing your interview experience — add company and role tags'}
        </p>
      </div>
      <div className="card p-6">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Company tag</label>
              <input
                className="input"
                placeholder="e.g. Google, Zoho"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="label">Role tag</label>
              <input
                className="input"
                placeholder="e.g. SDE Intern, Backend"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Your experience</label>
            <textarea
              className="input min-h-48 resize-y"
              placeholder="Describe the interview process, rounds, questions asked, tips for others…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={8}
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={mut.isPending} className="btn-primary">
              {mut.isPending ? 'Posting…' : 'Share experience'}
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
