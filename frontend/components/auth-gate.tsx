'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const STORAGE_KEY = 'authBasic';

type AuthGateProps = {
  children: React.ReactNode;
};

export default function AuthGate({ children }: AuthGateProps) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setIsAuthed(true);
    }
    setIsReady(true);
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const token = btoa(`${username}:${password}`);

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${token}`
        }
      });

      if (!response.ok) {
        setError('Invalid credentials.');
        return;
      }

      localStorage.setItem(STORAGE_KEY, token);
      window.dispatchEvent(new Event('auth-changed'));
      setIsAuthed(true);
    } catch (err) {
      setError('Unable to reach the server.');
    }
  };

  if (!isReady) return null;

  if (!isAuthed) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="grid w-full max-w-4xl gap-10 rounded-3xl border border-slate-200/70 bg-white/80 p-10 shadow-xl shadow-indigo-100/30 backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/70 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold leading-tight text-slate-900 dark:text-white">
              Make every firewall decision faster, safer, and provably compliant.
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Firewall AI turns complex rule sets into clear action plans. Audit risk, resolve conflicts, and ship
              changes with confidence across multi-cloud environments.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button className="bg-indigo-600 text-white hover:bg-indigo-700">Start a live audit</Button>
              <Button variant="outline">Explore sample data</Button>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-8 shadow-lg dark:border-slate-800/70 dark:bg-slate-900/70">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Admin sign in</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Use the default admin credentials to access Firewall AI.
            </p>
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
