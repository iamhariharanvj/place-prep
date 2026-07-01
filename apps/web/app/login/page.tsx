'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api-client';
import { homeForRole } from '@/lib/home-route';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedIn = await login(email, password);
      router.push(homeForRole(loggedIn.role));
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { message?: string; error?: { message?: string } };
        setError(body?.error?.message ?? body?.message ?? 'Login failed');
      } else {
        setError('Something went wrong. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">PP</div>
            <span className="font-semibold text-slate-800">PlacementPrep</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your account</p>
        </div>

        <div className="card p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" className="input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="password">Password</label>
              <input id="password" type="password" className="input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          Don't have an account?{' '}
          <Link href="/register" className="text-indigo-600 font-medium hover:text-indigo-700">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
