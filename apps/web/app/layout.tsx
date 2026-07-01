import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/lib/providers';
import { AppShell } from '@/components/app-shell';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'PlacementPrep — Placement Preparation Portal',
  description: 'Structured roadmaps, daily objectives, community, and leaderboards',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
