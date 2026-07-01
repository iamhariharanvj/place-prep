export function homeForRole(role: string): string {
  if (role === 'MENTOR') return '/profile';
  if (role === 'ADMIN') return '/admin';
  return '/dashboard';
}
