'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api-client';
import { homeForRole } from '@/lib/home-route';

const ROLE_OPTIONS = [
  {
    value: 'STUDENT',
    label: 'Student',
    desc: 'Enroll in roadmaps, complete daily tasks, earn XP',
    icon: '🎓',
  },
  {
    value: 'MENTOR',
    label: 'Mentor',
    desc: 'Create roadmaps, guide students, share resources',
    icon: '🧑‍🏫',
  },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('STUDENT');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (role === 'MENTOR' && company.trim().length < 2) {
      setError('Please enter the company you work at');
      return;
    }
    setLoading(true);
    try {
      const user = await register(email, password, name, role, role === 'MENTOR' ? company.trim() : undefined);
      router.push(homeForRole(user.role));
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { message?: string; error?: { message?: string } };
        setError(body?.error?.message ?? body?.message ?? 'Registration failed');
      } else {
        setError('Something went wrong. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">PP</div>
            <span className="font-semibold text-slate-800">PlacementPrep</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Create account</h1>
          <p className="text-sm text-slate-500 mt-1">Join thousands preparing for placements</p>
        </div>

        <div className="card p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Role picker */}
          <div className="mb-4">
            <p className="label">I am a…</p>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value)}
                  className={`rounded-lg border p-3 text-left transition-all ${
                    role === opt.value
                      ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                      : 'border-slate-200 bg-white hover:border-indigo-300'
                  }`}
                >
                  <div className="text-xl mb-1">{opt.icon}</div>
                  <div className="text-sm font-semibold text-slate-800">{opt.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label className="label" htmlFor="name">Display name</label>
              <input
                id="name"
                type="text"
                className="input"
                placeholder="Alex Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
              />
            </div>

            {role === 'MENTOR' && (
              <div className="form-group">
                <label className="label" htmlFor="company">Company</label>
                <input
                  id="company"
                  type="text"
                  className="input"
                  placeholder="e.g. Google, Zoho, Amazon"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                  minLength={2}
                />
                <p className="text-xs text-slate-400 mt-1">Shown on your mentor profile</p>
              </div>
            )}

            <div className="form-group">
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account…
                </span>
              ) : `Create ${role === 'MENTOR' ? 'mentor' : 'student'} account`}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 font-medium hover:text-indigo-700">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
