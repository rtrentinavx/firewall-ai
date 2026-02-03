import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ThemeProvider from '@/components/theme-provider';
import ThemeToggle from '@/components/theme-toggle';
import UserMenu from '@/components/user-menu';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Firewall AI - Agentic SDLC for Multi-Cloud Security',
  description: 'Intelligent firewall auditing platform with AI-powered analysis across GCP, Azure, and Aviatrix'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 text-slate-900 dark:text-slate-100">
            <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-950/60">
              <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-500 text-white shadow-sm">
                    AI
                  </div>
                  <div className="leading-tight">
                    <p className="text-sm font-semibold">Firewall AI</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Intelligent audit workspace</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <UserMenu />
                  <ThemeToggle />
                </div>
              </div>
            </header>
            <main>{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}