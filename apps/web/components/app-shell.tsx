'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ReactNode, useState } from 'react';

function NavItem({ href, label, icon, active }: { href: string; label: string; icon: ReactNode; active: boolean }) {
  return (
    <Link href={href} className={active ? 'nav-item-active' : 'nav-item'}>
      <span className="w-5 h-5 flex-shrink-0">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

const icons = {
  dashboard: (
    <svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h6a1 1 0 010 2H4a1 1 0 01-1-1z"/></svg>
  ),
  tasks: (
    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/></svg>
  ),
  roadmap: (
    <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/></svg>
  ),
  leaderboard: (
    <svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"/><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"/></svg>
  ),
  community: (
    <svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/><path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"/></svg>
  ),
  resources: (
    <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/></svg>
  ),
  reports: (
    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd"/></svg>
  ),
  users: (
    <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
  ),
  create: (
    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
  ),
  logout: (
    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/></svg>
  ),
};

import { roleBadgeStyleDark, roleLabel } from '@/lib/role-ui';

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isPublic = pathname === '/' || pathname === '/login' || pathname === '/register';
  if (isPublic) return <>{children}</>;

  const is = (path: string) => pathname === path || pathname.startsWith(path + '/');

  const studentNav = [
    { href: '/profile', label: 'Profile', icon: icons.users },
    { href: '/dashboard', label: 'Dashboard', icon: icons.dashboard },
    { href: '/daily', label: 'Daily Tasks', icon: icons.tasks },
    { href: '/roadmaps', label: 'Roadmaps', icon: icons.roadmap },
    { href: '/leaderboard', label: 'Leaderboard', icon: icons.leaderboard },
    { href: '/community/questions', label: 'Doubts', icon: icons.community },
    { href: '/community/notes', label: 'Notes', icon: icons.resources },
    { href: '/community/experiences', label: 'Experiences', icon: icons.users },
    { href: '/resources', label: 'Resources', icon: icons.resources },
  ];

  const mentorNav = [
    { href: '/profile', label: 'Profile', icon: icons.users },
    { href: '/mentor/roadmaps', label: 'My Roadmaps', icon: icons.roadmap },
    { href: '/mentor/roadmaps/new', label: 'Create Roadmap', icon: icons.create },
    { href: '/resources', label: 'Resources', icon: icons.resources },
    { href: '/community/questions', label: 'Student Doubts', icon: icons.community },
    { href: '/community/experiences', label: 'Experiences', icon: icons.users },
  ];

  const adminNav = [
    { href: '/profile', label: 'Profile', icon: icons.users },
    { href: '/admin', label: 'Overview', icon: icons.dashboard },
    { href: '/admin/reports', label: 'Reports', icon: icons.reports },
    { href: '/admin/messages', label: 'Content', icon: icons.community },
    { href: '/admin/users', label: 'Users', icon: icons.users },
  ];

  const navItems = user?.role === 'ADMIN' ? adminNav : user?.role === 'MENTOR' ? mentorNav : studentNav;

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-indigo-400 flex items-center justify-center font-bold text-white text-sm">PP</div>
        <div>
          <p className="text-sm font-semibold text-white">PlacementPrep</p>
          <p className="text-xs text-slate-400">Your prep journey</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => (
          <NavItem key={item.href} href={item.href} label={item.label} icon={item.icon} active={is(item.href)} />
        ))}
      </nav>

      {/* User footer */}
      {user && (
        <div className="border-t border-white/10 px-3 py-3">
          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 mb-1 hover:bg-white/5 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-400 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {user.displayName?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{user.displayName}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${roleBadgeStyleDark(user.role)}`}>
                  {roleLabel(user.role)}
                </span>
                {user.role === 'MENTOR' && user.company && (
                  <span className="rounded-full bg-white/10 text-white/90 px-2 py-0.5 text-xs truncate max-w-[120px]" title={user.company}>
                    {user.company}
                  </span>
                )}
              </div>
            </div>
          </Link>
          <button onClick={handleLogout} className="nav-item w-full">
            <span className="w-5 h-5 flex-shrink-0">{icons.logout}</span>
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-slate-900 flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-60 flex flex-col bg-slate-900 shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <button onClick={() => setMobileOpen(true)} className="text-slate-500 hover:text-slate-700">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-semibold text-slate-800">PlacementPrep</span>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
