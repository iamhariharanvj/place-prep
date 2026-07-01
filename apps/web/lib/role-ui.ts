export type AppRole = 'STUDENT' | 'MENTOR' | 'ADMIN' | string;

export function roleLabel(role: AppRole): string {
  if (role === 'STUDENT') return 'Student';
  if (role === 'MENTOR') return 'Mentor';
  if (role === 'ADMIN') return 'Admin';
  return role;
}

export function hasLearningStats(role: AppRole): boolean {
  return role === 'STUDENT';
}

export function showStreak(role: AppRole): boolean {
  return role === 'STUDENT';
}

export function roleBadgeStyle(role: AppRole): string {
  if (role === 'STUDENT') return 'bg-sky-100 text-sky-800 border-sky-200';
  if (role === 'MENTOR') return 'bg-violet-100 text-violet-800 border-violet-200';
  if (role === 'ADMIN') return 'bg-rose-100 text-rose-800 border-rose-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

export function roleBadgeStyleDark(role: AppRole): string {
  if (role === 'STUDENT') return 'bg-sky-400/20 text-sky-200';
  if (role === 'MENTOR') return 'bg-violet-400/20 text-violet-200';
  if (role === 'ADMIN') return 'bg-rose-400/20 text-rose-200';
  return 'bg-white/10 text-white/60';
}
