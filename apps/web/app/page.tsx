import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center font-bold text-white text-sm">PP</div>
          <span className="font-semibold text-white">PlacementPrep</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-slate-300 hover:text-white transition-colors">Sign in</Link>
          <Link href="/register" className="btn-primary btn-sm rounded-lg">Get started</Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-3xl mx-auto">
          <span className="badge badge-indigo mb-4 bg-indigo-500/20 text-indigo-300">Beta · Free to join</span>
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-6">
            Crack your dream<br />
            <span className="text-indigo-400">placement</span>
          </h1>
          <p className="text-lg text-slate-400 mb-8 max-w-xl mx-auto leading-relaxed">
            Structured roadmaps, daily objectives, mentor-crafted learning paths, and a community of aspirants — all in one place.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/register" className="btn-primary btn-lg">Start learning for free</Link>
            <Link href="/login" className="btn bg-white/10 text-white hover:bg-white/20 px-6 py-3 text-base rounded-lg">Sign in</Link>
          </div>

          {/* Features */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            {[
              { icon: '🗺️', title: 'Mentor Roadmaps', desc: 'Expert-crafted learning paths aligned to placement requirements.' },
              { icon: '⚡', title: 'Daily Objectives', desc: 'Bite-sized daily tasks assigned automatically to build consistency.' },
              { icon: '🏆', title: 'Gamification', desc: 'Earn XP, maintain streaks and compete on the leaderboard.' },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-white mb-1">{f.title}</h3>
                <p className="text-sm text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-sm text-slate-600">
        © 2024 PlacementPrep. Built with ❤️
      </footer>
    </div>
  );
}
